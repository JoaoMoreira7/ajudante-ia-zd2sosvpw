import React, { useState, useEffect } from 'react'
import { useVoiceContext } from '@/contexts/VoiceContext'
import { useVoiceHybrid } from '@/hooks/useVoiceHybrid'
import { X, Mic, Send, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface VoiceOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ isOpen, onClose }) => {
  const {
    interactions,
    isProcessing,
    statusText,
    currentPendingConfirm,
    processUserInput,
    confirmCurrentAction,
    rejectCurrentAction,
    undoLastAction,
    canUndo,
  } = useVoiceContext()

  const {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    speakText,
    speechError,
  } = useVoiceHybrid()

  const [textInput, setTextInput] = useState('')
  const [lastUserSaid, setLastUserSaid] = useState<string>('')

  // Ao finalizar fala capturada por voz, processa automaticamente
  useEffect(() => {
    if (transcript && !isListening) {
      setLastUserSaid(transcript)
      processUserInput(transcript)
    }
  }, [transcript, isListening, processUserInput])

  // Se a última resposta for do ajudante, sintetiza voz pt-BR se overlay estiver aberto
  useEffect(() => {
    if (isOpen && interactions.length > 0) {
      const last = interactions[interactions.length - 1]
      if (last.autor === 'ajudante' && last.texto) {
        speakText(last.texto)
      }
    }
  }, [isOpen, interactions, speakText])

  if (!isOpen) return null

  const handleToggleMic = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleSubmitText = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!textInput.trim() || isProcessing) return
    const msg = textInput.trim()
    setLastUserSaid(msg)
    setTextInput('')
    processUserInput(msg)
  }

  const lastAssistantMsg = [...interactions].reverse().find((m) => m.autor === 'ajudante')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl bg-card border border-border sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden rounded-t-3xl">
        {/* Cabeçalho do Overlay */}
        <div className="px-5 py-3.5 border-b flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
            <h2 className="text-base font-bold text-foreground tracking-tight">
              ASSISTENTE POR VOZ
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {canUndo && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1 border-muted-foreground/30"
                onClick={() => undoLastAction()}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Desfazer
              </Button>
            )}
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo: Área "VOCÊ DISSE:", Status e Resposta */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Status atual */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isListening ? 'OUVINDO SUA VOZ...' : isProcessing ? 'ENTENDENDO...' : 'PRONTO'}
            </span>
            {lastAssistantMsg?.tipoCalculo && (
              <Badge
                variant="secondary"
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  lastAssistantMsg.tipoCalculo === 'EXATO'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : lastAssistantMsg.tipoCalculo === 'ESTIMATIVA'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}
              >
                {lastAssistantMsg.tipoCalculo === 'EXATO'
                  ? 'CÁLCULO EXATO'
                  : lastAssistantMsg.tipoCalculo === 'ESTIMATIVA'
                    ? 'ESTIMATIVA'
                    : 'INFORMAÇÃO TÉCNICA'}
              </Badge>
            )}
          </div>

          {/* Área "VOCÊ DISSE:" */}
          {lastUserSaid && (
            <div className="p-3.5 rounded-xl bg-muted/70 border border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                VOCÊ DISSE:
              </p>
              <p className="text-sm font-semibold text-foreground">"{lastUserSaid}"</p>
            </div>
          )}

          {/* Erro de reconhecimento de voz amigável se houver */}
          {speechError && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          {/* Confirmação obrigatória se pendente */}
          {currentPendingConfirm ? (
            <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-primary" />
                <span>CONFIRMAÇÃO NECESSÁRIA</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{currentPendingConfirm.texto}</p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
                  onClick={confirmCurrentAction}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  SIM, CONFIRMAR
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 font-bold h-11 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={rejectCurrentAction}
                >
                  CANCELAR
                </Button>
              </div>
            </div>
          ) : (
            /* Resposta Textual do Ajudante IA */
            lastAssistantMsg && (
              <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">
                    RESPOSTA DO AJUDANTE IA
                  </span>
                </div>
                <div className="text-base font-medium text-foreground whitespace-pre-line leading-relaxed">
                  {lastAssistantMsg.texto}
                </div>

                {lastAssistantMsg.detalhes?.formula && (
                  <div className="p-2.5 rounded-lg bg-muted/60 font-mono text-xs text-foreground font-semibold">
                    {lastAssistantMsg.detalhes.formula}
                  </div>
                )}

                {lastAssistantMsg.detalhes?.aviso && (
                  <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-2 rounded">
                    ⚠️ {lastAssistantMsg.detalhes.aviso}
                  </p>
                )}

                {/* Sugestões de follow-up */}
                {lastAssistantMsg.detalhes?.sugestoes &&
                  lastAssistantMsg.detalhes.sugestoes.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                        Sugestões para continuar:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {lastAssistantMsg.detalhes.sugestoes.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setLastUserSaid(sug)
                              processUserInput(sug)
                            }}
                            className="text-xs px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-medium border border-primary/20 transition-colors"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )
          )}
        </div>

        {/* Rodapé do Overlay: Botão Grande FALAR e fallback para texto */}
        <div className="p-4 bg-muted/30 border-t border-border flex flex-col gap-3">
          {/* Botão Principal de Voz */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleToggleMic}
              className={`w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-3 transition-all cursor-pointer ${
                isListening
                  ? 'bg-destructive text-destructive-foreground animate-pulse shadow-lg ring-4 ring-destructive/30'
                  : 'bg-primary text-primary-foreground shadow-lg hover:bg-primary/95 active:scale-[0.99]'
              }`}
            >
              <Mic className="w-6 h-6" />
              <span>{isListening ? 'OUVINDO... (TOQUE PARA PARAR)' : '🎙️ FALAR AGORA'}</span>
            </button>
          </div>

          {/* Fallback de entrada por texto: funciona sempre */}
          <form onSubmit={handleSubmitText} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={isSupported ? 'Ou digite seu comando aqui...' : 'Digite seu comando:'}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="flex-1 h-11 px-3.5 rounded-lg border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
            <Button
              type="submit"
              disabled={!textInput.trim() || isProcessing}
              className="h-11 px-4 font-bold"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
