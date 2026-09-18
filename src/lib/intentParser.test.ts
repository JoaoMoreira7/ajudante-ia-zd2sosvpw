import { describe, test, expect } from 'vitest'
import { parseLocalIntent } from './intentParser'

describe('Interpretador Local de Intenções (Português do Brasil)', () => {
  test('Calcula parede de 10 por 3', () => {
    const res = parseLocalIntent('Calcula uma parede de 10 por 3.')
    expect(res.intent).toBe('calc_area')
    expect(res.params.comprimento).toBe(10)
    expect(res.params.altura).toBe(3)
  })

  test('Quanto de piso preciso para 30 metros?', () => {
    const res = parseLocalIntent('Quanto de piso preciso para 30 metros?')
    expect(res.intent).toBe('calc_piso')
    expect(res.params.areaM2).toBe(30)
  })

  test('Acrescenta 10% de perda.', () => {
    const res = parseLocalIntent('Acrescenta 10% de perda.')
    expect(res.intent).toBe('ajustar_perda')
    expect(res.params.perdaPct).toBe(10)
  })

  test('Tira a porta de 80 por 210.', () => {
    const res = parseLocalIntent('Tira a porta de 80 por 210.')
    expect(res.intent).toBe('descontar_abertura')
    expect(res.params.largura).toBe(0.8)
    expect(res.params.altura).toBe(2.1)
  })

  test('Registra uma saída de 350 reais de material', () => {
    const res = parseLocalIntent('Ajudante, registra uma saída de 350 reais de material.')
    expect(res.intent).toBe('registrar_saida')
    expect(res.params.valor).toBe(350)
    expect(res.requerConfirmacao).toBe(true)
  })

  test('Registra o pagamento de 1500 reais', () => {
    const res = parseLocalIntent('Registra o pagamento de 1500 reais do Carlos.')
    expect(res.intent).toBe('registrar_entrada')
    expect(res.params.valor).toBe(1500)
    expect(res.requerConfirmacao).toBe(true)
  })

  test('Comandos de desfazer, corrigir e cancelar', () => {
    expect(parseLocalIntent('Desfaz.').intent).toBe('acao_desfazer')
    expect(parseLocalIntent('Corrige.').intent).toBe('acao_desfazer')
    expect(parseLocalIntent('Cancela.').intent).toBe('acao_desfazer')
  })

  test('Estoque: Tenho 15 sacos de cimento e Baixa 5 sacos', () => {
    const resAdd = parseLocalIntent('Tenho 15 sacos de cimento')
    expect(resAdd.intent).toBe('estoque_adicionar')
    expect(resAdd.params.quantidade).toBe(15)

    const resSub = parseLocalIntent('Baixa 5 sacos de cimento')
    expect(resSub.intent).toBe('estoque_baixar')
    expect(resSub.params.quantidade).toBe(5)
  })

  test('Aritmética: Quanto é 5 vezes 3?', () => {
    const res = parseLocalIntent('Quanto é 5 vezes 3?')
    expect(res.intent).toBe('aritmetica_simples')
    expect(res.params.resultado).toBe(15)
  })
})
