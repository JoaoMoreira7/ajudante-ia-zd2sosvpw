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

  test('Estoque: O que está acabando? e Faz uma lista de compras', () => {
    const resAcabando = parseLocalIntent('O que está acabando?')
    expect(resAcabando.intent).toBe('estoque_consultar_acabando')

    const resPdf = parseLocalIntent('gera o relatório da obra do João em pdf')
    expect(resPdf.intent).toBe('gerar_relatorio_obra_pdf')
    expect(resPdf.params.termoObra).toContain('João')

    const resFoto = parseLocalIntent('essa foto é do vazamento na obra do João')
    expect(resFoto.intent).toBe('foto_obra_legenda')
    expect(resFoto.params.termoObra).toContain('João')
    expect(resFoto.params.legenda).toContain('vazamento')

    const resLista = parseLocalIntent('Faz uma lista de compras')
    expect(resLista.intent).toBe('estoque_lista_compras')
  })

  test('Aritmética: Quanto é 5 vezes 3?', () => {
    const res = parseLocalIntent('Quanto é 5 vezes 3?')
    expect(res.intent).toBe('aritmetica_simples')
    expect(res.params.resultado).toBe(15)
  })

  test('Orçamento por voz: Cria um orçamento para fazer uma parede de 20 metros quadrados', () => {
    const res = parseLocalIntent('Cria um orçamento para fazer uma parede de 20 metros quadrados')
    expect(res.intent).toBe('iniciar_orcamento_voz')
    expect(res.params.area).toBe(20)
    expect(res.params.servico).toBe('parede')
  })

  test('Consulta diário por voz: O que eu fiz na obra do João ontem?', () => {
    const res = parseLocalIntent('O que eu fiz na obra do João ontem?')
    expect(res.intent).toBe('consultar_diario_obra')
    expect(res.params.dataExpressao).toBe('ontem')
  })

  test('Regra 2: "bater o nível com a mangueira" e variantes viram atividade "Nivelamento Hidráulico"', () => {
    const res1 = parseLocalIntent('Hoje a gente foi bater o nível com a mangueira na fundação')
    expect(res1.intent).toBe('diario_obra')
    expect(res1.params.atividade).toBe('Nivelamento Hidráulico')
    expect(res1.params.servico).toBe('Nivelamento Hidráulico')

    const res2 = parseLocalIntent('precisamos nivelar com a mangueira todo o terreno')
    expect(res2.intent).toBe('diario_obra')
    expect(res2.params.atividade).toBe('Nivelamento Hidráulico')

    const res3 = parseLocalIntent('vamos bater nível de mangueira nos pilares')
    expect(res3.intent).toBe('diario_obra')
    expect(res3.params.atividade).toBe('Nivelamento Hidráulico')
  })

  test('Regra 3: "bater um traço" e variantes viram atividade "Preparação de Argamassa/Concreto"', () => {
    const res1 = parseLocalIntent('o ajudante foi bater um traço para o reboco')
    expect(res1.intent).toBe('diario_obra')
    expect(res1.params.atividade).toBe('Preparação de Argamassa/Concreto')
    expect(res1.params.servico).toBe('Preparação de Argamassa/Concreto')

    const res2 = parseLocalIntent('ele bateu traço de concreto 1 para 3')
    expect(res2.intent).toBe('diario_obra')
    expect(res2.params.atividade).toBe('Preparação de Argamassa/Concreto')

    const res3 = parseLocalIntent('vamos bater traço na betoneira')
    expect(res3.intent).toBe('diario_obra')
    expect(res3.params.atividade).toBe('Preparação de Argamassa/Concreto')
  })
})
