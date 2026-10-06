// src/lib/localInterpreter.ts
// Interpretador local de intenções (Regex + Palavras-chave pt-BR)
// Permite que o Ajudante IA continue funcionando 100% offline quando o agente remoto não puder ser chamado

export interface LocalParsedIntent {
  intent: string
  confidence: number
  params: Record<string, unknown>
  descricaoHumana: string
}

export function parseNumberPtBr(str: string): number | null {
  if (!str) return null
  // Substitui vírgula por ponto
  const clean = str.replace(',', '.').replace(/[^\d.]/g, '')
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

export function interpretCommandLocally(text: string): LocalParsedIntent {
  const norm = text.toLowerCase().trim()

  // 1. "Desfaz", "Corrige", "Cancela", "Apaga o último lançamento"
  if (
    norm === 'desfaz' ||
    norm.startsWith('desfazer') ||
    norm.startsWith('corrige') ||
    norm === 'cancela' ||
    norm.includes('apaga o último') ||
    norm.includes('apagar o ultimo') ||
    norm.includes('desfazer o ultimo')
  ) {
    return {
      intent: 'acao_desfazer',
      confidence: 1.0,
      params: {},
      descricaoHumana: 'Desfazer a última ação realizada.',
    }
  }

  // 1.1 "Quem está me devendo?", "Valores a receber"
  if (
    norm.includes('quem me deve') ||
    norm.includes('quem esta me devendo') ||
    norm.includes('quem está me devendo') ||
    norm.includes('quem ta me devendo') ||
    norm.includes('quem tá me devendo') ||
    norm.includes('valores a receber')
  ) {
    return {
      intent: 'quem_me_deve',
      confidence: 0.98,
      params: {},
      descricaoHumana: 'Consultar clientes com valores a receber e pendências.',
    }
  }

  // 1.11 "Cria uma cobrança de 350 pro João" / "Cobra 350 do João"
  if (
    /\b(cria(?:r)?\s+(?:uma\s+)?cobran[çc]a|cobra(?:r)?\b|gera(?:r)?\s+(?:uma\s+)?cobran[çc]a|fazer\s+cobran[çc]a|lan[çc]a(?:r)?\s+cobran[çc]a|manda(?:r)?\s+(?:um\s+)?pix)\b/i.test(
      norm,
    ) &&
    /\b(pro|pra|para|do|da|de|ao|à)\b/i.test(norm)
  ) {
    const valorEspMatch = norm.match(
      /(?:cobran[çc]a\s+(?:pix\s+)?de\s+|cobra\s+|cobrar\s+|pix\s+de\s+|de\s+)(?:r\$\s*)?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)/i,
    )
    let valorCobranca = 0
    if (valorEspMatch) {
      const limpo = valorEspMatch[1].replace(/\./g, '').replace(',', '.')
      valorCobranca = parseFloat(limpo) || 0
    }

    const clienteMatch = norm.match(
      /(?:para\s+o\s+cliente|pro\s+cliente|pra\s+cliente|para\s+a\s+cliente|pro|pra|para|do\s+cliente|da\s+cliente|do|da|ao|à)\s+([a-zá-ú0-9\s]+?)(?:\s+referente|\s+sobre|\s+pela|\s+pelo|\s+de\s+servi[çc]o|\s+de\s+consultoria|\s+da\s+obra|\s+na\s+obra|$)/i,
    )
    let clienteNome = ''
    if (clienteMatch) {
      const nomeLimpo = clienteMatch[1]
        .replace(/^(o|a|cliente|sr|sra)\s+/i, '')
        .split(/\s+(?:referente|sobre|pela|pelo|da\s+obra|na\s+obra)\b/i)[0]
        .trim()
      if (nomeLimpo.length >= 2) {
        clienteNome = nomeLimpo
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      }
    }

    let desc: string | undefined
    const descMatch = norm.match(
      /(?:referente\s+[aà]\s+|referente\s+ao\s+|referente\s+|sobre\s+a\s+|sobre\s+o\s+|sobre\s+|pela\s+|pelo\s+)(.+)$/i,
    )
    if (descMatch) {
      desc = descMatch[1].trim()
      desc = desc.charAt(0).toUpperCase() + desc.slice(1)
    }

    if (valorCobranca > 0 && clienteNome) {
      return {
        intent: 'criar_cobranca_pix',
        confidence: 0.98,
        params: {
          valor: valorCobranca,
          clienteNome: clienteNome,
          descricao: desc,
        },
        descricaoHumana: `Criar cobrança Pix de R$ ${valorCobranca.toFixed(2)} para ${clienteNome}.`,
      }
    }
  }

  // 1.2 "Como foi minha semana?" / "Resumo da semana"
  if (
    norm.includes('como foi minha semana') ||
    norm.includes('resumo da semana') ||
    norm.includes('resumo semanal')
  ) {
    return {
      intent: 'resumo_semanal',
      confidence: 0.98,
      params: {},
      descricaoHumana: 'Apresentar resumo semanal de obras, gastos e pendências.',
    }
  }

  // 1.3 "Resumo da manhã" / "Resumo do dia" / "Bom dia"
  if (
    norm.includes('resumo da manha') ||
    norm.includes('resumo da manhã') ||
    norm.includes('resumo do dia') ||
    norm.startsWith('bom dia') ||
    norm.includes('o que tem pra hoje')
  ) {
    return {
      intent: 'resumo_manha',
      confidence: 0.98,
      params: {},
      descricaoHumana: 'Apresentar resumo do dia com tarefas, lembretes e obras.',
    }
  }

  // 1.4 "Quem eu estou devendo?"
  if (
    norm.includes('quem eu estou devendo') ||
    norm.includes('quem eu to devendo') ||
    norm.includes('quem estou devendo') ||
    norm.includes('minhas dividas') ||
    norm.includes('minhas dívidas') ||
    norm.includes('contas a pagar')
  ) {
    return {
      intent: 'quem_estou_devendo',
      confidence: 0.98,
      params: {},
      descricaoHumana: 'Consultar dívidas e contas a pagar pendentes.',
    }
  }

  // 1.5 "Quais as tarefas?" / "Minhas tarefas"
  if (
    norm.includes('quais as tarefas') ||
    norm.includes('minhas tarefas') ||
    norm.includes('ver tarefas') ||
    norm.includes('lista de tarefas')
  ) {
    return {
      intent: 'consultar_tarefas',
      confidence: 0.98,
      params: {},
      descricaoHumana: 'Listar tarefas pendentes da obra por prazo de vencimento.',
    }
  }

  // 2. Parede com desconto de vão / porta: "Tira a porta de 80 por 210" / "desconta a porta"
  const matchPorta = norm.match(
    /(?:tira|desconta|menos)\s+(?:a\s+)?(?:porta|janela|vao|abertura)\s+(?:de\s+)?(\d+[.,]?\d*)\s*(?:por|x|\*)\s*(\d+[.,]?\d*)/,
  )
  if (matchPorta) {
    let w = parseNumberPtBr(matchPorta[1]) || 0
    let h = parseNumberPtBr(matchPorta[2]) || 0
    // Se digitou em centímetros (ex: 80 por 210) converte para metros
    if (w > 10) w = w / 100
    if (h > 10) h = h / 100
    return {
      intent: 'descontar_abertura',
      confidence: 0.95,
      params: { largura: w, altura: h },
      descricaoHumana: `Descontar abertura de ${w}m × ${h}m.`,
    }
  }

  // 3. "Calcula uma parede de 10 por 3" ou "parede de 8 por 3"
  const matchParede = norm.match(
    /(?:parede|muro)\s+(?:de\s+)?(\d+[.,]?\d*)\s*(?:por|x|\*)\s*(\d+[.,]?\d*)/,
  )
  if (matchParede) {
    const comp = parseNumberPtBr(matchParede[1]) || 0
    const alt = parseNumberPtBr(matchParede[2]) || 0
    return {
      intent: 'calc_area',
      confidence: 0.95,
      params: { comprimento: comp, larguraOuAltura: alt, tipo: 'parede' },
      descricaoHumana: `Calcular área da parede de ${comp}m por ${alt}m.`,
    }
  }

  // 4. "Quanto de piso preciso para 30 metros?" ou "piso para 20 metros"
  const matchPiso = norm.match(
    /(?:quanto de piso|piso)\s+(?:preciso\s+)?(?:para\s+)?(\d+[.,]?\d*)\s*(?:metros?|m2|m²)/,
  )
  if (matchPiso) {
    const area = parseNumberPtBr(matchPiso[1]) || 0
    return {
      intent: 'calc_piso',
      confidence: 0.95,
      params: { areaM2: area, perdaPct: 10 },
      descricaoHumana: `Calcular quantidade de piso para ${area} m².`,
    }
  }

  // 5. "Acrescenta 10% de perda" ou "coloca 15% de perda"
  const matchPerda = norm.match(
    /(?:acrescenta|coloca|adiciona|mais)\s+(\d+[.,]?\d*)%\s+(?:de\s+)?perda/,
  )
  if (matchPerda) {
    const perda = parseNumberPtBr(matchPerda[1]) || 10
    return {
      intent: 'aplicar_perda',
      confidence: 0.95,
      params: { perdaPct: perda },
      descricaoHumana: `Aplicar ${perda}% de margem de perda.`,
    }
  }

  // 6. "Quanto vou gastar?" / "faz o orçamento" / "cria o orçamento"
  if (
    norm.includes('quanto vou gastar') ||
    norm.includes('faz o orcamento') ||
    norm.includes('faz o orçamento') ||
    norm.includes('cria o orcamento') ||
    norm.includes('cria o orçamento')
  ) {
    return {
      intent: 'criar_orcamento',
      confidence: 0.9,
      params: {},
      descricaoHumana: 'Iniciar a criação de um novo orçamento.',
    }
  }

  // 7. "Manda para o cliente" / "enviar orçamento"
  if (
    norm.includes('manda para o cliente') ||
    norm.includes('enviar via whatsapp') ||
    norm.includes('manda no zap')
  ) {
    return {
      intent: 'enviar_cliente',
      confidence: 0.9,
      params: {},
      descricaoHumana: 'Enviar orçamento ou recibo para o cliente.',
    }
  }

  // 8. "Registra o pagamento" / "quanto falta receber?"
  if (norm.includes('quanto falta receber') || norm.includes('a receber')) {
    return {
      intent: 'consultar_a_receber',
      confidence: 0.95,
      params: {},
      descricaoHumana: 'Consultar valores pendentes a receber.',
    }
  }

  if (
    norm.includes('registra o pagamento') ||
    norm.includes('recebi') ||
    norm.includes('registrar pagamento')
  ) {
    const valorMatch = norm.match(/(\d+[.,]?\d*)\s*(?:reais)?/)
    const val = valorMatch ? parseNumberPtBr(valorMatch[1]) : 0
    return {
      intent: 'registrar_entrada',
      confidence: 0.9,
      params: { valor: val, categoria: 'pagamento' },
      descricaoHumana: `Registrar entrada de pagamento${val ? ` no valor de R$ ${val}` : ''}.`,
    }
  }

  // 9. "Registra essa despesa" / "gastei 150 reais"
  if (
    norm.includes('registra essa despesa') ||
    norm.includes('gastei') ||
    norm.includes('despesa de')
  ) {
    const valorMatch = norm.match(/(\d+[.,]?\d*)\s*(?:reais)?/)
    const val = valorMatch ? parseNumberPtBr(valorMatch[1]) : 0
    return {
      intent: 'registrar_saida',
      confidence: 0.9,
      params: { valor: val, categoria: 'outros' },
      descricaoHumana: `Registrar saída/despesa${val ? ` no valor de R$ ${val}` : ''}.`,
    }
  }

  // 10. "Mostra minhas obras" / "abre a obra do carlos"
  if (
    norm.includes('mostra minhas obras') ||
    norm.includes('minhas obras') ||
    norm.includes('listar obras')
  ) {
    return {
      intent: 'listar_obras',
      confidence: 0.95,
      params: {},
      descricaoHumana: 'Abrir painel Minhas Obras.',
    }
  }

  const matchObraNome = norm.match(/(?:abre|abrir|ver)\s+(?:a\s+)?obra\s+(?:do|da|de)?\s*(.+)/)
  if (matchObraNome) {
    return {
      intent: 'abrir_obra_nome',
      confidence: 0.9,
      params: { nomeObraOuCliente: matchObraNome[1].trim() },
      descricaoHumana: `Localizar e abrir a obra de ${matchObraNome[1].trim()}.`,
    }
  }

  // 11. "Faz uma lista de material" / "o que está acabando?"
  if (
    norm.includes('o que esta acabando') ||
    norm.includes('o que está acabando') ||
    norm.includes('estoque baixo')
  ) {
    return {
      intent: 'estoque_consultar_acabando',
      confidence: 0.95,
      params: {},
      descricaoHumana: 'Verificar materiais que atingiram o estoque mínimo.',
    }
  }

  if (
    norm.includes('lista de material') ||
    norm.includes('lista de compras') ||
    norm.includes('faz uma lista')
  ) {
    return {
      intent: 'gerar_lista_compras',
      confidence: 0.9,
      params: {},
      descricaoHumana: 'Gerar lista de materiais para compra.',
    }
  }

  // 11.1 Classificação de atividades de obra: "bater o nível com a mangueira" / "bater um traço"
  if (
    /\b(bater\s+(?:o\s+)?n[íi]vel\s+(?:com\s+a\s+|de\s+)?mangueira|bater\s+n[íi]vel\s+de\s+mangueira|nivelar\s+com\s+a\s+mangueira|nivelamento\s+com\s+mangueira)\b/i.test(
      norm,
    )
  ) {
    return {
      intent: 'diario_obra',
      confidence: 0.98,
      params: {
        atividade: 'Nivelamento Hidráulico',
        servico: 'Nivelamento Hidráulico',
        textoOriginal: text,
      },
      descricaoHumana: 'Classificar e registrar atividade como Nivelamento Hidráulico.',
    }
  }

  if (
    /\b(bater\s+(?:um\s+|o\s+)?tra[çc]o|bateu\s+(?:um\s+|o\s+)?tra[çc]o|bater\s+tra[çc]o)\b/i.test(
      norm,
    )
  ) {
    return {
      intent: 'diario_obra',
      confidence: 0.98,
      params: {
        atividade: 'Preparação de Argamassa/Concreto',
        servico: 'Preparação de Argamassa/Concreto',
        textoOriginal: text,
      },
      descricaoHumana: 'Classificar e registrar atividade como Preparação de Argamassa/Concreto.',
    }
  }

  // 12. "Tenho 15 sacos de cimento" / "Baixa 5 sacos de cimento"
  const matchTenho = norm.match(
    /(?:tenho|chegou|entrou)\s+(\d+)\s+(?:sacos?|un|kg|l)?\s*(?:de\s+)?(.+)/,
  )
  if (matchTenho) {
    const qtd = parseNumberPtBr(matchTenho[1]) || 0
    const item = matchTenho[2].trim()
    return {
      intent: 'estoque_adicionar',
      confidence: 0.9,
      params: { material: item, quantidade: qtd },
      descricaoHumana: `Adicionar ${qtd} unidades de ${item} ao estoque.`,
    }
  }

  const matchBaixa = norm.match(
    /(?:baixa|baixar|saiu|gastei)\s+(\d+)\s+(?:sacos?|un|kg|l)?\s*(?:de\s+)?(.+)/,
  )
  if (matchBaixa) {
    const qtd = parseNumberPtBr(matchBaixa[1]) || 0
    const item = matchBaixa[2].trim()
    return {
      intent: 'estoque_baixar',
      confidence: 0.9,
      params: { material: item, quantidade: qtd },
      descricaoHumana: `Dar baixa de ${qtd} unidades de ${item} no estoque.`,
    }
  }

  // 13. Cálculos básicos de matemática: "Quanto é 5 vezes 3?" ou "5 x 3"
  const matchMult = norm.match(
    /(?:quanto e|quanto é)?\s*(\d+[.,]?\d*)\s*(?:vezes|x|\*)\s*(\d+[.,]?\d*)/,
  )
  if (matchMult) {
    const a = parseNumberPtBr(matchMult[1]) || 0
    const b = parseNumberPtBr(matchMult[2]) || 0
    return {
      intent: 'calc_aritmetica',
      confidence: 0.95,
      params: { operacao: 'multiplicacao', a, b, resultado: a * b },
      descricaoHumana: `${a} vezes ${b} é igual a ${a * b}.`,
    }
  }

  // Fallback quando não identifica
  return {
    intent: 'desconhecido',
    confidence: 0.1,
    params: { textoOriginal: text },
    descricaoHumana: 'Comando não identificado localmente.',
  }
}
