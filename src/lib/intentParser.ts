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

  // 1. DESFAZER / CORRIGIR / CANCELAR / APAGA O ÚLTIMO
  if (
    /\b(desfaz|desfazer|corrige|corrigir|cancela|cancelar|apaga o último|apagar o último|apaga o ultimo|apagar o ultimo|desfazer último|desfazer o ultimo)\b/.test(
      clean,
    )
  ) {
    // Se for especificamente cancelar um fluxo em andamento
    const isCancelFluxo = clean === 'cancela' || clean === 'cancelar' || clean === 'abortar'
    return {
      intent: isCancelFluxo && context?.fluxoAtivo ? 'fluxo_cancelar' : 'acao_desfazer',
      confidence: 0.98,
      params: { tipo: isCancelFluxo ? 'cancelar' : 'desfazer' },
      rawText: text,
      respostaSugerida: isCancelFluxo
        ? 'Operação cancelada.'
        : 'Deseja desfazer a última ação registrada?',
      categoriaAcao: 'sistema',
      requerConfirmacao: false,
    }
  }

  // 1.1 RESPOSTAS DE SIM / NÃO / CONFIRMAÇÃO (incluindo "pode", "cancela", "ajustar")
  if (
    /^(sim|claro|pode|confirma|confirmar|com certeza|positivo|isso|beleza|ok|manda ver|valeu)$/.test(
      clean,
    )
  ) {
    return {
      intent: 'resposta_afirmativa',
      confidence: 0.98,
      params: { resposta: true },
      rawText: text,
      categoriaAcao: 'sistema',
    }
  }
  if (
    /^(não|nao|negativo|nunca|dispensa|pula|sem material|sem materiais|cancela|cancelar|deixa pra la|deixa pra lá)$/.test(
      clean,
    )
  ) {
    return {
      intent: 'resposta_negativa',
      confidence: 0.98,
      params: { resposta: false },
      rawText: text,
      categoriaAcao: 'sistema',
    }
  }

  // 1.2 RESUMO DA MANHÃ / BOM DIA
  if (
    /\b(resumo\s+(?:da\s+)?manh[ãa]|resumo\s+do\s+dia|bom\s+dia(?:\s+ajudante)?|o\s+que\s+tem\s+pra\s+hoje|planejamento\s+do\s+dia)\b/i.test(
      clean,
    )
  ) {
    return {
      intent: 'resumo_manha',
      confidence: 0.98,
      params: {},
      rawText: text,
      categoriaAcao: 'sistema',
    }
  }

  // 1.3 TAREFAS POR VOZ: CONSULTA ("quais as tarefas?", "minhas tarefas")
  if (
    /\b(quais\s+(?:as\s+)?tarefas|minhas\s+tarefas|ver\s+tarefas|lista\s+de\s+tarefas|fila\s+de\s+tarefas)\b/i.test(
      clean,
    )
  ) {
    return {
      intent: 'consultar_tarefas',
      confidence: 0.98,
      params: {},
      rawText: text,
      categoriaAcao: 'obra',
    }
  }

  // 1.4 QUEM EU ESTOU DEVENDO / CONTAS A PAGAR
  if (
    /\b(quem\s+(?:eu\s+)?estou\s+devendo|quem\s+(?:eu\s+)?to\s+devendo|quem\s+(?:eu\s+)?tô\s+devendo|o\s+que\s+estou\s+devendo|minhas\s+d[íi]vidas|contas\s+a\s+pagar|o\s+que\s+tenho\s+que\s+pagar)\b/i.test(
      clean,
    )
  ) {
    return {
      intent: 'quem_estou_devendo',
      confidence: 0.98,
      params: {},
      rawText: text,
      categoriaAcao: 'financeiro',
    }
  }

  // 1.5 QUEM ME DEVE / CONTAS A RECEBER
  if (
    /\b(quem est[áa] me devendo|quem me deve|quem ta me devendo|quem tá me devendo|valores a receber|contas a receber|o que tenho pra receber|quanto tenho pra receber)\b/i.test(
      clean,
    )
  ) {
    return {
      intent: 'quem_me_deve',
      confidence: 0.98,
      params: {},
      rawText: text,
      categoriaAcao: 'financeiro',
    }
  }

  // 1.6 RESUMO DA SEMANA
  if (
    /\b(como foi minha semana|resumo da semana|resumo semanal|como foram as coisas essa semana|balan[çc]o da semana)\b/i.test(
      clean,
    )
  ) {
    return {
      intent: 'resumo_semanal',
      confidence: 0.98,
      params: {},
      rawText: text,
      categoriaAcao: 'sistema',
    }
  }

  // 1.4 BAIXA DE RECEBIMENTO ("recebi os 450 do Rafael")
  const baixaMatch = clean.match(
    /(?:recebi|deu\s+baixa|baixa\s+de|entrou\s+o\s+pagamento\s+de)\s+(?:os\s+|as\s+|o\s+|a\s+)?(?:r\$\s*)?([0-9.,]+)(?:\s+(?:do|da|de|cliente)\s+([a-zá-ú\s]+))?/i,
  )
  if (baixaMatch) {
    const v = parseFloat(baixaMatch[1].replace('.', '').replace(',', '.'))
    const cli = (baixaMatch[2] || '').trim()
    return {
      intent: 'baixa_recebimento',
      confidence: 0.95,
      params: { valor: v, clienteNome: cli },
      rawText: text,
      categoriaAcao: 'financeiro',
      requerConfirmacao: false,
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
    /\b(quanto falta receber|quanto vou receber|qual meu saldo|quanto tenho de saldo|quanto lucrei|quanto eu gastei|quanto gastei|qual o custo|quanto custou)\b/.test(
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

  // 14. ORÇAMENTOS POR VOZ (INÍCIO DE FLUXO OU COMANDOS DIRETOS)
  // Ex: "Cria um orçamento para fazer uma parede de 20 metros quadrados" ou "Faz o orçamento da parede"
  if (
    /\b(faz o orçamento|fazer orçamento|cria um orçamento|criar um orçamento|novo orçamento|orçamento para|orcamento para)\b/.test(
      clean,
    )
  ) {
    const areaMatch = clean.match(/([0-9.,]+)\s*(?:m2|metros\s+quadrados|metros)/)
    const area = areaMatch
      ? parseFloat(areaMatch[1].replace(',', '.'))
      : context?.areaLiquida || context?.areaBruta || 20

    let servico = 'parede'
    if (clean.includes('piso') || clean.includes('porcelanato')) servico = 'piso'
    else if (clean.includes('reboco') || clean.includes('emboço')) servico = 'reboco'
    else if (clean.includes('pintura') || clean.includes('pintar')) servico = 'pintura'
    else if (clean.includes('contrapiso')) servico = 'contrapiso'
    else if (clean.includes('telhado')) servico = 'telhado'
    else if (clean.includes('concreto')) servico = 'concreto'

    return {
      intent: 'iniciar_orcamento_voz',
      confidence: 0.95,
      params: {
        servico,
        area,
        clienteNome: context?.clienteNome || 'Cliente',
      },
      rawText: text,
      categoriaAcao: 'orcamento',
    }
  }

  // 15. DIÁRIO DE OBRA: CONSULTA E REGISTRO
  // Regras de classificação de atividade em jargões de obra:
  // - "bater o nível com a mangueira" (e variantes) -> atividade "Nivelamento Hidráulico"
  // - "bater um traço" (e variantes) -> atividade "Preparação de Argamassa/Concreto"
  if (
    /\b(bater\s+(?:o\s+)?n[íi]vel\s+(?:com\s+a\s+|de\s+)?mangueira|bater\s+n[íi]vel\s+de\s+mangueira|nivelar\s+com\s+a\s+mangueira|nivelamento\s+com\s+mangueira)\b/i.test(
      clean,
    )
  ) {
    return {
      intent: 'diario_obra',
      confidence: 0.98,
      params: {
        atividade: 'Nivelamento Hidráulico',
        servico: 'Nivelamento Hidráulico',
        quantidade: 1,
        textoCompleto: text,
      },
      rawText: text,
      categoriaAcao: 'obra',
      respostaSugerida: 'Atividade registrada no diário/relatório: Nivelamento Hidráulico.',
    }
  }

  if (
    /\b(bater\s+(?:um\s+|o\s+)?tra[çc]o|bateu\s+(?:um\s+|o\s+)?tra[çc]o|bater\s+tra[çc]o)\b/i.test(
      clean,
    )
  ) {
    return {
      intent: 'diario_obra',
      confidence: 0.98,
      params: {
        atividade: 'Preparação de Argamassa/Concreto',
        servico: 'Preparação de Argamassa/Concreto',
        quantidade: 1,
        textoCompleto: text,
      },
      rawText: text,
      categoriaAcao: 'obra',
      respostaSugerida:
        'Atividade registrada no diário/relatório: Preparação de Argamassa/Concreto.',
    }
  }

  // Consulta: "O que eu fiz na obra do João ontem?" / "O que fiz na obra ontem?" / "Diário de ontem"
  if (
    /\b(o que eu fiz|o que fiz|o que foi feito|consultar diário|ver diário|diário da obra|relatório de ontem)\b/.test(
      clean,
    )
  ) {
    const obraMatch = clean.match(
      /(?:na|da|de|da obra)\s+(?:obra\s+)?(?:do|da|de)?\s*([a-zá-ú\s]+?)(?:\s+ontem|\s+hoje|\s+na\s+segunda|\s+semana|\?|$)/,
    )
    const alvoObra = obraMatch ? obraMatch[1].replace(/^(obra|do|da|de)\s+/, '').trim() : ''

    // Extrai expressão de data
    let dataExpressao = 'hoje'
    if (clean.includes('ontem')) dataExpressao = 'ontem'
    else if (clean.includes('anteontem')) dataExpressao = 'anteontem'
    else if (clean.includes('segunda')) dataExpressao = 'segunda'
    else if (clean.includes('terça') || clean.includes('terca')) dataExpressao = 'terça'
    else if (clean.includes('quarta')) dataExpressao = 'quarta'
    else if (clean.includes('quinta')) dataExpressao = 'quinta'
    else if (clean.includes('sexta')) dataExpressao = 'sexta'
    else if (clean.includes('sábado') || clean.includes('sabado')) dataExpressao = 'sábado'
    else if (clean.includes('semana passada')) dataExpressao = 'semana passada'

    return {
      intent: 'consultar_diario_obra',
      confidence: 0.95,
      params: {
        termoObra: alvoObra,
        dataExpressao,
      },
      rawText: text,
      categoriaAcao: 'obra',
    }
  }

  // Registro: "Hoje fizemos 30 metros quadrados de reboco. Gastamos 8 sacos de cimento."
  const diarioMatch = clean.match(
    /(?:hoje|ontem)?\s*(?:fizemos|assentamos|aplicamos|trabalhamos|executamos)\s+([0-9.,]+)\s*(?:m2|metros|m²)?\s+(?:de\s+)?([a-zá-ú\s]+)/,
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
