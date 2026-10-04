/**
 * src/lib/resumoSemanalEngine.ts
 * Motor determinístico para geração do "Resumo da Semana" e Alertas de Padrão (Estilo Meu Assessor).
 *
 * Características:
 * 1. Resumo Semanal em áudio (TTS) sob demanda ("como foi minha semana?", "resumo da semana"):
 *    - Obras ativas
 *    - Gastos da semana vs. semana anterior
 *    - Orçamentos enviados
 *    - A receber vencendo
 *    - Materiais em falta
 * 2. Alertas de padrão (proativo simples):
 *    - Quando um gasto foge do padrão da categoria
 *    - Quando estoque de material cai abaixo do mínimo
 *    - Tom de mestre de obras parceiro (sem bronca, acolhedor e construtivo).
 */

import { FinanceiroLancamento, Obra, Orcamento, MaterialEstoque } from '@/types/database'

export interface ResumoSemanalData {
  obrasAtivasCount: number
  obrasNomes: string[]
  gastosEstaSemana: number
  gastosSemanaAnterior: number
  diferencaGastosPct: number
  orcamentosEnviadosCount: number
  aReceberVencendoTotal: number
  materiaisFaltaNomes: string[]
  textoFormatado: string
  ttsTexto: string
}

export function gerarResumoSemana(
  obras: Obra[],
  financeiro: FinanceiroLancamento[],
  orcamentos: Orcamento[],
  materiais: MaterialEstoque[],
  isOperador = false,
): ResumoSemanalData {
  const agora = new Date()
  const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  const quatorzeDiasAtras = new Date(agora.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Obras ativas
  const ativas = obras.filter((o) => o.status === 'em_andamento')
  const obrasNomes = ativas.map((o) => o.titulo)

  // Gastos da semana atual vs. semana anterior
  let gastosEstaSemana = 0
  let gastosSemanaAnterior = 0

  for (const l of financeiro) {
    if (l.tipo === 'saida') {
      const dt = new Date(l.data)
      if (dt >= seteDiasAtras && dt <= agora) {
        gastosEstaSemana += l.valor
      } else if (dt >= quatorzeDiasAtras && dt < seteDiasAtras) {
        gastosSemanaAnterior += l.valor
      }
    }
  }

  let diferencaGastosPct = 0
  if (gastosSemanaAnterior > 0) {
    diferencaGastosPct = Math.round(
      ((gastosEstaSemana - gastosSemanaAnterior) / gastosSemanaAnterior) * 100,
    )
  }

  // Orçamentos enviados ou aprovados nos últimos 7 dias
  const orcsRecentes = orcamentos.filter((orc) => {
    if (!orc.created) return false
    const dt = new Date(orc.created)
    return dt >= seteDiasAtras && (orc.status === 'enviado' || orc.status === 'aprovado')
  })

  // A receber vencendo nos próximos 7 dias
  let aReceberVencendoTotal = 0
  if (!isOperador) {
    const proximosSeteDias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000)
    for (const l of financeiro) {
      if (l.tipo === 'entrada' && l.status !== 'pago') {
        const dt = new Date(l.data)
        if (dt <= proximosSeteDias) {
          aReceberVencendoTotal += l.valor
        }
      }
    }
  }

  // Materiais em falta
  const materiaisFalta = materiais.filter(
    (m) => m.estoque_minimo !== undefined && m.quantidade <= m.estoque_minimo,
  )
  const materiaisFaltaNomes = materiaisFalta.map((m) => m.nome)

  // Montagem amigável de texto estilo Meu Assessor / Mestre parceiro
  const partes: string[] = []
  partes.push('Aqui está o resumo da sua semana na obra, mestre:')

  if (ativas.length > 0) {
    partes.push(
      `• Obras em andamento: ${ativas.length} (${obrasNomes.slice(0, 3).join(', ')}${ativas.length > 3 ? '...' : ''}).`,
    )
  } else {
    partes.push('• Nenhuma obra em andamento no momento.')
  }

  if (!isOperador) {
    if (gastosEstaSemana > 0) {
      let comparacao = ''
      if (gastosSemanaAnterior > 0) {
        if (diferencaGastosPct > 0) {
          comparacao = ` (${diferencaGastosPct}% acima da semana anterior)`
        } else if (diferencaGastosPct < 0) {
          comparacao = ` (${Math.abs(diferencaGastosPct)}% abaixo da semana anterior)`
        } else {
          comparacao = ' (igual à semana anterior)'
        }
      }
      partes.push(`• Gastos dos últimos 7 dias: R$ ${gastosEstaSemana.toFixed(2)}${comparacao}.`)
    } else {
      partes.push('• Gastos dos últimos 7 dias: nenhum lançamento de saída.')
    }

    if (aReceberVencendoTotal > 0) {
      partes.push(`• A receber nos próximos dias: R$ ${aReceberVencendoTotal.toFixed(2)}.`)
    }
  }

  if (orcsRecentes.length > 0) {
    partes.push(`• Orçamentos enviados ou aprovados: ${orcsRecentes.length} orçamentos.`)
  }

  if (materiaisFaltaNomes.length > 0) {
    partes.push(`• Materiais no estoque mínimo: ${materiaisFaltaNomes.slice(0, 3).join(', ')}.`)
  } else {
    partes.push('• Estoque de materiais sob controle, sem itens abaixo do mínimo.')
  }

  const textoFormatado = partes.join('\n')
  const ttsTexto = partes.join(' ')

  return {
    obrasAtivasCount: ativas.length,
    obrasNomes,
    gastosEstaSemana,
    gastosSemanaAnterior,
    diferencaGastosPct,
    orcamentosEnviadosCount: orcsRecentes.length,
    aReceberVencendoTotal,
    materiaisFaltaNomes,
    textoFormatado,
    ttsTexto,
  }
}

/**
 * Alerta parceiro de padrão de gastos:
 * Se um gasto for 50% maior que a média da categoria nas últimas semanas,
 * comenta de forma parceira sem tom de bronca.
 */
export function verificarAlertaPadraoGasto(
  categoria: string,
  novoValor: number,
  historicoFinanceiro: FinanceiroLancamento[],
): string | null {
  const gastosMesmaCat = historicoFinanceiro.filter(
    (l) => l.tipo === 'saida' && l.categoria === categoria && l.valor > 0,
  )

  if (gastosMesmaCat.length < 3) return null

  const soma = gastosMesmaCat.reduce((acc, curr) => acc + curr.valor, 0)
  const media = soma / gastosMesmaCat.length

  if (novoValor > media * 1.5 && novoValor - media >= 100) {
    return `Observação de parceiro: esse gasto de R$ ${novoValor.toFixed(2)} com ${categoria} ficou bem acima da média costumeira de R$ ${media.toFixed(2)}. Vale conferir nota ou cotação, beleza?`
  }

  return null
}
