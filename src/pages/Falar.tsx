import React, { useState, useEffect } from 'react'
import { useVoiceContext } from '@/contexts/VoiceContext'
import { useVoiceHybrid } from '@/hooks/useVoiceHybrid'
import { Mic, Send, RotateCcw, AlertTriangle, CheckCircle, Calculator, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
    speechError,
  } = useVoiceHybrid()

  const [inputText, setInputText] = useState('')

  // Ao encerrar a fala, envia para o interpretador
  useEffect(() => {
    if (transcript && !isListening) {
      processUserInput(transcript)
    }
  }, [transcript, isListening, processUserInput])

  // Sintetiza resposta por áudio
  useEffect(() => {
    if (interactions.length > 0) {
      const last = interactions[interactions.length - 1]
      if (last.autor === 'ajudante' && last.texto) {
        speakText(last.texto)
      }
    }
  }, [interactions, speakText])

  const handleMicToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || isProcessing) return
    const msg = inputText.trim()
    setInputText('')
    processUserInput(msg)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Cabeçalho da Tela Falar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Mic className="w-6 h-6 text-primary" />
            CONVERSA COM O AJUDANTE IA
          </h1>
          <p className="text-xs text-muted-foreground">
            Você fala naturalmente. O Ajudante entende medidas, calcula materiais e registra
            financeiro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => undoLastAction()}
              className="text-xs gap-1.5 border-muted-foreground/30 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearContext}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold"
          >
            Limpar Memória
          </Button>
        </div>
      </div>

      {/* Botão Gigante de Fala */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-card to-muted/30 border border-border text-center shadow-xs">
        <button
          type="button"
          onClick={handleMicToggle}
          className={`w-full max-w-md h-32 sm:h-36 rounded-3xl font-black text-xl sm:text-2xl flex flex-col items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
            isListening
              ? 'bg-destructive text-destructive-foreground ring-8 ring-destructive/30 animate-pulse'
              : 'bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.98] pulse-falar'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Mic className="w-8 h-8" />
          </div>
          <span>
            {isListening ? 'OUVINDO SUA VOZ... (TOQUE PARA PARAR)' : '🎙️ TOCAR PARA FALAR'}
          </span>
        </button>

        <p className="text-xs font-semibold text-muted-foreground mt-3 uppercase tracking-wider">
          {isListening
            ? 'Fale agora perto do celular'
            : statusText === 'ENTENDENDO...'
              ? 'Calculando com motor determinístico...'
              : 'Pronto para ouvir ou ler'}
        </p>

        {speechError && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 border border-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{speechError}</span>
          </div>
        )}
      </div>

      {/* Entrada de Texto (Garante acessibilidade universal sem microfone) */}
      <form onSubmit={handleSendText} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isSupported
              ? 'Ou digite seu comando aqui (ex: Parede de 6 por 2,80)...'
              : 'Digite seu comando:'
          }
          className="flex-1 h-12 px-4 rounded-xl border border-input bg-card text-sm focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
        />
        <Button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          className="h-12 px-6 font-bold rounded-xl"
        >
          <Send className="w-4 h-4 mr-1.5" />
          Enviar
        </Button>
      </form>

      {/* Lista de Mensagens / Diálogo com Contexto */}
      <div className="space-y-4">
        {interactions.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.autor === 'usuario' ? 'items-end' : 'items-start'}`}
          >
            {msg.autor === 'usuario' ? (
              <div className="max-w-[85%] p-3.5 sm:p-4 rounded-2xl rounded-br-xs bg-primary text-primary-foreground font-semibold text-sm shadow-xs">
                <span className="text-[10px] uppercase tracking-wider block opacity-80 mb-0.5">
                  Você disse:
                </span>
                {msg.texto}
              </div>
            ) : (
              <div className="max-w-[90%] w-full p-4 sm:p-5 rounded-2xl rounded-bl-xs bg-card border border-border shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Calculator className="w-4 h-4" />
                    AJUDANTE IA
                  </span>
                  {msg.tipoCalculo && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        msg.tipoCalculo === 'EXATO'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : msg.tipoCalculo === 'ESTIMATIVA'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {msg.tipoCalculo === 'EXATO'
                        ? 'CÁLCULO EXATO'
                        : msg.tipoCalculo === 'ESTIMATIVA'
                          ? 'ESTIMATIVA'
                          : 'INFORMAÇÃO TÉCNICA'}
                    </Badge>
                  )}
                </div>

                <div className="text-sm sm:text-base font-medium text-foreground whitespace-pre-line leading-relaxed">
                  {msg.texto}
                </div>

                {msg.detalhes?.formula && (
                  <div className="p-2.5 rounded-lg bg-muted/60 font-mono text-xs font-bold text-foreground">
                    {msg.detalhes.formula}
                  </div>
                )}

                {msg.detalhes?.passos && msg.detalhes.passos.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 p-2.5 rounded-lg">
                    {msg.detalhes.passos.map((p, idx) => (
                      <p key={idx}>• {p}</p>
                    ))}
                  </div>
                )}

                {msg.detalhes?.aviso && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{msg.detalhes.aviso}</span>
                  </div>
                )}

                {/* Confirmação obrigatória */}
                {msg.detalhes?.confirmacaoNecessaria && currentPendingConfirm?.id === msg.id && (
                  <div className="p-3 rounded-xl border-2 border-primary bg-primary/5 space-y-2.5">
                    <p className="text-xs font-bold text-primary">
                      Confirmação de operação segura:
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 font-bold flex-1"
                        onClick={confirmCurrentAction}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive flex-1 font-bold"
                        onClick={rejectCurrentAction}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Sugestões de follow-up clicáveis */}
                {msg.detalhes?.sugestoes && msg.detalhes.sugestoes.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                      Continuar a partir daqui:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.detalhes.sugestoes.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => processUserInput(sug)}
                          className="text-xs px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold border border-primary/20 transition-colors"
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
      </div>
    </div>
  )
}

export default Falar
