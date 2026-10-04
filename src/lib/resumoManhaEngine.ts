/**
 * src/lib/resumoManhaEngine.ts
 * Motor determinístico para o "Resumo da Manhã" (estilo Meu Assessor adaptado à construção civil).
 *
 * Características:
 * 1. Disparado no primeiro acesso do dia pelo app (offline-friendly, sem depender de push).
 * 2. Horário configurável (padrão 6h da manhã).
 * 3. Mensagem única consolidada contendo:
 *    - Tarefas de hoje e vencidas da obra.
 *    - Lembretes agendados para o dia.
 *    - Contas a receber vencendo hoje (apenas para Dono; oculto de Operador).
 *    - Gastos registrados ontem.
 *    - Materiais em alerta de estoque crítico.
 * 4. Botão "Ouvir resumo" em voz alta via Web Speech TTS.
 * 5. Reúsa os motores existentes e cria uma camada diária consistente.
 */

import { TarefaObra, LembreteObra, FinanceiroLancamento, MaterialEstoque } from '@/types/database'

export interface ResumoManhaData {
  dataHojeStr: string
  tarefasHojeEVencidas: TarefaObra[]
  lembretesDoDia: LembreteObra[]
  contasReceberHoje: FinanceiroLancamento[]
  totalContasReceberHoje: number
  gastosOntem: FinanceiroLancamento[]
  totalGastosOntem: number
  materiaisAlerta: MaterialEstoque[]
  textoFormatado: string
  ttsTexto: string
}

export function gerarResumoManha(
  tarefas: TarefaObra[],
  lembretes: LembreteObra[],
  financeiro: FinanceiroLancamento[],
  materiais: MaterialEstoque[],
  isOperador = false,
  dataHoje: Date = new Date(),
): ResumoManhaData {
  const dataHojeStr = dataHoje.toISOString().split('T')[0]
  const ontem = new Date(dataHoje.getTime() - 86400000)
  const ontemStr = ontem.toISOString().split('T')[0]
  const diaSemanaHoje = dataHoje.getDay() // 0-6
  const diaMesHoje = dataHoje.getDate()

  // 1. Tarefas de hoje e vencidas
  const tarefasHojeEVencidas = tarefas.filter((t) => {
    if (t.status !== 'pendente') return false
    if (!t.prazo) return false
    return t.prazo <= dataHojeStr
  })

  // 2. Lembretes do dia (diários, semanais com mesmo dia da semana, mensais com mesmo dia do mês ou uma vez com data)
  const lembretesDoDia = lembretes.filter((l) => {
    if (!l.ativo) return false
    if (l.frequencia === 'diaria') return true
    if (l.frequencia === 'semanal' && l.dia_semana === diaSemanaHoje) return true
    if (l.frequencia === 'mensal' && l.dia_mes === diaMesHoje) return true
    if (l.frequencia === 'uma_vez') return true
    return false
  })

  // 3. Contas a receber vencendo hoje (oculto de Operador)
  let contasReceberHoje: FinanceiroLancamento[] = []
  let totalContasReceberHoje = 0
  if (!isOperador) {
    contasReceberHoje = financeiro.filter((f) => {
      if (f.tipo !== 'entrada' || f.status === 'pago') return false
      const fData = (f.data || '').split('T')[0]
      return fData === dataHojeStr
    })
    totalContasReceberHoje = contasReceberHoje.reduce((acc, f) => acc + f.valor, 0)
  }

  // 4. Gastos de ontem
  let gastosOntem: FinanceiroLancamento[] = []
  let totalGastosOntem = 0
  if (!isOperador) {
    gastosOntem = financeiro.filter((f) => {
      if (f.tipo !== 'saida') return false
      const fData = (f.data || '').split('T')[0]
      return fData === ontemStr
    })
    totalGastosOntem = gastosOntem.reduce((acc, f) => acc + f.valor, 0)
  }

  // 5. Materiais em alerta de estoque
  const materiaisAlerta = materiais.filter((m) => {
    return m.estoque_minimo !== undefined && m.quantidade <= m.estoque_minimo
  })

  // Formatação em estilo WhatsApp humanizado de mestre de obras parceiro
  const partes: string[] = []
  partes.push('☀️ Bom dia, mestre! Aqui está o seu resumo para começar bem o dia na obra:')

  // Tarefas
  if (tarefasHojeEVencidas.length > 0) {
    const vencidas = tarefasHojeEVencidas.filter((t) => t.prazo && t.prazo < dataHojeStr)
    const deHoje = tarefasHojeEVencidas.filter((t) => t.prazo === dataHojeStr)
    const listaTarefas: string[] = []
    if (vencidas.length > 0) {
      listaTarefas.push(
        `${vencidas.length} pendência${vencidas.length > 1 ? 's' : ''} anterior${vencidas.length > 1 ? 'es' : ''} (${vencidas
          .map((t) => t.titulo)
          .slice(0, 2)
          .join(', ')})`,
      )
    }
    if (deHoje.length > 0) {
      listaTarefas.push(
        `${deHoje.length} para hoje (${deHoje
          .map((t) => t.titulo)
          .slice(0, 2)
          .join(', ')})`,
      )
    }
    partes.push(`📋 Tarefas: ${listaTarefas.join(' e ')}.`)
  } else {
    partes.push('📋 Tarefas: nenhuma tarefa pendente para hoje.')
  }

  // Lembretes
  if (lembretesDoDia.length > 0) {
    const titulos = lembretesDoDia.map((l) => `${l.titulo}${l.horario ? ` (${l.horario})` : ''}`)
    partes.push(`⏰ Lembretes do dia: ${titulos.join(', ')}.`)
  }

  // Financeiro
  if (!isOperador) {
    if (totalContasReceberHoje > 0) {
      partes.push(
        `💰 A receber hoje: R$ ${totalContasReceberHoje.toFixed(2)} (${contasReceberHoje.length} pagamento${contasReceberHoje.length > 1 ? 's' : ''}).`,
      )
    }
    if (totalGastosOntem > 0) {
      partes.push(`💸 Gastos de ontem: R$ ${totalGastosOntem.toFixed(2)}.`)
    }
  }

  // Materiais
  if (materiaisAlerta.length > 0) {
    const matsNomes = materiaisAlerta
      .map((m) => m.nome)
      .slice(0, 3)
      .join(', ')
    partes.push(`📦 Estoque em alerta: ${matsNomes}.`)
  }

  partes.push('Ótimo trabalho hoje! Qualquer dúvida ou conta, é só me chamar.')

  const textoFormatado = partes.join('\n\n')
  const ttsTexto = partes.join(' ')

  return {
    dataHojeStr,
    tarefasHojeEVencidas,
    lembretesDoDia,
    contasReceberHoje,
    totalContasReceberHoje,
    gastosOntem,
    totalGastosOntem,
    materiaisAlerta,
    textoFormatado,
    ttsTexto,
  }
}

/**
 * Verifica se hoje deve ser exibido o Resumo da Manhã no primeiro acesso
 */
export function deveExibirResumoManhaHoje(
  ultimoResumoData: string | undefined,
  horaConfigurada = 6,
  agora: Date = new Date(),
): boolean {
  const hojeStr = agora.toISOString().split('T')[0]
  // Se já exibiu hoje, não repete
  if (ultimoResumoData === hojeStr) return false

  // Se já passou da hora configurada (padrão 6h da manhã)
  if (agora.getHours() >= horaConfigurada) {
    return true
  }

  return false
}
