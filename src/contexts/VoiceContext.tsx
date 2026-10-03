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
import { normalizarJargaoObra } from '@/lib/obraGlossary'
import { obterConsumoAudio, registrarUsoAudio } from '@/lib/audioUsageTracker'
import { verificarLimiteAudioMinutos } from '@/lib/planLimits'

export type CardAcaoTipo = 'material' | 'ocorrencia' | 'financeiro' | 'calculo' | 'aviso'

export interface CardAcaoItem {
  id: string
  tipo: CardAcaoTipo
  titulo: string
  resumo: string
  detalhe?: string
  status: 'sucesso' | 'aviso' | 'erro' | 'pendente'
  icone?: string
  ttsTexto: string
}

export interface ChatInteraction {
  id: string
  autor: 'usuario' | 'ajudante'
  texto: string
  tipoCalculo?: 'EXATO' | 'ESTIMATIVA' | 'TECNICA'
  timestamp: number
  cardsAcao?: CardAcaoItem[] // Melhoria 2: confirmação visual em cards coloridos compactos
  detalhes?: {
    formula?: string
    passos?: string[]
    aviso?: string
    sugestoes?: string[]
    confirmacaoNecessaria?: boolean
    acaoPendente?: () => Promise<void>
    correcoesGlossario?: Array<{ original: string; corrigido: string; termoDetectado: string }>
  }
}
export interface DialogoOrcamentoVoz {
  etapa: 'aguardando_preco_m2' | 'aguardando_materiais' | 'aguardando_sinal' | 'aguardando_parcelas'
  servico: string
  area: number
  precoM2?: number
  acrescentarMateriais?: boolean
  sinal?: number
  numeroParcelas?: number
  orcamentoGeradoId?: string
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
  clienteNome?: string
  obraId?: string
  fluxoAtivo?: 'orcamento' | 'estoque'
  dialogoOrcamento?: DialogoOrcamentoVoz
  ultimoCalculoMateriais?: MathEngine.ListaMateriaisEstimativa
}

export interface VoiceContextType {
  interactions: ChatInteraction[]
  contextData: ConversationContextData
  isProcessing: boolean
  statusText: string
  currentPendingConfirm: ChatInteraction | null
  processUserInput: (input: string, audioDurationSeconds?: number) => Promise<void>
  confirmCurrentAction: () => Promise<void>
  rejectCurrentAction: () => void
  clearContext: () => void
  undoLastAction: () => Promise<string>
  canUndo: boolean
}

