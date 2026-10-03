import { describe, it, expect } from 'vitest'
import { normalizarJargaoObra } from './obraGlossary'

describe('obraGlossary - Normalização de Jargões e Erros de STT de Obra', () => {
  it('deve corrigir "viga de bar d\'água" para "viga baldrame"', () => {
    const res = normalizarJargaoObra('concretamos a viga de bar d água hoje')
    expect(res.houveCorrecao).toBe(true)
    expect(res.textoNormalizado).toContain('viga baldrame')
    expect(res.correcoes.some((c) => c.termoDetectado === 'viga baldrame')).toBe(true)
  })

  it('deve traduzir transcrição com "bardame" e variantes para "baldrame" (Regra 1)', () => {
    const res1 = normalizarJargaoObra('concretamos o bardame da fundação')
    expect(res1.houveCorrecao).toBe(true)
    expect(res1.textoNormalizado).toBe('concretamos o baldrame da fundação')
    expect(res1.correcoes.some((c) => c.corrigido === 'baldrame')).toBe(true)

    const res2 = normalizarJargaoObra("passar piche no bar d'água")
    expect(res2.houveCorrecao).toBe(true)
    expect(res2.textoNormalizado).toContain('baldrame')

    const res3 = normalizarJargaoObra('amarrou os estribos da viga de bardame')
    expect(res3.textoNormalizado).toContain('viga de baldrame')
  })

  it('deve corrigir "contra-piso" e "contra piso" para "contrapiso"', () => {
    const res1 = normalizarJargaoObra('fizemos o contra-piso da sala')
    expect(res1.textoNormalizado).toBe('fizemos o contrapiso da sala')
    expect(res1.houveCorrecao).toBe(true)

    const res2 = normalizarJargaoObra('quanto de cimento para o contra piso?')
    expect(res2.textoNormalizado).toBe('quanto de cimento para o contrapiso?')
  })

  it('deve corrigir "reboque" para "reboco"', () => {
    const res = normalizarJargaoObra('terminei o reboque de 25 metros')
    expect(res.textoNormalizado).toBe('terminei o reboco de 25 metros')
    expect(res.houveCorrecao).toBe(true)
  })

  it('deve reconhecer asfalto frio, estribo, traço, sapata e baldrame', () => {
    const res = normalizarJargaoObra(
      'comprei asfalto frio pra passar no baldrame e amarrar o estribo da sapata no traço forte',
    )
    expect(res.textoNormalizado).toContain('asfalto frio')
    expect(res.textoNormalizado).toContain('baldrame')
    expect(res.textoNormalizado).toContain('estribo')
    expect(res.textoNormalizado).toContain('sapata')
    expect(res.textoNormalizado).toContain('traço')
  })

  it('deve registrar texto original e corrigido para auditoria', () => {
    const bruto = 'viga de bar d’água com estribu e contra-piso'
    const res = normalizarJargaoObra(bruto)
    expect(res.textoOriginal).toBe(bruto)
    expect(res.textoNormalizado).toContain('viga baldrame')
    expect(res.textoNormalizado).toContain('estribo')
    expect(res.textoNormalizado).toContain('contrapiso')
    expect(res.correcoes.length).toBeGreaterThanOrEqual(3)
  })

  it('não deve alterar texto que já esteja correto', () => {
    const correto = 'parede de 8 por 3 metros com bloco cerâmico'
    const res = normalizarJargaoObra(correto)
    expect(res.houveCorrecao).toBe(false)
    expect(res.textoNormalizado).toBe(correto)
    expect(res.correcoes).toHaveLength(0)
  })
})
