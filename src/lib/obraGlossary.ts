/**
 * GLOSSÁRIO DE DIALETOS E JARGÕES DA CONSTRUÇÃO CIVIL BRASILEIRA
 *
 * Módulo compartilhado para normalização de termos de canteiro de obras e correção
 * de erros típicos de Speech-to-Text (reconhecimento de voz) em pt-BR.
 * Usado tanto no frontend (antes do parse local / envio ao backend) quanto disponível para testes.
 */

export interface CorrecaoGlossarioItem {
  original: string
  corrigido: string
  termoDetectado: string
}

export interface ResultadoNormalizacao {
  textoOriginal: string
  textoNormalizado: string
  houveCorrecao: boolean
  correcoes: CorrecaoGlossarioItem[]
}

// Lista de regras de substituição fonética e erros de transcrição de voz
// Ordem: termos mais específicos primeiro para evitar substituições parciais indevidas
export const REGRAS_GLOSSARIO_OBRA: Array<{ padrao: RegExp; substituicao: string; termo: string }> =
  [
    // Viga baldrame / fundação
    {
      padrao: /\bviga\s+de\s+bar\s*d['’]?\s*á?gua\b/gi,
      substituicao: 'viga baldrame',
      termo: 'viga baldrame',
    },
    {
      padrao: /\bviga\s+bar\s*d['’]?\s*á?gua\b/gi,
      substituicao: 'viga baldrame',
      termo: 'viga baldrame',
    },
    { padrao: /\bviga\s+de\s+baldrame\b/gi, substituicao: 'viga baldrame', termo: 'viga baldrame' },
    { padrao: /\bbal\s*drame\b/gi, substituicao: 'baldrame', termo: 'baldrame' },
    { padrao: /\bbar\s*drame\b/gi, substituicao: 'baldrame', termo: 'baldrame' },
    { padrao: /\bbandrame\b/gi, substituicao: 'baldrame', termo: 'baldrame' },
    { padrao: /\bviga\s+baldrama\b/gi, substituicao: 'viga baldrame', termo: 'viga baldrame' },

    // Contrapiso
    { padrao: /\bcontra[- ]piso\b/gi, substituicao: 'contrapiso', termo: 'contrapiso' },
    { padrao: /\bcontra\s+piso\b/gi, substituicao: 'contrapiso', termo: 'contrapiso' },
    { padrao: /\bcontra\s+peso\b/gi, substituicao: 'contrapiso', termo: 'contrapiso' },
    {
      padrao: /\bcontrapeso\s+da\s+sala\b/gi,
      substituicao: 'contrapiso da sala',
      termo: 'contrapiso',
    },
    {
      padrao: /\bcontrapeso\s+do\s+quarto\b/gi,
      substituicao: 'contrapiso do quarto',
      termo: 'contrapiso',
    },
    { padrao: /\bcontrapeso\s+de\b/gi, substituicao: 'contrapiso de', termo: 'contrapiso' },

    // Reboco / Reboque / Emboço / Chapisco
    { padrao: /\breboque\b/gi, substituicao: 'reboco', termo: 'reboco' },
    {
      padrao: /\breboco\s+paulista\b/gi,
      substituicao: 'reboco paulista',
      termo: 'reboco paulista',
    },
    { padrao: /\bemboça\b/gi, substituicao: 'emboço', termo: 'emboço' },
    { padrao: /\bemboçar\b/gi, substituicao: 'emboçar', termo: 'emboço' },
    { padrao: /\bcha\s*pisco\b/gi, substituicao: 'chapisco', termo: 'chapisco' },
    { padrao: /\bchapisca\b/gi, substituicao: 'chapisco', termo: 'chapisco' },

    // Asfalto frio / impermeabilização
    { padrao: /\basfalto\s+frio\b/gi, substituicao: 'asfalto frio', termo: 'asfalto frio' },
    { padrao: /\basfalto\s+a\s+frio\b/gi, substituicao: 'asfalto frio', termo: 'asfalto frio' },
    { padrao: /\btinta\s+asfáltica\b/gi, substituicao: 'asfalto frio', termo: 'asfalto frio' },

    // Estribo / Ferragem
    { padrao: /\bestribos?\b/gi, substituicao: 'estribo', termo: 'estribo' },
    { padrao: /\bestribu\b/gi, substituicao: 'estribo', termo: 'estribo' },
    { padrao: /\bextribo\b/gi, substituicao: 'estribo', termo: 'estribo' },
    { padrao: /\bferro\s+caixa\b/gi, substituicao: 'ferro caixa', termo: 'ferro caixa' },
    {
      padrao: /\bferragem\s+armada\b/gi,
      substituicao: 'ferragem armada',
      termo: 'ferragem armada',
    },
    { padrao: /\blaje\s+treliça\b/gi, substituicao: 'laje treliça', termo: 'laje treliça' },
    { padrao: /\blaje\s+trelicada\b/gi, substituicao: 'laje treliçada', termo: 'laje treliça' },
    { padrao: /\blaje\s+treliçada\b/gi, substituicao: 'laje treliçada', termo: 'laje treliça' },

    // Sapata / Fundação
    { padrao: /\bsapatas?\b/gi, substituicao: 'sapata', termo: 'sapata' },
    { padrao: /\bsapata\s+corrida\b/gi, substituicao: 'sapata corrida', termo: 'sapata' },
    { padrao: /\bmuro\s+de\s+arrimo\b/gi, substituicao: 'muro de arrimo', termo: 'muro de arrimo' },
    { padrao: /\bmuro\s+de\s+rimo\b/gi, substituicao: 'muro de arrimo', termo: 'muro de arrimo' },
    {
      padrao: /\bcinta\s+de\s+amarração\b/gi,
      substituicao: 'cinta de amarração',
      termo: 'cinta de amarração',
    },
    {
      padrao: /\bcinta\s+de\s+amarracao\b/gi,
      substituicao: 'cinta de amarração',
      termo: 'cinta de amarração',
    },
    { padrao: /\bbroca\s+estaca\b/gi, substituicao: 'broca estaca', termo: 'estaca' },

    // Concreto usinado / Traço / Betoneira
    {
      padrao: /\bconcreto\s+usinado\b/gi,
      substituicao: 'concreto usinado',
      termo: 'concreto usinado',
    },
    {
      padrao: /\bconcreto\s+de\s+usina\b/gi,
      substituicao: 'concreto usinado',
      termo: 'concreto usinado',
    },
    { padrao: /\btraço\b/gi, substituicao: 'traço', termo: 'traço' },
    { padrao: /\btraco\b/gi, substituicao: 'traço', termo: 'traço' },
    { padrao: /\bbetoneira\b/gi, substituicao: 'betoneira', termo: 'betoneira' },
    { padrao: /\bbitoneira\b/gi, substituicao: 'betoneira', termo: 'betoneira' },

    // Massa corrida / Gesso
    { padrao: /\bmassa\s+corrida\b/gi, substituicao: 'massa corrida', termo: 'massa corrida' },
    { padrao: /\bmassa\s+acrílica\b/gi, substituicao: 'massa acrílica', termo: 'massa acrílica' },
    { padrao: /\bmassa\s+acrilica\b/gi, substituicao: 'massa acrílica', termo: 'massa acrílica' },

    // Ferramentas e métodos tradicionais
    {
      padrao: /\bnível\s+de\s+mangueira\b/gi,
      substituicao: 'nível de mangueira',
      termo: 'nível de mangueira',
    },
    {
      padrao: /\bnivel\s+de\s+mangueira\b/gi,
      substituicao: 'nível de mangueira',
      termo: 'nível de mangueira',
    },
    {
      padrao: /\blinha\s+de\s+pedreiro\b/gi,
      substituicao: 'linha de pedreiro',
      termo: 'linha de pedreiro',
    },
    { padrao: /\bprumo\s+de\s+face\b/gi, substituicao: 'prumo de face', termo: 'prumo' },
    { padrao: /\bprumo\s+de\s+centro\b/gi, substituicao: 'prumo de centro', termo: 'prumo' },
    { padrao: /\bsarrafo\b/gi, substituicao: 'sarrafo', termo: 'sarrafo' },
    { padrao: /\bdesempenadeira\b/gi, substituicao: 'desempenadeira', termo: 'desempenadeira' },
    { padrao: /\bdesempoladeira\b/gi, substituicao: 'desempenadeira', termo: 'desempenadeira' },

    // Jargões de equipe e canteiro
    { padrao: /\bgalego\b/gi, substituicao: 'carrinho de mão', termo: 'galego (carrinho de mão)' },
    { padrao: /\bpião\b/gi, substituicao: 'peão de obra', termo: 'peão' },
    { padrao: /\bpeão\b/gi, substituicao: 'peão de obra', termo: 'peão' },
    { padrao: /\bmarreta\b/gi, substituicao: 'marreta', termo: 'marreta' },
    { padrao: /\bmarretão\b/gi, substituicao: 'marreta grande', termo: 'marreta' },
    { padrao: /\bponteiro\b/gi, substituicao: 'ponteiro', termo: 'ponteiro' },
    { padrao: /\btalhadera\b/gi, substituicao: 'talhadeira', termo: 'talhadeira' },
    { padrao: /\btalhadeira\b/gi, substituicao: 'talhadeira', termo: 'talhadeira' },

    // Bitolas e ferros comuns
    {
      padrao: /\bferro\s+três\s+oitavos\b/gi,
      substituicao: 'ferro 3/8 (10mm)',
      termo: 'ferro 3/8',
    },
    { padrao: /\bferro\s+3\s*\/\s*8\b/gi, substituicao: 'ferro 3/8 (10mm)', termo: 'ferro 3/8' },
    {
      padrao: /\bferro\s+cinco\s+dezesseis\b/gi,
      substituicao: 'ferro 5/16 (8mm)',
      termo: 'ferro 5/16',
    },
    { padrao: /\bferro\s+5\s*\/\s*16\b/gi, substituicao: 'ferro 5/16 (8mm)', termo: 'ferro 5/16' },
    { padrao: /\bferro\s+um\s+quarto\b/gi, substituicao: 'ferro 1/4 (6.3mm)', termo: 'ferro 1/4' },
    { padrao: /\bferro\s+1\s*\/\s*4\b/gi, substituicao: 'ferro 1/4 (6.3mm)', termo: 'ferro 1/4' },
    {
      padrao: /\bferro\s+cinco\s+ponto\s+zero\b/gi,
      substituicao: 'ferro 5.0mm',
      termo: 'ferro 5.0',
    },
    { padrao: /\bferro\s+5\s*ponto\s*0\b/gi, substituicao: 'ferro 5.0mm', termo: 'ferro 5.0' },
    {
      padrao: /\bferro\s+quatro\s+ponto\s+dois\b/gi,
      substituicao: 'ferro 4.2mm',
      termo: 'ferro 4.2',
    },
  ]

/**
 * Normaliza o texto transcrito de voz, corrigindo dialetos e erros típicos de fonética.
 * Retorna o texto tratado e a lista de correções aplicadas (para auditoria e log).
 */
export function normalizarJargaoObra(textoBruto: string): ResultadoNormalizacao {
  if (!textoBruto || typeof textoBruto !== 'string') {
    return {
      textoOriginal: '',
      textoNormalizado: '',
      houveCorrecao: false,
      correcoes: [],
    }
  }

  let normalizado = textoBruto
  const correcoes: CorrecaoGlossarioItem[] = []

  for (const regra of REGRAS_GLOSSARIO_OBRA) {
    if (regra.padrao.test(normalizado)) {
      // Captura o trecho que deu match antes de substituir
      const matches = normalizado.match(regra.padrao) || []
      matches.forEach((trecho) => {
        correcoes.push({
          original: trecho,
          corrigido: regra.substituicao,
          termoDetectado: regra.termo,
        })
      })
      normalizado = normalizado.replace(regra.padrao, regra.substituicao)
    }
  }

  // Normalização de múltiplos espaços
  normalizado = normalizado.replace(/\s+/g, ' ').trim()

  return {
    textoOriginal: textoBruto,
    textoNormalizado: normalizado,
    houveCorrecao: correcoes.length > 0,
    correcoes,
  }
}
