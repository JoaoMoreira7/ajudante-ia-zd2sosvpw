/**
 * CONTEXTO DE CONVERSA E DESFAZER DO AJUDANTE IA
 *
 * Mantém:
 * - Histórico da conversa por voz/texto
 * - Contexto acumulativo ("Tenho uma parede de 5 por 3", depois "Tira a porta de 80 por 210", depois "E quanto de bloco?")
 * - Pilha de ações reversíveis (Desfazer/Corrige/Cancela)
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import { parseLocalIntent, ParsedIntent } from '@/lib/intentParser'
import * as MathEngine from '@/lib/mathEngine'
import { localDB } from '@/lib/localDB'
import { mutateEntity } from '@/lib/syncService'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ReversibleAction } from '@/types/database'

export interface ChatInteraction {
  id: string
  autor: 'usuario' | 'ajudante'
  texto: string
  tipoCalculo?: 'EXATO' | 'ESTIMATIVA' | 'TECNICA'
  detalhes?: {
    formula?: string
    passos?: string[]
    aviso?: string
    sugestoes?: string[]
    confirmacaoNecessaria?: boolean
    acaoPendente?: () => Promise<void>
  }
  timestamp: number
}

export interface ConversationContextData {
  comprimento?: number
  largura?: number
  altura?: number
  areaBruta?: number
  areaLiquida?: number
  aberturas?: Array<{ largura: number; altura: number; descricao?: string }>
  perdaPct?: number
  ultimoAssunto?: string
  clienteId?: string
  obraId?: string
}

interface VoiceContextType {
  interactions: ChatInteraction[]
  contextData: ConversationContextData
  isProcessing: boolean
  statusText: string
  currentPendingConfirm: ChatInteraction | null
  processUserInput: (input: string) => Promise<void>
  confirmCurrentAction: () => Promise<void>
  rejectCurrentAction: () => void
  clearContext: () => void
  undoLastAction: () => Promise<string>
  canUndo: boolean
}

const VoiceContext = createContext<VoiceContextType>({} as any)

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config, isOperador } = useAuth()
  const [interactions, setInteractions] = useState<ChatInteraction[]>([
    {
      id: 'welcome',
      autor: 'ajudante',
      texto: 'Olá! Sou o Ajudante IA. Você fala e eu entendo, calculo e organizo.',
      timestamp: Date.now(),
      detalhes: {
        sugestoes: [
          'Calcula uma parede de 8 por 3',
          'Tira a porta de 80 por 210',
          'Quanto de piso preciso para 30 metros?',
          'Registra uma saída de 350 reais de material',
        ],
      },
    },
  ])
  const [contextData, setContextData] = useState<ConversationContextData>({
    perdaPct: 10,
    aberturas: [],
  })
  const [undoStack, setUndoStack] = useState<ReversibleAction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusText, setStatusText] = useState('Pronto')
  const [currentPendingConfirm, setCurrentPendingConfirm] = useState<ChatInteraction | null>(null)

  // Empilhar ação reversível
  const pushUndo = useCallback((action: ReversibleAction) => {
    setUndoStack((prev) => [action, ...prev.slice(0, 19)])
  }, [])

  const undoLastAction = useCallback(async (): Promise<string> => {
    if (undoStack.length === 0) {
      return 'Nenhuma ação recente para desfazer.'
    }
    const [lastAction, ...rest] = undoStack
    try {
      await lastAction.desfazer()
      setUndoStack(rest)
      return `Desfeito com sucesso: ${lastAction.descricao}`
    } catch {
      return 'Não consegui desfazer essa ação.'
    }
  }, [undoStack])

  const clearContext = useCallback(() => {
    setContextData({ perdaPct: 10, aberturas: [] })
    setInteractions((prev) => [
      ...prev,
      {
        id: 'ctx_clear_' + Date.now(),
        autor: 'ajudante',
        texto: 'Contexto limpo! O que deseja calcular ou registrar agora?',
        timestamp: Date.now(),
      },
    ])
  }, [])

  const processUserInput = async (rawInput: string) => {
    const text = rawInput.trim()
    if (!text) return

    // Adiciona fala do usuário
    const userMsgId = 'usr_' + Date.now()
    setInteractions((prev) => [
      ...prev,
      {
        id: userMsgId,
        autor: 'usuario',
        texto: text,
        timestamp: Date.now(),
      },
    ])

    setIsProcessing(true)
    setStatusText('ENTENDENDO...')

    try {
      // Tenta Skip Cloud Agent se online e autenticado, para enriquecimento semântico
      let skipAgentIntent: any = null
      if (navigator.onLine && pb.authStore.isValid) {
        try {
          const res = await fetch(`${pb.baseUrl}/backend/v1/interpret`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: pb.authStore.token,
            },
            body: JSON.stringify({ message: text }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data?.intent) {
              skipAgentIntent = data.intent
            }
          }
        } catch {
          // Degradação graciosa: fallback local imediato
        }
      }

      // 1. Interpretação Local Primeiro ou enriquecida pelo agente
      const parsed: ParsedIntent = parseLocalIntent(text, contextData)
      if (skipAgentIntent?.intent && parsed.confidence < 0.8) {
        parsed.intent = skipAgentIntent.intent
        parsed.params = { ...skipAgentIntent, ...parsed.params }
      }

      // 2. Se for comando de DESFAZER
      if (parsed.intent === 'acao_desfazer') {
        const msgDesfazer = await undoLastAction()
        setInteractions((prev) => [
          ...prev,
          {
            id: 'resp_' + Date.now(),
            autor: 'ajudante',
            texto: msgDesfazer,
            timestamp: Date.now(),
          },
        ])
        return
      }

      // 3. EXECUÇÃO DETERMINÍSTICA DO MOTOR MATEMÁTICO E REGRAS
      let respostaTexto = ''
      let tipoBadge: 'EXATO' | 'ESTIMATIVA' | 'TECNICA' = 'EXATO'
      let formula: string | undefined
      let passos: string[] | undefined
      let aviso: string | undefined
      let sugestoes: string[] | undefined

      if (parsed.intent === 'calc_area') {
        const comp = parsed.params.comprimento
        const alt = parsed.params.altura
        const res = MathEngine.calcularAreaRetangulo(comp, alt)
        respostaTexto = `ÁREA DA PAREDE: ${res.formula}`
        formula = res.formula
        passos = res.passos
        tipoBadge = 'EXATO'
        sugestoes = [
          'Tira a porta de 80 por 210',
          'Quanto de bloco cerâmico?',
          'E quanto de reboco?',
        ]

        setContextData((prev) => ({
          ...prev,
          comprimento: comp,
          altura: alt,
          areaBruta: res.valor,
          areaLiquida: res.valor,
          aberturas: [],
        }))
      } else if (parsed.intent === 'descontar_abertura') {
        const pLarg = parsed.params.largura
        const pAlt = parsed.params.altura
        const comp = contextData.comprimento || 8
        const alt = contextData.altura || 3
        const novasAberturas = [
          ...(contextData.aberturas || []),
          { largura: pLarg, altura: pAlt, descricao: 'Porta/Abertura' },
        ]
        const res = MathEngine.calcularAreaComDesconto(comp, alt, novasAberturas)

        respostaTexto = `Descontando vão de ${pLarg}m × ${pAlt}m:\nÁrea bruta: ${res.valor.areaBruta} m² | Desconto vãos: ${res.valor.areaAberturas} m²\nÁREA LÍQUIDA: ${res.valor.areaLiquida} m²`
        formula = res.formula
        passos = res.passos
        tipoBadge = 'EXATO'
        sugestoes = ['Quanto de bloco?', 'Quanto de reboco?', 'Faz o orçamento']

        setContextData((prev) => ({
          ...prev,
          areaLiquida: res.valor.areaLiquida,
          aberturas: novasAberturas,
        }))
      } else if (parsed.intent === 'ajustar_perda') {
        const pPct = parsed.params.perdaPct
        setContextData((prev) => ({ ...prev, perdaPct: pPct }))
        respostaTexto = `Margem de perda ajustada para ${pPct}%. Todos os cálculos considerarão esse adicional.`
        tipoBadge = 'EXATO'
      } else if (parsed.intent === 'calc_alvenaria') {
        const area = contextData.areaLiquida || contextData.areaBruta || parsed.params.areaM2 || 20
        const res = MathEngine.calcularAlvenaria({
          areaM2: area,
          perdaPct: contextData.perdaPct || 10,
        })
        respostaTexto = `QUANTIDADE DE ALVENARIA para ${area} m²:\n• ${res.valor.quantidadeBlocos} blocos cerâmicos (14x19x29)\n• ~${res.valor.cimentoKg} kg de cimento\n• ~${res.valor.areiaM3} m³ de areia`
        formula = res.formula
        passos = res.passos
        aviso = res.aviso
        tipoBadge = 'ESTIMATIVA'
        sugestoes = ['E quanto de reboco?', 'Faz o orçamento', 'Baixa 10 sacos de cimento']
      } else if (parsed.intent === 'calc_reboco') {
        const area = contextData.areaLiquida || contextData.areaBruta || parsed.params.areaM2 || 20
        const res = MathEngine.calcularReboco({
          areaM2: area,
          espessuraCm: 2,
          perdaPct: contextData.perdaPct || 10,
        })
        respostaTexto = `REBOCO para ${area} m² (2 cm espessura):\n• ~${res.valor.cimentoSacos50kg} sacos de cimento (50kg)\n• ~${res.valor.calSacos20kg} sacos de cal\n• ~${res.valor.areiaM3} m³ de areia média`
        formula = res.formula
        passos = res.passos
        aviso = res.aviso
        tipoBadge = 'ESTIMATIVA'
      } else if (parsed.intent === 'calc_piso') {
        const area = parsed.params.areaM2 || 30
        const res = MathEngine.calcularPiso({ areaM2: area, perdaPct: contextData.perdaPct || 10 })
        respostaTexto = `REVESTIMENTO/PISO para ${area} m²:\n• ${res.valor.areaTotalComPerda} m² de piso com 10% perda (${res.valor.caixasPiso} caixas)\n• ~${res.valor.argamassaColanteSacos20kg} sacos de argamassa colante\n• ~${res.valor.rejunteKg} kg de rejunte`
        formula = res.formula
        passos = res.passos
        aviso = res.aviso
        tipoBadge = 'ESTIMATIVA'
        sugestoes = ['Faz o orçamento', 'Adicionar aos materiais']
      } else if (parsed.intent === 'aritmetica_simples') {
        respostaTexto = `Resultado: ${parsed.params.n1} ${parsed.params.op} ${parsed.params.n2} = ${parsed.params.resultado}`
        formula = `${parsed.params.n1} ${parsed.params.op} ${parsed.params.n2} = ${parsed.params.resultado}`
        tipoBadge = 'EXATO'
      } else if (parsed.intent === 'consultar_saldo' && isOperador) {
        // PERMISSÃO: Operador não tem acesso a saldo/custos
        respostaTexto =
          'Seu perfil de acesso é Operador. A consulta de valores financeiros e saldos é reservada ao Dono da obra.'
        tipoBadge = 'EXATO'
      } else if (parsed.intent === 'registrar_saida' && isOperador) {
        respostaTexto =
          'Seu perfil de acesso é Operador. O registro de custos e saídas financeiras é restrito ao Dono da obra.'
        tipoBadge = 'EXATO'
      } else if (parsed.intent === 'registrar_entrada' && isOperador) {
        respostaTexto =
          'Seu perfil de acesso é Operador. O registro de pagamentos e entradas financeiras é restrito ao Dono da obra.'
        tipoBadge = 'EXATO'
      } else if (parsed.intent === 'registrar_saida') {
        // OPERAÇÃO FINANCEIRA COM CONFIRMAÇÃO OBRIGATÓRIA
        const val = parsed.params.valor
        const cat = parsed.params.categoria
        const desc = parsed.params.descricao

        const executeSaida = async () => {
          const newId = await mutateEntity('financeiro', 'create', {
            id: 'fin_' + Date.now(),
            owner_id: pb.authStore.model?.id || 'local_user',
            tipo: 'saida' as const,
            categoria: cat as any,
            descricao: desc,
            valor: val,
            data: new Date().toISOString().split('T')[0],
            status: 'pago' as const,
          })
          pushUndo({
            id: 'undo_' + Date.now(),
            descricao: `Saída de R$ ${val.toFixed(2)} (${desc})`,
            timestamp: Date.now(),
            desfazer: async () => {
              await mutateEntity('financeiro', 'delete', { id: newId })
            },
          })
        }

        const confirmMsg: ChatInteraction = {
          id: 'confirm_' + Date.now(),
          autor: 'ajudante',
          texto: `Você deseja registrar uma saída de R$ ${val.toFixed(2)} (${cat} - ${desc})?`,
          timestamp: Date.now(),
          detalhes: {
            confirmacaoNecessaria: true,
            acaoPendente: executeSaida,
          },
        }
        setCurrentPendingConfirm(confirmMsg)
        setInteractions((prev) => [...prev, confirmMsg])
        return
      } else if (parsed.intent === 'registrar_entrada') {
        // ENTRADA FINANCEIRA COM CONFIRMAÇÃO
        const val = parsed.params.valor
        const desc = parsed.params.descricao

        const executeEntrada = async () => {
          const newId = await mutateEntity('financeiro', 'create', {
            id: 'fin_' + Date.now(),
            owner_id: pb.authStore.model?.id || 'local_user',
            tipo: 'entrada' as const,
            categoria: 'pagamento',
            descricao: desc,
            valor: val,
            data: new Date().toISOString().split('T')[0],
            status: 'pago' as const,
          })
          pushUndo({
            id: 'undo_' + Date.now(),
            descricao: `Entrada de R$ ${val.toFixed(2)} (${desc})`,
            timestamp: Date.now(),
            desfazer: async () => {
              await mutateEntity('financeiro', 'delete', { id: newId })
            },
          })
        }

        const confirmMsg: ChatInteraction = {
          id: 'confirm_' + Date.now(),
          autor: 'ajudante',
          texto: `Você deseja registrar um recebimento de R$ ${val.toFixed(2)} (${desc})?`,
          timestamp: Date.now(),
          detalhes: {
            confirmacaoNecessaria: true,
            acaoPendente: executeEntrada,
          },
        }
        setCurrentPendingConfirm(confirmMsg)
        setInteractions((prev) => [...prev, confirmMsg])
        return
      } else if (parsed.intent === 'estoque_adicionar') {
        const qtd = parsed.params.quantidade
        const mat = parsed.params.material
        const un = parsed.params.unidade || 'saco'
        const item = await localDB.put('materiais_estoque', {
          id: 'mat_' + Date.now(),
          owner_id: 'local_user',
          nome: mat,
          quantidade: qtd,
          unidade: un as any,
          estoque_minimo: 5,
        })
        respostaTexto = `Registrado no estoque: ${qtd} ${un}(s) de ${mat}.`
        tipoBadge = 'EXATO'
      } else if (parsed.intent === 'estoque_consultar_acabando') {
        const mats = await localDB.getAll('materiais_estoque')
        const acabando = mats.filter((m) => m.estoque_minimo && m.quantidade <= m.estoque_minimo)
        if (acabando.length === 0) {
          respostaTexto = 'Nenhum material está com estoque baixo no momento.'
        } else {
          respostaTexto =
            `Materiais que estão acabando:\n` +
            acabando.map((m) => `• ${m.nome}: resta apenas ${m.quantidade} ${m.unidade}`).join('\n')
        }
        tipoBadge = 'EXATO'
      } else if (parsed.intent === 'diario_obra') {
        const serv = parsed.params.servico
        const qtd = parsed.params.quantidade
        const obras = await localDB.getAll('obras')
        const obraAlvo = obras[0]
        if (obraAlvo) {
          const entry = await localDB.put('diario_obra', {
            id: 'dia_' + Date.now(),
            owner_id: 'local_user',
            obra_id: obraAlvo.id,
            data: new Date().toISOString(),
            servico: serv,
            quantidade: qtd,
            observacoes: parsed.params.textoCompleto,
          })
          respostaTexto = `Diário registrado na obra "${obraAlvo.titulo}": ${serv} (${qtd} m²).`
        } else {
          respostaTexto = `Diário anotado: ${serv} (${qtd} m²).`
        }
        tipoBadge = 'EXATO'
      } else {
        // Fallback amigável
        respostaTexto =
          parsed.respostaSugerida ||
          'Não tenho informação suficiente para calcular isso. Qual a medida da parede ou o serviço que você precisa?'
        tipoBadge = 'EXATO'
        sugestoes = [
          'Calcula parede de 8 por 3',
          'Quanto de piso para 20m²?',
          'Registra uma despesa',
        ]
      }

      const assistantMsg: ChatInteraction = {
        id: 'resp_' + Date.now(),
        autor: 'ajudante',
        texto: respostaTexto,
        tipoCalculo: tipoBadge,
        timestamp: Date.now(),
        detalhes: {
          formula,
          passos,
          aviso,
          sugestoes,
        },
      }

      setInteractions((prev) => [...prev, assistantMsg])
    } catch {
      setInteractions((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          autor: 'ajudante',
          texto: 'Não consegui concluir esse cálculo. Confira as medidas e tente novamente.',
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsProcessing(false)
      setStatusText('Pronto')
    }
  }

  const confirmCurrentAction = async () => {
    if (!currentPendingConfirm || !currentPendingConfirm.detalhes?.acaoPendente) return
    try {
      await currentPendingConfirm.detalhes.acaoPendente()
      setInteractions((prev) => [
        ...prev,
        {
          id: 'conf_done_' + Date.now(),
          autor: 'ajudante',
          texto: 'Confirmado e registrado com sucesso!',
          timestamp: Date.now(),
        },
      ])
    } catch {
      setInteractions((prev) => [
        ...prev,
        {
          id: 'conf_fail_' + Date.now(),
          autor: 'ajudante',
          texto: 'Não consegui salvar essa alteração. Tente novamente.',
          timestamp: Date.now(),
        },
      ])
    } finally {
      setCurrentPendingConfirm(null)
    }
  }

  const rejectCurrentAction = () => {
    setCurrentPendingConfirm(null)
    setInteractions((prev) => [
      ...prev,
      {
        id: 'conf_cancel_' + Date.now(),
        autor: 'ajudante',
        texto: 'Operação cancelada.',
        timestamp: Date.now(),
      },
    ])
  }

  return (
    <VoiceContext.Provider
      value={{
        interactions,
        contextData,
        isProcessing,
        statusText,
        currentPendingConfirm,
        processUserInput,
        confirmCurrentAction,
        rejectCurrentAction,
        clearContext,
        undoLastAction,
        canUndo: undoStack.length > 0,
      }}
    >
      {children}
    </VoiceContext.Provider>
  )
}

export const useVoiceContext = () => useContext(VoiceContext)
