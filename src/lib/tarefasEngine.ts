/**
 * src/lib/tarefasEngine.ts
 * Motor determinístico para transformar "recados soltos em tarefas" na obra (estilo Meu Assessor).
 *
 * REGRAS INVIOLÁVEIS:
 * - A IA nunca calcula nem deduz prazos inconsistentes: o motor determinístico extrai dia da semana
 *   (sexta, quinta, amanhã, dia 15), prioridade (urgente/alta/media/baixa) e gera datas ISO reais.
 * - Fila ordenada: 1º tarefas vencidas (prazo < hoje), 2º por prazo mais próximo, 3º sem prazo por criação.
 * - Comandos suportados:
 *   - "pedir pro eletricista chegar sexta" -> Tarefa "Pedir pro eletricista chegar", prazo sexta-feira
 *   - "lembra de comprar tela pra janela até quinta" -> Tarefa "Comprar tela pra janela", prazo quinta-feira
 *   - "quais as tarefas?" / "minhas tarefas" -> Lista fila ordenada
 *   - "marca a tarefa do eletricista como feita" / "conclui a tarefa X" -> baixa determinística
 */

import { TarefaObra } from '@/types/database'

export interface ExtracaoTarefa {
  titulo: string
  prazo?: string // yyyy-mm-dd
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  termoBuscaBaixa?: string
}

/**
 * Calcula a próxima data correspondente ao dia da semana falado (0 = domingo, 1 = segunda, ..., 6 = sábado)
 */
