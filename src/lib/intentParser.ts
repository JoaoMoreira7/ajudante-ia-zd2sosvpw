/**
 * INTERPRETADOR LOCAL DETERMINÍSTICO DE INTENÇÕES (FALLBACK E REGRAS PT-BR)
 *
 * Mapeia expressões em português falado para intenções estruturadas e parâmetros,
 * garantindo funcionamento instantâneo mesmo 100% offline ou sem IA.
 */

export interface ParsedIntent {
  intent: string
  confidence: number
  params: Record<string, any>
  rawText: string
  respostaSugerida?: string
  categoriaAcao?:
    | 'calculo'
    | 'financeiro'
    | 'cliente'
    | 'obra'
    | 'orcamento'
    | 'estoque'
    | 'sistema'
  requerConfirmacao?: boolean
}

export function parseLocalIntent(text: string, context?: Record<string, any>): ParsedIntent {
  const clean = text.toLowerCase().trim()

  // 1. DESFAZER / CORRIGIR / CANCELAR
  if (
    /\b(desfaz|desfazer|corrige|corrigir|cancela|cancelar|apaga o último|desfazer último)\b/.test(
      clean,
    )
  ) {
    return {
      intent: 'acao_desfazer',
      confidence: 0.95,
      params: {},
      rawText: text,
      respostaSugerida: 'Deseja desfazer a última ação registrada?',
      categoriaAcao: 'sistema',
      requerConfirmacao: true,
    }
  }

  // 2. DESCONTO DE ABERTURA / PORTA / JANELA NO CONTEXTO EXISTENTE
  // Ex: "Tira a porta de 80 por 210" ou "com porta de 0,80 por 2,10"
  const portaMatch = clean.match(
    /(?:tira|desconta|menos|com)\s+(?:a\s+)?porta\s+(?:de\s+)?([0-9.,]+)\s*(?:m|cm)?\s*(?:x|por|vezes)\s*([0-9.,]+)/,
  )
  if (portaMatch) {
    let pLarg = parseFloat(portaMatch[1].replace(',', '.'))
    let pAlt = parseFloat(portaMatch[2].replace(',', '.'))
    if (pLarg > 10) pLarg = pLarg / 100 // 80cm -> 0.80m
    if (pAlt > 10) pAlt = pAlt / 100 // 210cm -> 2.10m
    return {
      intent: 'descontar_abertura',
      confidence: 0.95,
      params: { largura: pLarg, altura: pAlt, tipo: 'porta' },
      rawText: text,
      categoriaAcao: 'calculo',
    }
  }

  // 3. ACRESCENTA PERDA
  // Ex: "Acrescenta 10% de perda" ou "coloca 10% de margem"
  const perdaMatch = clean.match(/acrescenta[r]?\s+([0-9.,]+)\s*%\s*(?:de\s+)?perda/)
  if (perdaMatch) {
    const pct = parseFloat(perdaMatch[1].replace(',', '.'))
    return {
      intent: 'ajustar_perda',
      confidence: 0.95,
      params: { perdaPct: pct },
      rawText: text,
      categoriaAcao: 'calculo',
    }
  }

  // 4. ÁREA DE PAREDE / SUPERFÍCIE
  // Ex: "Calcula uma parede de 8 por 3" ou "Parede de 10 por 3" ou "Área de 6 x 2,80"
  const paredeMatch = clean.match(
    /(?:parede|sala|quarto|area|área|muro|terreno)\s+(?:de\s+)?([0-9.,]+)\s*(?:m)?\s*(?:x|por|vezes|\*)\s*([0-9.,]+)/,
  )
  if (paredeMatch) {
    const comp = parseFloat(paredeMatch[1].replace(',', '.'))
    const alt = parseFloat(paredeMatch[2].replace(',', '.'))
    return {
      intent: 'calc_area',
      confidence: 0.9,
      params: { comprimento: comp, altura: alt },
      rawText: text,
      categoriaAcao: 'calculo',
    }
  }

  // 5. CÁLCULO DE PISO
  // Ex: "Quanto de piso preciso para 30 metros?" ou "Piso para 20m2"
  const pisoMatch = clean.match(
    /(?:quanto\s+de\s+piso|piso|porcelanato|revestimento)\s+(?:preciso\s+)?(?:para\s+)?([0-9.,]+)\s*(?:m2|metros|m²)?/,
  )
  if (pisoMatch) {
    const area = parseFloat(pisoMatch[1].replace(',', '.'))
    return {
      intent: 'calc_piso',
      confidence: 0.9,
      params: { areaM2: area },
      rawText: text,
      categoriaAcao: 'calculo',
    }
  }

  // 6. CÁLCULO DE BLOCO / ALVENARIA NO CONTEXTO
  // Ex: "Quero colocar bloco" ou "Quanto de bloco?"
  if (/\b(bloco|tijolo|alvenaria)\b/.test(clean)) {
    return {
      intent: 'calc_alvenaria',
      confidence: 0.85,
      params:
        context?.comprimento && context?.altura
          ? { areaM2: context.comprimento * context.altura }
          : {},
      rawText: text,
      categoriaAcao: 'calculo',
    }
  }

  // 7. CÁLCULO DE ARGAMASSA / REBOCO
  // Ex: "E quanto de argamassa?" ou "Calcula reboco"
  if (/\b(argamassa|reboco|emboço)\b/.test(clean)) {
    return {
      intent: 'calc_reboco',
      confidence: 0.85,
      params: context?.areaLiquida
        ? { areaM2: context.areaLiquida }
        : context?.area
          ? { areaM2: context.area }
          : {},
      rawText: text,
      categoriaAcao: 'calculo',
    }
  }

  // 8. CÁLCULO DE CONCRETO
  // Ex: "Concreto para 5 metros cúbicos" ou "Volume de 4 por 5 por 0,10"
  const concMatch = clean.match(
    /(?:concreto|laje|sapata)\s+(?:para\s+)?([0-9.,]+)\s*(?:m3|metros\s+cúbicos|m³)?/,
  )
  if (concMatch) {
    const vol = parseFloat(concMatch[1].replace(',', '.'))
    return {
      intent: 'calc_concreto',
      confidence: 0.9,
      params: { volumeM3: vol },
      rawText: text,
      categoriaAcao: 'calculo',
    }
  }

  // 9. OPERAÇÕES FINANCEIRAS: REGISTRAR SAÍDA
  // Ex: "Ajudante, registra uma saída de 350 reais de material" ou "Gastei 200 reais de cimento"
  const saidaMatch = clean.match(
    /(?:registra\s+(?:uma\s+)?saída|gastei|paguei|despesa|saiu)\s+(?:de\s+)?(?:r\$\s*)?([0-9.,]+)\s*(?:reais)?(?:\s+(?:de|com|em)\s+([a-zá-ú\s]+))?/,
  )
  if (saidaMatch) {
    const valor = parseFloat(saidaMatch[1].replace('.', '').replace(',', '.'))
    const categoriaRaw = (saidaMatch[2] || 'outros').trim()
    let categoria = 'outros'
    if (/cimento/.test(categoriaRaw)) categoria = 'cimento'
    else if (/areia/.test(categoriaRaw)) categoria = 'areia'
    else if (/bloco|tijolo/.test(categoriaRaw)) categoria = 'bloco'
    else if (/combustivel|gasolina/.test(categoriaRaw)) categoria = 'combustivel'
    else if (/ferramenta/.test(categoriaRaw)) categoria = 'ferramenta'
    else if (/almoço|refeição|comida|alimentação/.test(categoriaRaw)) categoria = 'alimentacao'
    else if (/ajudante|diaria|diária/.test(categoriaRaw)) categoria = 'ajudante'
    else if (/transporte|frete/.test(categoriaRaw)) categoria = 'transporte'

    return {
      intent: 'registrar_saida',
      confidence: 0.95,
      params: { valor, categoria, descricao: saidaMatch[2] || 'Despesa registrada por voz' },
      rawText: text,
      respostaSugerida: `Você deseja registrar uma saída de R$ ${valor.toFixed(2)} (${categoria})?`,
      categoriaAcao: 'financeiro',
      requerConfirmacao: true,
    }
  }

  // 10. OPERAÇÕES FINANCEIRAS: REGISTRAR ENTRADA / PAGAMENTO
  // Ex: "Registra o pagamento de 1500 reais" ou "Recebi 500 reais do Carlos"
  const entradaMatch = clean.match(
    /(?:registra\s+(?:o\s+)?pagamento|recebi|entrou|sinal)\s+(?:de\s+)?(?:r\$\s*)?([0-9.,]+)\s*(?:reais)?(?:\s+(?:do|da|de)\s+([a-zá-ú\s]+))?/,
  )
  if (entradaMatch) {
    const valor = parseFloat(entradaMatch[1].replace('.', '').replace(',', '.'))
    const pagador = entradaMatch[2]?.trim() || ''
    return {
      intent: 'registrar_entrada',
      confidence: 0.95,
      params: { valor, descricao: pagador ? `Recebido de ${pagador}` : 'Recebimento de cliente' },
      rawText: text,
      respostaSugerida: `Você deseja registrar um recebimento de R$ ${valor.toFixed(2)}?`,
      categoriaAcao: 'financeiro',
      requerConfirmacao: true,
    }
  }

  // 11. CONSULTA DE SALDO OU FINANCEIRO
  if (
    /\b(quanto falta receber|quanto vou receber|qual meu saldo|quanto tenho de saldo|quanto lucrei)\b/.test(
      clean,
    )
  ) {
    return {
      intent: 'consultar_saldo',
      confidence: 0.9,
      params: {},
      rawText: text,
      categoriaAcao: 'financeiro',
    }
  }

  // 12. ESTOQUE: ADICIONAR OU BAIXAR
  // Ex: "Tenho 15 sacos de cimento"
  const estAddMatch = clean.match(
    /(?:tenho|chegou|comprei|adiciona)\s+([0-9]+)\s+(sacos?|unidades?|kg|litros?)\s+de\s+([a-zá-ú0-9\s]+)/,
  )
  if (estAddMatch) {
    const qtd = parseInt(estAddMatch[1], 10)
    const un = estAddMatch[2].startsWith('saco')
      ? 'saco'
      : estAddMatch[2].startsWith('kg')
        ? 'kg'
        : 'un'
    const mat = estAddMatch[3].trim()
    return {
      intent: 'estoque_adicionar',
      confidence: 0.95,
      params: { quantidade: qtd, unidade: un, material: mat },
      rawText: text,
      categoriaAcao: 'estoque',
    }
  }

  // Ex: "Baixa 5 sacos de cimento"
  const estSubMatch = clean.match(
    /(?:baixa|baixe|usei|gastamos)\s+([0-9]+)\s+(?:sacos?|unidades?|kg)?\s*(?:de\s+)?([a-zá-ú0-9\s]+)/,
  )
  if (estSubMatch) {
    const qtd = parseInt(estSubMatch[1], 10)
    const mat = estSubMatch[2].trim()
    return {
      intent: 'estoque_baixar',
      confidence: 0.95,
      params: { quantidade: qtd, material: mat },
      rawText: text,
      categoriaAcao: 'estoque',
      respostaSugerida: `Confirmar baixa de ${qtd} unidades de ${mat}?`,
      requerConfirmacao: true,
    }
  }

  // Ex: "O que está acabando?"
  if (/\b(o que está acabando|estoque baixo|falta material)\b/.test(clean)) {
    return {
      intent: 'estoque_consultar_acabando',
      confidence: 0.95,
      params: {},
      rawText: text,
      categoriaAcao: 'estoque',
    }
  }

  // Ex: "Faz uma lista de compras"
  if (/\b(lista de compras|lista de material|o que preciso comprar)\b/.test(clean)) {
    return {
      intent: 'estoque_lista_compras',
      confidence: 0.9,
      params: {},
      rawText: text,
      categoriaAcao: 'estoque',
    }
  }

  // 13. OBRAS
  // Ex: "Mostra minhas obras" ou "Abre a obra do Carlos"
  if (/\b(mostra minhas obras|minhas obras|ver obras|listar obras)\b/.test(clean)) {
    return {
      intent: 'listar_obras',
      confidence: 0.95,
      params: {},
      rawText: text,
      categoriaAcao: 'obra',
    }
  }

  const abreObraMatch = clean.match(
    /(?:abre|abrir|ver)\s+(?:a\s+)?obra\s+(?:do|da|de)?\s*([a-zá-ú\s]+)/,
  )
  if (abreObraMatch) {
    return {
      intent: 'abrir_obra',
      confidence: 0.9,
      params: { termo: abreObraMatch[1].trim() },
      rawText: text,
      categoriaAcao: 'obra',
    }
  }

  // 14. ORÇAMENTOS
  // Ex: "Faz o orçamento" ou "Cria um orçamento para fazer uma parede de 20 metros quadrados"
  if (/\b(faz o orçamento|fazer orçamento|cria um orçamento|novo orçamento)\b/.test(clean)) {
    const areaMatch = clean.match(/([0-9.,]+)\s*(?:m2|metros)/)
    return {
      intent: 'criar_orcamento',
      confidence: 0.9,
      params: { area: areaMatch ? parseFloat(areaMatch[1].replace(',', '.')) : 20 },
      rawText: text,
      categoriaAcao: 'orcamento',
    }
  }

  // 15. DIÁRIO DE OBRA
  // Ex: "Hoje fizemos 30 metros quadrados de reboco. Gastamos 8 sacos de cimento."
  const diarioMatch = clean.match(
    /(?:hoje|ontem)?\s*(?:fizemos|assentamos|aplicamos)\s+([0-9.,]+)\s*(?:m2|metros)\s+de\s+([a-zá-ú\s]+)/,
  )
  if (diarioMatch) {
    return {
      intent: 'diario_obra',
      confidence: 0.9,
      params: {
        quantidade: parseFloat(diarioMatch[1].replace(',', '.')),
        servico: diarioMatch[2].trim(),
        textoCompleto: text,
      },
      rawText: text,
      categoriaAcao: 'obra',
    }
  }

  // 16. ARITMÉTICA BÁSICA
  // Ex: "Quanto é 5 vezes 3?" ou "5 vezes 3" ou "120 dividido por 4"
  const contaMatch = clean.match(
    /(?:quanto\s+é\s+)?([0-9.,]+)\s*(vezes|\*|x|dividido\s+por|\/|mais|\+|menos|-)\s*([0-9.,]+)/,
  )
  if (contaMatch) {
    const n1 = parseFloat(contaMatch[1].replace(',', '.'))
    const op = contaMatch[2]
    const n2 = parseFloat(contaMatch[3].replace(',', '.'))
    let res = 0
    if (op === 'vezes' || op === '*' || op === 'x') res = n1 * n2
    else if (op.includes('dividido') || op === '/') res = n2 !== 0 ? n1 / n2 : 0
    else if (op === 'mais' || op === '+') res = n1 + n2
    else if (op === 'menos' || op === '-') res = n1 - n2

    return {
      intent: 'aritmetica_simples',
      confidence: 0.98,
      params: { n1, op, n2, resultado: res },
      rawText: text,
      categoriaAcao: 'calculo',
    }
  }

  // Desconhecido
  return {
    intent: 'desconhecido',
    confidence: 0.1,
    params: {},
    rawText: text,
    respostaSugerida:
      'Não tenho informação suficiente para calcular isso. Pode repetir ou dizer as medidas com clareza?',
  }
}
