import React, { useRef, useState, useEffect } from 'react'
import { Mic, MicOff, Loader2, Radio, Clock } from 'lucide-react'
import { useVoiceHybrid } from '@/hooks/useVoiceHybrid'
import { calcularEstadoConsumoAudio } from '@/lib/audioUsageTracker'

interface WalkieTalkieButtonProps {
  onSendMessage: (text: string, durationSeconds: number) => void
  isProcessing?: boolean
  disabled?: boolean
  isSimpleMode?: boolean
  /**
   * Mostra barra discreta de saldo de minutos restante junto ao botão (Melhoria 2)
   */
  exibirSaldoVoz?: boolean
  segundosUsados?: number
  maxMinutos?: number
}

export const WalkieTalkieButton: React.FC<WalkieTalkieButtonProps> = ({
  onSendMessage,
  isProcessing = false,
  disabled = false,
  isSimpleMode = false,
  exibirSaldoVoz = false,
  segundosUsados = 0,
  maxMinutos = 60,
}) => {
  const { isSupported, isListening, transcript, interimTranscript, startListening, stopListening } =
    useVoiceHybrid()

  const [isPressing, setIsPressing] = useState(false)
  const [pulseLevel, setPulseLevel] = useState(1)
  const pressTimerRef = useRef<number | null>(null)
  const recordedDurationRef = useRef<number>(3)

  // Feedback auditivo simples com Web Audio API para simular bipe estilo walkie-talkie
  // Degradação graciosa total: a falta ou bloqueio de áudio NUNCA interfere no render nem lança erro
  const playBeep = (start: boolean) => {
    try {
      if (typeof window === 'undefined') return
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return

      const ctx = new AudioCtx()
      if (ctx.state === 'suspended') {
        // Tenta retomar se permitido pela interação do usuário, sem travar se falhar
        ctx.resume().catch(() => {})
      }

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      const now = ctx.currentTime || 0
      if (start) {
        // Bipe curto de acionamento walkie-talkie (tom agudo rápido)
        osc.frequency.setValueAtTime(880, now) // A5
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
        osc.start(now)
        osc.stop(now + 0.12)
      } else {
        // Bipe duplo de liberação ("câmbio/desliga")
        osc.frequency.setValueAtTime(659.25, now) // E5
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
        osc.start(now)
        osc.stop(now + 0.15)
      }

      // Fecha o contexto após o término para evitar vazamento de recursos no mobile
      setTimeout(() => {
        try {
          if (ctx.state !== 'closed') {
            ctx.close().catch(() => {})
          }
        } catch {
          /* intentionally ignored */
        }
      }, 300)
    } catch (_) {
      // Degradação silenciosa graciosa (sem som se bloqueado ou sem suporte)
    }
  }

  // Quando parar de ouvir e tiver texto final, envia
  useEffect(() => {
    if (!isListening && transcript && transcript.trim().length > 0) {
      const dur = recordedDurationRef.current || 3
      onSendMessage(transcript.trim(), dur)
    }
  }, [isListening, transcript, onSendMessage])

  // Iniciar fala (TouchDown ou Click)
  const handleStart = () => {
    if (disabled || isProcessing) return
    try {
      setIsPressing(true)
      playBeep(true)
      startListening()
    } catch (e) {
      console.warn('Erro ao acionar início de voz:', e)
    }
  }

  // Finalizar fala e enviar (TouchUp ou Click em desktop)
  const handleStop = () => {
    if (!isPressing && !isListening) return
    try {
      setIsPressing(false)
      playBeep(false)
      const dur = stopListening()
      recordedDurationRef.current = dur
    } catch (e) {
      console.warn('Erro ao finalizar voz:', e)
    }
  }

  // Alternar clique único (especialmente útil no desktop sem touch ou se preferir clique normal)
  const handleClickToggle = () => {
    if (disabled || isProcessing) return
    if (isListening) {
      handleStop()
    } else {
      handleStart()
    }
  }

  const currentDisplay = interimTranscript || transcript
  const estadoConsumo = exibirSaldoVoz
    ? calcularEstadoConsumoAudio(segundosUsados, maxMinutos)
    : null

  return (
    <div className="flex flex-col items-center justify-center w-full py-4 px-2">
      <div className="relative flex items-center justify-center">
        {/* Anéis de pulso de áudio estilo walkie-talkie */}
        {isListening && (
          <>
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary/25 animate-ping duration-1000" />
            <span className="absolute inline-flex h-36 w-36 rounded-full bg-emerald-500/20 animate-pulse" />
          </>
        )}

        <button
          type="button"
          disabled={disabled || isProcessing}
          onMouseDown={handleStart}
          onMouseUp={handleStop}
          onTouchStart={(e) => {
            e.preventDefault()
            handleStart()
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            handleStop()
          }}
          onClick={handleClickToggle}
          className={`relative z-10 flex flex-col items-center justify-center rounded-full transition-all shadow-xl active:scale-95 select-none focus:outline-none focus:ring-4 focus:ring-primary/40 ${
            isSimpleMode ? 'w-36 h-36' : 'w-28 h-28 sm:w-32 sm:h-32'
          } ${
            isListening
              ? 'bg-emerald-600 text-white ring-4 ring-emerald-300 shadow-emerald-500/50 scale-105'
              : isProcessing
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-wait'
                : 'bg-primary hover:bg-primary/95 text-primary-foreground shadow-primary/30'
          }`}
          aria-label={
            isListening ? 'Solte para enviar comando' : 'Pressione para falar (Walkie-Talkie)'
          }
        >
          {isProcessing ? (
            <Loader2 className={`${isSimpleMode ? 'w-12 h-12' : 'w-10 h-10'} animate-spin`} />
          ) : isListening ? (
            <Radio className={`${isSimpleMode ? 'w-14 h-14' : 'w-11 h-11'} animate-pulse`} />
          ) : (
            <Mic className={isSimpleMode ? 'w-14 h-14' : 'w-11 h-11'} />
          )}

          <span
            className={`font-black uppercase tracking-wider text-[11px] mt-1 ${
              isSimpleMode ? 'text-xs' : ''
            }`}
          >
            {isProcessing ? 'Calculando...' : isListening ? 'SOLTE P/ ENVIAR' : 'SEGURE P/ FALAR'}
          </span>
        </button>
      </div>

      {/* MELHORIA 2: Barra discreta de saldo de minutos junto ao botão walkie-talkie */}
      {exibirSaldoVoz && estadoConsumo && (
        <div
          className={`w-full max-w-[200px] mt-2.5 transition-opacity ${
            isListening ? 'opacity-100 scale-105' : 'opacity-85 hover:opacity-100'
          }`}
          title={
            estadoConsumo.isIlimitado
              ? 'Plano com minutos de voz ilimitados'
              : `${estadoConsumo.percentual}% de voz consumido este mês`
          }
        >
          {estadoConsumo.isIlimitado ? (
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Voz Ilimitada</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="w-full bg-border/70 dark:bg-muted/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${estadoConsumo.corBarra}`}
                  style={{
                    width: `${Math.max(estadoConsumo.percentual > 0 ? 4 : 0, estadoConsumo.percentual)}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                <span className={`flex items-center gap-1 ${estadoConsumo.corTexto}`}>
                  <Clock className="w-2.5 h-2.5" />
                  {estadoConsumo.minutosRestantes} min restantes
                </span>
                <span className="text-muted-foreground text-[9px] sm:text-[10px]">
                  {estadoConsumo.percentual}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dica operacional clara e direta para canteiro */}
      <div className="mt-3 text-center max-w-sm">
        {isListening ? (
          <div className="space-y-1">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 animate-pulse">
              ● Gravando em tempo real... Fale tudo e solte!
            </span>
            {currentDisplay && (
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 italic line-clamp-2 px-2">
                "{currentDisplay}"
              </p>
            )}
          </div>
        ) : !isSupported ? (
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Toque para falar ou escreva no chat.
            </p>
            <p className="text-[11px] text-primary font-semibold">
              Reconhecimento de voz em modo alternativo no seu aparelho.
            </p>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Segure como <strong className="text-foreground">Walkie-Talkie</strong> (ou dê 1 toque).
            Ex:
            <br />
            <span className="italic">"Chegou 50 saco de cimento e o encanador faltou hoje"</span>
          </p>
        )}{' '}
      </div>
    </div>
  )
}
