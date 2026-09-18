// src/hooks/use-voice.ts
// Hook de voz híbrida: SpeechRecognition (webkitSpeechRecognition) + Text-to-Speech (speechSynthesis pt-BR)
// Regra fundamental: o app JAMAIS deixa de funcionar por falta de suporte de voz

import { useState, useEffect, useCallback, useRef } from 'react'

// Declaração de tipos para SpeechRecognition do navegador
interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
      }
      isFinal: boolean
    }
    length: number
  }
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: (event: SpeechRecognitionEventLike) => void
  onerror: (event: { error: string }) => void
  onend: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

export interface VoiceState {
  isListening: boolean
  isSpeaking: boolean
  hasSpeechSupport: boolean
  hasTtsSupport: boolean
  transcript: string
  interimTranscript: string
  error: string | null
}

export function useVoice(
  options: {
    lang?: string
    enableTts?: boolean
    onFinalTranscript?: (text: string) => void
  } = {},
) {
  const lang = options.lang || 'pt-BR'
  const enableTts = options.enableTts ?? true

  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    hasSpeechSupport: false,
    hasTtsSupport: false,
    transcript: '',
    interimTranscript: '',
    error: null,
  })

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    const hasSpeech =
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    const hasTts = typeof window !== 'undefined' && 'speechSynthesis' in window

    setState((prev) => ({
      ...prev,
      hasSpeechSupport: hasSpeech,
      hasTtsSupport: hasTts,
    }))

    if (hasSpeech) {
      const SpeechConstructor = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechConstructor) {
        const recognition = new SpeechConstructor()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = lang

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let currentInterim = ''
          let final = ''

          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i]
            if (res.isFinal) {
              final += res[0].transcript
            } else {
              currentInterim += res[0].transcript
            }
          }

          setState((prev) => ({
            ...prev,
            transcript: final || prev.transcript,
            interimTranscript: currentInterim,
          }))

          if (final && options.onFinalTranscript) {
            options.onFinalTranscript(final.trim())
          }
        }

        recognition.onerror = (e) => {
          let msg = 'Erro ao ouvir microfone.'
          if (e.error === 'not-allowed') {
            msg = 'Permissão de microfone negada. Você pode digitar seu comando.'
          } else if (e.error === 'no-speech') {
            msg = 'Não ouvi nada. Tente falar novamente mais perto do microfone.'
          }
          setState((prev) => ({
            ...prev,
            isListening: false,
            error: msg,
          }))
        }

        recognition.onend = () => {
          setState((prev) => ({ ...prev, isListening: false, interimTranscript: '' }))
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          /* intentionally ignored */
        }
      }
    }
  }, [lang, options])

  const startListening = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: '', interimTranscript: '', error: null }))
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
        setState((prev) => ({ ...prev, isListening: true }))
      } catch (err) {
        console.warn('Falha ao iniciar reconhecimento:', err)
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        setState((prev) => ({ ...prev, isListening: false }))
      } catch {
        /* intentionally ignored */
      }
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!enableTts || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return
      }

      try {
        window.speechSynthesis.cancel() // Para fala anterior

        // Remove marcações de formatação antes de falar
        const cleanText = text
          .replace(/[#*_`]/g, '')
          .replace(/R\$\s*/g, 'reais ')
          .replace(/m²/g, 'metros quadrados')
          .replace(/m³/g, 'metros cúbicos')

        const utterance = new SpeechSynthesisUtterance(cleanText)
        utterance.lang = 'pt-BR'
        utterance.rate = 1.05 // ritmo levemente ágil e prático

        utterance.onstart = () => setState((prev) => ({ ...prev, isSpeaking: true }))
        utterance.onend = () => setState((prev) => ({ ...prev, isSpeaking: false }))
        utterance.onerror = () => setState((prev) => ({ ...prev, isSpeaking: false }))

        window.speechSynthesis.speak(utterance)
      } catch (err) {
        console.warn('Falha no sintetizador de voz TTS:', err)
      }
    },
    [enableTts],
  )

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setState((prev) => ({ ...prev, isSpeaking: false }))
    }
  }, [])

  return {
    ...state,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  }
}
