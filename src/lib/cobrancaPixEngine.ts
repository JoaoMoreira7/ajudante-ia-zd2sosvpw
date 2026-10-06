/**
 * src/lib/cobrancaPixEngine.ts
 * Motor determinístico para interpretação de cobranças Pix por voz e gestão de cobranças Asaas.
 *
 * Padrão de frases faladas:
 * - "cria uma cobrança de 350 pro João"
 * - "cobra 350 do João"
 * - "cria uma cobrança Pix de R$ 350 para o cliente João referente à consultoria de hoje"
 * - "gerar cobrança de 500 para Maria"
 * - "manda um pix de 1200 pro Carlos referente a pintura"
 *
 * Regras:
 * - Extração determinística sem alucinações de IA.
 * - Perfil Operador bloqueado de criar ou visualizar cobranças.
 * - Idempotência e validação.
 */

export interface IntencaoCobrancaPix {
  clienteNome: string
  valor: number
  descricao?: string
  rawText: string
}

export interface CobrancaPixItem {
  id: string
  financeiroId?: string
  asaasPaymentId?: string
  clienteNome: string
  valor: number
  descricao?: string
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'CANCELLED'
  pixCopiaECola?: string
  pixQrCodeBase64?: string
  pixExpiracao?: string
  invoiceUrl?: string
  criadoPorNome?: string
  vencimento?: string
  timestamp: number
}

/**
 * Tenta extrair a intenção de cobrança Pix de uma frase falada/digitada
 */
export function parseCobrancaPix(text: string): IntencaoCobrancaPix | null {
  if (!text) return null
  const clean = text.toLowerCase().trim()

  // Deve conter indício de cobrança
  const ehCobranca =
    /\b(cria(?:r)?\s+(?:uma\s+)?cobran[çc]a|cobra(?:r)?\b|gera(?:r)?\s+(?:uma\s+)?cobran[çc]a|fazer\s+cobran[çc]a|lan[çc]a(?:r)?\s+cobran[çc]a|manda(?:r)?\s+(?:um\s+)?pix|pix\s+de\s+[0-9.,]+)/i.test(
      clean,
    )

  if (!ehCobranca) return null

  // 1. Extrai o valor
  // Exemplos: "350", "350,00", "r$ 350", "350 reais", "R$ 1.250,50"
  let valor = 0
  const valorMatch = clean.match(
    /(?:r\$\s*|de\s+r\$\s*|de\s+)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)\s*(?:reais)?/i,
  )

  // Encontra o número associado à cobrança
  // Procura padrão específico: "cobrança de X" ou "cobra X" ou "pix de X"
  const valorEspecificoMatch = clean.match(
    /(?:cobran[çc]a\s+(?:pix\s+)?de\s+|cobra\s+|cobrar\s+|pix\s+de\s+)(?:r\$\s*)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)/i,
  )

  const numStr = valorEspecificoMatch ? valorEspecificoMatch[1] : valorMatch ? valorMatch[1] : ''
  if (numStr) {
    const limpo = numStr.replace(/\./g, '').replace(',', '.')
    const parsedVal = parseFloat(limpo)
    if (!isNaN(parsedVal) && parsedVal > 0) {
      valor = parsedVal
    }
  }

  if (valor <= 0) return null

  // 2. Extrai o nome do cliente
  // Exemplos: "pro João", "para o cliente João", "do João", "pra Maria", "para Carlos"
  let clienteNome = ''
  const clienteMatch = clean.match(
    /(?:para\s+o\s+cliente|pro\s+cliente|pra\s+cliente|para\s+a\s+cliente|pro|pra|para|do\s+cliente|da\s+cliente|do|da|ao|à)\s+([a-zá-ú0-9\s]+?)(?:\s+referente|\s+sobre|\s+pela|\s+pelo|\s+de\s+servi[çc]o|\s+de\s+consultoria|\s+da\s+obra|\s+na\s+obra|$)/i,
  )

  if (clienteMatch) {
    const rawNome = clienteMatch[1].trim()
    // Limpa stopwords caso tenha capturado algo espúrio
    const nomeLimpo = rawNome
      .replace(/^(o|a|cliente|sr|sra)\s+/i, '')
      .split(/\s+(?:referente|sobre|pela|pelo|da\s+obra|na\s+obra)\b/i)[0]
      .trim()

    if (nomeLimpo.length >= 2) {
      // Capitaliza primeira letra de cada palavra
      clienteNome = nomeLimpo
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
  }

  if (!clienteNome) return null

  // 3. Extrai descrição opcional
  // Exemplos: "referente à consultoria de hoje", "referente a pintura", "sobre a reforma"
  let descricao: string | undefined
  const descMatch = clean.match(
    /(?:referente\s+[aà]\s+|referente\s+ao\s+|referente\s+|sobre\s+a\s+|sobre\s+o\s+|sobre\s+|pela\s+|pelo\s+)(.+)$/i,
  )
  if (descMatch) {
    descricao = descMatch[1].trim()
    descricao = descricao.charAt(0).toUpperCase() + descricao.slice(1)
  }

  return {
    clienteNome,
    valor,
    descricao,
    rawText: text,
  }
}

/**
 * Formata um valor numérico para o padrão de moeda pt-BR (R$ 350,00)
 */
export function formatarValorBrl(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val)
}
