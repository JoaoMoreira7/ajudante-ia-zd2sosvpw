import { describe, it, expect } from 'vitest'
import { normalizarJargaoObra } from '@/lib/obraGlossary'
import { parseLocalIntent } from '@/lib/intentParser'
import { interpretCommandLocally } from '@/lib/localInterpreter'

describe('Regras de Voz-IA do Usuário (Fonética e Jargão de Obra)', () => {
  describe('Regra 1: Fonética "bardame" -> "baldrame" no relatório estruturado', () => {
    it('deve traduzir "bardame" para "baldrame"', () => {
      const res = normalizarJargaoObra('concretamos o bardame hoje cedo')
      expect(res.houveCorrecao).toBe(true)
      expect(res.textoNormalizado).toBe('concretamos o baldrame hoje cedo')
      expect(res.correcoes.some((c) => c.corrigido === 'baldrame')).toBe(true)
    })

    it('deve traduzir "bar d\'água" para "baldrame"', () => {
      const res = normalizarJargaoObra("passamos impermeabilizante no bar d'água")
      expect(res.houveCorrecao).toBe(true)
      expect(res.textoNormalizado).toContain('baldrame')
    })

    it('deve manter texto já correto como "baldrame"', () => {
      const res = normalizarJargaoObra('viga baldrame nivelada')
      expect(res.textoNormalizado).toContain('baldrame')
    })
  })

  describe('Regra 2: "bater o nível com a mangueira" -> atividade "Nivelamento Hidráulico"', () => {
    it('deve estruturar "bater o nível com a mangueira" como Nivelamento Hidráulico no intentParser', () => {
      const intent = parseLocalIntent('Hoje fomos bater o nível com a mangueira')
      expect(intent.intent).toBe('diario_obra')
      expect(intent.params.atividade).toBe('Nivelamento Hidráulico')
      expect(intent.params.servico).toBe('Nivelamento Hidráulico')
    })

    it('deve estruturar variantes como "nivelar com a mangueira" e "bater nível de mangueira"', () => {
      const intent1 = parseLocalIntent('precisamos nivelar com a mangueira')
      expect(intent1.params.atividade).toBe('Nivelamento Hidráulico')

      const intent2 = parseLocalIntent('vamos bater nível de mangueira nos cantos')
      expect(intent2.params.atividade).toBe('Nivelamento Hidráulico')
    })

    it('deve estruturar "bater o nível com a mangueira" no localInterpreter', () => {
      const local = interpretCommandLocally('bater o nível com a mangueira no canteiro')
      expect(local.intent).toBe('diario_obra')
      expect(local.params.atividade).toBe('Nivelamento Hidráulico')
    })
  })

  describe('Regra 3: "bater um traço" -> atividade "Preparação de Argamassa/Concreto"', () => {
    it('deve classificar "bater um traço" como Preparação de Argamassa/Concreto no intentParser', () => {
      const intent = parseLocalIntent('O servente foi bater um traço')
      expect(intent.intent).toBe('diario_obra')
      expect(intent.params.atividade).toBe('Preparação de Argamassa/Concreto')
      expect(intent.params.servico).toBe('Preparação de Argamassa/Concreto')
    })

    it('deve classificar variantes "bateu traço" e "bater traço"', () => {
      const intent1 = parseLocalIntent('a equipe bateu traço para o reboco')
      expect(intent1.params.atividade).toBe('Preparação de Argamassa/Concreto')

      const intent2 = parseLocalIntent('vamos bater traço na betoneira')
      expect(intent2.params.atividade).toBe('Preparação de Argamassa/Concreto')
    })

    it('deve classificar "bater um traço" no localInterpreter', () => {
      const local = interpretCommandLocally('bater um traço forte')
      expect(local.intent).toBe('diario_obra')
      expect(local.params.atividade).toBe('Preparação de Argamassa/Concreto')
    })
  })
})
