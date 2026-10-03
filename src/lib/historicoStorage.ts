/**
 * PERSISTÊNCIA OFFLINE E REGISTRO DE HISTÓRICO (CHAT E CÁLCULOS DETERMINÍSTICOS)
 *
 * Garante que:
 * 1. O histórico de conversas do Ajudante IA seja salvo localmente (persistente entre fechamentos).
 * 2. Os cálculos executados pelo motor matemático (na conversa ou na Calculadora) fiquem registrados
 *    com tipo, parâmetros de entrada, fórmula, passos e resumo falado.
 * 3. O usuário possa recuperar tudo offline com busca unificada tolerante a acentos e maiúsculas.
 * 4. Permissões de operador sejam respeitadas (sem vazar valores financeiros restritos ao dono).
 */

export interface RegistroCalculoSalvo {
  id: string
  owner_id: string
  titulo: string // ex: "Cálculo de Parede de Alvenaria", "Cálculo de Concreto", "Área com Desconto"
  tipoCalculo: 'EXATO' | 'ESTIMATIVA' | 'TECNICA'
  categoria:
    | 'area'
    | 'volume'
    | 'alvenaria'
    | 'reboco'
    | 'contrapiso'
    | 'concreto'
    | 'piso'
    | 'pintura'
    | 'telhado'
    | 'orcamento'
    | 'financeiro'
    | 'geral'
  parametrosEntrada: Record<string, unknown>
  resumoEntrada: string // ex: "Parede 8m × 3m, 10% perda"
  resumoResultado: string // ex: "24 m² | 456 blocos cerâmicos, ~5 sacos de cimento, 0.4 m³ areia"
  formula?: string
  passos?: string[]
  aviso?: string
  ttsTexto: string // texto completo pronto para síntese de voz (TTS)
  origem: 'falar' | 'calculadora' | 'orcamento'
  data: string // ISO string
  timestamp: number
}

export interface HistoricoChatPersistente {
  id: string
  owner_id: string
  interactions: Array<{
    id: string
    autor: 'usuario' | 'ajudante'
    texto: string
    tipoCalculo?: 'EXATO' | 'ESTIMATIVA' | 'TECNICA'
    timestamp: number
    cardsAcao?: any[]
    detalhes?: {
      formula?: string
      passos?: string[]
      aviso?: string
      sugestoes?: string[]
      confirmacaoNecessaria?: boolean
      correcoesGlossario?: Array<{ original: string; corrigido: string; termoDetectado: string }>
    }
  }>
  updatedAt: string
}

const CHAT_STORAGE_KEY = 'ajudante_chat_history_v1'
const CALCS_STORAGE_KEY = 'ajudante_calculos_history_v1'
const MAX_CHAT_ITEMS = 80
const MAX_CALCS_ITEMS = 120

/**
 * Normaliza strings para busca insensível a acentos, cedilhas e maiúsculas/minúsculas.
 * Exemplo: "parêde" -> "parede", "CIMENTO" -> "cimento", "aço" -> "aco"
 */
export function normalizarParaBusca(texto: string): string {
  if (!texto) return ''
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Carrega o histórico de mensagens do chat persistido no aparelho
 */
export function carregarChatPersistido(userId?: string): any[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return []
    const parsed: HistoricoChatPersistente = JSON.parse(raw)
    // Se houver userId, valida isolamento de cliente/organização
    if (
      userId &&
      parsed.owner_id &&
      parsed.owner_id !== userId &&
      parsed.owner_id !== 'local_user'
    ) {
      return []
    }
    return Array.isArray(parsed.interactions) ? parsed.interactions : []
  } catch {
    return []
  }
}

/**
 * Salva o histórico de mensagens do chat no aparelho
 */
export function salvarChatPersistido(interactions: any[], userId: string = 'local_user'): void {
  try {
    const limpas = interactions.slice(-MAX_CHAT_ITEMS).map((item) => ({
      id: item.id,
      autor: item.autor,
      texto: item.texto,
      tipoCalculo: item.tipoCalculo,
      timestamp: item.timestamp,
      cardsAcao: item.cardsAcao,
      detalhes: item.detalhes
        ? {
            formula: item.detalhes.formula,
            passos: item.detalhes.passos,
            aviso: item.detalhes.aviso,
            sugestoes: item.detalhes.sugestoes,
            correcoesGlossario: item.detalhes.correcoesGlossario,
          }
        : undefined,
    }))
    const data: HistoricoChatPersistente = {
      id: 'chat_' + userId,
      owner_id: userId,
      interactions: limpas,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // quota ou storage inacessível
  }
}

/**
 * Limpa o histórico de chat persistido do usuário atual
 */
export function limparChatPersistido(userId?: string): void {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (raw && userId) {
      const parsed: HistoricoChatPersistente = JSON.parse(raw)
      if (parsed.owner_id && parsed.owner_id !== userId && parsed.owner_id !== 'local_user') {
        return // não limpa de outro usuário
      }
    }
    localStorage.removeItem(CHAT_STORAGE_KEY)
  } catch {
    // no-op
  }
}

