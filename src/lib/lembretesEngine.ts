/**
 * src/lib/lembretesEngine.ts
 * Motor determinístico para Lembretes que voltam sozinhos (estilo Meu Assessor).
 *
 * Características:
 * 1. "me lembra de medir o nível todo dia às 6h" -> Frequência diária, horário 06:00
 * 2. "não me deixa esquecer de ligar pro fornecedor amanhã" -> Uma vez, amanhã
 * 3. Frequências: uma_vez, diaria, semanal, mensal
 * 4. Operações locais: criação, listagem ("quais meus lembretes?"), cancelamento ("cancela o lembrete do remédio")
 * 5. Disparo simples e confiável ao abrir o app e/ou cron.
 */

import { LembreteObra } from '@/types/database'

export interface ExtracaoLembrete {
  titulo: string
  horario?: string // "06:00"
  frequencia: 'uma_vez' | 'diaria' | 'semanal' | 'mensal'
  diaSemana?: number // 0-6
  diaMes?: number // 1-31
  termoCancelamento?: string
  isConsulta?: boolean
}

/**
 * Extrai intenção de lembrete
 */
export function parseLembreteRecorrente(texto: string): ExtracaoLembrete | null {
  const clean = texto.trim()
  const lower = clean.toLowerCase()

  // 1. Consulta: "quais meus lembretes?", "ver lembretes", "lembretes ativos"
  if (
    /\b(quais\s+meus\s+lembretes|quais\s+os\s+lembretes|ver\s+lembretes|listar\s+lembretes|meus\s+lembretes)\b/i.test(
      lower,
    )
  ) {
    return {
      titulo: 'Consulta de lembretes',
      frequencia: 'diaria',
      isConsulta: true,
    }
  }

  // 2. Cancelamento: "cancela o lembrete do nível", "apagar lembrete do fornecedor"
  const matchCancela = lower.match(
    /(?:cancela|cancelar|apaga|apagar|remove|remover|desativa|desativar)\s+(?:o\s+)?lembrete\s+(?:de|do|da)?\s*(.+)/i,
  )
  if (matchCancela) {
    const alvo = matchCancela[1].trim()
    return {
      titulo: alvo,
      frequencia: 'uma_vez',
      termoCancelamento: alvo,
    }
  }

  // 3. Criação de lembrete:
  // "me lembra de medir o nível todo dia às 6h"
  // "não me deixa esquecer de ligar pro fornecedor amanhã"
  // "lembrete diário de conferir o estoque"
  const ehGatilho =
    /\b(me\s+lembra\s+de|me\s+lembre\s+de|n[ãa]o\s+me\s+deixa\s+esquecer\s+de|lembrete\s+de|criar\s+lembrete)\b/i.test(
      lower,
    )

  if (!ehGatilho) return null

  // Frequência
  let frequencia: 'uma_vez' | 'diaria' | 'semanal' | 'mensal' = 'uma_vez'
  if (
    lower.includes('todo dia') ||
    lower.includes('todos os dias') ||
    lower.includes('diariamente') ||
    lower.includes('diário')
  ) {
    frequencia = 'diaria'
  } else if (
    lower.includes('toda semana') ||
    lower.includes('semanalmente') ||
    lower.includes('toda segunda') ||
    lower.includes('toda sexta')
  ) {
    frequencia = 'semanal'
  } else if (
    lower.includes('todo mês') ||
    lower.includes('todo mes') ||
    lower.includes('mensalmente')
  ) {
    frequencia = 'mensal'
  }

  // Horário: "às 6h", "às 06:00", "às 7 e meia", "14h"
  let horario = '08:00'
  const matchHora = lower.match(
    /(?:às|as|para\s+as|para\s+às)?\s*(\d{1,2})(?::(\d{2})|h(?:oras?)?|\s*e\s*meia)/i,
  )
  if (matchHora) {
    const h = parseInt(matchHora[1], 10)
    let m = '00'
    if (matchHora[2]) {
      m = matchHora[2]
    } else if (lower.includes('e meia')) {
      m = '30'
    }
    horario = `${String(h).padStart(2, '0')}:${m}`
  }

  // Dia da semana se semanal
  let diaSemana: number | undefined
  if (lower.includes('domingo')) diaSemana = 0
  else if (lower.includes('segunda')) diaSemana = 1
  else if (lower.includes('terça') || lower.includes('terca')) diaSemana = 2
  else if (lower.includes('quarta')) diaSemana = 3
  else if (lower.includes('quinta')) diaSemana = 4
  else if (lower.includes('sexta')) diaSemana = 5
  else if (lower.includes('sábado') || lower.includes('sabado')) diaSemana = 6

  // Dia do mês se mensal
  let diaMes: number | undefined
  const matchDiaMes = lower.match(/(?:todo\s+dia|dia)\s+(\d{1,2})/i)
  if (matchDiaMes) {
    diaMes = parseInt(matchDiaMes[1], 10)
  }

  // Limpa o título do lembrete
  let titulo = clean
    .replace(
      /^(me\s+lembra\s+de|me\s+lembre\s+de|não\s+me\s+deixa\s+esquecer\s+de|lembrete\s+de|criar\s+lembrete\s+de)\s*/i,
      '',
    )
    .replace(/(?:todo\s+dia|todos\s+os\s+dias|toda\s+semana|todo\s+mês).*$/i, '')
    .replace(/(?:às|as)?\s*\d{1,2}(?::\d{2}|h|\s*e\s*meia).*$/i, '')
    .trim()

  if (titulo.length > 0) {
    titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1)
  } else {
    titulo = 'Lembrete de obra'
  }

  return {
    titulo,
    horario,
    frequencia,
    diaSemana,
    diaMes,
  }
}

/**
 * Localiza lembrete para cancelamento
 */
export function identificarLembreteParaCancelamento(
  termo: string,
  lembretes: LembreteObra[],
): LembreteObra | null {
  const norm = termo.toLowerCase().trim()
  const ativos = lembretes.filter((l) => l.ativo)
  const exato = ativos.find((l) => l.titulo.toLowerCase().includes(norm))
  if (exato) return exato

  const palavras = norm
    .split(/\s+/)
    .filter((p) => p.length > 2 && !['lembrete', 'para', 'com', 'todo', 'dia'].includes(p))
  for (const l of ativos) {
    const lLower = l.titulo.toLowerCase()
    if (palavras.some((p) => lLower.includes(p))) {
      return l
    }
  }

  return null
}
