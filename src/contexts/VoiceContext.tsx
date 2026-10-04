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
import { gerarEImprimirRelatorioObraPDF } from '@/lib/obraPdfGenerator'
import { verificarPermissaoDocumentosPdf } from '@/lib/planLimits'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ReversibleAction } from '@/types/database'
import { normalizarJargaoObra } from '@/lib/obraGlossary'
import { obterConsumoAudio, registrarUsoAudio } from '@/lib/audioUsageTracker'
import { verificarLimiteAudioMinutos } from '@/lib/planLimits'
import {
  carregarChatPersistido,
  salvarChatPersistido,
  limparChatPersistido,
  registrarCalculoPersistente,
} from '@/lib/historicoStorage'
import { ReciboItem, parseEdicaoFraseRecibo } from '@/lib/reciboEngine'
import { parsePreferenciaConversa, aplicarPreferenciaAoTexto } from '@/lib/preferencesEngine'
import { calcularParcelamento, parseParcelamentoOuRecorrencia } from '@/lib/recorrenciasEngine'
import { calcularQuemMeDeve, identificarBaixaRecebimento } from '@/lib/quemMeDeveEngine'
import { gerarResumoSemana, verificarAlertaPadraoGasto } from '@/lib/resumoSemanalEngine'
import {
  extrairTarefaDeFrase,
  ordenarFilaTarefas,
  identificarTarefaParaBaixa,
} from '@/lib/tarefasEngine'
import {
  parseDefinicaoTeto,
  verificarTetoCategoria,
  calcularMediaGastosCategoria,
} from '@/lib/tetoEngine'
import { parseLembreteRecorrente, identificarLembreteParaCancelamento } from '@/lib/lembretesEngine'
import { parseContaAPagar, calcularQuemEstouDevendo } from '@/lib/contasAPagarEngine'
import {
  verificarDuplicidadeGastoMesmoDia,
  verificarRecorrenciasNaoLancadas,
} from '@/lib/alertasPadraoEngine'
import { gerarResumoManha, deveExibirResumoManhaHoje } from '@/lib/resumoManhaEngine'

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
  recibo?: ReciboItem // Novo: Recibo estruturado estilo Meu Assessor (editar / desfazer 24h)
  detalhes?: {
    formula?: string
    passos?: string[]
    aviso?: string
    sugestoes?: string[]
    confirmacaoNecessaria?: boolean
    acaoPendente?: () => Promise<void>
    correcoesGlossario?: Array<{ original: string; corrigido: string; termoDetectado: string }>
    ttsTexto?: string
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
  ultimoRecibo: ReciboItem | null
  processUserInput: (input: string, audioDurationSeconds?: number) => Promise<void>
  anexarFotoComLegenda: (fotoBase64: string, legenda: string, termoObra?: string) => Promise<void>
  confirmCurrentAction: () => Promise<void>
  rejectCurrentAction: () => void
  clearContext: () => void
  undoLastAction: () => Promise<string>
  desfazerRecibo: (recibo: ReciboItem) => Promise<void>
  solicitarEdicaoRecibo: (recibo: ReciboItem) => void
  canUndo: boolean
}