export function calcularDataProximoDiaSemana(diaAlvo: number, dataBase: Date = new Date()): string {
  const d = new Date(dataBase.getTime())
  const diaAtual = d.getDay()
  let diferenca = diaAlvo - diaAtual
  if (diferenca <= 0) {
    diferenca += 7
  }
  d.setDate(d.getDate() + diferenca)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/**
 * Extrai intenção de tarefa de uma frase solta
 */
export function extrairTarefaDeFrase(
  texto: string,
  dataBase: Date = new Date(),
): ExtracaoTarefa | null {
  const clean = texto.trim()
  const lower = clean.toLowerCase()

  // Detecta se é pedido para marcar como feita / concluir
  const matchBaixa = lower.match(
    /(?:marca|conclui|finaliza|fecha|dar\s+baixa|deu\s+baixa)\s+(?:a\s+|na\s+)?tarefa\s+(?:de|do|da)?\s*(.+)/i,
  )
  if (matchBaixa) {
    const alvo = matchBaixa[1]
      .replace(/\s*(?:como\s+feita|como\s+concluida|como\s+concluída|pronta).*$/, '')
      .trim()
    return {
      titulo: alvo,
      prioridade: 'media',
      termoBuscaBaixa: alvo,
    }
  }

  // Padrões de "recado vira tarefa":
  // "pedir pro eletricista chegar sexta"
  // "lembra de comprar tela pra janela até quinta"
  // "preciso comprar cimento amanhã"
  // "tem que falar com o gesseiro até segunda"
  // "anota pra mim: comprar pregos"
  // "tarefa: acertar o muro urgente"
  const ehGatilhoTarefa =
    /\b(pedir\s+pro|pedir\s+pra|pedir\s+ao|lembra\s+de\s+|anota\s+pra\s+mim|tem\s+que\s+|preciso\s+|tarefa:?|lembrar\s+de\s+|não\s+esquecer\s+de\s+falar|cobrar\s+o|ligar\s+pro|ligar\s+pra)\b/i.test(
      lower,
    )

  if (!ehGatilhoTarefa) {
    return null
  }

  // 1. Extração de prazo determinístico
  let prazo: string | undefined
  if (lower.includes('hoje')) {
    prazo = dataBase.toISOString().split('T')[0]
  } else if (lower.includes('amanhã') || lower.includes('amanha')) {
    const d = new Date(dataBase.getTime() + 86400000)
    prazo = d.toISOString().split('T')[0]
  } else if (lower.includes('depois de amanhã') || lower.includes('depois de amanha')) {
    const d = new Date(dataBase.getTime() + 2 * 86400000)
    prazo = d.toISOString().split('T')[0]
  } else if (lower.includes('segunda')) {
    prazo = calcularDataProximoDiaSemana(1, dataBase)
  } else if (lower.includes('terça') || lower.includes('terca')) {
    prazo = calcularDataProximoDiaSemana(2, dataBase)
  } else if (lower.includes('quarta')) {
    prazo = calcularDataProximoDiaSemana(3, dataBase)
  } else if (lower.includes('quinta')) {
    prazo = calcularDataProximoDiaSemana(4, dataBase)
  } else if (lower.includes('sexta')) {
    prazo = calcularDataProximoDiaSemana(5, dataBase)
  } else if (lower.includes('sábado') || lower.includes('sabado')) {
    prazo = calcularDataProximoDiaSemana(6, dataBase)
  } else if (lower.includes('domingo')) {
    prazo = calcularDataProximoDiaSemana(0, dataBase)
  } else {
    // Procura por "dia 15", "dia 22/05"
    const matchDia = lower.match(/(?:dia|até\s+o\s+dia)\s+(\d{1,2})(?:\/(\d{1,2}))?/i)
    if (matchDia) {
      const dNum = parseInt(matchDia[1], 10)
      const mNum = matchDia[2] ? parseInt(matchDia[2], 10) - 1 : dataBase.getMonth()
      const d = new Date(dataBase.getFullYear(), mNum, dNum)
      if (d < dataBase && !matchDia[2]) {
        // Se já passou esse dia no mês atual, coloca pro próximo mês
        d.setMonth(d.getMonth() + 1)
      }
      prazo = d.toISOString().split('T')[0]
    }
  }

  // 2. Extração de prioridade
  let prioridade: 'baixa' | 'media' | 'alta' | 'urgente' = 'media'
  if (lower.includes('urgente') || lower.includes('pra ontem') || lower.includes('imediatamente')) {
    prioridade = 'urgente'
  } else if (
    lower.includes('alta prioridade') ||
    lower.includes('importante') ||
    lower.includes('não pode atrasar')
  ) {
    prioridade = 'alta'
  } else if (
    lower.includes('quando der') ||
    lower.includes('sem pressa') ||
    lower.includes('baixa')
  ) {
    prioridade = 'baixa'
  }

  // 3. Limpeza do título (remove os prefixos e sufixos de data/urgência para ficar um título limpo)
  let tituloLimpo = clean
    .replace(
      /^(anota\s+pra\s+mim\s*:?|tarefa\s*:?|lembra\s+de\s+|lembrar\s+de\s+|não\s+esquecer\s+de\s+)/i,
      '',
    )
    .replace(
      /(?:até|ate|pra|para)?\s*(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|hoje|amanhã|amanha|depois de amanhã).*$/i,
      '',
    )
    .replace(/\b(urgente|sem pressa|quando der|importante)\b/gi, '')
    .trim()

  // Capitaliza primeira letra
  if (tituloLimpo.length > 0) {
    tituloLimpo = tituloLimpo.charAt(0).toUpperCase() + tituloLimpo.slice(1)
  } else {
    tituloLimpo = 'Tarefa de obra'
  }

  return {
    titulo: tituloLimpo,
    prazo,
    prioridade,
  }
}

/**
 * Ordena a fila de tarefas:
 * 1. Vencidas primeiro (prazo < hoje)
 * 2. Próximas por prazo ascendente
 * 3. Sem prazo por criação mais recente
 */
export function ordenarFilaTarefas(
  tarefas: TarefaObra[],
  hojeIso: string = new Date().toISOString().split('T')[0],
): TarefaObra[] {
  return [...tarefas].sort((a, b) => {
    // Se uma estiver concluída e outra pendente, pendente vem primeiro
    if (a.status === 'pendente' && b.status !== 'pendente') return -1
    if (a.status !== 'pendente' && b.status === 'pendente') return 1

    const aPrazo = a.prazo || '9999-99-99'
    const bPrazo = b.prazo || '9999-99-99'

    const aVencida = a.prazo ? a.prazo < hojeIso : false
    const bVencida = b.prazo ? b.prazo < hojeIso : false

    if (aVencida && !bVencida) return -1
    if (!aVencida && bVencida) return 1

    // Compara por prazo
    if (aPrazo !== bPrazo) {
      return aPrazo.localeCompare(bPrazo)
    }

    // Prioridade como desempate
    const pesos: Record<string, number> = { urgente: 4, alta: 3, media: 2, baixa: 1 }
    const pA = pesos[a.prioridade] || 2
    const pB = pesos[b.prioridade] || 2
    if (pA !== pB) return pB - pA

    return (b.created || '').localeCompare(a.created || '')
  })
}

/**
 * Identifica uma tarefa correspondente para dar baixa a partir do texto dito pelo usuário
 */
export function identificarTarefaParaBaixa(
  termo: string,
  tarefas: TarefaObra[],
): TarefaObra | null {
  const normTermo = termo.toLowerCase().trim()
  if (!normTermo) return null

  // Filtra apenas pendentes
  const pendentes = tarefas.filter((t) => t.status === 'pendente')

  // Procura match por inclusão exata
  const exata = pendentes.find((t) => t.titulo.toLowerCase().includes(normTermo))
  if (exata) return exata

  // Procura por palavras-chave relevantes
  const palavras = normTermo
    .split(/\s+/)
    .filter((p) => p.length > 2 && !['tarefa', 'para', 'com', 'feita', 'marca'].includes(p))
  for (const t of pendentes) {
    const tLower = t.titulo.toLowerCase()
    const matches = palavras.filter((p) => tLower.includes(p))
    if (matches.length > 0) {
      return t
    }
  }

  return null
}
