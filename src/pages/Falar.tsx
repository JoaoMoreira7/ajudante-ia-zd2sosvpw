import React, { useState, useEffect, useRef } from 'react'
import { useVoiceContext } from '@/contexts/VoiceContext'
import { useVoiceHybrid } from '@/hooks/useVoiceHybrid'
import { useAuth } from '@/contexts/AuthContext'
import {
  Mic,
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
  Layers,
  MessageSquare,
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
  const [modoEntrada, setModoEntrada] = useState<'walkie' | 'teclado'>('walkie')

  // Estado da busca unificada (conversas e cálculos)
  const [termoBusca, setTermoBusca] = useState<string>(() => searchParams.get('busca') || '')
  const [buscaAtiva, setBuscaAtiva] = useState<boolean>(() => !!searchParams.get('busca'))
  const [resultadosBusca, setResultadosBusca] = useState<ItemResultadoBuscaUnificada[]>([])
  const [itemDestacadoId, setItemDestacadoId] = useState<string | null>(null)

  const chatBottomRef = useRef<HTMLDivElement>(null)
  const buscaInputRef = useRef<HTMLInputElement>(null)

  const limites = obterLimitesPlano(plano)
  const minutosUsados = consumoAudio.segundosUsados / 60

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

  // Se veio parâmetro de busca na URL, foca o input
  useEffect(() => {
    const q = searchParams.get('busca')
    if (q) {
      setTermoBusca(q)
      setBuscaAtiva(true)
      setTimeout(() => {
        buscaInputRef.current?.focus()
      }, 100)
    }
  }, [searchParams])

  // Auto-scroll ao receber nova mensagem (apenas se busca não estiver ativa com rolagem)
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

  // Ao encerrar a fala pelo botão secundário, envia para o interpretador
  useEffect(() => {
    if (transcript && !isListening) {
      processUserInput(transcript, 4)
      setConsumoAudio(obterConsumoAudio(profile?.id))
    }
  }, [transcript, isListening, processUserInput, profile?.id])

  const handleWalkieSend = (text: string, durationSeconds: number) => {
    stopSpeaking()
    processUserInput(text, durationSeconds)
    setConsumoAudio(obterConsumoAudio(profile?.id))
  }

  // Leitura em voz alta automática (TTS) de toda resposta do assistente (essencial para quem não lê)
  useEffect(() => {
    if (ttsEnabled && interactions.length > 0) {
      const last = interactions[interactions.length - 1]
      if (last.autor === 'ajudante' && last.texto) {
        speakText(last.texto)
      }
    }
  }, [interactions, ttsEnabled, speakText])

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
  }

  const isModoSimples = config?.modo === 'simples'

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8.5rem)] sm:h-[calc(100vh-7.5rem)]">
      {/* Cabeçalho do Chat Ajudante IA */}
      <div className="shrink-0 p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-xs mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                AJUDANTE IA
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isModoSimples
                ? 'Você fala e o Ajudante responde com voz clara e contas certas.'
                : 'Chat inteligente com voz, motor determinístico e precisão nos números.'}
            </p>
            {/* Contador discreto de minutos de áudio consumidos no mês */}
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-muted-foreground">
              <Clock className="w-3 h-3 text-primary" />
              <span>
                Voz:{' '}
                <strong className="text-foreground">
                  {formatarMinutosESegundos(consumoAudio.segundosUsados)}
                </strong>{' '}
                de{' '}
                {limites.maxMinutosAudioMes === -1
                  ? 'Ilimitado'
                  : `${limites.maxMinutosAudioMes} min`}{' '}
                este mês
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

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botão de abrir/fechar Busca no Histórico */}
          <Button
            type="button"
            variant={buscaAtiva ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setBuscaAtiva(!buscaAtiva)
              if (!buscaAtiva) {
                setTimeout(() => buscaInputRef.current?.focus(), 80)
              }
            }}
            title="Buscar em conversas e cálculos anteriores"
            className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
          >
            <Search className="w-4 h-4" />
            <span>Buscar</span>
          </Button>

          {/* Botão de alternar leitura em voz alta (TTS) */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (ttsEnabled) stopSpeaking()
              setTtsEnabled(!ttsEnabled)
            }}
            title={ttsEnabled ? 'Desativar leitura por voz' : 'Ativar leitura por voz'}
            className={`h-9 px-2.5 rounded-xl text-xs font-bold gap-1.5 ${
              ttsEnabled ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{ttsEnabled ? 'Voz Ligada' : 'Voz Silenciada'}</span>
          </Button>

          {canUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => undoLastAction()}
              className="h-9 px-2.5 rounded-xl text-xs gap-1.5 border-muted-foreground/30 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desfazer</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearContext}
            title="Começar uma nova conversa e limpar histórico de tela"
            className="h-9 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground font-semibold gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        </div>
      </div>

      {/* CAMPO FIXO DE BUSCA NO TOPO DO HISTÓRICO (TELA FALAR) */}
      {buscaAtiva && (
        <div className="shrink-0 mb-3 p-3 sm:p-4 rounded-2xl bg-card border-2 border-primary/40 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-black uppercase text-foreground">
                Buscar no que já conversamos ou calculamos
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                limparBusca()
                setBuscaAtiva(false)
              }}
              className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 p-1 rounded-md"
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
              placeholder="Buscar no que já conversamos... (ex: cimento, parede, 24m, piso)"
              className={`w-full h-12 sm:h-13 pl-11 pr-10 rounded-xl border-2 border-border bg-background font-medium focus:outline-hidden focus:border-primary shadow-inner ${
                isModoSimples ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
              }`}
            />
            <Search className="w-5 h-5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {termoBusca && (
              <button
                type="button"
                onClick={limparBusca}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dica amigável e atalhos rápidos de busca para quem tem baixa leitura */}
          {!termoBusca && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Toques rápidos para encontrar fácil:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['cimento', 'parede', 'bloco', 'piso', 'reboco', 'concreto', 'areia'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTermoBusca(tag)}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary font-bold border border-border transition-colors cursor-pointer"
                    >
                      🔍 {tag}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* RESULTADOS DA BUSCA EM TEMPO REAL */}
          {termoBusca.trim() && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>
                  {resultadosBusca.length === 0
                    ? 'Nenhum resultado'
                    : `${resultadosBusca.length} item(s) encontrado(s)`}
                </span>
                <span className="text-[11px] font-medium">Ignora acentos e maiúsculas</span>
              </div>

              {resultadosBusca.length === 0 ? (
                <div className="p-4 sm:p-5 rounded-xl bg-muted/40 border border-dashed border-border text-center space-y-2">
                  <p className="text-base sm:text-lg font-black text-foreground">
                    Não achei nada com essa palavra.
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                    Tente falar de outro jeito ou confira se escreveu com outra palavraparecida
                    (como "parede", "bloco" ou "cimento").
                  </p>
                </div>
              ) : (
                <div className="max-h-64 sm:max-h-80 overflow-y-auto space-y-2.5 pr-1">
                  {resultadosBusca.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 sm:p-3.5 rounded-xl bg-background border border-border hover:border-primary/50 shadow-xs transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1.5 rounded-lg text-xs font-black flex items-center gap-1 ${
                              item.tipoItem === 'calculo'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : item.tipoItem === 'conversa_usuario'
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {item.tipoItem === 'calculo' ? (
                              <>
                                <Calculator className="w-3.5 h-3.5" />
                                <span>CÁLCULO</span>
                              </>
                            ) : item.tipoItem === 'conversa_usuario' ? (
                              <>
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>VOCÊ DISSE</span>
                              </>
                            ) : (
                              <>
                                <Sparkle className="w-3.5 h-3.5" />
                                <span>AJUDANTE IA</span>
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

                      {item.detalhe && (
                        <p className="text-xs text-muted-foreground font-medium bg-muted/30 px-2.5 py-1 rounded-md">
                          <strong>Entrada:</strong> {item.detalhe}
                        </p>
                      )}

                      <p
                        className={`font-semibold text-foreground leading-snug ${
                          isModoSimples ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                        }`}
                      >
                        {item.conteudoPrincipal}
                      </p>

                      {item.formula && (
                        <div className="text-[11px] font-mono text-primary bg-primary/5 px-2 py-1 rounded-md">
                          📐 {item.formula}
                        </div>
                      )}

                      {/* Ações acessíveis do item: Rolar até mensagem ou Ouvir em voz alta */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/50 gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => speakText(item.ttsTexto)}
                          className="h-8 px-2.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 gap-1.5 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Ouvir resumo</span>
                        </Button>

                        {item.origemId && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              rolarAteMensagem(item.origemId)
                            }}
                            className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 cursor-pointer"
                          >
                            <ArrowDownCircle className="w-3.5 h-3.5" />
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

      {/* Aviso de Operador ou Aviso de Offline */}
      {!isOnline && (
        <div className="shrink-0 mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Sem internet:</strong> o assistente usa o motor de cálculos e banco de dados
            local offline. A conversa com a IA em nuvem volta assim que conectar.
          </span>
        </div>
      )}

      {isOperador && (
        <div className="shrink-0 mb-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-blue-600" />
          <span>
            Perfil <strong>Operador</strong> ativo: você pode calcular materiais, apontar diário e
            ver obras. Valores financeiros e saldos são restritos ao Dono.
          </span>
        </div>
      )}

      {/* Área Principal de Conversa (Scrollable Chat) */}
      <div className="flex-1 overflow-y-auto space-y-4 p-3 sm:p-4 rounded-2xl bg-card/60 border border-border shadow-inner">
        {interactions.map((msg) => (
          <div
            id={`chat-msg-${msg.id}`}
            key={msg.id}
            className={`flex flex-col transition-all duration-300 ${
              itemDestacadoId === msg.id ? 'ring-4 ring-primary ring-offset-2 rounded-3xl' : ''
            } ${msg.autor === 'usuario' ? 'items-end' : 'items-start'}`}
          >
            {msg.autor === 'usuario' ? (
              <div
                className={`max-w-[85%] sm:max-w-[80%] p-3.5 sm:p-4 rounded-3xl rounded-br-xs bg-primary text-primary-foreground font-semibold shadow-xs ${
                  isModoSimples ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                } ${itemDestacadoId === msg.id ? 'bg-primary/90 shadow-lg' : ''}`}
              >
                <div className="text-[11px] font-black uppercase tracking-wider opacity-85 mb-1 flex items-center gap-1">
                  <span>VOCÊ DISSE:</span>
                </div>
                <div>{msg.texto}</div>
              </div>
            ) : (
              <div className="max-w-[95%] sm:max-w-[88%] w-full p-4 sm:p-5 rounded-3xl rounded-bl-xs bg-card border border-border shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-black text-foreground tracking-tight">
                      AJUDANTE IA
                    </span>
                  </div>

                  {msg.tipoCalculo && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        msg.tipoCalculo === 'EXATO'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : msg.tipoCalculo === 'ESTIMATIVA'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      }`}
                    >
                      {msg.tipoCalculo === 'EXATO'
                        ? 'CÁLCULO EXATO'
                        : msg.tipoCalculo === 'ESTIMATIVA'
                          ? 'ESTIMATIVA MÉDIA'
                          : 'INFORMAÇÃO TÉCNICA'}
                    </Badge>
                  )}
                </div>

                {/* Conteúdo textual da resposta com acessibilidade para leitura */}
                <div
                  className={`font-medium text-foreground whitespace-pre-line leading-relaxed ${
                    isModoSimples ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                  }`}
                >
                  {msg.texto}
                </div>

                {/* MELHORIA 2: Confirmação visual em cards coloridos compactos por item reconhecido */}
                {msg.cardsAcao && msg.cardsAcao.length > 0 && (
                  <ActionCardList
                    cards={msg.cardsAcao}
                    onSpeak={(tts) => speakText(tts)}
                    isSimpleMode={isModoSimples}
                  />
                )}

                {/* Feedback de jargão técnico corrigido */}
                {msg.detalhes?.correcoesGlossario && msg.detalhes.correcoesGlossario.length > 0 && (
                  <div className="text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span>
                      Jargão de obra identificado:{' '}
                      {msg.detalhes.correcoesGlossario.map((c) => c.termoDetectado).join(', ')}
                    </span>
                  </div>
                )}

                {/* Fórmula exata se houver */}
                {msg.detalhes?.formula && (
                  <div className="p-3 rounded-xl bg-muted/60 font-mono text-xs sm:text-sm font-bold text-foreground border border-border/50">
                    📐 {msg.detalhes.formula}
                  </div>
                )}

                {/* Passos do cálculo determinístico */}
                {msg.detalhes?.passos && msg.detalhes.passos.length > 0 && (
                  <div className="text-xs sm:text-sm text-muted-foreground space-y-1 bg-muted/20 p-3 rounded-xl border border-border/40">
                    <span className="font-bold text-foreground block text-xs">
                      Detalhamento do cálculo:
                    </span>
                    {msg.detalhes.passos.map((p, idx) => (
                      <p key={idx}>• {p}</p>
                    ))}
                  </div>
                )}

                {/* Aviso técnico */}
                {msg.detalhes?.aviso && (
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs sm:text-sm flex items-start gap-2 border border-amber-500/20">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{msg.detalhes.aviso}</span>
                  </div>
                )}

                {/* Botão para ouvir a resposta novamente */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => speakText(msg.texto)}
                    className="text-xs text-muted-foreground hover:text-primary font-bold flex items-center gap-1.5 transition-colors py-1 px-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Ouvir novamente</span>
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Bloco de Confirmação Obrigatória */}
                {msg.detalhes?.confirmacaoNecessaria && currentPendingConfirm?.id === msg.id && (
                  <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5 space-y-3">
                    <p className="text-xs sm:text-sm font-bold text-primary flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Confirmação de operação segura:
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1 h-12 rounded-xl text-sm sm:text-base cursor-pointer"
                        onClick={confirmCurrentAction}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Sim, Confirmar
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-destructive/40 text-destructive flex-1 font-bold h-12 rounded-xl text-sm sm:text-base cursor-pointer"
                        onClick={rejectCurrentAction}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Sugestões de continuação da conversa */}
                {msg.detalhes?.sugestoes && msg.detalhes.sugestoes.length > 0 && (
                  <div className="pt-2 border-t border-border/40">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                      Continuar a partir daqui:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.detalhes.sugestoes.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => processUserInput(sug)}
                          className="text-xs sm:text-sm px-3.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold border border-primary/20 transition-all hover:scale-[1.02] cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border w-fit shadow-xs">
            <span className="w-3 h-3 rounded-full bg-primary animate-ping" />
            <span className="text-xs sm:text-sm font-bold text-primary tracking-wide">
              {statusText === 'ENTENDENDO...'
                ? 'AJUDANTE IA PROCESSANDO COM MOTOR DETERMINÍSTICO...'
                : 'PENSANDO...'}
            </span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Erro de Microfone */}
      {speechError && (
        <div className="shrink-0 my-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 border border-amber-200 dark:border-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Área Inferior: Botão Walkie-Talkie Principal + Alternância Rápida para Teclado */}
      <div className="shrink-0 pt-2 space-y-2">
        {modoEntrada === 'walkie' ? (
          <div className="bg-card border border-border/80 rounded-2xl p-2 shadow-sm">
            <WalkieTalkieButton
              onSendMessage={handleWalkieSend}
              isProcessing={isProcessing}
              disabled={false}
              isSimpleMode={isModoSimples}
              exibirSaldoVoz={true}
              segundosUsados={consumoAudio.segundosUsados}
              maxMinutos={limites.maxMinutosAudioMes}
            />
            <div className="text-center pb-1">
              <button
                type="button"
                onClick={() => setModoEntrada('teclado')}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold underline cursor-pointer"
              >
                Prefere digitar? Abrir teclado
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border/80 rounded-2xl p-3 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Digitar mensagem:</span>
              <button
                type="button"
                onClick={() => setModoEntrada('walkie')}
                className="text-xs text-primary font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                Voltar para o Walkie-Talkie
              </button>
            </div>

            {/* Entrada de Texto com letras grandes para acessibilidade */}
            <form onSubmit={handleSendText} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ex: Parede de 6 por 2,80 ou Chegou 50 saco de cimento..."
                className={`flex-1 h-12 sm:h-13 px-4 rounded-xl border border-input bg-card font-medium focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs ${
                  isModoSimples ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                }`}
              />
              <Button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className="h-12 sm:h-13 px-5 sm:px-6 font-black rounded-xl text-sm sm:text-base cursor-pointer"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Enviar
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default Falar