const VoiceContext = createContext<VoiceContextType>({} as any)

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config, isOperador, assinatura, plano, isTrial, profile } = useAuth()
  const [interactions, setInteractions] = useState<ChatInteraction[]>(() => {
    const salvos = carregarChatPersistido(profile?.id)
    if (salvos && salvos.length > 0) {
      return salvos
    }
    return [
      {
        id: 'welcome',
        autor: 'ajudante',
        texto:
          'Olá, mestre! Tudo bem? Estou por aqui para te ajudar no que precisar: tirar dúvidas, fazer contas de materiais, anotar o dia a dia da obra ou organizar os gastos. Pode falar ou digitar do seu jeito!',
        timestamp: Date.now(),
      },
    ]
  })

  // Sincroniza persistência offline sempre que interactions mudar
  React.useEffect(() => {
    salvarChatPersistido(interactions, profile?.id || 'local_user')
  }, [interactions, profile?.id])

  // RESUMO DA MANHÃ AUTOMÁTICO NO PRIMEIRO ACESSO DO DIA (Offline-friendly)
  React.useEffect(() => {
    const dispararResumoManhaSeNecessario = async () => {
      try {
        const horaCfg = config?.resumo_manha_hora || 6
        const ultimoData = config?.ultimo_resumo_manha_data
        if (!deveExibirResumoManhaHoje(ultimoData, horaCfg)) return

        let tarefas = await localDB.getAll('tarefas_obra')
        const lembretes = await localDB.getAll('lembretes_obra')
        let financeiro = await localDB.getAll('financeiro')
        let materiais = await localDB.getAll('materiais_estoque')

        // Se for Dono, consolida equipe (dono + membros)
        const equipeNomesMap: Record<string, string> = {}
        if (!isOperador) {
          const membros = await localDB.getAll('equipe_membros')
          const idsEquipe = new Set<string>()
          if (profile?.id) idsEquipe.add(profile.id)
          for (const m of membros) {
            if (m.owner_id === profile?.id || !profile?.id) {
              if (m.operador_user_id) {
                idsEquipe.add(m.operador_user_id)
                equipeNomesMap[m.operador_user_id] = m.nome
              }
              if (m.id) {
                idsEquipe.add(m.id)
                equipeNomesMap[m.id] = m.nome
              }
            }
          }
          if (idsEquipe.size > 1) {
            tarefas = tarefas.filter(
              (t) =>
                !t.criado_por_id ||
                idsEquipe.has(t.criado_por_id) ||
                (t.owner_id && idsEquipe.has(t.owner_id)),
            )
            financeiro = financeiro.filter(
              (f) =>
                !f.criado_por_id ||
                idsEquipe.has(f.criado_por_id) ||
                (f.owner_id && idsEquipe.has(f.owner_id)),
            )
            materiais = materiais.filter(
              (m) =>
                !m.criado_por_id ||
                idsEquipe.has(m.criado_por_id) ||
                (m.owner_id && idsEquipe.has(m.owner_id)),
            )
          }
        }

        const resumo = gerarResumoManha(
          tarefas,
          lembretes,
          financeiro,
          materiais,
          isOperador,
          new Date(),
          equipeNomesMap,
        )

        // Atualiza a data do último resumo para não repetir no mesmo dia
        await localDB.put('configuracoes', {
          ...config,
          ultimo_resumo_manha_data: resumo.dataHojeStr,
        })

        setInteractions((prev) => [
          ...prev,
          {
            id: 'resumo_manha_' + Date.now(),
            autor: 'ajudante',
            texto: resumo.textoFormatado,
            tipoCalculo: 'TECNICA',
            timestamp: Date.now(),
            detalhes: {
              ttsTexto: resumo.ttsTexto,
              sugestoes: ['Quais as tarefas?', 'Ouvir resumo', 'Quem me deve?'],
            },
          },
        ])
      } catch {
        /* intentionally ignored */
      }
    }

    dispararResumoManhaSeNecessario()
  }, [config, isOperador])
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
  const [ultimoRecibo, setUltimoRecibo] = useState<ReciboItem | null>(null)

  // Empilhar ação reversível local por dispositivo
  const pushUndo = useCallback((action: ReversibleAction) => {
    setUndoStack((prev) => [action, ...prev.slice(0, 19)])
  }, [])

  // Desfazer recibo específico integrado (<50ms)
  const desfazerRecibo = useCallback(
    async (recibo: ReciboItem) => {
      if (!recibo) return
      const idAlvo = recibo.entidadeId
      const ent = recibo.entidade

      try {
        if (ent === 'financeiro') {
          await mutateEntity('financeiro', 'delete', { id: idAlvo })
        } else if (ent === 'materiais_estoque') {
          await mutateEntity('materiais_estoque', 'delete', { id: idAlvo })
        } else if (ent === 'diario_obra') {
          await localDB.delete('diario_obra', idAlvo)
        }

        setInteractions((prev) => [
          ...prev,
          {
            id: 'recibo_undone_' + Date.now(),
            autor: 'ajudante',
            texto: `Recibo desfeito com sucesso! O registro de ${recibo.descricao} foi removido.`,
            timestamp: Date.now(),
          },
        ])

        if (ultimoRecibo?.id === recibo.id) {
          setUltimoRecibo(null)
        }
      } catch {
        setInteractions((prev) => [
          ...prev,
          {
            id: 'recibo_err_' + Date.now(),
            autor: 'ajudante',
            texto: 'Não foi possível desfazer este recibo. Tente novamente.',
            timestamp: Date.now(),
          },
        ])
      }
    },
    [ultimoRecibo],
  )

  // Solicitar edição por frase
  const solicitarEdicaoRecibo = useCallback((recibo: ReciboItem) => {
    setInteractions((prev) => [
      ...prev,
      {
        id: 'edit_prompt_' + Date.now(),
        autor: 'ajudante',
        texto: `Para editar esse recibo, basta falar ou digitar a correção diretamente aqui na conversa. Exemplo: "o valor é 92", "a quantidade é 30" ou "a categoria é combustível".`,
        timestamp: Date.now(),
        detalhes: {
          sugestoes: ['o valor é 92', 'a quantidade é 40', 'Desfaz'],
        },
      },
    ])
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
    limparChatPersistido(profile?.id)
    setInteractions([
      {
        id: 'ctx_clear_' + Date.now(),
        autor: 'ajudante',
        texto: 'Conversa limpa! O que você precisar agora, é só falar ou mandar mensagem aqui.',
        timestamp: Date.now(),
      },
    ])
  }, [profile?.id])

  const processUserInput = async (rawInput: string, audioDurationSeconds: number = 0) => {
    const textOriginal = rawInput.trim()
    if (!textOriginal) return

    // Identifica autor logado com fallback
    const autorNome = profile?.name || config?.nome_profissional || 'Responsável'
    const autorId = profile?.id || pb.authStore.model?.id || 'local_user'

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

    // A. VERIFICA SE O USUÁRIO ESTÁ RESPONDENDO CONFIRMAÇÃO PENDENTE (ex: "pode", "cancela", "confirma")
    if (currentPendingConfirm) {
      const lower = text.toLowerCase().trim()
      if (
        lower === 'sim' ||
        lower === 'pode' ||
        lower === 'confirma' ||
        lower === 'confirmar' ||
        lower === 'com certeza' ||
        lower === 'positivo' ||
        lower === 'beleza' ||
        lower === 'ok'
      ) {
        await confirmCurrentAction()
        return
      }
      if (
        lower === 'não' ||
        lower === 'nao' ||
        lower === 'cancela' ||
        lower === 'cancelar' ||
        lower === 'deixa' ||
        lower === 'esquece'
      ) {
        rejectCurrentAction()
        return
      }
    }

    // B. VERIFICA SE É UMA EDIÇÃO POR FRASE DO ÚLTIMO RECIBO ("o valor é 92", "a quantidade é 40")
    const edicaoRecibo = parseEdicaoFraseRecibo(text, ultimoRecibo)
    if (edicaoRecibo && ultimoRecibo) {
      try {
        let valorAntes: string | number = ''
        let valorDepois: string | number = edicaoRecibo.novoValor

        if (ultimoRecibo.entidade === 'financeiro') {
          const finList = await localDB.getAll('financeiro')
          const finItem = finList.find((f) => f.id === ultimoRecibo.entidadeId)
          if (finItem) {
            if (edicaoRecibo.campo === 'valor') {
              valorAntes = `R$ ${finItem.valor.toFixed(2)}`
              valorDepois = `R$ ${(edicaoRecibo.novoValor as number).toFixed(2)}`
              await mutateEntity('financeiro', 'update', {
                ...finItem,
                valor: edicaoRecibo.novoValor as number,
              })
            } else if (edicaoRecibo.campo === 'categoria') {
              valorAntes = finItem.categoria
              await mutateEntity('financeiro', 'update', {
                ...finItem,
                categoria: edicaoRecibo.novoValor as any,
              })
            } else if (edicaoRecibo.campo === 'descricao') {
              valorAntes = finItem.descricao
              await mutateEntity('financeiro', 'update', {
                ...finItem,
                descricao: edicaoRecibo.novoValor as string,
              })
            }
          }
        } else if (ultimoRecibo.entidade === 'materiais_estoque') {
          const matList = await localDB.getAll('materiais_estoque')
          const matItem = matList.find((m) => m.id === ultimoRecibo.entidadeId)
          if (matItem) {
            if (edicaoRecibo.campo === 'quantidade') {
              valorAntes = matItem.quantidade
              await mutateEntity('materiais_estoque', 'update', {
                ...matItem,
                quantidade: edicaoRecibo.novoValor as number,
              })
            } else if (edicaoRecibo.campo === 'descricao') {
              valorAntes = matItem.nome
              await mutateEntity('materiais_estoque', 'update', {
                ...matItem,
                nome: edicaoRecibo.novoValor as string,
              })
            }
          }
        }

        const reciboAtualizado: ReciboItem = {
          ...ultimoRecibo,
          valor:
            edicaoRecibo.campo === 'valor'
              ? (edicaoRecibo.novoValor as number)
              : ultimoRecibo.valor,
          quantidade:
            edicaoRecibo.campo === 'quantidade'
              ? (edicaoRecibo.novoValor as number)
              : ultimoRecibo.quantidade,
          categoria:
            edicaoRecibo.campo === 'categoria'
              ? (edicaoRecibo.novoValor as string)
              : ultimoRecibo.categoria,
          descricao:
            edicaoRecibo.campo === 'descricao'
              ? (edicaoRecibo.novoValor as string)
              : ultimoRecibo.descricao,
          alteracaoAnterior: {
            campo: edicaoRecibo.campo,
            valorAntes,
            valorDepois,
          },
        }

        setUltimoRecibo(reciboAtualizado)

        setInteractions((prev) => [
          ...prev,
          {
            id: 'resp_edit_' + Date.now(),
            autor: 'ajudante',
            texto: `Recibo atualizado por frase: ${edicaoRecibo.campo} alterado com sucesso!`,
            tipoCalculo: 'EXATO',
            timestamp: Date.now(),
            recibo: reciboAtualizado,
          },
        ])
        return
      } catch {
        // Fallback se edição falhar
      }
    }

    // B.1 PARCELAMENTOS E RECORRÊNCIAS DETERMINÍSTICOS ("comprei em 3x de 500", "aluguel 200 todo mês")
    const parcOuRec = parseParcelamentoOuRecorrencia(text)
    if (parcOuRec) {
      if (parcOuRec.tipo === 'parcelamento' && !isOperador) {
        const p = parcOuRec.params
        const plano = calcularParcelamento(
          p.numParcelas,
          p.valorParcela,
          p.valorTotal,
          p.descricao,
          'outros',
        )
        const grupoId = 'grp_' + Date.now()

        // Registra cada parcela no financeiro local
        for (const parc of plano.parcelas) {
          await mutateEntity('financeiro', 'create', {
            id: 'fin_' + Date.now() + '_' + parc.numero,
            owner_id: autorId,
            tipo: 'saida',
            categoria: 'outros',
            descricao: parc.descricao,
            valor: parc.valor,
            data: parc.dataVencimento,
            status: parc.numero === 1 ? 'pago' : 'pendente',
            parcela_atual: parc.numero,
            total_parcelas: plano.totalParcelas,
            grupo_parcelamento_id: grupoId,
            criado_por_nome: autorNome,
            criado_por_id: autorId,
          })
        }

        const novoRecibo: ReciboItem = {
          id: 'rec_' + Date.now(),
          tipo: 'gasto',
          entidade: 'financeiro',
          entidadeId: grupoId,
          titulo: 'Compra Parcelada Registrada',
          descricao: `${plano.descricaoBase} (${plano.totalParcelas}x de R$ ${plano.valorParcela.toFixed(2)})`,
          valor: plano.valorTotal,
          categoria: 'outros',
          data: new Date().toISOString().split('T')[0],
          status: 'Gravado com sucesso',
          criadoPorNome: autorNome,
          timestamp: Date.now(),
        }
        setUltimoRecibo(novoRecibo)

        setInteractions((prev) => [
          ...prev,
          {
            id: 'resp_' + Date.now(),
            autor: 'ajudante',
            texto: `Compra parcelada gravada com sucesso!\n\n• ${plano.totalParcelas} parcelas de R$ ${plano.valorParcela.toFixed(2)}\n• Valor total: R$ ${plano.valorTotal.toFixed(2)}\n• Primeira parcela registrada hoje e as próximas a cada 30 dias.`,
            tipoCalculo: 'EXATO',
            timestamp: Date.now(),
            recibo: novoRecibo,
            detalhes: {
              sugestoes: ['Desfaz', 'Quem está me devendo?', 'Consultar saldo'],
            },
          },
        ])
        return
      }

      if (parcOuRec.tipo === 'recorrente' && !isOperador) {
        const p = parcOuRec.params
        const novoId = 'fin_' + Date.now()
        await mutateEntity('financeiro', 'create', {
          id: novoId,
          owner_id: autorId,
          tipo: 'saida',
          categoria: 'outros',
          descricao: p.descricao,
          valor: p.valor,
          data: new Date().toISOString().split('T')[0],
          status: 'pago',
          recorrente: true,
          dia_vencimento: p.diaVencimento,
          criado_por_nome: autorNome,
          criado_por_id: autorId,
        })

        const novoRecibo: ReciboItem = {
          id: 'rec_' + Date.now(),
          tipo: 'gasto',
          entidade: 'financeiro',
          entidadeId: novoId,
          titulo: 'Gasto Recorrente Registrado',
          descricao: `${p.descricao} (todo dia ${p.diaVencimento})`,
          valor: p.valor,
          categoria: 'outros',
          data: new Date().toISOString().split('T')[0],
          status: 'Ativo mensalmente',
          criadoPorNome: autorNome,
          timestamp: Date.now(),
        }
        setUltimoRecibo(novoRecibo)

        setInteractions((prev) => [
          ...prev,
          {
            id: 'resp_' + Date.now(),
            autor: 'ajudante',
            texto: `Gasto recorrente ativado: "${p.descricao}" no valor de R$ ${p.valor.toFixed(2)} todo mês (dia ${p.diaVencimento}). Vou te lembrar se ele não for lançado no dia!`,
            tipoCalculo: 'EXATO',
            timestamp: Date.now(),
            recibo: novoRecibo,
            detalhes: {
              sugestoes: ['Desfaz', 'Ver financeiro', 'Quem eu estou devendo?'],
            },
          },
        ])
        return
      }
    }

    // B.2 TETO POR CATEGORIA DE GASTO ("define um orçamento de 800 por mês pra material")
    const intencaoTeto = parseDefinicaoTeto(text)
    if (intencaoTeto) {
      if (isOperador) {
        setInteractions((prev) => [
          ...prev,
          {
            id: 'teto_op_' + Date.now(),
            autor: 'ajudante',
            texto:
              'Seu perfil de acesso é Operador. A definição e consulta de tetos orçamentários é reservada ao Dono.',
            timestamp: Date.now(),
          },
        ])
        return
      }

      if (intencaoTeto.removerTeto) {
        const tetosAtuais = { ...(config?.teto_categorias || {}) }
        delete tetosAtuais[intencaoTeto.categoria]
        await localDB.put('configuracoes', {
          ...config,
          teto_categorias: tetosAtuais,
        })
        setInteractions((prev) => [
          ...prev,
          {
            id: 'teto_rem_' + Date.now(),
            autor: 'ajudante',
            texto: `Teto de gastos para ${intencaoTeto.categoria} removido com sucesso.`,
            timestamp: Date.now(),
          },
        ])
        return
      }

      if (intencaoTeto.valor && intencaoTeto.valor > 0) {
        const tetosAtuais = { ...(config?.teto_categorias || {}) }
        tetosAtuais[intencaoTeto.categoria] = intencaoTeto.valor
        await localDB.put('configuracoes', {
          ...config,
          teto_categorias: tetosAtuais,
        })
        setInteractions((prev) => [
          ...prev,
          {
            id: 'teto_set_' + Date.now(),
            autor: 'ajudante',
            texto: `Teto definido com sucesso! Orçamento de R$ ${intencaoTeto.valor.toFixed(2)} por mês para ${intencaoTeto.categoria}. Vou te avisar a partir de 70% consumido!`,
            tipoCalculo: 'EXATO',
            timestamp: Date.now(),
            detalhes: {
              sugestoes: ['Consultar saldo', 'Quais as tarefas?', 'Registra uma despesa'],
            },
          },
        ])
        return
      }

      if (intencaoTeto.solicitarSugestaoMedia) {
        const historico = await localDB.getAll('financeiro')
        const media = calcularMediaGastosCategoria(intencaoTeto.categoria, historico)
        const valorSugerido = media > 0 ? media : 500

        const confirmacaoAcao = async () => {
          const tetosAtuais = { ...(config?.teto_categorias || {}) }
          tetosAtuais[intencaoTeto.categoria] = valorSugerido
          await localDB.put('configuracoes', {
            ...config,
            teto_categorias: tetosAtuais,
          })
          setInteractions((prev) => [
            ...prev,
            {
              id: 'teto_gravado_' + Date.now(),
              autor: 'ajudante',
              texto: `Beleza! Teto de R$ ${valorSugerido.toFixed(2)} definido para ${intencaoTeto.categoria}.`,
              timestamp: Date.now(),
            },
          ])
        }

        const confirmMsg: ChatInteraction = {
          id: 'confirm_teto_' + Date.now(),
          autor: 'ajudante',
          texto: `A média de gastos dos últimos meses com ${intencaoTeto.categoria} foi de R$ ${valorSugerido.toFixed(2)}. Posso definir esse valor como seu teto mensal?`,
          timestamp: Date.now(),
          detalhes: {
            confirmacaoNecessaria: true,
            acaoPendente: confirmacaoAcao,
            sugestoes: ['Pode', 'Cancela'],
          },
        }
        setCurrentPendingConfirm(confirmMsg)
        setInteractions((prev) => [...prev, confirmMsg])
        return
      }
    }

    // B.3 CONTAS A PAGAR / EMPRÉSTIMOS DE TERCEIROS ("peguei 300 do Zé", "quem eu estou devendo?", "paguei os 300 do Zé")
    const finTodos = await localDB.getAll('financeiro')
    const intencaoConta = parseContaAPagar(text, finTodos)
    if (intencaoConta) {
      if (intencaoConta.tipo === 'consulta_dividas') {
        const relatorio = calcularQuemEstouDevendo(finTodos, isOperador)
        setInteractions((prev) => [
          ...prev,
          {
            id: 'dividas_' + Date.now(),
            autor: 'ajudante',
            texto: relatorio.textoFormatado,
            tipoCalculo: 'EXATO',
            timestamp: Date.now(),
            detalhes: {
              sugestoes: ['Quem está me devendo?', 'Quais as tarefas?', 'Consultar saldo'],
            },
          },
        ])
        return
      }

      if (intencaoConta.tipo === 'baixa_divida') {
        if (isOperador) {
          setInteractions((prev) => [
            ...prev,
            {
              id: 'divida_op_' + Date.now(),
              autor: 'ajudante',
              texto: 'Seu perfil é Operador. A baixa de contas a pagar é restrita ao Dono.',
              timestamp: Date.now(),
            },
          ])
          return
        }

        if (intencaoConta.lancamentoAlvo) {
          const alvo = intencaoConta.lancamentoAlvo
          await mutateEntity('financeiro', 'update', {
            ...alvo,
            status: 'pago',
          })

          const rec: ReciboItem = {
            id: 'rec_' + Date.now(),
            tipo: 'gasto',
            entidade: 'financeiro',
            entidadeId: alvo.id,
            titulo: 'Conta a Pagar Baixada',
            descricao: `Pagamento para ${alvo.credor_nome || alvo.descricao}`,
            valor: alvo.valor,
            data: new Date().toISOString().split('T')[0],
            status: 'Pago e quitado',
            criadoPorNome: autorNome,
            timestamp: Date.now(),
          }
          setUltimoRecibo(rec)

          setInteractions((prev) => [
            ...prev,
            {
              id: 'baixa_divida_ok_' + Date.now(),
              autor: 'ajudante',
              texto: `Pagamento registrado com sucesso! Conta de R$ ${alvo.valor.toFixed(2)} quitada com ${alvo.credor_nome || 'o credor'}.`,
              tipoCalculo: 'EXATO',
              timestamp: Date.now(),
              recibo: rec,
              detalhes: {
                sugestoes: ['Quem eu estou devendo?', 'Consultar saldo', 'Desfaz'],
              },
            },
          ])
          return
        } else {
          // Cria lançamento de saída para a baixa
          const v = intencaoConta.valor || 0
          const cred = intencaoConta.credorNome || 'Credor'
          const novoId = 'fin_' + Date.now()
          await mutateEntity('financeiro', 'create', {
            id: novoId,
            owner_id: autorId,
            tipo: 'saida',
            categoria: 'outros',
            descricao: `Pagamento de empréstimo: ${cred}`,
            valor: v,
            data: new Date().toISOString().split('T')[0],
            status: 'pago',
            credor_nome: cred,
            criado_por_nome: autorNome,
            criado_por_id: autorId,
          })

          const rec: ReciboItem = {
            id: 'rec_' + Date.now(),
            tipo: 'gasto',
            entidade: 'financeiro',
            entidadeId: novoId,
            titulo: 'Pagamento de Empréstimo',
            descricao: `Pago a ${cred}`,
            valor: v,
            data: new Date().toISOString().split('T')[0],
            status: 'Quitado',
            criadoPorNome: autorNome,
            timestamp: Date.now(),
          }
          setUltimoRecibo(rec)

          setInteractions((prev) => [
            ...prev,
            {
              id: 'baixa_divida_reg_' + Date.now(),
              autor: 'ajudante',
              texto: `Registrado pagamento de R$ ${v.toFixed(2)} para ${cred}.`,
              tipoCalculo: 'EXATO',
              timestamp: Date.now(),
              recibo: rec,
              detalhes: {
                sugestoes: ['Quem eu estou devendo?', 'Desfaz'],
              },
            },
          ])
          return
        }
      }

      if (intencaoConta.tipo === 'cadastro_divida') {
        if (isOperador) {
          setInteractions((prev) => [
            ...prev,
            {
              id: 'divida_op_' + Date.now(),
              autor: 'ajudante',
              texto: 'Seu perfil é Operador. O cadastro de contas a pagar é restrito ao Dono.',
              timestamp: Date.now(),
            },
          ])
          return
        }

        const v = intencaoConta.valor || 0
        const cred = intencaoConta.credorNome || 'Credor'
        const desc = intencaoConta.descricao || `Dívida com ${cred}`
        const novoId = 'fin_' + Date.now()

        const executeCadastroDivida = async () => {
          await mutateEntity('financeiro', 'create', {
            id: novoId,
            owner_id: autorId,
            tipo: 'saida',
            categoria: 'outros',
            descricao: desc,
            valor: v,
            data: new Date().toISOString().split('T')[0],
            status: 'pendente',
            credor_nome: cred,
            criado_por_nome: autorNome,
            criado_por_id: autorId,
          })

          const rec: ReciboItem = {
            id: 'rec_' + Date.now(),
            tipo: 'gasto',
            entidade: 'financeiro',
            entidadeId: novoId,
            titulo: 'Conta a Pagar Cadastrada',
            descricao: desc,
            valor: v,
            categoria: 'outros',
            data: new Date().toISOString().split('T')[0],
            status: 'Pendente de pagamento',
            criadoPorNome: autorNome,
            timestamp: Date.now(),
          }
          setUltimoRecibo(rec)
        }

        if (v >= 1000) {
          const confirmMsg: ChatInteraction = {
            id: 'confirm_divida_' + Date.now(),
            autor: 'ajudante',
            texto: `Deseja registrar uma conta a pagar de R$ ${v.toFixed(2)} para ${cred}?`,
            timestamp: Date.now(),
            detalhes: {
              confirmacaoNecessaria: true,
              acaoPendente: async () => {
                await executeCadastroDivida()
              },
              sugestoes: ['Pode', 'Cancela'],
            },
          }
          setCurrentPendingConfirm(confirmMsg)
          setInteractions((prev) => [...prev, confirmMsg])
          return
        } else {
          await executeCadastroDivida()
          setInteractions((prev) => [
            ...prev,
            {
              id: 'divida_gravada_' + Date.now(),
              autor: 'ajudante',
              texto: `Conta a pagar registrada: R$ ${v.toFixed(2)} com ${cred}. Você pode consultar quando quiser dizendo "quem eu estou devendo?".`,
              tipoCalculo: 'EXATO',
              timestamp: Date.now(),
              recibo: ultimoRecibo || undefined,
              detalhes: {
                sugestoes: ['Quem eu estou devendo?', 'Desfaz'],
              },
            },
          ])
          return
        }
      }
    }

    // B.4 LEMBRETES QUE VOLTAM SOZINHOS ("me lembra de medir o nível todo dia às 6h")
    const lembreteParsed = parseLembreteRecorrente(text)
    if (lembreteParsed) {
      if (lembreteParsed.isConsulta) {
        const lembretes = await localDB.getAll('lembretes_obra')
        const ativos = lembretes.filter((l) => l.ativo)
        let msg = ''
        if (ativos.length === 0) {
          msg =
            'Você não tem nenhum lembrete ativo no momento. Para criar, diga "me lembra de [tarefa] todo dia às [hora]".'
        } else {
          msg =
            'Aqui estão seus lembretes programados:\n\n' +
            ativos
              .map(
                (l, idx) =>
                  `• ${l.titulo} — ${l.frequencia === 'diaria' ? 'Todo dia' : l.frequencia === 'semanal' ? 'Semanal' : 'Uma vez'} às ${l.horario || '08:00'}`,
              )
              .join('\n')
        }
        setInteractions((prev) => [
          ...prev,
          {
            id: 'lembrete_list_' + Date.now(),
            autor: 'ajudante',
            texto: msg,
            timestamp: Date.now(),
            detalhes: {
              sugestoes: ['Quais as tarefas?', 'Resumo da manhã'],
            },
          },
        ])
        return
      }

      if (lembreteParsed.termoCancelamento) {
        const lembretes = await localDB.getAll('lembretes_obra')
        const alvo = identificarLembreteParaCancelamento(
          lembreteParsed.termoCancelamento,
          lembretes,
        )
        if (alvo) {
          await localDB.delete('lembretes_obra', alvo.id)
          setInteractions((prev) => [
            ...prev,
            {
              id: 'lembrete_cancel_' + Date.now(),
              autor: 'ajudante',
              texto: `Lembrete "${alvo.titulo}" cancelado com sucesso.`,
              timestamp: Date.now(),
            },
          ])
          return
        }
      }

      if (lembreteParsed.titulo) {
        const novoLembreteId = 'lem_' + Date.now()
        await localDB.put('lembretes_obra', {
          id: novoLembreteId,
          owner_id: autorId,
          titulo: lembreteParsed.titulo,
          horario: lembreteParsed.horario,
          frequencia: lembreteParsed.frequencia,
          dia_semana: lembreteParsed.diaSemana,
          dia_mes: lembreteParsed.diaMes,
          ativo: true,
        })

        const freqTexto =
          lembreteParsed.frequencia === 'diaria'
            ? 'todo dia'
            : lembreteParsed.frequencia === 'semanal'
              ? 'toda semana'
              : 'agendado'
        setInteractions((prev) => [
          ...prev,
          {
            id: 'lembrete_novo_' + Date.now(),
            autor: 'ajudante',
            texto: `Lembrete gravado! Vou te lembrar de "${lembreteParsed.titulo}" ${freqTexto} às ${lembreteParsed.horario || '08:00'}.`,
            tipoCalculo: 'EXATO',
            timestamp: Date.now(),
            detalhes: {
              sugestoes: ['Ver lembretes', 'Quais as tarefas?', 'Desfaz'],
            },
          },
        ])
        return
      }
    }

    // B.5 TAREFAS POR VOZ ("recado vira tarefa" / "marca tarefa como feita")
    const tarefaParsed = extrairTarefaDeFrase(text)
    if (tarefaParsed) {
      if (tarefaParsed.termoBuscaBaixa) {
        const tarefas = await localDB.getAll('tarefas_obra')
        const alvo = identificarTarefaParaBaixa(tarefaParsed.termoBuscaBaixa, tarefas)
        if (alvo) {
          await localDB.put('tarefas_obra', {
            ...alvo,
            status: 'concluida',
            concluida_em: new Date().toISOString(),
          })

          const rec: ReciboItem = {
            id: 'rec_' + Date.now(),
            tipo: 'atividade',
            entidade: 'diario_obra',
            entidadeId: alvo.id,
            titulo: 'Tarefa Concluída',
            descricao: alvo.titulo,
            data: new Date().toISOString().split('T')[0],
            status: 'Concluída com sucesso',
            criadoPorNome: autorNome,
            timestamp: Date.now(),
          }
          setUltimoRecibo(rec)

          setInteractions((prev) => [
            ...prev,
            {
              id: 'tarefa_feita_' + Date.now(),
              autor: 'ajudante',
              texto: `Tarefa concluída com sucesso: "${alvo.titulo}". Boa, mestre!`,
              tipoCalculo: 'EXATO',
              timestamp: Date.now(),
              recibo: rec,
              detalhes: {
                sugestoes: ['Quais as tarefas?', 'Desfaz'],
              },
            },
          ])
          return
        }
      }

      if (tarefaParsed.titulo && !tarefaParsed.termoBuscaBaixa) {
        const novaTarefaId = 'tar_' + Date.now()
        const obras = await localDB.getAll('obras')
        const obraAlvo = obras[0]

        await localDB.put('tarefas_obra', {
          id: novaTarefaId,
          owner_id: autorId,
          obra_id: obraAlvo?.id,
          titulo: tarefaParsed.titulo,
          prazo: tarefaParsed.prazo,
          prioridade: tarefaParsed.prioridade,
          status: 'pendente',
          origem_fala: text,
          criado_por_nome: autorNome,
          criado_por_id: autorId,
        })

        const rec: ReciboItem = {
          id: 'rec_' + Date.now(),
          tipo: 'atividade',
          entidade: 'diario_obra',
          entidadeId: novaTarefaId,
          titulo: 'Tarefa Criada por Voz',
          descricao: tarefaParsed.titulo,
          data: tarefaParsed.prazo || new Date().toISOString().split('T')[0],
          status: `Prioridade: ${tarefaParsed.prioridade}`,
          criadoPorNome: autorNome,
          timestamp: Date.now(),
        }
        setUltimoRecibo(rec)

        const prazoFormatado = tarefaParsed.prazo
          ? ` (prazo: ${tarefaParsed.prazo.split('-').reverse().join('/')})`
          : ''
        setInteractions((prev) => [
          ...prev,
          {
            id: 'tarefa_criada_' + Date.now(),
            autor: 'ajudante',
            texto: `Recado transformado em tarefa: "${tarefaParsed.titulo}"${prazoFormatado} com prioridade ${tarefaParsed.prioridade}. Está na sua fila de tarefas!`,
            tipoCalculo: 'EXATO',
            timestamp: Date.now(),
            recibo: rec,
            detalhes: {
              sugestoes: ['Quais as tarefas?', 'Resumo da manhã', 'Desfaz'],
            },
          },
        ])
        return
      }
    }

    // C. PREFERÊNCIAS POR CONVERSA ("me chama de Zé", "sem emoji", "lembra que...")
    const prefDetectada = parsePreferenciaConversa(text)
    if (prefDetectada) {
      if (prefDetectada.tipo === 'apelido') {
        const apelido = prefDetectada.valor
        await localDB.put('configuracoes', {
          ...config,
          apelido_usuario: apelido,
        })
        setInteractions((prev) => [
          ...prev,
          {
            id: 'pref_' + Date.now(),
            autor: 'ajudante',
            texto: prefDetectada.mensagemConfirmacao,
            timestamp: Date.now(),
          },
        ])
        return
      }
      if (prefDetectada.tipo === 'tom') {
        const tom = prefDetectada.valor
        await localDB.put('configuracoes', {
          ...config,
          tom_conversa: tom,
        })
        setInteractions((prev) => [
          ...prev,
          {
            id: 'pref_' + Date.now(),
            autor: 'ajudante',
            texto: prefDetectada.mensagemConfirmacao,
            timestamp: Date.now(),
          },
        ])
        return
      }
      if (prefDetectada.tipo === 'lembrete_adicionar') {
        const nota = prefDetectada.valor
        const notasAtuais = config?.notas_contexto || []
        const novasNotas = [
          ...notasAtuais,
          { id: 'nota_' + Date.now(), texto: nota, data: new Date().toISOString() },
        ]
        await localDB.put('configuracoes', {
          ...config,
          notas_contexto: novasNotas,
        })
        setInteractions((prev) => [
          ...prev,
          {
            id: 'pref_' + Date.now(),
            autor: 'ajudante',
            texto: prefDetectada.mensagemConfirmacao,
            timestamp: Date.now(),
          },
        ])
        return
      }
      if (prefDetectada.tipo === 'lembrete_remover') {
        const notasAtuais = config?.notas_contexto || []
        const novasNotas = notasAtuais.slice(0, -1)
        await localDB.put('configuracoes', {
          ...config,
          notas_contexto: novasNotas,
        })
        setInteractions((prev) => [
          ...prev,
          {
            id: 'pref_' + Date.now(),
            autor: 'ajudante',
            texto: prefDetectada.mensagemConfirmacao,
            timestamp: Date.now(),
          },
        ])
        return
      }
      if (prefDetectada.tipo === 'lembrete_consultar') {
        const notasAtuais = config?.notas_contexto || []
        let msg = ''
        if (notasAtuais.length === 0) {
          msg =
            'Não tenho nenhuma nota de contexto guardada no momento. Para guardar, diga "lembra que...".'
        } else {
          msg =
            'Aqui estão as anotações que você me pediu para lembrar:\n\n' +
            notasAtuais.map((n, idx) => `${idx + 1}. ${n.texto}`).join('\n')
        }
        setInteractions((prev) => [
          ...prev,
          {
            id: 'pref_' + Date.now(),
            autor: 'ajudante',
            texto: msg,
            timestamp: Date.now(),
          },
        ])
        return
      }
    }

    // Se o limite de minutos de áudio por plano foi ultrapassado:
    // REGRA DE OURO: Bloqueia apenas a nuvem / IA; permite processamento determinístico local!
    const audioLimiteAtingido = !checagemAudio.permitido

    setIsProcessing(true)
    setStatusText(audioLimiteAtingido ? 'PROCESSANDO LOCAL...' : 'ENTENDENDO...')

    // 0. ANÁLISE LOCAL PRÉVIA IMEDIATA:
    // Se o usuário estiver no meio de um diálogo de orçamento guiado ou se a intenção
    // for identificada com alta confiança local (desfazer, medidas matemáticas determinísticas diretas),
    // podemos processar localmente em milissegundos sem aguardar round-trip de rede desnecessário!
    const isFluxoOrcamentoAtivo =
      contextData.fluxoAtivo === 'orcamento' && !!contextData.dialogoOrcamento
    const parsedLocalPrevio: ParsedIntent = parseLocalIntent(text, contextData)
    const isComandoUltraRapidoLocal =
      parsedLocalPrevio.intent === 'acao_desfazer' ||
      (parsedLocalPrevio.confidence >= 0.88 &&
        (parsedLocalPrevio.intent === 'calc_area' ||
          parsedLocalPrevio.intent === 'calc_alvenaria' ||
          parsedLocalPrevio.intent === 'calc_reboco' ||
          parsedLocalPrevio.intent === 'calc_piso' ||
          parsedLocalPrevio.intent === 'descontar_abertura' ||
          parsedLocalPrevio.intent === 'aritmetica_simples'))

    try {
      // Tenta Skip Cloud Agent se online e autenticado, para diálogo e semântica
      let skipAgentIntent: any = null
      let skipAgentReplyText: string | null = null
      let skipAgentActions: any[] | null = null

      // Se não for fluxo local guiado de orçamento e o limite de áudio não foi atingido,
      // consulta o Skip Cloud Agent com timeout controlado de 8s (evita travar o usuário no celular 3G/4G)
      if (
        !isFluxoOrcamentoAtivo &&
        !isComandoUltraRapidoLocal &&
        !audioLimiteAtingido &&
        navigator.onLine &&
        pb.authStore.isValid
      ) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 8000)

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
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

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
          // Degradação graciosa: fallback local imediato se offline, timeout ou erro
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
                owner_id: autorId,
                nome: mat,
                quantidade: qtd,
                unidade: un as any,
                estoque_minimo: 5,
                criado_por_nome: autorNome,
                criado_por_id: autorId,
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
            await mutateEntity('diario_obra', 'create', {
              id: 'dia_' + Date.now() + '_' + i,
              owner_id: autorId,
              obra_id: obraAlvo ? obraAlvo.id : 'obra_padrao',
              data: new Date().toISOString(),
              servico: serv,
              quantidade: params.quantidade || 0,
              observacoes: obs,
              criado_por_nome: autorNome,
              criado_por_id: autorId,
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
              owner_id: autorId,
              tipo: tipoFin,
              categoria: params.categoria || 'outros',
              descricao: desc,
              valor: val,
              data: new Date().toISOString().split('T')[0],
              status: 'pago',
              criado_por_nome: autorNome,
              criado_por_id: autorId,
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

          registrarCalculoPersistente({
            owner_id: profile?.id || 'local_user',
            titulo: `Orçamento de ${dlg.servico.toUpperCase()} (${dlg.area} m²)`,
            tipoCalculo: 'EXATO',
            categoria: 'orcamento',
            parametrosEntrada: {
              servico: dlg.servico,
              area: dlg.area,
              precoM2: dlg.precoM2,
              sinal: dlg.sinal,
              parcelas: parcelasCount,
            },
            resumoEntrada: `${dlg.servico} (${dlg.area} m²), mão de obra R$ ${dlg.precoM2 || 50}/m²`,
            resumoResultado: `Total: R$ ${calcFinal.valor.total.toFixed(2)} | Sinal: R$ ${(dlg.sinal || 0).toFixed(2)} | ${parcelasText}`,
            formula: calcFinal.formula,
            passos: calcFinal.passos,
            ttsTexto: `Orçamento criado com sucesso: ${dlg.servico} de ${dlg.area} metros quadrados, valor total de ${calcFinal.valor.total.toFixed(2)} reais.`,
            origem: 'orcamento',
          })

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
      let ttsTexto: string | undefined

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

        registrarCalculoPersistente({
          owner_id: profile?.id || 'local_user',
          titulo: `Cálculo de Área de Parede (${comp}m × ${alt}m)`,
          tipoCalculo: 'EXATO',
          categoria: 'area',
          parametrosEntrada: { comprimento: comp, altura: alt },
          resumoEntrada: `Parede de ${comp}m de comprimento por ${alt}m de altura`,
          resumoResultado: `Área total: ${res.valor} m²`,
          formula: res.formula,
          passos: res.passos,
          ttsTexto: `Cálculo de área: ${comp} por ${alt} dá ${res.valor} metros quadrados.`,
          origem: 'falar',
        })

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

        registrarCalculoPersistente({
          owner_id: profile?.id || 'local_user',
          titulo: `Área com Desconto de Vão (${pLarg}m × ${pAlt}m)`,
          tipoCalculo: 'EXATO',
          categoria: 'area',
          parametrosEntrada: {
            comprimento: comp,
            altura: alt,
            descontoLargura: pLarg,
            descontoAltura: pAlt,
          },
          resumoEntrada: `Parede ${comp}m × ${alt}m com desconto de ${pLarg}m × ${pAlt}m`,
          resumoResultado: `Área líquida: ${res.valor.areaLiquida} m² (descontou ${res.valor.areaAberturas} m²)`,
          formula: res.formula,
          passos: res.passos,
          ttsTexto: `Descontando o vão de ${pLarg} por ${pAlt}, a área líquida ficou em ${res.valor.areaLiquida} metros quadrados.`,
          origem: 'falar',
        })

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
        const perda = contextData.perdaPct || 10
        const res = MathEngine.calcularAlvenaria({
          areaM2: area,
          perdaPct: perda,
        })
        respostaTexto = `QUANTIDADE DE ALVENARIA para ${area} m²:\n• ${res.valor.quantidadeBlocos} blocos cerâmicos (14x19x29)\n• ~${res.valor.cimentoKg} kg de cimento\n• ~${res.valor.areiaM3} m³ de areia`
        formula = res.formula
        passos = res.passos
        aviso = res.aviso
        tipoBadge = 'ESTIMATIVA'
        sugestoes = ['E quanto de reboco?', 'Faz o orçamento', 'Baixa 10 sacos de cimento']

        registrarCalculoPersistente({
          owner_id: profile?.id || 'local_user',
          titulo: `Cálculo de Alvenaria (${area} m²)`,
          tipoCalculo: 'ESTIMATIVA',
          categoria: 'alvenaria',
          parametrosEntrada: { areaM2: area, perdaPct: perda },
          resumoEntrada: `${area} m² de parede, margem de ${perda}%`,
          resumoResultado: `${res.valor.quantidadeBlocos} blocos cerâmicos (14x19x29), ~${res.valor.cimentoKg} kg cimento e ~${res.valor.areiaM3} m³ areia`,
          formula: res.formula,
          passos: res.passos,
          aviso: res.aviso,
          ttsTexto: `Alvenaria para ${area} metros quadrados: ${res.valor.quantidadeBlocos} blocos cerâmicos, cerca de ${Math.ceil(res.valor.cimentoKg / 50)} sacos de cimento e ${res.valor.areiaM3} metros cúbicos de areia.`,
          origem: 'falar',
        })
      } else if (parsed.intent === 'calc_reboco') {
        const area = contextData.areaLiquida || contextData.areaBruta || parsed.params.areaM2 || 20
        const perda = contextData.perdaPct || 10
        const res = MathEngine.calcularReboco({
          areaM2: area,
          espessuraCm: 2,
          perdaPct: perda,
        })
        respostaTexto = `REBOCO para ${area} m² (2 cm espessura):\n• ~${res.valor.cimentoSacos50kg} sacos de cimento (50kg)\n• ~${res.valor.calSacos20kg} sacos de cal\n• ~${res.valor.areiaM3} m³ de areia média`
        formula = res.formula
        passos = res.passos
        aviso = res.aviso
        tipoBadge = 'ESTIMATIVA'

        registrarCalculoPersistente({
          owner_id: profile?.id || 'local_user',
          titulo: `Cálculo de Reboco (${area} m²)`,
          tipoCalculo: 'ESTIMATIVA',
          categoria: 'reboco',
          parametrosEntrada: { areaM2: area, espessuraCm: 2, perdaPct: perda },
          resumoEntrada: `${area} m² a rebocar (2 cm espessura, traço padrão)`,
          resumoResultado: `~${res.valor.cimentoSacos50kg} sacos cimento, ~${res.valor.calSacos20kg} sacos cal e ~${res.valor.areiaM3} m³ areia média`,
          formula: res.formula,
          passos: res.passos,
          aviso: res.aviso,
          ttsTexto: `Reboco para ${area} metros quadrados: cerca de ${res.valor.cimentoSacos50kg} sacos de cimento, ${res.valor.calSacos20kg} sacos de cal e ${res.valor.areiaM3} metros cúbicos de areia média.`,
          origem: 'falar',
        })
      } else if (parsed.intent === 'calc_piso') {
        const area = parsed.params.areaM2 || 30
        const perda = contextData.perdaPct || 10
        const res = MathEngine.calcularPiso({ areaM2: area, perdaPct: perda })
        respostaTexto = `REVESTIMENTO/PISO para ${area} m²:\n• ${res.valor.areaTotalComPerda} m² de piso com 10% perda (${res.valor.caixasPiso} caixas)\n• ~${res.valor.argamassaColanteSacos20kg} sacos de argamassa colante\n• ~${res.valor.rejunteKg} kg de rejunte`
        formula = res.formula
        passos = res.passos
        aviso = res.aviso
        tipoBadge = 'ESTIMATIVA'
        sugestoes = ['Faz o orçamento', 'Adicionar aos materiais']

        registrarCalculoPersistente({
          owner_id: profile?.id || 'local_user',
          titulo: `Cálculo de Piso e Revestimento (${area} m²)`,
          tipoCalculo: 'ESTIMATIVA',
          categoria: 'piso',
          parametrosEntrada: { areaM2: area, perdaPct: perda },
          resumoEntrada: `${area} m² de piso com ${perda}% de perda`,
          resumoResultado: `${res.valor.areaTotalComPerda} m² (${res.valor.caixasPiso} caixas), ~${res.valor.argamassaColanteSacos20kg} sacos argamassa e ~${res.valor.rejunteKg} kg rejunte`,
          formula: res.formula,
          passos: res.passos,
          aviso: res.aviso,
          ttsTexto: `Piso para ${area} metros: ${res.valor.areaTotalComPerda} metros quadrados com folga, total de ${res.valor.caixasPiso} caixas, ${res.valor.argamassaColanteSacos20kg} sacos de argamassa e ${res.valor.rejunteKg} quilos de rejunte.`,
          origem: 'falar',
        })
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
      } else if (parsed.intent === 'registrar_saida' && !isOperador) {
        const val = parsed.params.valor || 0
        const desc = parsed.params.descricao || 'Despesa de obra'
        const cat = parsed.params.categoria || 'outros'
        const finList = await localDB.getAll('financeiro')

        // 1. Verificação de teto por categoria
        const alertaTeto = verificarTetoCategoria(cat, val, config?.teto_categorias, finList)

        // 2. Verificação de gasto fora da média (categoria, valor, historico)
        const alertaMedia = verificarAlertaPadraoGasto(cat, val, finList)

        // 3. Verificação de gasto duplicado no mesmo dia
        const alertaDuplicado = verificarDuplicidadeGastoMesmoDia(val, cat, desc, finList)

        let idCriado = ''
        const executeSaida = async () => {
          idCriado = await mutateEntity('financeiro', 'create', {
            id: 'fin_' + Date.now(),
            owner_id: autorId,
            tipo: 'saida',
            categoria: cat,
            descricao: desc,
            valor: val,
            data: new Date().toISOString().split('T')[0],
            status: 'pago',
            criado_por_nome: autorNome,
            criado_por_id: autorId,
          })
          pushUndo({
            id: 'undo_' + Date.now(),
            descricao: `Saída de R$ ${val.toFixed(2)} (${desc})`,
            timestamp: Date.now(),
            desfazer: async () => {
              await mutateEntity('financeiro', 'delete', { id: idCriado })
            },
          })

          const rec: ReciboItem = {
            id: 'rec_' + Date.now(),
            tipo: 'gasto',
            entidade: 'financeiro',
            entidadeId: idCriado,
            titulo: 'Despesa Registrada',
            descricao: desc,
            valor: val,
            categoria: cat,
            data: new Date().toISOString().split('T')[0],
            status: 'Gravado com sucesso',
            criadoPorNome: autorNome,
            timestamp: Date.now(),
          }
          setUltimoRecibo(rec)
        }

        if (val >= 1000) {
          const confirmMsg: ChatInteraction = {
            id: 'confirm_' + Date.now(),
            autor: 'ajudante',
            texto: `Deseja confirmar o registro de saída de R$ ${val.toFixed(2)} (${desc})?`,
            timestamp: Date.now(),
            detalhes: {
              confirmacaoNecessaria: true,
              acaoPendente: executeSaida,
              sugestoes: ['Sim, confirmar', 'Cancela'],
            },
          }
          setCurrentPendingConfirm(confirmMsg)
          setInteractions((prev) => [...prev, confirmMsg])
          return
        } else {
          await executeSaida()
          const avisos: string[] = []
          if (alertaTeto?.mensagemAviso) avisos.push(alertaTeto.mensagemAviso)
          if (alertaDuplicado?.mensagem) avisos.push(alertaDuplicado.mensagem)
          else if (alertaMedia) avisos.push(alertaMedia)

          respostaTexto = `Registrada despesa de R$ ${val.toFixed(2)} (${desc}).`
          if (avisos.length > 0) {
            respostaTexto += '\n\n' + avisos.join('\n\n')
          }
          tipoBadge = 'EXATO'
          sugestoes = ['Desfaz', 'Consultar saldo', 'Quem eu estou devendo?']
        }
      } else if (parsed.intent === 'registrar_entrada' && isOperador) {
        respostaTexto =
          'Seu perfil de acesso é Operador. O registro de pagamentos e entradas financeiras é restrito ao Dono da obra.'
        tipoBadge = 'EXATO'
      } else if (parsed.intent === 'consultar_tarefas') {
        const tarefasList = await localDB.getAll('tarefas_obra')
        const fila = ordenarFilaTarefas(tarefasList)
        const pendentes = fila.filter((t) => t.status === 'pendente')
        if (pendentes.length === 0) {
          respostaTexto = 'Nenhuma tarefa pendente na fila! Tudo em dia na obra.'
        } else {
          const hojeIso = new Date().toISOString().split('T')[0]
          const linhas = pendentes.map((t) => {
            const isVencida = t.prazo && t.prazo < hojeIso
            const prazoTxt = t.prazo ? ` (prazo: ${t.prazo.split('-').reverse().join('/')})` : ''
            const tagVencida = isVencida ? ' ⚠️ VENCIDA' : ''
            return `• [${t.prioridade.toUpperCase()}] ${t.titulo}${prazoTxt}${tagVencida}`
          })
          respostaTexto = `Aqui estão as tarefas pendentes da obra:\n\n${linhas.join('\n')}\n\nPara concluir qualquer uma, é só dizer "marca a tarefa de [nome] como feita".`
        }
        tipoBadge = 'EXATO'
        sugestoes = ['Resumo da manhã', 'Quem está me devendo?', 'Novo lembrete']
      } else if (parsed.intent === 'resumo_manha') {
        let tarefasList = await localDB.getAll('tarefas_obra')
        const lembretesList = await localDB.getAll('lembretes_obra')
        let finList = await localDB.getAll('financeiro')
        let matList = await localDB.getAll('materiais_estoque')

        const equipeNomesMap: Record<string, string> = {}
        if (!isOperador) {
          const membros = await localDB.getAll('equipe_membros')
          const idsEquipe = new Set<string>()
          if (profile?.id) idsEquipe.add(profile.id)
          for (const m of membros) {
            if (m.owner_id === profile?.id || !profile?.id) {
              if (m.operador_user_id) {
                idsEquipe.add(m.operador_user_id)
                equipeNomesMap[m.operador_user_id] = m.nome
              }
              if (m.id) {
                idsEquipe.add(m.id)
                equipeNomesMap[m.id] = m.nome
              }
            }
          }
          if (idsEquipe.size > 1) {
            tarefasList = tarefasList.filter(
              (t) =>
                !t.criado_por_id ||
                idsEquipe.has(t.criado_por_id) ||
                (t.owner_id && idsEquipe.has(t.owner_id)),
            )
            finList = finList.filter(
              (f) =>
                !f.criado_por_id ||
                idsEquipe.has(f.criado_por_id) ||
                (f.owner_id && idsEquipe.has(f.owner_id)),
            )
            matList = matList.filter(
              (m) =>
                !m.criado_por_id ||
                idsEquipe.has(m.criado_por_id) ||
                (m.owner_id && idsEquipe.has(m.owner_id)),
            )
          }
        }

        const resumo = gerarResumoManha(
          tarefasList,
          lembretesList,
          finList,
          matList,
          isOperador,
          new Date(),
          equipeNomesMap,
        )
        respostaTexto = resumo.textoFormatado
        ttsTexto = resumo.ttsTexto
        tipoBadge = 'TECNICA'
        sugestoes = ['Quais as tarefas?', 'Quem está me devendo?', 'Quem eu estou devendo?']
      } else if (parsed.intent === 'quem_estou_devendo') {
        const finList = await localDB.getAll('financeiro')
        const relatorio = calcularQuemEstouDevendo(finList, isOperador)
        respostaTexto = relatorio.textoFormatado
        tipoBadge = 'EXATO'
        sugestoes = isOperador
          ? []
          : ['Quem está me devendo?', 'Quais as tarefas?', 'Consultar saldo']
      } else if (parsed.intent === 'quem_me_deve') {
        const finList = await localDB.getAll('financeiro')
        const cliList = await localDB.getAll('clientes')
        const obrasList = await localDB.getAll('obras')
        const relatorio = calcularQuemMeDeve(finList, cliList, obrasList, isOperador)
        respostaTexto = relatorio.textoFormatado
        tipoBadge = 'EXATO'
        sugestoes = isOperador
          ? []
          : ['Quem eu estou devendo?', 'Recebi 450 do Rafael', 'Consultar saldo']
      } else if (parsed.intent === 'baixa_recebimento') {
        const finList = await localDB.getAll('financeiro')
        const cliList = await localDB.getAll('clientes')
        const baixaInfo = identificarBaixaRecebimento(text, finList, cliList)
        if (baixaInfo && baixaInfo.lancamentoAlvo) {
          const alvo = baixaInfo.lancamentoAlvo
          await mutateEntity('financeiro', 'update', {
            ...alvo,
            status: 'pago',
          })
          respostaTexto = `Baixa confirmada com sucesso! Recebimento de R$ ${alvo.valor.toFixed(2)} (${alvo.descricao}) marcado como pago.`
          tipoBadge = 'EXATO'
          sugestoes = ['Quem está me devendo?', 'Consultar saldo', 'Desfaz']

          const novoRecibo: ReciboItem = {
            id: 'rec_' + Date.now(),
            tipo: 'recebimento',
            entidade: 'financeiro',
            entidadeId: alvo.id,
            titulo: 'Recebimento Baixado',
            descricao: alvo.descricao,
            valor: alvo.valor,
            data: new Date().toISOString().split('T')[0],
            status: 'Pago e baixado',
            criadoPorNome: autorNome,
            timestamp: Date.now(),
          }
          setUltimoRecibo(novoRecibo)
        } else {
          // Se não encontrou pendente, cria lançamento de entrada como pago
          const v = parsed.params.valor || 0
          const cli = parsed.params.clienteNome || 'Cliente'
          const novoId = await mutateEntity('financeiro', 'create', {
            id: 'fin_' + Date.now(),
            owner_id: autorId,
            tipo: 'entrada',
            categoria: 'pagamento',
            descricao: `Recebido de ${cli}`,
            valor: v,
            data: new Date().toISOString().split('T')[0],
            status: 'pago',
            criado_por_nome: autorNome,
            criado_por_id: autorId,
          })
          respostaTexto = `Recebimento de R$ ${v.toFixed(2)} (${cli}) registrado e marcado como pago!`
          tipoBadge = 'EXATO'
          sugestoes = ['Quem está me devendo?', 'Consultar saldo', 'Desfaz']

          const novoRecibo: ReciboItem = {
            id: 'rec_' + Date.now(),
            tipo: 'recebimento',
            entidade: 'financeiro',
            entidadeId: novoId,
            titulo: 'Recebimento Registrado',
            descricao: `Recebido de ${cli}`,
            valor: v,
            data: new Date().toISOString().split('T')[0],
            status: 'Pago',
            criadoPorNome: autorNome,
            timestamp: Date.now(),
          }
          setUltimoRecibo(novoRecibo)
        }
      } else if (parsed.intent === 'resumo_semanal') {
        const obrasList = await localDB.getAll('obras')
        let finList = await localDB.getAll('financeiro')
        const orcList = await localDB.getAll('orcamentos')
        let matList = await localDB.getAll('materiais_estoque')

        const equipeNomesMap: Record<string, string> = {}
        if (!isOperador) {
          const membros = await localDB.getAll('equipe_membros')
          const idsEquipe = new Set<string>()
          if (profile?.id) idsEquipe.add(profile.id)
          for (const m of membros) {
            if (m.owner_id === profile?.id || !profile?.id) {
              if (m.operador_user_id) {
                idsEquipe.add(m.operador_user_id)
                equipeNomesMap[m.operador_user_id] = m.nome
              }
              if (m.id) {
                idsEquipe.add(m.id)
                equipeNomesMap[m.id] = m.nome
              }
            }
          }
          if (idsEquipe.size > 1) {
            finList = finList.filter(
              (f) =>
                !f.criado_por_id ||
                idsEquipe.has(f.criado_por_id) ||
                (f.owner_id && idsEquipe.has(f.owner_id)),
            )
            matList = matList.filter(
              (m) =>
                !m.criado_por_id ||
                idsEquipe.has(m.criado_por_id) ||
                (m.owner_id && idsEquipe.has(m.owner_id)),
            )
          }
        }

        const resumo = gerarResumoSemana(
          obrasList,
          finList,
          orcList,
          matList,
          isOperador,
          equipeNomesMap,
        )
        respostaTexto = resumo.textoFormatado
        ttsTexto = resumo.ttsTexto
        tipoBadge = 'TECNICA'
        sugestoes = ['O que está acabando?', 'Quem está me devendo?', 'Ver obras']
      } else if (parsed.intent === 'registrar_entrada') {
        const val = parsed.params.valor
        const desc = parsed.params.descricao

        let idCriado = ''
        const executeEntrada = async () => {
          idCriado = await mutateEntity('financeiro', 'create', {
            id: 'fin_' + Date.now(),
            owner_id: autorId,
            tipo: 'entrada' as const,
            categoria: 'pagamento',
            descricao: desc,
            valor: val,
            data: new Date().toISOString().split('T')[0],
            status: 'pago' as const,
            criado_por_nome: autorNome,
            criado_por_id: autorId,
          })
          pushUndo({
            id: 'undo_' + Date.now(),
            descricao: `Entrada de R$ ${val.toFixed(2)} (${desc})`,
            timestamp: Date.now(),
            desfazer: async () => {
              await mutateEntity('financeiro', 'delete', { id: idCriado })
            },
          })

          const rec: ReciboItem = {
            id: 'rec_' + Date.now(),
            tipo: 'recebimento',
            entidade: 'financeiro',
            entidadeId: idCriado,
            titulo: 'Recebimento Registrado',
            descricao: desc,
            valor: val,
            categoria: 'pagamento',
            data: new Date().toISOString().split('T')[0],
            status: 'Gravado com sucesso',
            criadoPorNome: autorNome,
            timestamp: Date.now(),
          }
          setUltimoRecibo(rec)
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
            owner_id: autorId,
            nome: mat,
            quantidade: qtd,
            unidade: un as any,
            estoque_minimo: 5,
            criado_por_nome: autorNome,
            criado_por_id: autorId,
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

        const rec: ReciboItem = {
          id: 'rec_' + Date.now(),
          tipo: 'material',
          entidade: 'materiais_estoque',
          entidadeId: novoId,
          titulo: 'Material em Estoque',
          descricao: mat,
          quantidade: qtd,
          unidade: un,
          data: new Date().toISOString().split('T')[0],
          status: 'Gravado com sucesso',
          criadoPorNome: autorNome,
          timestamp: Date.now(),
        }
        setUltimoRecibo(rec)

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
      } else if (parsed.intent === 'gerar_relatorio_obra_pdf') {
        const termo = (parsed.params.termoObra || '').toLowerCase().trim()
        const todasObras = await localDB.getAll('obras')
        let obraEncontrada = todasObras.find(
          (o) =>
            o.titulo.toLowerCase().includes(termo) ||
            (o.endereco && o.endereco.toLowerCase().includes(termo)),
        )

        // Se não achou por termo, pega a primeira obra ativa ou primeira cadastrada
        if (!obraEncontrada && todasObras.length > 0) {
          obraEncontrada = todasObras.find((o) => o.status === 'em_andamento') || todasObras[0]
        }

        if (!obraEncontrada) {
          respostaTexto =
            'Não encontrei nenhuma obra cadastrada para gerar o relatório. Cadastre a obra primeiro em Obras!'
          tipoBadge = 'EXATO'
          sugestoes = ['Ver Obras', 'Cadastrar Obra']
        } else {
          // Checagem de Limite de Plano para PDF:
          // O plano Profissional (R$ 49,90) e Empresa liberam PDF; no Essencial (R$ 29,90) mostrar amigavelmente
          const checagemPdf = verificarPermissaoDocumentosPdf(
            plano,
            assinatura?.modulos_liberados,
            isTrial,
          )

          if (!checagemPdf.permitido) {
            respostaTexto = `Opa, mestre! A geração de relatórios completos em PDF com fotos e diário é um recurso do Plano Profissional (R$ 49,90/mês). No Plano Essencial você tem todos os cálculos matemáticos liberados! Quer conhecer os planos? Acesse /planos.`
            tipoBadge = 'EXATO'
            sugestoes = ['Ver Planos', 'Como foi minha semana?', 'Quem me deve?']
          } else {
            // Reúne dados da obra, diário, fotos, cliente e financeiro
            const todosDiarios = await localDB.getAll('diario_obra')
            const diariosObra = todosDiarios.filter((d) => d.obra_id === obraEncontrada!.id)

            const todosDocs = await localDB.getAll('documentos')
            const fotosObra = todosDocs.filter(
              (doc) => doc.obra_id === obraEncontrada!.id && doc.tipo === 'foto',
            )

            const clientes = await localDB.getAll('clientes')
            const cliente = clientes.find((c) => c.id === obraEncontrada!.cliente_id)

            const financs = await localDB.getAll('financeiro')
            const gastosObra = financs.filter((f) => f.obra_id === obraEncontrada!.id)

            const orcs = await localDB.getAll('orcamentos')
            const orcamentoVinculado = orcs.find((o) => o.obra_id === obraEncontrada!.id)

            // Gera e abre o PDF formatado (respeitando se é Dono ou Operador)
            await gerarEImprimirRelatorioObraPDF({
              obra: obraEncontrada,
              clienteNome: cliente?.nome,
              clienteTelefone: cliente?.whatsapp || cliente?.telefone,
              diarios: diariosObra,
              fotos: fotosObra,
              gastos: isOperador ? [] : gastosObra,
              orcamento: isOperador ? null : orcamentoVinculado,
              empresaNome: config?.nome_empresa || undefined,
              responsavelNome: config?.nome_profissional || profile?.name || 'Mestre de Obras',
              telefoneContato: config?.telefone || undefined,
              isDono: !isOperador,
            })

            respostaTexto = `Relatório em PDF da obra "${obraEncontrada.titulo}" gerado com sucesso! Abri a janela com o resumo para você salvar ou compartilhar com o cliente.`
            tipoBadge = 'TECNICA'
            sugestoes = ['Enviar Relatório', 'Ver Obras', 'O que está acabando?']
          }
        }
      } else if (parsed.intent === 'foto_obra_legenda') {
        const termo = (parsed.params.termoObra || '').toLowerCase().trim()
        const todasObras = await localDB.getAll('obras')
        let obraEncontrada = todasObras.find(
          (o) =>
            o.titulo.toLowerCase().includes(termo) ||
            (o.endereco && o.endereco.toLowerCase().includes(termo)),
        )
        if (!obraEncontrada && todasObras.length > 0) {
          obraEncontrada = todasObras.find((o) => o.status === 'em_andamento') || todasObras[0]
        }

        const legenda = parsed.params.legenda || 'Registro fotográfico da obra'
        const obraNome = obraEncontrada ? obraEncontrada.titulo : 'obra ativa'

        respostaTexto = obraEncontrada
          ? `Perfeito! Para anexar a foto à obra "${obraNome}" com a legenda "${legenda}", toque no ícone de câmera/anexo ao lado do campo de mensagem.`
          : `Entendido sobre a foto ("${legenda}"). Cadastre ou selecione a obra em Obras para vincular a foto ao diário.`
        tipoBadge = 'EXATO'
        sugestoes = ['Tirar Foto', 'Ver Obras', 'Gerar Relatório']
      } else if (parsed.intent === 'diario_obra') {
        const serv = parsed.params.atividade || parsed.params.servico || 'Atividade de obra'
        const qtd = parsed.params.quantidade || 0
        const obras = await localDB.getAll('obras')
        const obraAlvo = obras[0]
        const descQtd = qtd > 0 ? ` (${qtd} m²)` : ''
        const novoDiaId = 'dia_' + Date.now()
        if (obraAlvo) {
          await mutateEntity('diario_obra', 'create', {
            id: novoDiaId,
            owner_id: obraAlvo.owner_id || autorId,
            obra_id: obraAlvo.id,
            data: new Date().toISOString(),
            servico: serv,
            quantidade: qtd,
            observacoes: parsed.params.textoCompleto || text,
            criado_por_nome: autorNome,
            criado_por_id: autorId,
          })
          respostaTexto = `Atividade registrada no diário da obra "${obraAlvo.titulo}": ${serv}${descQtd}.`
        } else {
          await mutateEntity('diario_obra', 'create', {
            id: novoDiaId,
            owner_id: autorId,
            obra_id: 'obra_padrao',
            data: new Date().toISOString(),
            servico: serv,
            quantidade: qtd,
            observacoes: parsed.params.textoCompleto || text,
            criado_por_nome: autorNome,
            criado_por_id: autorId,
          })
          respostaTexto = `Atividade anotada no diário: ${serv}${descQtd}.`
        }
        tipoBadge = 'EXATO'

        const rec: ReciboItem = {
          id: 'rec_' + Date.now(),
          tipo: 'atividade',
          entidade: 'diario_obra',
          entidadeId: novoDiaId,
          titulo: 'Atividade no Diário',
          descricao: serv,
          quantidade: qtd > 0 ? qtd : undefined,
          obraNome: obraAlvo?.titulo,
          data: new Date().toISOString().split('T')[0],
          status: 'Gravado com sucesso',
          criadoPorNome: autorNome,
          timestamp: Date.now(),
        }
        setUltimoRecibo(rec)
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

      // Aplica preferências ativas de apelido e tom da conversa
      const textoFinalAjustado = aplicarPreferenciaAoTexto(
        respostaTexto,
        config?.apelido_usuario,
        config?.tom_conversa,
      )

      const assistantMsg: ChatInteraction = {
        id: 'resp_' + Date.now(),
        autor: 'ajudante',
        texto: textoFinalAjustado,
        tipoCalculo: tipoBadge,
        timestamp: Date.now(),
        recibo: ultimoRecibo || undefined,
        detalhes: {
          formula,
          passos,
          aviso,
          sugestoes,
          ttsTexto,
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
        texto: 'Ação cancelada. Nada foi alterado.',
        timestamp: Date.now(),
      },
    ])
  }

  // Anexa foto com legenda vinculando à obra correta (extraída da frase ou obra padrão)
  const anexarFotoComLegenda = async (fotoBase64: string, legenda: string, termoObra?: string) => {
    setIsProcessing(true)
    setStatusText('Salvando foto...')
    try {
      const todasObras = await localDB.getAll('obras')
      let obraAlvo = todasObras.find(
        (o) =>
          termoObra &&
          (o.titulo.toLowerCase().includes(termoObra.toLowerCase()) ||
            (o.endereco && o.endereco.toLowerCase().includes(termoObra.toLowerCase()))),
      )
      if (!obraAlvo && todasObras.length > 0) {
        obraAlvo = todasObras.find((o) => o.status === 'em_andamento') || todasObras[0]
      }

      const autorNome = profile?.name || config?.nome_profissional || 'Operador'
      const autorId = profile?.id || pb.authStore.model?.id || 'local_user'

      const novaFotoId = 'doc_foto_' + Date.now()
      const dataHojeStr = new Date().toLocaleDateString('pt-BR')
      const horaStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

      const fotoDoc = {
        id: novaFotoId,
        owner_id: obraAlvo?.owner_id || pb.authStore.model?.id || 'local_user',
        obra_id: obraAlvo?.id,
        cliente_id: obraAlvo?.cliente_id,
        tipo: 'foto' as const,
        arquivo: fotoBase64,
        descricao: legenda.trim() || 'Foto da obra',
        data_foto: `${dataHojeStr} às ${horaStr}`,
        criado_por_nome: autorNome,
        criado_por_id: autorId,
        created: new Date().toISOString(),
      }

      await mutateEntity('documentos', 'create', fotoDoc)

      // Também inclui um registro breve no diário da obra com a foto
      if (obraAlvo) {
        const novoDiaId = 'dia_' + Date.now()
        await mutateEntity('diario_obra', 'create', {
          id: novoDiaId,
          owner_id: obraAlvo.owner_id || pb.authStore.model?.id || 'local_user',
          obra_id: obraAlvo.id,
          data: new Date().toISOString().split('T')[0],
          servico: `[Foto] ${legenda.trim() || 'Registro fotográfico da obra'}`,
          observacoes: `Foto registrada no diário por ${autorNome}`,
          criado_por_nome: autorNome,
          criado_por_id: autorId,
        })
      }

      const rec: ReciboItem = {
        id: 'rec_' + Date.now(),
        tipo: 'foto',
        entidade: 'documentos',
        entidadeId: novaFotoId,
        titulo: 'Foto Registrada no Diário',
        descricao: legenda.trim() || 'Foto da obra',
        obraNome: obraAlvo?.titulo,
        data: dataHojeStr,
        status: 'Gravado com sucesso',
        criadoPorNome: autorNome,
        timestamp: Date.now(),
      }
      setUltimoRecibo(rec)

      pushUndo({
        id: 'undo_' + Date.now(),
        descricao: `Foto "${legenda}" da obra ${obraAlvo?.titulo || ''}`,
        timestamp: Date.now(),
        desfazer: async () => {
          await mutateEntity('documentos', 'delete', { id: novaFotoId })
        },
      })

      const msgResposta: ChatInteraction = {
        id: 'resp_foto_' + Date.now(),
        autor: 'ajudante',
        texto: obraAlvo
          ? `Foto registrada com sucesso no diário da obra "${obraAlvo.titulo}" com a legenda: "${legenda}". Registrado por ${autorNome}.`
          : `Foto salva no diário com a legenda: "${legenda}". Registrado por ${autorNome}.`,
        tipoCalculo: 'EXATO',
        timestamp: Date.now(),
        recibo: rec,
        detalhes: {
          sugestoes: [
            obraAlvo ? `Gera relatório da obra ${obraAlvo.titulo}` : 'Ver Obras',
            'Desfaz',
            'Tirar outra foto',
          ],
        },
      }

      setInteractions((prev) => [...prev, msgResposta])
    } catch {
      setInteractions((prev) => [
        ...prev,
        {
          id: 'err_foto_' + Date.now(),
          autor: 'ajudante',
          texto: 'Não foi possível salvar a foto no diário da obra. Tente novamente.',
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsProcessing(false)
      setStatusText('Pronto')
    }
  }
  return (
    <VoiceContext.Provider
      value={{
        interactions,
        contextData,
        isProcessing,
        statusText,
        currentPendingConfirm,
        ultimoRecibo,
        processUserInput,
        anexarFotoComLegenda,
        confirmCurrentAction,
        rejectCurrentAction,
        clearContext,
        undoLastAction,
        desfazerRecibo,
        solicitarEdicaoRecibo,
        canUndo: undoStack.length > 0,
      }}
    >
      {children}
    </VoiceContext.Provider>
  )
}

export const useVoiceContext = () => useContext(VoiceContext)
