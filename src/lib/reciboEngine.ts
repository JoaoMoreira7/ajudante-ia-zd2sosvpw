/**
 * src/lib/reciboEngine.ts
 * Motor determinístico de Recibos de Registro (Estilo Meu Assessor adaptado à obra).
 *
 * Características centrais:
 * 1. Cada registro na conversa (material, gasto, atividade/diário, pagamento/recebimento)
 *    gera um Recibo estruturado com botões [EDITAR] e [DESFAZER] valendo 24 horas.
 * 2. Edição por frase na conversa: o usuário diz "o valor é 92", "a quantidade é 40",
 *    "a obra é Reforma Centro" e o recibo volta reescrito mostrando o que era → o que passou a ser,
 *    sem abrir tela de edição.
 * 3. Integração com o Desfazer local instantâneo (<50ms).
 */

export type TipoRecibo =
  | 'material'
  | 'gasto'
  | 'atividade'
  | 'pagamento'
  | 'recebimento'
  | 'parcelamento'
  | 'foto'

export interface ReciboItem {
  id: string
  tipo: TipoRecibo
  entidade:
    | 'materiais_estoque'
    | 'financeiro'
    | 'diario_obra'
    | 'obras'
    | 'configuracoes'
    | 'documentos'
  entidadeId: string
  titulo: string
  descricao: string
  valor?: number
  quantidade?: number
  unidade?: string
  categoria?: string
  obraNome?: string
  obraId?: string
  data: string
  status: string
  timestamp: number // timestamp de criação para checagem da janela de 24h
  alteracaoAnterior?: {
    campo: string
    valorAntes: string | number
    valorDepois: string | number
  }
}

const VINTE_QUATRO_HORAS_MS = 24 * 60 * 60 * 1000

/**
 * Verifica se o recibo ainda está dentro da janela de 24 horas para edição/desfazer
 */
export function isReciboValido24h(recibo: ReciboItem): boolean {
  if (!recibo || !recibo.timestamp) return false
  return Date.now() - recibo.timestamp <= VINTE_QUATRO_HORAS_MS
}

/**
 * Tenta interpretar se uma frase do usuário é um pedido de edição rápida do último recibo.
 * Exemplos:
 * - "o valor é 92" / "valor 92" / "muda o valor para 150" / "o preço é 92"
 * - "a quantidade é 40" / "são 50 sacos" / "muda pra 30"
 * - "a data é ontem" / "foi ontem" / "data 10/05"
 * - "a categoria é combustível" / "categoria areia"
 * - "a descrição é cimento para o muro"
 */
export interface EdicaoReciboDetectada {
  campo: 'valor' | 'quantidade' | 'categoria' | 'descricao' | 'data'
  novoValor: string | number
  descricaoHumana: string
}

export function parseEdicaoFraseRecibo(
  frase: string,
  ultimoRecibo: ReciboItem | null,
): EdicaoReciboDetectada | null {
  if (!ultimoRecibo || !isReciboValido24h(ultimoRecibo)) {
    return null
  }

  const clean = frase.toLowerCase().trim()

  // 1. Edição de VALOR ("o valor é 92", "muda o valor para 92,50", "valor 92", "o preço é 92", "era 92")
  const matchValor = clean.match(
    /(?:o\s+)?(?:valor|preço|preco)\s+(?:é|e|era|pra|para)?\s*(?:r\$\s*)?([0-9.,]+)|(?:muda|troca|corrige|altera)\s+(?:o\s+)?valor\s+(?:pra|para)?\s*(?:r\$\s*)?([0-9.,]+)|(?:não,\s*)?(?:é|são)\s+(?:r\$\s*)?([0-9.,]+)\s*(?:reais)?$/i,
  )
  if (matchValor) {
    const rawNum = matchValor[1] || matchValor[2] || matchValor[3]
    if (rawNum) {
      const num = parseFloat(rawNum.replace('.', '').replace(',', '.'))
      if (!isNaN(num) && num > 0) {
        return {
          campo: 'valor',
          novoValor: num,
          descricaoHumana: `Alterar valor para R$ ${num.toFixed(2)}`,
        }
      }
    }
  }

  // 2. Edição de QUANTIDADE ("a quantidade é 40", "são 40 sacos", "muda pra 40 sacos", "quantidade 30")
  const matchQtd = clean.match(
    /(?:a\s+)?quantidade\s+(?:é|e|era|pra|para)?\s*([0-9.,]+)|(?:muda|troca|corrige)\s+(?:a\s+)?(?:quantidade|qtd)\s+(?:pra|para)?\s*([0-9.,]+)|(?:não,\s*)?(?:são|eram|foram)\s+([0-9.,]+)\s*(?:sacos?|unidades?|un|kg|latas?|m2)?$/i,
  )
  if (matchQtd) {
    const rawNum = matchQtd[1] || matchQtd[2] || matchQtd[3]
    if (rawNum) {
      const num = parseFloat(rawNum.replace(',', '.'))
      if (!isNaN(num) && num > 0) {
        return {
          campo: 'quantidade',
          novoValor: num,
          descricaoHumana: `Alterar quantidade para ${num}`,
        }
      }
    }
  }

  // 3. Edição de CATEGORIA ("a categoria é areia", "muda para areia", "categoria combustível")
  const matchCat = clean.match(
    /(?:a\s+)?categoria\s+(?:é|e|pra|para)?\s*([a-zá-ú\s]+)|(?:muda|troca)\s+(?:a\s+)?categoria\s+(?:pra|para)?\s*([a-zá-ú\s]+)/i,
  )
  if (matchCat) {
    const cat = (matchCat[1] || matchCat[2] || '').trim()
    if (cat) {
      return {
        campo: 'categoria',
        novoValor: cat,
        descricaoHumana: `Alterar categoria para "${cat}"`,
      }
    }
  }

  // 4. Edição de DESCRIÇÃO ("a descrição é X", "o nome é X", "muda a descrição para X")
  const matchDesc = clean.match(
    /(?:a\s+)?descri[çc][ãa]o\s+(?:é|e|pra|para)?\s*(.+)|(?:muda|troca)\s+(?:a\s+)?descri[çc][ãa]o\s+(?:pra|para)?\s*(.+)/i,
  )
  if (matchDesc) {
    const desc = (matchDesc[1] || matchDesc[2] || '').trim()
    if (desc) {
      return {
        campo: 'descricao',
        novoValor: desc,
        descricaoHumana: `Alterar descrição para "${desc}"`,
      }
    }
  }

  return null
}
