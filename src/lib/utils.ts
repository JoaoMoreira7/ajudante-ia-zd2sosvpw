/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata um valor numérico para moeda com segurança contra null, undefined ou NaN.
 * Ex: formatarMoedaSegura(12.5) => "12,50"
 *     formatarMoedaSegura(undefined) => "0,00"
 */
export function formatarMoedaSegura(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') {
    return '0,00'
  }
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : Number(valor)
  if (!Number.isFinite(num)) {
    return '0,00'
  }
  return num.toFixed(2).replace('.', ',')
}

/**
 * Converte e formata uma string/data de forma segura para o formato pt-BR (DD/MM/AAAA).
 * Lida com 'YYYY-MM-DD', ISO strings e timestamps, evitando Invalid Date em webviews de iOS/Android.
 */
export function formatarDataSegura(dataInput: string | Date | number | null | undefined): string {
  if (!dataInput) return ''
  try {
    if (typeof dataInput === 'string') {
      const match = dataInput.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (match) {
        const [, ano, mes, dia] = match
        return `${dia}/${mes}/${ano}`
      }
    }
    const d = new Date(dataInput)
    if (Number.isNaN(d.getTime())) {
      return ''
    }
    return d.toLocaleDateString('pt-BR')
  } catch {
    return ''
  }
}

/**
 * Faz parse seguro de uma data string para objeto Date, evitando problemas de timezone ou Invalid Date.
 */
export function parseDataSegura(dataInput: string | null | undefined): Date | null {
  if (!dataInput) return null
  try {
    if (typeof dataInput === 'string') {
      const match = dataInput.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (match) {
        const [, ano, mes, dia] = match
        const d = new Date(Number(ano), Number(mes) - 1, Number(dia))
        return Number.isNaN(d.getTime()) ? null : d
      }
    }
    const d = new Date(dataInput)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}