/**
 * Carrega todos os registros de cálculos salvos localmente
 */
export function carregarCalculosPersistidos(userId?: string): RegistroCalculoSalvo[] {
  try {
    const raw = localStorage.getItem(CALCS_STORAGE_KEY)
    if (!raw) return []
    const list: RegistroCalculoSalvo[] = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    if (userId) {
      return list.filter((c) => !c.owner_id || c.owner_id === userId || c.owner_id === 'local_user')
    }
    return list
  } catch {
    return []
  }
}

/**
 * Registra um novo cálculo persistente
 */
export function registrarCalculoPersistente(
  calculo: Omit<RegistroCalculoSalvo, 'id' | 'data' | 'timestamp'> & {
    id?: string
    data?: string
    timestamp?: number
  },
): RegistroCalculoSalvo {
  const novo: RegistroCalculoSalvo = {
    ...calculo,
    id: calculo.id || 'calc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    data: calculo.data || new Date().toISOString(),
    timestamp: calculo.timestamp || Date.now(),
  }

  try {
    const list = carregarCalculosPersistidos()
    // Evita duplicação exata em intervalo de 5 segundos
    const recente = list.find(
      (it) =>
        it.titulo === novo.titulo &&
        it.resumoResultado === novo.resumoResultado &&
        Math.abs(it.timestamp - novo.timestamp) < 5000,
    )
    if (recente) return recente

    const atualizada = [novo, ...list].slice(0, MAX_CALCS_ITEMS)
    localStorage.setItem(CALCS_STORAGE_KEY, JSON.stringify(atualizada))
  } catch {
    // no-op
  }

  return novo
}

/**
 * Limpa o histórico de cálculos do usuário
 */
export function limparCalculosPersistidos(userId?: string): void {
  try {
    if (!userId) {
      localStorage.removeItem(CALCS_STORAGE_KEY)
      return
    }
    const list = carregarCalculosPersistidos()
    const mantidos = list.filter(
      (c) => c.owner_id && c.owner_id !== userId && c.owner_id !== 'local_user',
    )
    localStorage.setItem(CALCS_STORAGE_KEY, JSON.stringify(mantidos))
  } catch {
    // no-op
  }
}

export type TipoItemBusca = 'conversa_usuario' | 'conversa_ajudante' | 'calculo'

export interface ItemResultadoBuscaUnificada {
  id: string
  tipoItem: TipoItemBusca
  titulo: string
  subtitulo?: string
  conteudoPrincipal: string
  detalhe?: string
  data: string
  timestamp: number
  origemId?: string // ex: id da mensagem no chat para scroll direto
  categoriaCalculo?: string
  tipoCalculo?: 'EXATO' | 'ESTIMATIVA' | 'TECNICA'
  formula?: string
  passos?: string[]
  ttsTexto: string
  isFinanceiroSensivel?: boolean // se for valor financeiro restrito ao dono
}

/**
 * Executa a busca unificada em mensagens de chat E em registros de cálculos.
 * É tolerante a acentos e maiúsculas (ex: "parede" = "PAREDE" = "parêde").
 * Respeita privacidade e perfil de Operador (oculta ou anonimiza dados financeiros).
 */
