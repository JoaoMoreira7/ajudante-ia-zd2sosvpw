/**
 * src/lib/preferencesEngine.ts
 * Motor determinístico para preferências conversacionais e notas de contexto.
 * Estilo Meu Assessor adaptado ao Ajudante IA.
 *
 * Funcionalidades:
 * 1. "me chama de Zé" -> captura e atualiza o apelido do usuário.
 * 2. Tom da conversa:
 *    - "para de mandar emoji" / "sem emoji" -> tom 'sem_emoji'
 *    - "fala mais curto" / "respostas curtas" -> tom 'curto'
 *    - "fala normal" / "tom padrão" -> tom 'padrao'
 * 3. Notas de contexto:
 *    - "lembra que o portão da obra do João é azul" -> adiciona nota de contexto
 *    - "esquece isso" / "apaga essa nota" -> remove a última nota ou nota relacionada
 *    - "o que você lembra?" / "minhas notas" -> lista as notas guardadas
 */

export interface PreferenciaDetectada {
  tipo: 'apelido' | 'tom' | 'lembrete_adicionar' | 'lembrete_remover' | 'lembrete_consultar'
  valor: any
  mensagemConfirmacao: string
}

export function parsePreferenciaConversa(texto: string): PreferenciaDetectada | null {
  const clean = texto.trim()
  const lower = clean.toLowerCase()

  // 1. "me chama de X" / "pode me chamar de X" / "meu nome é X"
  const matchApelido = clean.match(
    /(?:me\s+chama\s+de|pode\s+me\s+chamar\s+de|me\s+chame\s+de|meu\s+apelido\s+[eé]|chama\s+eu\s+de)\s+([A-Za-zÀ-ÖØ-öø-ÿ0-9_-]+)/i,
  )
  if (matchApelido) {
    const apelido = matchApelido[1].trim()
    return {
      tipo: 'apelido',
      valor: apelido,
      mensagemConfirmacao: `Combinado! A partir de agora vou te chamar de ${apelido}, mestre.`,
    }
  }

  // 2. Tom de conversa:
  // "para de mandar emoji" / "sem emoji" / "tira os emojis"
  if (
    /\b(para\s+de\s+mandar\s+emoji|sem\s+emoji|sem\s+emojis|tira\s+os\s+emojis|sem\s+figurinhas?)\b/i.test(
      lower,
    )
  ) {
    return {
      tipo: 'tom',
      valor: 'sem_emoji',
      mensagemConfirmacao: 'Beleza! A partir de agora minhas respostas não terão emojis.',
    }
  }

  // "fala mais curto" / "fala curto" / "respostas mais curtas" / "seja mais breve"
  if (
    /\b(fala\s+mais\s+curto|fala\s+curto|respostas?\s+curtas?|seja\s+mais\s+breve|fale\s+pouco|direto\s+ao\s+ponto)\b/i.test(
      lower,
    )
  ) {
    return {
      tipo: 'tom',
      valor: 'curto',
      mensagemConfirmacao: 'Entendido. Serei bem direto e curto nas respostas.',
    }
  }

  // "fala normal" / "tom padrão"
  if (/\b(fala\s+normal|tom\s+padr[ãa]o|volta\s+ao\s+normal)\b/i.test(lower)) {
    return {
      tipo: 'tom',
      valor: 'padrao',
      mensagemConfirmacao: 'Perfeito, voltei ao modo normal de conversa!',
    }
  }

  // 3. Notas de contexto:
  // "lembra que..." / "anota aí que..." / "guarda que..."
  const matchLembra = clean.match(
    /(?:lembra\s+que|anota\s+(?:a[íi]\s+)?que|guarda\s+que|n[ãa]o\s+esquece\s+que)\s+(.+)/i,
  )
  if (matchLembra) {
    const notaTexto = matchLembra[1].trim()
    if (notaTexto.length >= 3) {
      return {
        tipo: 'lembrete_adicionar',
        valor: notaTexto,
        mensagemConfirmacao: `Guardei na memória: "${notaTexto}".`,
      }
    }
  }

  // "esquece isso" / "apaga isso" / "esquece a última nota"
  if (
    /\b(esquece\s+isso|esquece\s+essa\s+nota|apaga\s+essa\s+nota|apaga\s+o\s+lembrete|esquece\s+o\s+lembrete)\b/i.test(
      lower,
    )
  ) {
    return {
      tipo: 'lembrete_remover',
      valor: null,
      mensagemConfirmacao: 'Pronto, esqueci a última anotação!',
    }
  }

  // "o que você lembra?" / "minhas anotações" / "ver notas"
  if (
    /\b(o\s+que\s+voc[êe]\s+lembra|quais\s+s[ãa]o\s+minhas\s+notas|minhas\s+anota[çc][õo]es|ver\s+lembretes|ver\s+notas)\b/i.test(
      lower,
    )
  ) {
    return {
      tipo: 'lembrete_consultar',
      valor: null,
      mensagemConfirmacao: '',
    }
  }

  return null
}

/**
 * Ajusta uma resposta de texto de acordo com as preferências ativas
 */
export function aplicarPreferenciaAoTexto(
  texto: string,
  apelido?: string,
  tom?: 'padrao' | 'curto' | 'sem_emoji',
): string {
  let resultado = texto

  // Se o usuário pediu sem emojis, remove emojis comuns de unicode
  if (tom === 'sem_emoji') {
    resultado = resultado.replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/gu,
      '',
    )
    resultado = resultado.replace(/\s{2,}/g, ' ').trim()
  }

  // Se o tom for curto, encurta se for muito longo
  if (tom === 'curto' && resultado.length > 150) {
    const frases = resultado.split(/(?<=[.!?])\s+/)
    if (frases.length > 2) {
      resultado = frases.slice(0, 2).join(' ')
    }
  }

  // Se tiver apelido e texto contiver vocativo genérico "mestre", pode personalizar suavemente
  if (apelido && resultado.includes('mestre')) {
    // Substitui pontualmente para soar natural
    resultado = resultado.replace(/\bmestre\b/i, apelido)
  }

  return resultado
}
