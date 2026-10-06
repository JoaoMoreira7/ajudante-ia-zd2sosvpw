/**
 * src/lib/cobrancaPixEngine.ts
 * Motor determinístico para interpretação de cobranças Pix por voz e gestão de cobranças Asaas.
 *
 * Padrão de frases faladas de criação:
 * - "cria uma cobrança de 350 pro João"
 * - "cobra 350 do João"
 * - "cria uma cobrança Pix de R$ 350 para o cliente João referente à consultoria de hoje"
 * - "faz uma cobrança de 250 pra obra do José"
 * - "gerar cobrança de 500 para Maria"
 * - "manda um pix de 1200 pro Carlos referente a pintura"
 *
 * Padrão de frases de consulta:
 * - "quais cobranças pendentes?"
 * - "quais as cobranças pendentes?"
 * - "cobranças pendentes"
 * - "listar cobranças pix"
 * - "tem cobrança pendente?"
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
  owner_id?: string
  cliente_id?: string
  financeiro_id?: string
  asaas_payment_id?: string
  asaas_customer_id?: string
  cliente_nome: string
  valor: number
  descricao?: string
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'CANCELLED'
  pix_copia_e_cola?: string
  pix_qr_code_base64?: string
  pix_expiracao?: string
  invoice_url?: string
  pago_em?: string
  criado_por_nome?: string
  vencimento?: string
  timestamp: number
  created?: string
}

/**
 * Verifica se a frase é uma consulta de cobranças pendentes
 */
export function isConsultaCobrancasPendentes(text: string): boolean {
  if (!text) return false
  const clean = text.toLowerCase().trim()
  return /\b(quais\s+(?:as\s+)?cobran[çc]as\s+pendentes|cobran[çc]as\s+pendentes|listar\s+cobran[çc]as|ver\s+cobran[çc]as|quais\s+cobran[çc]as\s+est[ãa]o\s+abertas|tem\s+cobran[çc]a\s+pendente|tem\s+cobran[çc]as\s+pendentes|cobran[çc]as\s+pix\s+pendentes|cobrancas\s+pendentes)\b/i.test(
    clean,
  )
}

/**
 * Tenta extrair a intenção de cobrança Pix de uma frase falada/digitada
 */
export function parseCobrancaPix(text: string): IntencaoCobrancaPix | null {
  if (!text) return null
  const clean = text.toLowerCase().trim()

  // Deve conter indício de cobrança
  const ehCobranca =
    /\b(cria(?:r)?\s+(?:uma\s+)?cobran[çc]a|cobra(?:r)?\b|gera(?:r)?\s+(?:uma\s+)?cobran[çc]a|faz(?:er)?\s+(?:uma\s+)?cobran[çc]a|lan[çc]a(?:r)?\s+cobran[çc]a|manda(?:r)?\s+(?:um\s+)?pix|pix\s+de\s+[0-9.,]+)/i.test(
      clean,
    )

  if (!ehCobranca) return null

  // 1. Extrai o valor
  // Exemplos: "350", "350,00", "r$ 350", "350 reais", "R$ 1.250,50"
  let valor = 0

  // 1.1 Procura padrão específico com verbo/palavra-chave: "cobrança de X", "cobrança pix de X", "cobra X", "pix de X", "faz uma cobrança de X"
  const valorEspecificoMatch = clean.match(
    /(?:cobran[çc]a\s+(?:pix\s+)?de\s+|cobra\s+|cobrar\s+|pix\s+de\s+)(?:r\$\s*)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)/i,
  )

  const valorGeralMatch = clean.match(
    /(?:r\$\s*|de\s+r\$\s*|de\s+)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)\s*(?:reais)?/i,
  )

  const numStr = valorEspecificoMatch
    ? valorEspecificoMatch[1]
    : valorGeralMatch
      ? valorGeralMatch[1]
      : ''
  if (numStr) {
    const limpo = numStr.replace(/\./g, '').replace(',', '.')
    const parsedVal = parseFloat(limpo)
    if (!isNaN(parsedVal) && parsedVal > 0) {
      valor = parsedVal
    }
  }

  if (valor <= 0) return null

  // 2. Extrai o nome do cliente / destinatário
  // Exemplos: "pro João", "para o cliente João", "do João", "pra Maria", "para Carlos", "pra obra do José", "para a obra do José"
  let clienteNome = ''
  const clienteMatch = clean.match(
    /(?:para\s+o\s+cliente|pro\s+cliente|pra\s+cliente|para\s+a\s+cliente|pro\s+obra\s+do|pra\s+obra\s+do|pra\s+obra\s+da|para\s+a\s+obra\s+do|para\s+a\s+obra\s+da|pra\s+obra\s+de|para\s+a\s+obra\s+de|pra\s+obra|para\s+obra|pro|pra|para|do\s+cliente|da\s+cliente|do|da|ao|à)\s+([a-zá-ú0-9\s]+?)(?:\s+referente|\s+sobre|\s+pela|\s+pelo|\s+de\s+servi[çc]o|\s+de\s+consultoria|\s+da\s+obra|\s+na\s+obra|$)/i,
  )

  if (clienteMatch) {
    const rawNome = clienteMatch[1].trim()
    // Limpa stopwords caso tenha capturado algo espúrio
    const nomeLimpo = rawNome
      .replace(/^(o|a|cliente|sr|sra|obra\s+do|obra\s+da|obra\s+de|obra)\s+/i, '')
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
  }).format(val || 0)
}

/**
 * Retorna se um recibo/cobrança foi gerado nas últimas 24 horas (válido para desfazer)
 */
export function isCobrancaValida24h(timestamp: number): boolean {
  if (!timestamp) return false
  const agora = Date.now()
  const vinteQuatroHorasMs = 24 * 60 * 60 * 1000
  return agora - timestamp <= vinteQuatroHorasMs
}
