import React, { useRef, useState, useEffect } from 'react'
import { Mic, MicOff, Loader2, Radio } from 'lucide-react'
import { useVoiceHybrid } from '@/hooks/useVoiceHybrid'

interface WalkieTalkieButtonProps {
  onSendMessage: (text: string, durationSeconds: number) => void
  isProcessing?: boolean
  disabled?: boolean
  isSimpleMode?: boolean
}

export const WalkieTalkieButton: React.FC<WalkieTalkieButtonProps> = ({
  onSendMessage,
  isProcessing = false,
  disabled = false,
  isSimpleMode = false,
}) => {
  const { isSupported, isListening, transcript, interimTranscript, startListening, stopListening } =
    useVoiceHybrid()

  const [isPressing, setIsPressing] = useState(false)
  const [pulseLevel, setPulseLevel] = useState(1)
  const pressTimerRef = useRef<number | null>(null)
  const recordedDurationRef = useRef<number>(3)

  // Feedback auditivo simples com Web Audio API para simular bipe estilo walkie-talkie
  const playBeep = (start: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (start) {
        // Bipe curto de acionamento walkie-talkie (tom agudo rápido)
        osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.start()
        osc.stop(ctx.currentTime + 0.12)
      } else {
        // Bipe duplo de liberação ("câmbio/desliga")
        osc.frequency.setValueAtTime(659.25, ctx.currentTime) // E5
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        osc.start()
        osc.stop(ctx.currentTime + 0.15)
      }
    } catch (_) {
      // Ignora erro de áudio se navegador bloquear autoplay
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
    setIsPressing(true)
    playBeep(true)
    startListening()
  }

  // Finalizar fala e enviar (TouchUp ou Click em desktop)
  const handleStop = () => {
    if (!isPressing && !isListening) return
    setIsPressing(false)
    playBeep(false)
    const dur = stopListening()
    recordedDurationRef.current = dur
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
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Segure como <strong className="text-foreground">Walkie-Talkie</strong> (ou dê 1 toque).
            Ex:
            <br />
            <span className="italic">"Chegou 50 saco de cimento e o encanador faltou hoje"</span>
          </p>
        )}
      </div>
    </div>
  )
}
