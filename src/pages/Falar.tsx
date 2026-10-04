import React, { useState, useEffect, useRef } from 'react'
import { useVoiceContext } from '@/contexts/VoiceContext'
import { useVoiceHybrid } from '@/hooks/useVoiceHybrid'
import { useAuth } from '@/contexts/AuthContext'
import {
  Mic,
  MicOff,
  Send,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Volume2,
  VolumeX,
  WifiOff,
  Sparkles,
  RefreshCw,
  Info,
  Clock,
  Sparkle,
  Search,
  X,
  ArrowDownCircle,
  MessageSquare,
  CheckCheck,
  Radio,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WalkieTalkieButton } from '@/components/WalkieTalkieButton'
import { ActionCardList } from '@/components/ActionCardList'
import {
  obterConsumoAudio,
  formatarMinutosESegundos,
  calcularEstadoConsumoAudio,
} from '@/lib/audioUsageTracker'
import { obterLimitesPlano } from '@/lib/planLimits'
import { buscarNoHistorico, ItemResultadoBuscaUnificada } from '@/lib/historicoStorage'
import { useSearchParams } from 'react-router-dom'

export const Falar: React.FC = () => {
  const {
    interactions,
    isProcessing,
    statusText,
    currentPendingConfirm,
    processUserInput,
    confirmCurrentAction,
    rejectCurrentAction,
    undoLastAction,
    clearContext,
    canUndo,
  } = useVoiceContext()

  const {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    speechError,
  } = useVoiceHybrid()

  const { config, isOperador, plano, profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [inputText, setInputText] = useState('')
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => {
    return config?.voz_respostas !== false
  })
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const [consumoAudio, setConsumoAudio] = useState(() => obterConsumoAudio(profile?.id))
  const [modoEntradaVoz, setModoEntradaVoz] = useState<'walkie' | 'campo'>('campo')

  // Estado da busca unificada (conversas e cálculos)
  const [termoBusca, setTermoBusca] = useState<string>(() => searchParams.get('busca') || '')
  const [buscaAtiva, setBuscaAtiva] = useState<boolean>(() => !!searchParams.get('busca'))
  const [resultadosBusca, setResultadosBusca] = useState<ItemResultadoBuscaUnificada[]>([])
  const [itemDestacadoId, setItemDestacadoId] = useState<string | null>(null)

  const chatBottomRef = useRef<HTMLDivElement>(null)
  const buscaInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLTextAreaElement>(null)

  const limites = obterLimitesPlano(plano)

  // Monitorar conectividade de rede
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Executa busca sempre que o termo mudar ou as interactions forem atualizadas
  useEffect(() => {
    if (!termoBusca.trim()) {
      setResultadosBusca([])
      return
    }
    const res = buscarNoHistorico(termoBusca, {
      interactions,
      userId: profile?.id,
      isOperador,
    })
    setResultadosBusca(res)
  }, [termoBusca, interactions, profile?.id, isOperador])

  // Se veio parâmetro de busca na URL, abre e foca o input
  useEffect(() => {
    const q = searchParams.get('busca')
    if (q) {
      setTermoBusca(q === '1' ? '' : q)
      setBuscaAtiva(true)
      setTimeout(() => {
        buscaInputRef.current?.focus()
      }, 100)
    }
  }, [searchParams])

  // Auto-scroll ao receber nova mensagem ou atualizar processamento
  useEffect(() => {
    if (!termoBusca.trim()) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [interactions, isProcessing, termoBusca])

  const rolarAteMensagem = (msgId?: string) => {
    if (!msgId) return
    const el = document.getElementById(`chat-msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setItemDestacadoId(msgId)
      setTimeout(() => setItemDestacadoId(null), 3500)
    }
  }

  const limparBusca = () => {
    setTermoBusca('')
    setResultadosBusca([])
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev)
      n.delete('busca')
      return n
    })
  }

  // Preenche ou envia transcrição por voz do microfone no campo
  useEffect(() => {
    if (transcript && !isListening) {
      const trimmed = transcript.trim()
      if (trimmed) {
        processUserInput(trimmed, 4)
        setConsumoAudio(obterConsumoAudio(profile?.id))
      }
    }
  }, [transcript, isListening, processUserInput, profile?.id])

  const handleWalkieSend = (text: string, durationSeconds: number) => {
    stopSpeaking()
    processUserInput(text, durationSeconds)
    setConsumoAudio(obterConsumoAudio(profile?.id))
  }

  // Leitura em voz alta automática (TTS) de toda resposta do assistente (essencial para quem não lê)
  const lastSpokenInteractionIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (ttsEnabled && interactions.length > 0 && !isProcessing) {
      const last = interactions[interactions.length - 1]
      if (
        last.autor === 'ajudante' &&
        last.texto &&
        lastSpokenInteractionIdRef.current !== last.id
      ) {
        lastSpokenInteractionIdRef.current = last.id
        const timer = setTimeout(() => {
          speakText(last.texto)
        }, 120)
        return () => clearTimeout(timer)
      }
    }
  }, [interactions, isProcessing, ttsEnabled, speakText])

  const handleMicToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      stopSpeaking()
      startListening()
    }
  }

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || isProcessing) return
    const msg = inputText.trim()
    setInputText('')
    stopSpeaking()
    processUserInput(msg)
    // Redefine altura do textarea
    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  const isModoSimples = config?.modo === 'simples'

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100dvh-8.5rem)] sm:h-[calc(100dvh-7.5rem)]">
      {/* Topo do Chat estilo WhatsApp */}
      <div className="shrink-0 p-3 sm:p-3.5 rounded-2xl bg-card border border-border shadow-xs mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                isOnline ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-foreground tracking-tight">
                Ajudante IA
              </h1>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {isProcessing ? 'digitando...' : isOnline ? 'online' : 'offline'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>
                Voz: <strong>{formatarMinutosESegundos(consumoAudio.segundosUsados)}</strong> de{' '}
                {limites.maxMinutosAudioMes === -1
                  ? 'Ilimitado'
                  : `${limites.maxMinutosAudioMes} min`}
              </span>
              {(() => {
                const est = calcularEstadoConsumoAudio(
                  consumoAudio.segundosUsados,
                  limites.maxMinutosAudioMes,
                )
                if (est.isIlimitado) {
                  return (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Ilimitado
                    </span>
                  )
                }
                if (est.nivel !== 'normal') {
                  return (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${est.corBadge}`}
                    >
                      {est.textoEstado}
                    </span>
                  )
                }
                return null
              })()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Alternar modo Walkie-Talkie expandido */}
          <Button
            type="button"
            variant={modoEntradaVoz === 'walkie' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setModoEntradaVoz(modoEntradaVoz === 'walkie' ? 'campo' : 'walkie')}
            title={
              modoEntradaVoz === 'walkie'
                ? 'Voltar ao chat WhatsApp padrão'
                : 'Abrir botão Walkie-Talkie grande'
            }
            className="h-8 sm:h-9 px-2.5 rounded-xl text-xs font-bold gap-1 cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Walkie-Talkie</span>
          </Button>

          {/* Botão de abrir/fechar Busca no Histórico */}
          <Button
            type="button"
            variant={buscaAtiva ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setBuscaAtiva(!buscaAtiva)
              if (!buscaAtiva) {
                setTimeout(() => buscaInputRef.current?.focus(), 80)
              }
            }}
            title="Buscar em conversas e cálculos anteriores"
            className="h-8 sm:h-9 px-2.5 rounded-xl text-xs font-bold gap-1 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buscar</span>
          </Button>

          {/* Leitura em voz alta (TTS) */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (ttsEnabled) stopSpeaking()
              setTtsEnabled(!ttsEnabled)
            }}
            title={ttsEnabled ? 'Silenciar voz da IA' : 'Ativar voz da IA'}
            className={`h-8 sm:h-9 px-2 rounded-xl text-xs font-bold gap-1 ${
              ttsEnabled ? 'text-emerald-600 bg-emerald-500/10' : 'text-muted-foreground'
            }`}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </Button>

          {canUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => undoLastAction()}
              title="Desfazer última alteração"
              className="h-8 sm:h-9 px-2 rounded-xl text-xs gap-1 border-muted-foreground/30 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearContext}
            title="Começar uma nova conversa"
            className="h-8 sm:h-9 px-2 rounded-xl text-xs text-muted-foreground hover:text-foreground font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* CAMPO DE BUSCA NO TOPO DO HISTÓRICO (QUANDO ABERTO) */}
      {buscaAtiva && (
        <div className="shrink-0 mb-2 p-3 sm:p-3.5 rounded-2xl bg-card border-2 border-emerald-500/40 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Search className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black uppercase text-foreground">
                Buscar no histórico de mensagens e cálculos
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                limparBusca()
                setBuscaAtiva(false)
              }}
              className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 p-1 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Fechar</span>
            </button>
          </div>

          <div className="relative">
            <input
              ref={buscaInputRef}
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Digite o que procura... (ex: cimento, parede, 24m, piso)"
              className="w-full h-11 pl-10 pr-9 rounded-xl border border-border bg-background text-sm font-medium focus:outline-hidden focus:border-emerald-500 shadow-inner"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {termoBusca && (
              <button
                type="button"
                onClick={limparBusca}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* RESULTADOS DA BUSCA */}
          {termoBusca.trim() && (
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>
                  {resultadosBusca.length === 0
                    ? 'Nenhum resultado'
                    : `${resultadosBusca.length} item(s) encontrado(s)`}
                </span>
                <span className="text-[10px] font-medium">Tolerante a acentos e maiúsculas</span>
              </div>

              {resultadosBusca.length === 0 ? (
                <div className="p-3 rounded-xl bg-muted/40 border border-dashed border-border text-center space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    Não achei nada com essa palavra.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tente buscar por palavras da obra como "cimento", "bloco" ou "parede".
                  </p>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {resultadosBusca.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 sm:p-3 rounded-xl bg-background border border-border hover:border-emerald-500/50 shadow-xs transition-all space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`p-1 rounded-md text-[10px] font-black flex items-center gap-1 ${
                              item.tipoItem === 'calculo'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : item.tipoItem === 'conversa_usuario'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-primary/15 text-primary'
                            }`}
                          >
                            {item.tipoItem === 'calculo' ? (
                              <>
                                <Calculator className="w-3 h-3" />
                                <span>CÁLCULO</span>
                              </>
                            ) : item.tipoItem === 'conversa_usuario' ? (
                              <>
                                <MessageSquare className="w-3 h-3" />
                                <span>VOCÊ</span>
                              </>
                            ) : (
                              <>
                                <Sparkle className="w-3 h-3" />
                                <span>AJUDANTE</span>
                              </>
                            )}
                          </span>
                          <span className="text-xs font-bold text-foreground line-clamp-1">
                            {item.titulo}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {item.subtitulo}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-foreground leading-snug">
                        {item.conteudoPrincipal}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-border/50 gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => speakText(item.ttsTexto)}
                          className="h-7 px-2 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Ouvir</span>
                        </Button>

                        {item.origemId && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => rolarAteMensagem(item.origemId)}
                            className="h-7 px-2 rounded-lg text-xs font-bold gap-1 cursor-pointer"
                          >
                            <ArrowDownCircle className="w-3 h-3" />
                            <span>Ver na conversa</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Avisos de conectividade e perfil */}
      {!isOnline && (
        <div className="shrink-0 mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Sem internet:</strong> o assistente usa o motor de cálculos offline. A conversa
            com a nuvem volta assim que conectar.
          </span>
        </div>
      )}

      {isOperador && (
        <div className="shrink-0 mb-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-blue-600" />
          <span>
            Perfil <strong>Operador</strong> ativo: você conversa e calcula tudo. Valores
            financeiros são restritos ao Dono.
          </span>
        </div>
      )}

      {/* ÁREA DE MENSAGENS ESTILO WHATSAPP (Fundo suave, bolhas alternadas, timestamps discretos) */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3 sm:p-4 rounded-2xl bg-muted/30 border border-border/80 shadow-inner">
        {interactions.map((msg) => {
          const isUser = msg.autor === 'usuario'
          const horaStr = new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <div
              id={`chat-msg-${msg.id}`}
              key={msg.id}
              className={`flex flex-col transition-all duration-300 ${
                itemDestacadoId === msg.id
                  ? 'ring-4 ring-emerald-500 ring-offset-2 rounded-2xl'
                  : ''
              } ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl shadow-xs transition-shadow relative ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-tr-xs p-3 sm:p-3.5'
                    : 'bg-card text-card-foreground border border-border/90 rounded-tl-xs p-3.5 sm:p-4'
                }`}
              >
                {/* Nome do remetente discreto para o Ajudante */}
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-border/40">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        Ajudante IA
                      </span>
                    </div>

                    {msg.tipoCalculo && (
                      <Badge
                        variant="secondary"
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-md ${
                          msg.tipoCalculo === 'EXATO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : msg.tipoCalculo === 'ESTIMATIVA'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {msg.tipoCalculo === 'EXATO'
                          ? 'Cálculo Exato'
                          : msg.tipoCalculo === 'ESTIMATIVA'
                            ? 'Estimativa'
                            : 'Orientação'}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Conteúdo textual da mensagem */}
                <div
                  className={`font-normal whitespace-pre-line leading-relaxed ${
                    isModoSimples ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                  } ${isUser ? 'text-white' : 'text-foreground'}`}
                >
                  {msg.texto}
                </div>

                {/* Cards de ação rápida integrados nos bastidores */}
                {msg.cardsAcao && msg.cardsAcao.length > 0 && (
                  <div className="mt-2.5">
                    <ActionCardList
                      cards={msg.cardsAcao}
                      onSpeak={(tts) => speakText(tts)}
                      isSimpleMode={isModoSimples}
                    />
                  </div>
                )}

                {/* Fórmula se houver cálculo matemático determinístico */}
                {msg.detalhes?.formula && (
                  <div className="mt-2 p-2 sm:p-2.5 rounded-xl bg-muted/60 font-mono text-xs font-bold text-foreground border border-border/50">
                    📐 {msg.detalhes.formula}
                  </div>
                )}

                {/* Detalhamento dos passos do cálculo se houver */}
                {msg.detalhes?.passos && msg.detalhes.passos.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5 bg-muted/20 p-2 sm:p-2.5 rounded-xl border border-border/40">
                    <span className="font-bold text-foreground block text-[11px]">
                      Passos da conta:
                    </span>
                    {msg.detalhes.passos.map((p, idx) => (
                      <p key={idx}>• {p}</p>
                    ))}
                  </div>
                )}

                {/* Aviso técnico legal se aplicável */}
                {msg.detalhes?.aviso && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-1.5 border border-amber-500/20">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{msg.detalhes.aviso}</span>
                  </div>
                )}

                {/* Bloco de Confirmação Obrigatória (ex: valores >= R$ 1.000) */}
                {msg.detalhes?.confirmacaoNecessaria && currentPendingConfirm?.id === msg.id && (
                  <div className="mt-3 p-3 rounded-xl border-2 border-emerald-500 bg-emerald-500/5 space-y-2">
                    <p className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-emerald-600 shrink-0" />
                      Confirmação necessária:
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1 h-10 rounded-xl text-xs sm:text-sm cursor-pointer"
                        onClick={confirmCurrentAction}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Sim, Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive flex-1 font-bold h-10 rounded-xl text-xs sm:text-sm cursor-pointer"
                        onClick={rejectCurrentAction}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Linha de rodapé da bolha: Ouvir novamente e Timestamp com tique */}
                <div
                  className={`flex items-center justify-between pt-1.5 mt-1 border-t gap-2 ${
                    isUser
                      ? 'border-white/20 text-white/80'
                      : 'border-border/30 text-muted-foreground'
                  }`}
                >
                  {!isUser ? (
                    <button
                      type="button"
                      onClick={() => speakText(msg.texto)}
                      className="text-[11px] font-bold flex items-center gap-1 hover:text-emerald-600 transition-colors py-0.5 px-1 rounded-md hover:bg-muted/40 cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Ouvir</span>
                    </button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-1 text-[10px] font-medium ml-auto">
                    <span>{horaStr}</span>
                    {isUser && <CheckCheck className="w-3.5 h-3.5 text-white/90" />}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Indicador de "digitando..." enquanto a IA processa */}
        {isProcessing && (
          <div className="flex items-center gap-2 p-3 rounded-2xl rounded-tl-xs bg-card border border-border/80 w-fit shadow-xs">
            <div className="flex items-center gap-1 px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Ajudante está digitando...
            </span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Erro de Microfone */}
      {speechError && (
        <div className="shrink-0 my-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 border border-amber-200 dark:border-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* PAINEL OPCIONAL: Walkie-Talkie expandido se o usuário ativou */}
      {modoEntradaVoz === 'walkie' && (
        <div className="shrink-0 pt-2 pb-1">
          <div className="bg-card border border-border rounded-2xl p-2.5 shadow-sm space-y-2">
            <WalkieTalkieButton
              onSendMessage={handleWalkieSend}
              isProcessing={isProcessing}
              disabled={false}
              isSimpleMode={isModoSimples}
              exibirSaldoVoz={true}
              segundosUsados={consumoAudio.segundosUsados}
              maxMinutos={limites.maxMinutosAudioMes}
            />
            <div className="text-center">
              <button
                type="button"
                onClick={() => setModoEntradaVoz('campo')}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold underline cursor-pointer"
              >
                Voltar ao campo normal de digitação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMPO DE MENSAGEM FIXO EMBAIXO ESTILO WHATSAPP */}
      <div className="shrink-0 pt-2">
        <form
          onSubmit={handleSendText}
          className="flex items-end gap-2 p-1.5 sm:p-2 rounded-2xl bg-card border border-border shadow-sm"
        >
          {/* Botão de gravação/ditado por voz */}
          {isSupported && (
            <button
              type="button"
              onClick={handleMicToggle}
              title={isListening ? 'Parar gravação' : 'Falar mensagem por voz'}
              className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse shadow-md'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {/* Campo de texto livre que cresce suavemente até 4 linhas */}
          <textarea
            ref={textInputRef}
            rows={1}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Ouvindo... pode falar à vontade'
                : 'Mensagem (fale ou digite qualquer dúvida, conta ou serviço)...'
            }
            className={`flex-1 min-h-[44px] max-h-[120px] py-2.5 px-3 rounded-xl border border-input bg-background font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed ${
              isModoSimples ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
            }`}
          />

          {/* Botão de envio estilo WhatsApp */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            title="Enviar mensagem"
            className="w-11 h-11 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default Falar