export function buscarNoHistorico(
  termo: string,
  opcoes: {
    interactions?: any[]
    userId?: string
    isOperador?: boolean
  } = {},
): ItemResultadoBuscaUnificada[] {
  const query = normalizarParaBusca(termo)
  if (!query) return []

  const resultados: ItemResultadoBuscaUnificada[] = []

  // 1. BUSCA NAS CONVERSAS DO CHAT (atuais em memória ou persistidas)
  const msgsMemoria = opcoes.interactions || []
  const msgsPersistidas = carregarChatPersistido(opcoes.userId)

  // Mescla sem duplicar por id
  const mapMsgs = new Map<string, any>()
  msgsPersistidas.forEach((m) => {
    if (m?.id && m.id !== 'welcome') mapMsgs.set(m.id, m)
  })
  msgsMemoria.forEach((m) => {
    if (m?.id && m.id !== 'welcome') mapMsgs.set(m.id, m)
  })

  mapMsgs.forEach((msg) => {
    const textoNorm = normalizarParaBusca(msg.texto || '')
    const formulaNorm = normalizarParaBusca(msg.detalhes?.formula || '')
    const passosNorm = normalizarParaBusca((msg.detalhes?.passos || []).join(' '))
    const cardsNorm = normalizarParaBusca(
      (msg.cardsAcao || []).map((c: any) => `${c.titulo} ${c.resumo} ${c.detalhe || ''}`).join(' '),
    )

    const match =
      textoNorm.includes(query) ||
      formulaNorm.includes(query) ||
      passosNorm.includes(query) ||
      cardsNorm.includes(query)

    if (match) {
      const isUser = msg.autor === 'usuario'

      // Se for operador e a mensagem contiver valores financeiros restritos
      const contemFinanceiro =
        /\b(r\$|reais|recebido|gasto|saldo|despesa|faturamento)\b/i.test(msg.texto || '') ||
        msg.cardsAcao?.some((c: any) => c.tipo === 'financeiro')

      if (opcoes.isOperador && contemFinanceiro) {
        // Operador não vê números financeiros de caixa
        return
      }

      const tts = isUser
        ? `Você falou no dia ${new Date(msg.timestamp).toLocaleDateString('pt-BR')}: ${msg.texto}`
        : `O Ajudante respondeu: ${msg.texto}`

      resultados.push({
        id: `chat_res_${msg.id}`,
        tipoItem: isUser ? 'conversa_usuario' : 'conversa_ajudante',
        titulo: isUser ? 'Você disse na conversa' : 'Resposta do Ajudante IA',
        subtitulo: new Date(msg.timestamp).toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
        conteudoPrincipal: msg.texto,
        detalhe: msg.detalhes?.formula || undefined,
        data: new Date(msg.timestamp).toISOString(),
        timestamp: msg.timestamp,
        origemId: msg.id,
        tipoCalculo: msg.tipoCalculo,
        formula: msg.detalhes?.formula,
        passos: msg.detalhes?.passos,
        ttsTexto: tts,
        isFinanceiroSensivel: contemFinanceiro,
      })
    }
  })

  // 2. BUSCA NOS CÁLCULOS DETERMINÍSTICOS PERSISTIDOS
  const calculos = carregarCalculosPersistidos(opcoes.userId)

  calculos.forEach((calc) => {
    // Filtro de operador
    if (opcoes.isOperador && (calc.categoria === 'financeiro' || calc.categoria === 'orcamento')) {
      return
    }

    const tituloNorm = normalizarParaBusca(calc.titulo)
    const entradaNorm = normalizarParaBusca(calc.resumoEntrada)
    const resultadoNorm = normalizarParaBusca(calc.resumoResultado)
    const formulaNorm = normalizarParaBusca(calc.formula || '')
    const passosNorm = normalizarParaBusca((calc.passos || []).join(' '))

    const match =
      tituloNorm.includes(query) ||
      entradaNorm.includes(query) ||
      resultadoNorm.includes(query) ||
      formulaNorm.includes(query) ||
      passosNorm.includes(query)

    if (match) {
      resultados.push({
        id: `calc_res_${calc.id}`,
        tipoItem: 'calculo',
        titulo: calc.titulo,
        subtitulo: `Cálculo realizado em ${new Date(calc.timestamp).toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}`,
        conteudoPrincipal: calc.resumoResultado,
        detalhe: calc.resumoEntrada,
        data: calc.data,
        timestamp: calc.timestamp,
        origemId: calc.id,
        categoriaCalculo: calc.categoria,
        tipoCalculo: calc.tipoCalculo,
        formula: calc.formula,
        passos: calc.passos,
        ttsTexto: calc.ttsTexto || `${calc.titulo}: ${calc.resumoResultado}`,
        isFinanceiroSensivel: calc.categoria === 'financeiro' || calc.categoria === 'orcamento',
      })
    }
  })

  // Ordena os mais recentes primeiro
  return resultados.sort((a, b) => b.timestamp - a.timestamp)
}
