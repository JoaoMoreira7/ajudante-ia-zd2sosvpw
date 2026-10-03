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

export type NivelConsumoAudio = 'normal' | 'atencao' | 'critico' | 'ilimitado'

export interface EstadoConsumoAudio {
  isIlimitado: boolean
  minutosUsados: number
  maxMinutos: number
  minutosRestantes: number
  percentual: number // 0 a 100
  nivel: NivelConsumoAudio
  corBarra: string // classes Tailwind para a barra de progresso
  corTexto: string // classes Tailwind para textos
  corBadge: string // classes Tailwind para badges
  textoEstado: string
  descricaoAmigavel: string
}

/**
 * Calcula o estado visual dinâmico do consumo de voz por plano:
 * - Verde (normal): até 70%
 * - Amarelo (atenção): entre 70% e 90%
 * - Vermelho (crítico): acima de 90%
 * - Ilimitado (plano Empresa ou modulosLiberados)
 */
export function calcularEstadoConsumoAudio(
  segundosUsados: number,
  maxMinutosAudioMes: number,
): EstadoConsumoAudio {
  const isIlimitado = maxMinutosAudioMes === -1
  const minutosUsados = Math.max(0, (segundosUsados || 0) / 60)

  if (isIlimitado) {
    return {
      isIlimitado: true,
      minutosUsados,
      maxMinutos: -1,
      minutosRestantes: -1,
      percentual: 0,
      nivel: 'ilimitado',
      corBarra: 'bg-emerald-500',
      corTexto: 'text-emerald-600 dark:text-emerald-400',
      corBadge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      textoEstado: 'Ilimitado',
      descricaoAmigavel: 'Voz ilimitada no Plano Empresa',
    }
  }

  const max = Math.max(1, maxMinutosAudioMes)
  const rawPct = (minutosUsados / max) * 100
  const percentual = Math.min(100, Math.max(0, Math.round(rawPct)))
  const minutosRestantes = Math.max(0, Math.round(max - minutosUsados))

  let nivel: NivelConsumoAudio = 'normal'
  let corBarra = 'bg-emerald-500'
  let corTexto = 'text-emerald-600 dark:text-emerald-400'
  let corBadge = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
  let textoEstado = 'Normal'
  let descricaoAmigavel = `${minutosRestantes} min restantes de ${max} min`

  if (percentual >= 90) {
    nivel = 'critico'
    corBarra = 'bg-red-500'
    corTexto = 'text-red-600 dark:text-red-400'
    corBadge = 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 animate-pulse'
    textoEstado = percentual >= 100 ? 'Limite atingido' : 'Quase no limite'
    descricaoAmigavel =
      percentual >= 100
        ? 'Teto de voz atingido neste mês (cálculos offline continuam ativos)'
        : `Apenas ${minutosRestantes} min restantes de voz`
  } else if (percentual >= 70) {
    nivel = 'atencao'
    corBarra = 'bg-amber-500'
    corTexto = 'text-amber-600 dark:text-amber-400'
    corBadge = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
    textoEstado = 'Atenção'
    descricaoAmigavel = `${minutosRestantes} min restantes (${percentual}% usado)`
  }

  return {
    isIlimitado: false,
    minutosUsados,
    maxMinutos: max,
    minutosRestantes,
    percentual,
    nivel,
    corBarra,
    corTexto,
    corBadge,
    textoEstado,
    descricaoAmigavel,
  }
}
