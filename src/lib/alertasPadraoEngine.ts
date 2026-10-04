/**
 * src/lib/alertasPadraoEngine.ts
 * Motor determinístico para Alertas de Padrão Ampliado (estilo Meu Assessor adaptado à obra).
 *
 * Características:
 * 1. Detecção proativa sem bronca:
 *    - Mesmo gasto/valor registrado duas vezes no mesmo dia ("Aviso amigável: a mesma compra de R$ 120 entrou duas vezes hoje. Confere se não foi duplicada?").
 *    - Conta recorrente que não foi lançada no dia de sempre ("Aviso amigável: o aluguel da betoneira costuma cair dia 10 e ainda não foi registrado este mês").
 *    - Gasto fora da média histórica.
 */

import { FinanceiroLancamento } from '@/types/database'

export interface AlertaPadraoItem {
  tipo: 'duplicidade_mesmo_dia' | 'recorrente_nao_lancada' | 'fora_da_media'
  mensagem: string
  detalhes?: {
    valor?: number
    categoria?: string
    descricao?: string
    data?: string
  }
}

/**
 * Verifica se um novo gasto tem risco de duplicidade com outro registrado no mesmo dia
 */
export function verificarDuplicidadeGastoMesmoDia(
  novoValor: number,
  novaCategoria: string,
  novaDescricao: string,
  historicoFinanceiro: FinanceiroLancamento[],
  dataHojeStr: string = new Date().toISOString().split('T')[0],
): AlertaPadraoItem | null {
  if (novoValor <= 0) return null

  // Filtra lançamentos de saída do mesmo dia com valor exatamente igual
  const duplicados = historicoFinanceiro.filter((f) => {
    if (f.tipo !== 'saida') return false
    const fData = (f.data || '').split('T')[0]
    return fData === dataHojeStr && Math.abs(f.valor - novoValor) < 0.01
  })

  if (duplicados.length > 0) {
    const descExistente = duplicados[0].descricao || novaCategoria
    return {
      tipo: 'duplicidade_mesmo_dia',
      mensagem: `Observação amigável: já existe um lançamento hoje no mesmo valor de R$ ${novoValor.toFixed(2)} (${descExistente}). Confere se a mesma compra não entrou duas vezes por engano, beleza?`,
      detalhes: {
        valor: novoValor,
        categoria: novaCategoria,
        descricao: novaDescricao,
        data: dataHojeStr,
      },
    }
  }

  return null
}

/**
 * Verifica contas recorrentes cadastradas que já passaram do dia habitual no mês e não foram lançadas
 */
export function verificarRecorrenciasNaoLancadas(
  historicoFinanceiro: FinanceiroLancamento[],
  dataReferencia: Date = new Date(),
): AlertaPadraoItem[] {
  const diaHoje = dataReferencia.getDate()
  const anoAtual = dataReferencia.getFullYear()
  const mesAtual = dataReferencia.getMonth()

  // Agrupa lançamentos recorrentes cadastrados
  const recorrentes = historicoFinanceiro.filter((f) => f.recorrente && f.dia_vencimento)
  const alertas: AlertaPadraoItem[] = []

  // Agrupa por descrição base
  const vistas = new Set<string>()

  for (const rec of recorrentes) {
    const chave = rec.descricao.toLowerCase().trim()
    if (vistas.has(chave)) continue
    vistas.add(chave)

    const diaVenc = rec.dia_vencimento || 10

    // Se já passou do dia de vencimento no mês atual
    if (diaHoje > diaVenc) {
      // Verifica se existe lançamento dessa despesa no mês corrente
      const jaLancadoNoMes = historicoFinanceiro.some((f) => {
        if (f.tipo !== 'saida') return false
        const d = new Date(f.data)
        const mesmoMes = d.getFullYear() === anoAtual && d.getMonth() === mesAtual
        const mesmaDesc =
          f.descricao.toLowerCase().includes(chave) || chave.includes(f.descricao.toLowerCase())
        return mesmoMes && mesmaDesc
      })

      if (!jaLancadoNoMes) {
        alertas.push({
          tipo: 'recorrente_nao_lancada',
          mensagem: `Aviso parceiro: o lançamento recorrente de "${rec.descricao}" (dia ${diaVenc}, R$ ${rec.valor.toFixed(2)}) ainda não caiu neste mês. Vale conferir se o pagamento foi feito!`,
          detalhes: {
            valor: rec.valor,
            descricao: rec.descricao,
            categoria: rec.categoria,
          },
        })
      }
    }
  }

  return alertas
}
