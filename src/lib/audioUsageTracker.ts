/**
 * Controle de uso de minutos de áudio / IA por voz por ciclo de faturamento.
 * Armazenamento persistente e offline-first com renovação automática no ciclo da assinatura.
 */

export interface ConsumoAudioMes {
  userId: string
  cicloMesAno: string // '2025-05'
  segundosUsados: number
  totalComandosVoz: number
  ultimaAtualizacao: string
}

const STORAGE_KEY_PREFIX = 'ajudante_audio_uso_'

export function obterChaveCicloAtual(dataReferencia?: Date): string {
  const d = dataReferencia || new Date()
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

export function obterConsumoAudio(userId?: string): ConsumoAudioMes {
  const uid = userId || 'local_user'
  const ciclo = obterChaveCicloAtual()
  const key = `${STORAGE_KEY_PREFIX}${uid}`

  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as ConsumoAudioMes
      // Se for do mesmo ciclo/mês, retorna
      if (parsed.cicloMesAno === ciclo) {
        return parsed
      }
      // Se virou o mês/ciclo, renova o contador automaticamente!
    }
  } catch {
    /* intentionally ignored */
  }

  // Inicializa ciclo renovado
  const novoConsumo: ConsumoAudioMes = {
    userId: uid,
    cicloMesAno: ciclo,
    segundosUsados: 0,
    totalComandosVoz: 0,
    ultimaAtualizacao: new Date().toISOString(),
  }
  salvarConsumoAudio(novoConsumo)
  return novoConsumo
}

export function registrarUsoAudio(segundos: number, userId?: string): ConsumoAudioMes {
  const consumoAtual = obterConsumoAudio(userId)
  const segundosValidos = Math.max(1, Math.round(segundos || 5)) // mínimo de 1s, default 5s para falas curtas
  consumoAtual.segundosUsados += segundosValidos
  consumoAtual.totalComandosVoz += 1
  consumoAtual.ultimaAtualizacao = new Date().toISOString()
  salvarConsumoAudio(consumoAtual)
  return consumoAtual
}

function salvarConsumoAudio(consumo: ConsumoAudioMes): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${consumo.userId}`
    localStorage.setItem(key, JSON.stringify(consumo))
  } catch {
    /* intentionally ignored */
  }
}

export function formatarMinutosESegundos(segundosTotais: number): string {
  const min = Math.floor(segundosTotais / 60)
  const seg = Math.round(segundosTotais % 60)
  if (min === 0) return `${seg}s`
  if (seg === 0) return `${min} min`
  return `${min}m ${seg}s`
}
