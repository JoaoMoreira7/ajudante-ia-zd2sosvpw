/**
 * HOOK HÍBRIDO DE VOZ: SPEECH RECOGNITION (LOCAL/NAVEGADOR) + TTS (SPEECH SYNTHESIS)
 *
 * Regra do produto:
 * - Se SpeechRecognition estiver disponível, usa voz do aparelho.
 * - Se não estiver disponível, faz fallback gracioso para entrada de texto sem travar nada.
 * - Suporta sintetização de voz pt-BR se ativada nas configurações.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// Declaração de tipos para SpeechRecognition do navegador
interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  maxAlternatives?: number
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: (event: any) => void
  onerror: (event: any) => void
  onend: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

// Interface de compatibilidade com navegadores
export function useVoiceHybrid() {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recordingStartTimeRef = useRef<number | null>(null)

  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechClass) {
        setIsSupported(true)
        try {
          const recognition: any = new SpeechClass()
          recognition.lang = 'pt-BR'
          recognition.continuous = false
          recognition.interimResults = true
          recognition.maxAlternatives = 1

          recognition.onresult = (event: any) => {
            let interim = ''
            let final = ''
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                final += event.results[i][0].transcript
              } else {
                interim += event.results[i][0].transcript
              }
            }
            if (final) {
              setTranscript(final.trim())
            }
            setInterimTranscript(interim.trim())
          }

          recognition.onerror = (event: any) => {
            console.warn('Erro de reconhecimento de voz:', event.error)
            setIsListening(false)
            if (event.error === 'not-allowed') {
              setSpeechError('Microfone bloqueado. Habilite o acesso ou use o teclado.')
            } else if (event.error !== 'no-speech') {
              setSpeechError('Não consegui ouvir com clareza. Tente falar novamente.')
            }
          }

          recognition.onend = () => {
            setIsListening(false)
          }

          recognitionRef.current = recognition
        } catch (e) {
          console.warn('Falha ao instanciar SpeechRecognition:', e)
          setIsSupported(false)
        }
      } else {
        setIsSupported(false)
      }
    }
  }, [])

  const startListening = useCallback(() => {
    setSpeechError(null)
    setTranscript('')
    setInterimTranscript('')
    recordingStartTimeRef.current = Date.now()

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.warn('Não foi possível iniciar o microfone:', err)
        setIsListening(false)
      }
    }
  }, [])

  const stopListening = useCallback((): number => {
    let durationSeconds = 3
    if (recordingStartTimeRef.current) {
      durationSeconds = Math.max(1, (Date.now() - recordingStartTimeRef.current) / 1000)
      recordingStartTimeRef.current = null
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      setIsListening(false)
    }
    return durationSeconds
  }, [])

  // Sintetizador de voz pt-BR claro e calmo, sem jargão
  const speakText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
        // Remove markdown, caracteres de controle e ajusta pronúncia em pt-BR
        const cleanToSpeak = text
          .replace(/[#*_`~]/g, '')
          .replace(/INTENT_JSON:.*$/s, '')
          .replace(/R\$\s*([0-9.,]+)/g, '$1 reais')
          .replace(/m²/g, 'metros quadrados')
          .replace(/m³/g, 'metros cúbicos')
          .replace(/cm/g, 'centímetros')
          .replace(/kg/g, 'quilos')
          .replace(/un/g, 'unidades')
          .replace(/•/g, '')
          .replace(/⚠️/g, 'Atenção:')
          .trim()

        if (!cleanToSpeak) return

        const utterance = new SpeechSynthesisUtterance(cleanToSpeak)
        utterance.lang = 'pt-BR'
        utterance.rate = 1.0 // Cadência calma e clara
        utterance.pitch = 1.0

        // Seleção de voz pt-BR com fallback
        const selectAndSpeak = () => {
          const voices = window.speechSynthesis.getVoices()
          const ptVoice =
            voices.find((v) => v.lang === 'pt-BR' || v.lang === 'pt_BR') ||
            voices.find((v) => v.lang.startsWith('pt'))
          if (ptVoice) {
            utterance.voice = ptVoice
          }
          window.speechSynthesis.speak(utterance)
        }

        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          selectAndSpeak()
        } else {
          // Chrome às vezes carrega vozes assincronamente
          window.speechSynthesis.onvoiceschanged = () => {
            selectAndSpeak()
          }
        }
      } catch (e) {
        console.warn('Erro ao sintetizar voz:', e)
      }
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  return {
    isSupported,
    isListening,
    transcript,
    setTranscript,
    interimTranscript,
    speechError,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  }
}
