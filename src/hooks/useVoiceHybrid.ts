/**
 * HOOK HÍBRIDO DE VOZ: SPEECH RECOGNITION (LOCAL/NAVEGADOR) + TTS (SPEECH SYNTHESIS)
 *
 * Regra do produto:
 * - Se SpeechRecognition estiver disponível, usa voz do aparelho.
 * - Se não estiver disponível, faz fallback gracioso para entrada de texto sem travar nada.
 * - Suporta sintetização de voz pt-BR se ativada nas configurações.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// Declaração de tipos para SpeechRecognition
// Interface de compatibilidade com navegadores
export function useVoiceHybrid() {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [speechError, setSpeechError] = useState<string | null>(null)

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

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      setIsListening(false)
    }
  }, [])

  // Sintetizador de voz pt-BR
  const speakText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
        // Remove markdown e símbolos excessivos para fala natural
        const cleanToSpeak = text
          .replace(/[#*_`]/g, '')
          .replace(/R\$\s*/g, 'reais ')
          .replace(/m²/g, 'metros quadrados')
          .replace(/m³/g, 'metros cúbicos')

        const utterance = new SpeechSynthesisUtterance(cleanToSpeak)
        utterance.lang = 'pt-BR'
        utterance.rate = 1.05

        // Tenta selecionar voz pt-BR nativa
        const voices = window.speechSynthesis.getVoices()
        const ptVoice = voices.find((v) => v.lang.startsWith('pt') || v.lang.includes('BR'))
        if (ptVoice) {
          utterance.voice = ptVoice
        }

        window.speechSynthesis.speak(utterance)
      } catch (e) {
        console.warn('Erro ao falar texto:', e)
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