const VoiceContext = createContext<VoiceContextType>({} as any)

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config, isOperador, assinatura, plano, isTrial, profile } = useAuth()
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
  const [conversationId, setConversationId] = useState<string | null>(() => {
    return localStorage.getItem('ajudante_chat_conv_id') || null
  })
  const [contextData, setContextData] = useState<ConversationContextData>({
    perdaPct: 10,
    aberturas: [],
  })
  const [undoStack, setUndoStack] = useState<ReversibleAction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusText, setStatusText] = useState('Pronto')
  const [currentPendingConfirm, setCurrentPendingConfirm] = useState<ChatInteraction | null>(null)

  // Empilhar ação reversível local por dispositivo
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
    setConversationId(null)
    localStorage.removeItem('ajudante_chat_conv_id')
    setInteractions((prev) => [
      ...prev,
      {
        id: 'ctx_clear_' + Date.now(),
        autor: 'ajudante',
        texto: 'Conversa renovada! O que você gostaria de calcular ou organizar agora?',
        timestamp: Date.now(),
        detalhes: {
          sugestoes: [
            'Calcula parede de 5 por 3',
            'Quanto de piso para 25 metros?',
            'Registra saída de material',
          ],
        },
      },
    ])
  }, [])

  const processUserInput = async (rawInput: string, audioDurationSeconds: number = 0) => {
    const textOriginal = rawInput.trim()
    if (!textOriginal) return

    // MELHORIA 1: Normalização fonética e jargão de obra antes do parse e envio
    const normalizacao = normalizarJargaoObra(textOriginal)
    const text = normalizacao.textoNormalizado

    // MELHORIA 3: Registrar e verificar consumo de minutos de áudio
    const duracaoSegundos = audioDurationSeconds > 0 ? audioDurationSeconds : 5
    let consumoAtual = obterConsumoAudio(profile?.id)
    if (audioDurationSeconds > 0) {
      consumoAtual = registrarUsoAudio(duracaoSegundos, profile?.id)
    }

    const minutosUsados = consumoAtual.segundosUsados / 60
    const checagemAudio = verificarLimiteAudioMinutos(
      plano,
      minutosUsados,
      assinatura?.modulos_liberados,
      isTrial,
    )

    // Adiciona fala do usuário (registra original e se houve normalização para clareza)
    const userMsgId = 'usr_' + Date.now()
    setInteractions((prev) => [
      ...prev,
      {
        id: userMsgId,
        autor: 'usuario',
        texto: textOriginal,
        timestamp: Date.now(),
        detalhes: {
          correcoesGlossario: normalizacao.houveCorrecao ? normalizacao.correcoes : undefined,
        },
      },
    ])

    // Se o limite de minutos de áudio por plano foi ultrapassado:
    // REGRA DE OURO: Bloqueia apenas a nuvem / IA; permite processamento determinístico local!
    const audioLimiteAtingido = !checagemAudio.permitido

    setIsProcessing(true)
    setStatusText(audioLimiteAtingido ? 'PROCESSANDO LOCAL...' : 'ENTENDENDO...')

    try {
      // Tenta Skip Cloud Agent se online e autenticado, para diálogo e semântica
      let skipAgentIntent: any = null
      let skipAgentReplyText: string | null = null
      let skipAgentActions: any[] | null = null

      // Se o limite de áudio foi ultrapassado, não consulta o Skip Cloud Agent na nuvem
      if (!audioLimiteAtingido && navigator.onLine && pb.authStore.isValid) {
        try {
          const res = await fetch(`${pb.baseUrl}/backend/v1/interpret`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: pb.authStore.token,
            },
            body: JSON.stringify({
              message: text,
              conversation_id: conversationId || undefined,
              audio_seconds: duracaoSegundos,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data?.conversation_id) {
              setConversationId(data.conversation_id)
              localStorage.setItem('ajudante_chat_conv_id', data.conversation_id)
            }
            if (data?.intent) {
              skipAgentIntent = data.intent
            }
            if (data?.actions && Array.isArray(data.actions)) {
              skipAgentActions = data.actions
            }
            if (data?.content && typeof data.content === 'string') {
              skipAgentReplyText = data.content.trim()
            }
          }
        } catch {
          // Degradação graciosa: fallback local imediato se offline ou erro
        }
      }

      // Se houver múltiplas ações retornadas pela IA (Fala composta - Melhoria 2):
      // Processa cada ação e gera cards visuais coloridos compactos
      if (skipAgentActions && skipAgentActions.length > 0) {
        const cardsGerados: CardAcaoItem[] = []
        const titulosResumo: string[] = []

        for (let i = 0; i < skipAgentActions.length; i++) {
          const acao = skipAgentActions[i]
          const actionType = acao.type || acao.tipo || 'acao'
          const intentName = acao.intent || ''
          const params = acao.params || {}

          if (actionType === 'material' || intentName.includes('estoque')) {
            const mat = params.material || 'Material'
            const qtd = params.quantidade || 1
            const un = params.unidade || 'un'

            // Atualiza localmente o estoque
            const todosMats = await localDB.getAll('materiais_estoque')
            const existente = todosMats.find((m) =>
              m.nome.toLowerCase().includes(mat.toLowerCase()),
            )
            if (existente) {
              await mutateEntity('materiais_estoque', 'update', {
                ...existente,
                quantidade: existente.quantidade + qtd,
              })
            } else {
              await mutateEntity('materiais_estoque', 'create', {
                id: 'mat_' + Date.now() + '_' + i,
                owner_id: pb.authStore.model?.id || 'local_user',
                nome: mat,
                quantidade: qtd,
                unidade: un as any,
                estoque_minimo: 5,
              })
            }

            cardsGerados.push({
              id: `card_mat_${i}`,
              tipo: 'material',
              titulo: 'Material Registrado',
              resumo: `${qtd} ${un} de ${mat}`,
              status: 'sucesso',
              icone: 'package',
              ttsTexto: `Material: ${qtd} ${un} de ${mat} adicionado ao estoque.`,
            })
            titulosResumo.push(`🟩 Material: ${qtd} ${un} de ${mat}`)
          } else if (actionType === 'ocorrencia' || intentName.includes('diario')) {
            const serv =
              params.atividade || params.servico || params.ocorrencia || 'Atividade registrada'
            const obs = params.observacao || params.textoCompleto || text
            const obras = await localDB.getAll('obras')
            const obraAlvo = obras[0]
            await localDB.put('diario_obra', {
              id: 'dia_' + Date.now() + '_' + i,
              owner_id: 'local_user',
              obra_id: obraAlvo ? obraAlvo.id : 'obra_padrao',
              data: new Date().toISOString(),
              servico: serv,
              quantidade: params.quantidade || 0,
              observacoes: obs,
            })

            cardsGerados.push({
              id: `card_oco_${i}`,
              tipo: 'ocorrencia',
              titulo: 'Ocorrência de Obra',
              resumo: serv,
              detalhe: obs !== serv ? obs : undefined,
              status: 'erro', // Vermelho para ocorrência/falta/problema
              icone: 'alert-triangle',
              ttsTexto: `Ocorrência: ${serv}.`,
            })
            titulosResumo.push(`🟥 Ocorrência: ${serv}`)
          } else if (
            actionType === 'financeiro' ||
            intentName.includes('saida') ||
            intentName.includes('entrada')
          ) {
            const val = params.valor || 0
            const desc = params.descricao || 'Despesa'
            const tipoFin = intentName.includes('entrada') ? 'entrada' : 'saida'
            await mutateEntity('financeiro', 'create', {
              id: 'fin_' + Date.now() + '_' + i,
              owner_id: pb.authStore.model?.id || 'local_user',
              tipo: tipoFin,
              categoria: params.categoria || 'outros',
              descricao: desc,
              valor: val,
              data: new Date().toISOString().split('T')[0],
              status: 'pago',
            })

            cardsGerados.push({
              id: `card_fin_${i}`,
              tipo: 'financeiro',
              titulo: tipoFin === 'entrada' ? 'Recebimento' : 'Despesa Registrada',
              resumo: `R$ ${val.toFixed(2)} — ${desc}`,
              status: 'aviso',
              icone: 'dollar-sign',
              ttsTexto: `Financeiro: ${tipoFin === 'entrada' ? 'Recebido' : 'Gasto'} R$ ${val.toFixed(2)} com ${desc}.`,
            })
            titulosResumo.push(`🟨 Financeiro: R$ ${val.toFixed(2)} (${desc})`)
          }
        }

        const assistantMsg: ChatInteraction = {
          id: 'resp_' + Date.now(),
          autor: 'ajudante',
          texto:
            skipAgentReplyText ||
            `Entendido! Identifiquei e processei ${cardsGerados.length} ações nesta fala:`,
          tipoCalculo: 'EXATO',
          timestamp: Date.now(),
          cardsAcao: cardsGerados,
        }

        setInteractions((prev) => [...prev, assistantMsg])
        return
      }

      // 1. SE HOUVER FLUXO DE ORÇAMENTO ATIVO, INTERCEPTA PASSOS DO DIÁLOGO GUIADO
      if (contextData.fluxoAtivo === 'orcamento' && contextData.dialogoOrcamento) {
        const dlg = contextData.dialogoOrcamento
        const lower = text.toLowerCase().trim()

        // Comando CANCELA aborta sem salvar
        if (lower === 'cancela' || lower === 'cancelar' || lower === 'abortar') {
          setContextData((prev) => ({
            ...prev,
            fluxoAtivo: undefined,
            dialogoOrcamento: undefined,
          }))
          setInteractions((prev) => [
            ...prev,
            {
              id: 'resp_' + Date.now(),
              autor: 'ajudante',
              texto: 'Orçamento cancelado sem salvar.',
              timestamp: Date.now(),
            },
          ])
          return
        }

        // ETAPA 1: AGUARDANDO PREÇO DA MÃO DE OBRA POR M²
        if (dlg.etapa === 'aguardando_preco_m2') {
          // Extrai número da resposta em linguagem natural ("cinquenta reais", "50 reais o metro", "55", etc)
          const numMatch = lower.match(/(\d+[.,]?\d*)/)
          let preco = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : null
          if (!preco) {
            // Conversão de números comuns falados por extenso
            if (lower.includes('cinquenta')) preco = 50
            else if (lower.includes('quarenta')) preco = 40
            else if (lower.includes('sessenta')) preco = 60
            else if (lower.includes('trinta')) preco = 30
            else if (lower.includes('setenta')) preco = 70
            else if (lower.includes('oitenta')) preco = 80
            else if (lower.includes('cem')) preco = 100
          }

          if (!preco || preco <= 0) {
            setInteractions((prev) => [
              ...prev,
              {
                id: 'resp_' + Date.now(),
                autor: 'ajudante',
                texto:
                  'Não entendi o valor. Qual o preço da mão de obra por metro quadrado? (Ex: 50 reais)',
                timestamp: Date.now(),
              },
            ])
            return
          }

          // Atualiza etapa para perguntar sobre materiais
          setContextData((prev) => ({
            ...prev,
            dialogoOrcamento: {
              ...dlg,
              precoM2: preco,
              etapa: 'aguardando_materiais',
            },
          }))

          const totalMaoObra = dlg.area * preco
          setInteractions((prev) => [
            ...prev,
            {
              id: 'resp_' + Date.now(),
              autor: 'ajudante',
              texto: `Entendido: R$ ${preco.toFixed(2)} por m² (${dlg.area} m² = R$ ${totalMaoObra.toFixed(2)} de mão de obra).\n\nDeseja acrescentar materiais na estimativa? (Responda "Sim" ou "Não")`,
              timestamp: Date.now(),
              detalhes: {
                sugestoes: ['Sim, acrescentar materiais', 'Não, só mão de obra', 'Cancela'],
              },
            },
          ])
          return
        }

        // ETAPA 2: AGUARDANDO ADICIONAR MATERIAIS
        if (dlg.etapa === 'aguardando_materiais') {
          const querMateriais =
            lower.includes('sim') ||
            lower.includes('claro') ||
            lower.includes('pode') ||
            lower.includes('acrescenta') ||
            lower.includes('com material')

          setContextData((prev) => ({
            ...prev,
            dialogoOrcamento: {
              ...dlg,
              acrescentarMateriais: querMateriais,
              etapa: 'aguardando_sinal',
            },
          }))

          setInteractions((prev) => [
            ...prev,
            {
              id: 'resp_' + Date.now(),
              autor: 'ajudante',
              texto: querMateriais
                ? 'Materiais incluídos na estimativa! Deseja definir um sinal de entrada? Diga o valor (ex: "sinal de 1000 reais") ou responda "Sem sinal".'
                : 'Certo, somente mão de obra. Deseja definir um sinal de entrada? Diga o valor ou "Sem sinal".',
              timestamp: Date.now(),
              detalhes: {
                sugestoes: ['Sem sinal', 'Sinal de 500 reais', 'Sinal de 1000 reais', 'Cancela'],
              },
            },
          ])
          return
        }

        // ETAPA 3: AGUARDANDO SINAL
        if (dlg.etapa === 'aguardando_sinal') {
          let sinalValor = 0
          if (!lower.includes('sem') && !lower.includes('não') && !lower.includes('nao')) {
            const numMatch = lower.match(/(\d+[.,]?\d*)/)
            if (numMatch) {
              sinalValor = parseFloat(numMatch[1].replace(',', '.'))
            }
          }

          setContextData((prev) => ({
            ...prev,
            dialogoOrcamento: {
              ...dlg,
              sinal: sinalValor,
              etapa: 'aguardando_parcelas',
            },
          }))

          setInteractions((prev) => [
            ...prev,
            {
              id: 'resp_' + Date.now(),
              autor: 'ajudante',
              texto: `Sinal: R$ ${sinalValor.toFixed(2)}. Em quantas parcelas deseja dividir o saldo restante? (Ex: 1 vez, 2 vezes, 3 parcelas)`,
              timestamp: Date.now(),
              detalhes: {
                sugestoes: ['À vista (1x)', '2 parcelas', '3 parcelas', 'Cancela'],
              },
            },
          ])
          return
        }

        // ETAPA 4: AGUARDANDO NÚMERO DE PARCELAS -> FINALIZAÇÃO E SALVAMENTO
        if (dlg.etapa === 'aguardando_parcelas') {
          const numMatch = lower.match(/(\d+)/)
          let parcelasCount = numMatch ? parseInt(numMatch[1], 10) : 1
          if (lower.includes('duas') || lower.includes('dois')) parcelasCount = 2
          if (lower.includes('tres') || lower.includes('três')) parcelasCount = 3
          if (parcelasCount < 1) parcelasCount = 1

          // Monta itens determinísticos
          const itensOrc: Array<{
            descricao: string
            quantidade: number
            unidade: string
            preco_unitario: number
            total: number
            categoria: string
          }> = []

          // Mão de obra calculada determinística
          const precoUnitarioMaoObra = dlg.precoM2 || 50
          const totalMaoObra = dlg.area * precoUnitarioMaoObra
          itensOrc.push({
            descricao: `Mão de obra para ${dlg.servico} (${dlg.area} m²)`,
            quantidade: dlg.area,
            unidade: 'm²',
            preco_unitario: precoUnitarioMaoObra,
            total: totalMaoObra,
            categoria: 'mão de obra',
          })

          // Se escolheu materiais, usa o motor determinístico
          if (dlg.acrescentarMateriais) {
            const servicoTipo = dlg.servico.includes('piso')
              ? 'piso'
              : dlg.servico.includes('reboco')
                ? 'reboco'
                : dlg.servico.includes('pintura')
                  ? 'pintura'
                  : 'alvenaria'
            const est = MathEngine.gerarEstimativaMateriais(servicoTipo, dlg.area, 10)
            est.valor.itens.forEach((mat) => {
              // Preço estimado médio por item de material
              let precoMat = 38.0
              if (mat.nome.includes('Bloco')) precoMat = 2.8
              else if (mat.nome.includes('Areia')) precoMat = 140.0
              else if (mat.nome.includes('Cal')) precoMat = 18.0
              else if (mat.nome.includes('Piso')) precoMat = 45.0
              else if (mat.nome.includes('Tinta')) precoMat = 260.0

              itensOrc.push({
                descricao: `${mat.nome} (estimativa)`,
                quantidade: mat.quantidade,
                unidade: mat.unidade,
                preco_unitario: precoMat,
                total: Number((mat.quantidade * precoMat).toFixed(2)),
                categoria: 'materiais',
              })
            })
          }

          // Cálculo determinístico final
          const calcFinal = MathEngine.calcularOrcamento(
            itensOrc.map((it) => ({
              descricao: it.descricao,
              quantidade: it.quantidade,
              unidade: it.unidade,
              precoUnitario: it.preco_unitario,
              categoria: it.categoria as any,
            })),
            {
              sinal: dlg.sinal || 0,
              numeroParcelas: parcelasCount,
            },
          )

          // Salva no banco local com Last-Write-Wins / SyncQueue
          const novoOrcamentoId = 'orc_' + Date.now()
          const orcSalvo = {
            id: novoOrcamentoId,
            owner_id: pb.authStore.model?.id || 'local_user',
            cliente_id: contextData.clienteId,
            titulo: `Orçamento de ${dlg.servico.toUpperCase()} (${dlg.area} m²)`,
            itens: itensOrc,
            subtotal: calcFinal.valor.subtotal,
            desconto: 0,
            total: calcFinal.valor.total,
            status: 'criado' as const,
            sinal: dlg.sinal || 0,
            parcelas: calcFinal.valor.parcelas.map((p) => ({
              numero: p.numero,
              valor: p.valor,
              vencimento: new Date(Date.now() + p.numero * 30 * 86400000)
                .toISOString()
                .split('T')[0],
              status: 'pendente' as const,
            })),
            observacoes: 'Orçamento gerado por comando de voz com motor determinístico.',
            created: new Date().toISOString(),
          }

          await mutateEntity('orcamentos', 'create', orcSalvo)

          // Adiciona ação reversível à pilha de desfazer
          pushUndo({
            id: 'undo_' + Date.now(),
            descricao: `Criação do Orçamento "${orcSalvo.titulo}"`,
            timestamp: Date.now(),
            desfazer: async () => {
              await mutateEntity('orcamentos', 'delete', { id: novoOrcamentoId })
            },
          })

          // Limpa diálogo
          setContextData((prev) => ({
            ...prev,
            fluxoAtivo: undefined,
            dialogoOrcamento: undefined,
          }))

          const parcelasText =
            parcelasCount > 1
              ? `${parcelasCount} parcelas de R$ ${calcFinal.valor.parcelas[0]?.valor.toFixed(2)}`
              : 'À vista'

          const whatsLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(
            `*ORÇAMENTO: ${orcSalvo.titulo}*\nTotal: R$ ${calcFinal.valor.total.toFixed(2)}\nSinal: R$ ${(dlg.sinal || 0).toFixed(2)}\nCondições: ${parcelasText}\n\nJC Construções`,
          )}`

          setInteractions((prev) => [
            ...prev,
            {
              id: 'resp_' + Date.now(),
              autor: 'ajudante',
              texto: `ORÇAMENTO CRIADO COM SUCESSO!\n\n• Serviço: ${dlg.servico} (${dlg.area} m²)\n• Mão de obra: R$ ${totalMaoObra.toFixed(2)}\n• Materiais: ${dlg.acrescentarMateriais ? 'Incluídos' : 'Não incluídos'}\n• TOTAL: R$ ${calcFinal.valor.total.toFixed(2)}\n• Sinal: R$ ${(dlg.sinal || 0).toFixed(2)}\n• Pagamento: ${parcelasText}\n\nDeseja compartilhar com o cliente?`,
              tipoCalculo: 'EXATO',
              timestamp: Date.now(),
              detalhes: {
                sugestoes: ['Manda para o cliente', 'Ver orçamentos', 'Desfaz'],
              },
            },
          ])
          return
        }
      }

      // 2. Interpretação Local Primeiro ou enriquecida pelo agente
      const parsed: ParsedIntent = parseLocalIntent(text, contextData)
      if (skipAgentIntent?.intent && parsed.confidence < 0.8) {
        parsed.intent = skipAgentIntent.intent
        parsed.params = { ...skipAgentIntent, ...parsed.params }
      }

      // Se limite de áudio foi atingido, inclui aviso explicativo caso usuário fale algo não reconhecido localmente
      if (audioLimiteAtingido && !parsed.intent) {
        setInteractions((prev) => [
          ...prev,
          {
            id: 'limite_audio_' + Date.now(),
            autor: 'ajudante',
            texto: `${checagemAudio.mensagemBloqueio}\n\nDica: você ainda pode usar a calculadora manual ou falar comandos diretos como "calcula parede de 5 por 3".`,
            tipoCalculo: 'TECNICA',
            timestamp: Date.now(),
            detalhes: {
              sugestoes: ['Calcula parede de 5 por 3', 'Quanto de reboco?', 'Ver Planos'],
            },
          },
        ])
        return
      }

      // 3. Se for comando de DESFAZER
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

      // 4. Se for INICIAR ORÇAMENTO POR VOZ
      if (parsed.intent === 'iniciar_orcamento_voz') {
        const area = parsed.params.area || contextData.areaLiquida || contextData.areaBruta || 20
        const servico = parsed.params.servico || 'parede'

        setContextData((prev) => ({
          ...prev,
          fluxoAtivo: 'orcamento',
          dialogoOrcamento: {
            etapa: 'aguardando_preco_m2',
            servico,
            area,
          },
        }))

        setInteractions((prev) => [
          ...prev,
          {
            id: 'resp_' + Date.now(),
            autor: 'ajudante',
            texto: `Iniciando orçamento para ${servico} de ${area} m².\n\nQual o preço da mão de obra por metro quadrado?`,
            tipoCalculo: 'EXATO',
            timestamp: Date.now(),
            detalhes: {
              sugestoes: ['50 reais o metro', '60 reais', '45 reais', 'Cancela'],
            },
          },
        ])
        return
      }

      // 5. Se for CONSULTA DE DIÁRIO DE OBRA POR VOZ ("O que eu fiz na obra do João ontem?")
      if (parsed.intent === 'consultar_diario_obra') {
        const { termoObra, dataExpressao } = parsed.params
        const parseData = MathEngine.parseRelativeDatePtBr(dataExpressao || 'hoje')
        const dataAlvoStr = parseData?.dateStr || new Date().toISOString().split('T')[0]
        const dataRotulo = parseData?.label || dataExpressao || 'na data solicitada'

        const todasObras = await localDB.getAll('obras')
        let obraEncontrada = todasObras.find(
          (o) =>
            termoObra &&
            (o.titulo.toLowerCase().includes(termoObra.toLowerCase()) ||
              (o.endereco && o.endereco.toLowerCase().includes(termoObra.toLowerCase()))),
        )

        // Se não encontrou pelo título, procura por cliente
        if (!obraEncontrada && termoObra) {
          const todosClientes = await localDB.getAll('clientes')
          const cliente = todosClientes.find((c) =>
            c.nome.toLowerCase().includes(termoObra.toLowerCase()),
          )
          if (cliente) {
            obraEncontrada = todasObras.find((o) => o.cliente_id === cliente.id)
          }
        }

        const todosDiarios = await localDB.getAll('diario_obra')
        let filtrados = todosDiarios.filter((d) => d.data.startsWith(dataAlvoStr))
        if (obraEncontrada) {
          filtrados = filtrados.filter((d) => d.obra_id === obraEncontrada?.id)
        }

        if (filtrados.length === 0) {
          const nomeObraTexto = obraEncontrada ? ` na obra "${obraEncontrada.titulo}"` : ''
          setInteractions((prev) => [
            ...prev,
            {
              id: 'resp_' + Date.now(),
              autor: 'ajudante',
              texto: `Não encontrei anotações no diário ${dataRotulo}${nomeObraTexto}.`,
              timestamp: Date.now(),
              detalhes: {
                sugestoes: ['Ver minhas obras', 'Hoje fizemos 20m² de reboco', 'O que fiz hoje?'],
              },
            },
          ])
          return
        }

        const linhas = filtrados
          .map(
            (d) =>
              `• ${d.servico}${d.quantidade ? ` (${d.quantidade} m²)` : ''}${d.material ? ` — Usou: ${d.material}` : ''}${d.observacoes ? ` — Obs: "${d.observacoes}"` : ''}`,
          )
          .join('\n')

        const nomeObraTexto = obraEncontrada ? ` na obra "${obraEncontrada.titulo}"` : ''
        setInteractions((prev) => [
          ...prev,
          {
            id: 'resp_' + Date.now(),
            autor: 'ajudante',
            texto: `Registros de ${dataRotulo}${nomeObraTexto}:\n\n${linhas}`,
            tipoCalculo: 'EXATO',
            timestamp: Date.now(),
            detalhes: {
              sugestoes: ['Mostra minhas obras', 'Faz um novo diário'],
            },
          },
        ])
        return
      }

      // 6. Se for LISTA DE COMPRAS POR VOZ
      if (parsed.intent === 'estoque_lista_compras' || parsed.intent === 'gerar_lista_compras') {
        const todosMats = await localDB.getAll('materiais_estoque')
        const acabando = todosMats.filter(
          (m) => m.estoque_minimo !== undefined && m.quantidade <= m.estoque_minimo,
        )

        let textoLista = ''
        if (acabando.length === 0) {
          textoLista = 'Nenhum material está com estoque crítico no depósito no momento.'
        } else {
          textoLista =
            `LISTA DE COMPRAS (Itens abaixo do estoque mínimo):\n` +
            acabando
              .map(
                (m) =>
                  `• ${m.nome}: restam ${m.quantidade} ${m.unidade} (Mínimo: ${m.estoque_minimo} ${m.unidade})`,
              )
              .join('\n')
        }

        setInteractions((prev) => [
          ...prev,
          {
            id: 'resp_' + Date.now(),
            autor: 'ajudante',
            texto: textoLista,
            tipoCalculo: 'EXATO',
            timestamp: Date.now(),
            detalhes: {
              sugestoes: [
                'Manda para o cliente',
                'Tenho 20 sacos de cimento',
                'O que está acabando?',
              ],
            },
          },
        ])
        return
      }

      // 7. Se for BAIXAR ESTOQUE COM VERIFICAÇÃO DE ZERO
      if (parsed.intent === 'estoque_baixar') {
        const matNome = parsed.params.material || ''
        const qtdBaixa = parsed.params.quantidade || 1
        const todosMats = await localDB.getAll('materiais_estoque')
        const encontrado = todosMats.find((m) =>
          m.nome.toLowerCase().includes(matNome.toLowerCase()),
        )

        if (!encontrado) {
          setInteractions((prev) => [
            ...prev,
            {
              id: 'resp_' + Date.now(),
              autor: 'ajudante',
              texto: `Não encontrei "${matNome}" no seu estoque. Deseja cadastrar esse material?`,
              timestamp: Date.now(),
              detalhes: {
                sugestoes: [`Tenho 10 sacos de ${matNome}`, 'Ver estoque de materiais', 'Cancela'],
              },
            },
          ])
          return
        }

        const novaQtd = Math.max(0, encontrado.quantidade - qtdBaixa)
        const qtdAnterior = encontrado.quantidade

        const executeBaixa = async () => {
          await mutateEntity('materiais_estoque', 'update', {
            ...encontrado,
            quantidade: novaQtd,
          })
          pushUndo({
            id: 'undo_' + Date.now(),
            descricao: `Baixa de ${qtdBaixa} ${encontrado.unidade} de ${encontrado.nome}`,
            timestamp: Date.now(),
            desfazer: async () => {
              await mutateEntity('materiais_estoque', 'update', {
                ...encontrado,
                quantidade: qtdAnterior,
              })
            },
          })
        }

        await executeBaixa()

        setInteractions((prev) => [
          ...prev,
          {
            id: 'resp_' + Date.now(),
            autor: 'ajudante',
            texto: `Baixa realizada: -${qtdBaixa} ${encontrado.unidade} de ${encontrado.nome}. Estoque atual: ${novaQtd} ${encontrado.unidade}.${novaQtd <= (encontrado.estoque_minimo || 0) ? ' ⚠️ Atenção: estoque baixo!' : ''}`,
            tipoCalculo: 'EXATO',
            timestamp: Date.now(),
            detalhes: {
              sugestoes: ['Desfaz', 'O que está acabando?', 'Faz uma lista de compras'],
            },
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
        // OPERAÇÃO FINANCEIRA: CONFIRMAÇÃO OBRIGATÓRIA SE >= R$ 1.000 OU EXCLUSÕES
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

        if (val >= 1000) {
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
        } else {
          await executeSaida()
          respostaTexto = `Registrada saída de R$ ${val.toFixed(2)} (${desc}).`
          tipoBadge = 'EXATO'
          sugestoes = ['Desfaz', 'Consultar saldo', 'Registrar outra saída']
        }
      } else if (parsed.intent === 'registrar_entrada') {
        // ENTRADA FINANCEIRA COM CONFIRMAÇÃO SE >= R$ 1.000
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

        if (val >= 1000) {
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
        } else {
          await executeEntrada()
          respostaTexto = `Registrado recebimento de R$ ${val.toFixed(2)} (${desc}).`
          tipoBadge = 'EXATO'
          sugestoes = ['Desfaz', 'Consultar saldo']
        }
      } else if (parsed.intent === 'estoque_adicionar') {
        const qtd = parsed.params.quantidade
        const mat = parsed.params.material
        const un = parsed.params.unidade || 'saco'

        // Verifica se já existe o material para somar ou criar
        const todosMats = await localDB.getAll('materiais_estoque')
        const existente = todosMats.find((m) => m.nome.toLowerCase().includes(mat.toLowerCase()))

        let novoId = ''
        if (existente) {
          novoId = existente.id
          const qtdAnterior = existente.quantidade
          await mutateEntity('materiais_estoque', 'update', {
            ...existente,
            quantidade: existente.quantidade + qtd,
          })
          pushUndo({
            id: 'undo_' + Date.now(),
            descricao: `Adição de ${qtd} ${un} de ${existente.nome}`,
            timestamp: Date.now(),
            desfazer: async () => {
              await mutateEntity('materiais_estoque', 'update', {
                ...existente,
                quantidade: qtdAnterior,
              })
            },
          })
        } else {
          novoId = 'mat_' + Date.now()
          await mutateEntity('materiais_estoque', 'create', {
            id: novoId,
            owner_id: pb.authStore.model?.id || 'local_user',
            nome: mat,
            quantidade: qtd,
            unidade: un as any,
            estoque_minimo: 5,
          })
          pushUndo({
            id: 'undo_' + Date.now(),
            descricao: `Cadastro de ${mat} (${qtd} ${un})`,
            timestamp: Date.now(),
            desfazer: async () => {
              await mutateEntity('materiais_estoque', 'delete', { id: novoId })
            },
          })
        }

        respostaTexto = `Registrado no estoque: ${qtd} ${un}(s) de ${mat}.`
        tipoBadge = 'EXATO'
        sugestoes = ['Desfaz', 'O que está acabando?', 'Faz uma lista de compras']
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
        const serv = parsed.params.atividade || parsed.params.servico || 'Atividade de obra'
        const qtd = parsed.params.quantidade || 0
        const obras = await localDB.getAll('obras')
        const obraAlvo = obras[0]
        const descQtd = qtd > 0 ? ` (${qtd} m²)` : ''
        if (obraAlvo) {
          await localDB.put('diario_obra', {
            id: 'dia_' + Date.now(),
            owner_id: 'local_user',
            obra_id: obraAlvo.id,
            data: new Date().toISOString(),
            servico: serv,
            quantidade: qtd,
            observacoes: parsed.params.textoCompleto || text,
          })
          respostaTexto = `Atividade registrada no diário da obra "${obraAlvo.titulo}": ${serv}${descQtd}.`
        } else {
          respostaTexto = `Atividade anotada no diário: ${serv}${descQtd}.`
        }
        tipoBadge = 'EXATO'
      } else {
        // Se a IA nativa do Skip Cloud tiver gerado uma resposta conversacional humana de qualidade
        if (skipAgentReplyText) {
          respostaTexto = skipAgentReplyText
          tipoBadge = 'TECNICA'
          sugestoes = [
            'Calcula parede de 5 por 3',
            'Quanto de bloco cerâmico?',
            'Quanto de reboco?',
          ]
        } else {
          // Fallback amigável offline
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
