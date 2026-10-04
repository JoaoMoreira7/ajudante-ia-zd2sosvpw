/**
 * src/lib/recorrenciasEngine.ts
 * Motor determinístico para Parcelamentos e Recorrências financeiras no Ajudante IA.
 *
 * REGRAS INVIOLÁVEIS:
 * - A IA NUNCA calcula nem inventa número: o motor determinístico calcula total,
 *   valor de parcelas e datas de vencimento com exatidão matemática.
 * - Formas suportadas:
 *   1. "comprei material em 3x de 500" -> 3 parcelas de R$ 500, total R$ 1.500, datas mensais sequenciais.
 *   2. "comprei betoneira por 1500 em 3 vezes" -> 3 parcelas de R$ 500 (1500 / 3).
 *   3. "aluguel da betoneira é 200 todo mês" / "200 mensais dia 10" -> lançamento recorrente com dia fixo.
 */

export interface ParcelaCalculada {
  numero: number
  valor: number
  dataVencimento: string
  descricao: string
}

export interface PlanoParcelamento {
  totalParcelas: number
  valorParcela: number
  valorTotal: number
  categoria: string
  descricaoBase: string
  parcelas: ParcelaCalculada[]
}

export interface RecorrenciaCalculada {
  valor: number
  diaVencimento: number
  categoria: string
  descricao: string
  proximaData: string
}

/**
 * Gera datas mensais sequenciais respeitando dias válidos (ex: dia 31 vira 28/29 em fevereiro)
 */
export function somarMesesData(dataBase: Date, mesesASomar: number, diaFixo?: number): string {
  const d = new Date(dataBase.getTime())
  const diaAlvo = diaFixo || d.getDate()
  const novoMes = d.getMonth() + mesesASomar
  d.setMonth(novoMes)

  // Ajusta se o mês não tiver tantos dias
  d.setDate(diaAlvo)
  if (d.getMonth() !== ((novoMes % 12) + 12) % 12) {
    // Ultrapassou o fim do mês, volta pro último dia do mês
    d.setDate(0)
  }

  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/**
 * Cria parcelamento determinístico
 */
export function calcularParcelamento(
  totalParcelas: number,
  valorPorParcela?: number,
  valorTotalGeral?: number,
  descricaoBase = 'Compra parcelada',
  categoria = 'outros',
  dataInicio?: Date,
): PlanoParcelamento {
  const parcelasCount = Math.max(1, Math.min(60, Math.round(totalParcelas)))
  const dataBase = dataInicio || new Date()

  let vParcela = 0
  let vTotal = 0

  if (valorPorParcela !== undefined && valorPorParcela > 0) {
    vParcela = valorPorParcela
    vTotal = Math.round(vParcela * parcelasCount * 100) / 100
  } else if (valorTotalGeral !== undefined && valorTotalGeral > 0) {
    vTotal = valorTotalGeral
    vParcela = Math.round((vTotal / parcelasCount) * 100) / 100
  }

  const parcelas: ParcelaCalculada[] = []
  for (let i = 1; i <= parcelasCount; i++) {
    // Primeira parcela hoje ou no próximo mês conforme convenção
    const dataVenc = somarMesesData(dataBase, i - 1)
    parcelas.push({
      numero: i,
      valor: vParcela,
      dataVencimento: dataVenc,
      descricao: `${descricaoBase} (${i}/${parcelasCount})`,
    })
  }

  return {
    totalParcelas: parcelasCount,
    valorParcela: vParcela,
    valorTotal: vTotal,
    categoria,
    descricaoBase,
    parcelas,
  }
}

/**
 * Detecta intenção de parcelas ou recorrência por texto
 */
export function parseParcelamentoOuRecorrencia(texto: string): {
  tipo: 'parcelamento' | 'recorrente'
  params: any
} | null {
  const clean = texto.toLowerCase().trim()

  // 1. "3x de 500" / "em 3 vezes de 500" / "3 parcelas de 120"
  const matchNxValor = clean.match(
    /(?:em\s+)?(\d+)\s*(?:x|vezes|parcelas)\s*(?:de\s+)?(?:r\$\s*)?([0-9.,]+)(?:\s+(?:de|com|para)\s+(.+))?/i,
  )
  if (matchNxValor) {
    const numParcelas = parseInt(matchNxValor[1], 10)
    const valorParcela = parseFloat(matchNxValor[2].replace('.', '').replace(',', '.'))
    const itemDesc = (matchNxValor[3] || 'material').trim()
    if (numParcelas > 1 && valorParcela > 0) {
      return {
        tipo: 'parcelamento',
        params: {
          numParcelas,
          valorParcela,
          descricao: itemDesc,
        },
      }
    }
  }

  // 2. "1500 em 3 vezes" / "2000 em 4x"
  const matchTotalNx = clean.match(
    /(?:valor\s+de\s+)?(?:r\$\s*)?([0-9.,]+)\s*(?:reais)?\s+em\s+(\d+)\s*(?:x|vezes|parcelas)(?:\s+(?:de|com|para)\s+(.+))?/i,
  )
  if (matchTotalNx) {
    const valorTotal = parseFloat(matchTotalNx[1].replace('.', '').replace(',', '.'))
    const numParcelas = parseInt(matchTotalNx[2], 10)
    const itemDesc = (matchTotalNx[3] || 'material').trim()
    if (numParcelas > 1 && valorTotal > 0) {
      return {
        tipo: 'parcelamento',
        params: {
          numParcelas,
          valorTotal,
          descricao: itemDesc,
        },
      }
    }
  }

  // 3. Recorrência: "aluguel da betoneira é 200 todo mês" / "200 mensais" / "todo dia 10"
  if (
    clean.includes('todo mês') ||
    clean.includes('todo mes') ||
    clean.includes('mensal') ||
    clean.includes('por mês') ||
    clean.includes('por mes')
  ) {
    const matchValor = clean.match(/(?:r\$\s*)?([0-9.,]+)\s*(?:reais)?/i)
    const matchDia = clean.match(/(?:dia|todo\s+dia)\s+(\d{1,2})/i)

    const valor = matchValor ? parseFloat(matchValor[1].replace('.', '').replace(',', '.')) : 0
    const dia = matchDia ? parseInt(matchDia[1], 10) : new Date().getDate()

    let desc = 'Gasto recorrente'
    if (clean.includes('aluguel')) desc = 'Aluguel'
    else if (clean.includes('betoneira')) desc = 'Aluguel de betoneira'
    else if (clean.includes('ajudante')) desc = 'Pagamento de ajudante'
    else if (clean.includes('energia') || clean.includes('luz')) desc = 'Conta de energia'
    else if (clean.includes('água') || clean.includes('agua')) desc = 'Conta de água'

    if (valor > 0) {
      return {
        tipo: 'recorrente',
        params: {
          valor,
          diaVencimento: dia,
          descricao: desc,
        },
      }
    }
  }

  return null
}
