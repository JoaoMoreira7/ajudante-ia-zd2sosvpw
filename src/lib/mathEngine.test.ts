// src/lib/mathEngine.test.ts
// Testes obrigatórios do motor determinístico de cálculo da construção civil - Ajudante IA

import {
  calcularAreaRetangulo,
  calcularAreaComDesconto,
  calcularVolume,
  calcularPerimetro,
  converterComprimento,
  converterVolume,
  converterMassa,
  calcularRegraDeTres,
  calcularPorcentagem,
  calcularDesconto,
  calcularMargemLucro,
  calcularAlvenaria,
  calcularReboco,
  calcularContrapiso,
  calcularConcreto,
  calcularPiso,
  calcularPintura,
  calcularTelhado,
  informacaoFundacao,
  calcularOrcamento,
  calcularResumoFinanceiro,
  calcularMovimentacaoEstoque,
} from './mathEngine'

export function runMathEngineTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0
  let failed = 0
  const errors: string[] = []

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++
    } else {
      failed++
      errors.push(`FALHA: ${message}`)
    }
  }

  function assertClose(actual: number, expected: number, tolerance = 0.01, message = '') {
    const diff = Math.abs(actual - expected)
    if (diff <= tolerance) {
      passed++
    } else {
      failed++
      errors.push(`FALHA assertClose: esperado ~${expected}, recebido ${actual}. ${message}`)
    }
  }

  // 1. Teste obrigatório 8x3 = 24 m²
  const resArea = calcularAreaRetangulo(8, 3)
  assert(resArea.valor === 24, '8x3 deve ser 24 m²')
  assert(resArea.tipo === 'EXATO', 'Cálculo de área deve ser EXATO')

  // 2. Teste obrigatório parede 8x3 com porta de 0.80x2.10 -> líquida 22.32 m²
  const resParedePorta = calcularAreaComDesconto(8, 3, [
    { largura: 0.8, altura: 2.1, descricao: 'Porta padrão' },
  ])
  assertClose(resParedePorta.valor.areaBruta, 24, 0.001, 'Área bruta deve ser 24 m²')
  assertClose(resParedePorta.valor.areaAberturas, 1.68, 0.001, 'Porta 0.80x2.10 deve ser 1.68 m²')
  assertClose(resParedePorta.valor.areaLiquida, 22.32, 0.001, 'Área líquida deve ser 22.32 m²')

  // 3. Teste obrigatório piso 4x5 = 20 m² + 10% -> ~22 m²
  const resPiso = calcularPiso({ areaM2: 20, perdaPct: 10, m2PorCaixa: 2 })
  assertClose(resPiso.valor.areaTotalComPerda, 22, 0.01, 'Piso 20m² + 10% deve ser 22 m²')
  assert(resPiso.valor.caixasPiso === 11, '22m² dividido por 2m²/cx = 11 caixas')
  assert(resPiso.tipo === 'ESTIMATIVA', 'Piso deve ser marcado como ESTIMATIVA')

  // 4. Volume e perímetro
  const resVol = calcularVolume(10, 4, 0.15) // laje 10x4x0.15 = 6 m³
  assertClose(resVol.valor, 6.0, 0.001, 'Volume 10x4x0.15 deve ser 6 m³')
  const resPerim = calcularPerimetro(10, 5) // 2*(10+5) = 30m
  assert(resPerim.valor === 30, 'Perímetro 10 e 5 deve ser 30m')

  // 5. Conversões obrigatórias
  const convMm = converterComprimento(2500, 'mm', 'm')
  assert(convMm.valor === 2.5, '2500 mm = 2.5 m')
  const convKm = converterComprimento(1.5, 'km', 'm')
  assert(convKm.valor === 1500, '1.5 km = 1500 m')
  const convVol = converterVolume(3500, 'litros', 'm3')
  assert(convVol.valor === 3.5, '3500 L = 3.5 m³')
  const convVol2 = converterVolume(2, 'm3', 'litros')
  assert(convVol2.valor === 2000, '2 m³ = 2000 L')
  const convMassa = converterMassa(4500, 'kg', 'toneladas')
  assert(convMassa.valor === 4.5, '4500 kg = 4.5 toneladas')

  // 6. Regra de três e porcentagens
  // 5 sacos fazem 10m², quantos sacos para 20m²? X = (10 * 20)/X não: 5/10 = X/20 => A=10m², B=5sacos, C=20m² => X=10 sacos
  const resRegra = calcularRegraDeTres(10, 5, 20)
  assert(resRegra.valor === 10, 'Regra de três: 10->5, 20->10')
  const resPct = calcularPorcentagem(1500, 15)
  assert(resPct.valor === 225, '15% de 1500 = 225')
  const resDesc = calcularDesconto(1000, 10)
  assert(resDesc.valor.valorFinal === 900, '1000 com 10% de desconto = 900')
  const resMargem = calcularMargemLucro(1000, 30)
  assert(resMargem.valor.precoVenda === 1300, 'Custo 1000 + 30% lucro = 1300')

  // 7. Estimativas da construção: Alvenaria, Reboco, Contrapiso, Concreto, Pintura, Telhado, Fundação
  const resAlv = calcularAlvenaria({ areaM2: 50, tipoBloco: 'ceramico_14x19x29', perdaPct: 10 })
  assert(resAlv.valor.quantidadeBlocos > 0, 'Alvenaria deve calcular blocos')
  assert(resAlv.tipo === 'ESTIMATIVA', 'Alvenaria é estimativa')

  const resReb = calcularReboco({ areaM2: 30, espessuraCm: 2 })
  assert(resReb.valor.cimentoSacos50kg > 0, 'Reboco deve calcular cimento')

  const resCp = calcularContrapiso({ areaM2: 40, espessuraCm: 5 })
  assert(resCp.valor.volumeM3 > 0, 'Contrapiso deve calcular volume')

  const resConc = calcularConcreto({ volumeM3: 3 })
  assert(resConc.valor.cimentoSacos50kg > 0, 'Concreto deve calcular sacos de cimento')

  const resPint = calcularPintura({ areaM2: 100, demaos: 2 })
  assert(resPint.valor.litrosTinta > 0, 'Pintura deve calcular litros')

  const resTelh = calcularTelhado({ areaPlantaM2: 80, inclinacaoPct: 30 })
  assert(resTelh.valor.areaInclinadaM2 > 80, 'Área inclinada deve ser maior que projeção')

  const resFund = informacaoFundacao()
  assert(resFund.tipo === 'TECNICA', 'Fundação deve ser classificada como TECNICA')

  // 8. Orçamento determinístico (subtotal, margem, desconto, sinal, parcelas)
  const resOrc = calcularOrcamento(
    [
      {
        descricao: 'Mão de obra parede',
        quantidade: 20,
        unidade: 'm²',
        precoUnitario: 50,
        categoria: 'mão de obra',
      },
      {
        descricao: 'Material cimento',
        quantidade: 5,
        unidade: 'saco',
        precoUnitario: 40,
        categoria: 'materiais',
      },
    ],
    {
      desconto: 50,
      margemLucroPct: 10,
      sinal: 300,
      numeroParcelas: 2,
    },
  )
  // Subtotal: (20*50) + (5*40) = 1000 + 200 = 1200
  assert(resOrc.valor.subtotal === 1200, 'Subtotal do orçamento deve ser 1200')
  // Margem 10% sobre 1200 = 120 => 1320
  assert(resOrc.valor.lucroAdicionado === 120, 'Lucro adicional 10% deve ser 120')
  // Desconto 50 => Total 1270
  assert(resOrc.valor.total === 1270, 'Total deve ser 1270 com margem e desconto')
  // Sinal 300 => Saldo restante 970 => 2 parcelas de 485
  assert(resOrc.valor.saldoRestante === 970, 'Saldo restante deve ser 970')
  assert(resOrc.valor.parcelas.length === 2, 'Deve ter 2 parcelas')
  assert(resOrc.valor.parcelas[0].valor === 485, 'Parcela 1 deve ser 485')
  assert(resOrc.valor.parcelas[1].valor === 485, 'Parcela 2 deve ser 485')

  // 9. Financeiro determinístico (saldos e resumo)
  const resFin = calcularResumoFinanceiro([
    { tipo: 'entrada', valor: 5000 },
    { tipo: 'entrada', valor: 3500 },
    { tipo: 'saida', valor: 1850 },
    { tipo: 'saida', valor: 1350 },
  ])
  assert(resFin.valor.totalEntradas === 8500, 'Total entradas deve ser 8500')
  assert(resFin.valor.totalSaidas === 3200, 'Total saídas deve ser 3200')
  assert(resFin.valor.saldoAtual === 5300, 'Saldo deve ser 5300')

  // 10. Movimentação de estoque (baixa e aviso de mínimo)
  const resEstoqueBaixa = calcularMovimentacaoEstoque({
    quantidadeAtual: 15,
    quantidadeAlteracao: 5,
    tipo: 'baixar',
    estoqueMinimo: 12,
  })
  assert(resEstoqueBaixa.valor.novaQuantidade === 10, '15 - 5 deve resultar em 10')
  assert(resEstoqueBaixa.valor.estaAcabando === true, '10 <= 12 deve acusar que está acabando')

  const resEstoqueAdd = calcularMovimentacaoEstoque({
    quantidadeAtual: 10,
    quantidadeAlteracao: 15,
    tipo: 'adicionar',
    estoqueMinimo: 12,
  })
  assert(resEstoqueAdd.valor.novaQuantidade === 25, '10 + 15 deve ser 25')
  assert(resEstoqueAdd.valor.estaAcabando === false, '25 > 12 não está acabando')

  return { passed, failed, errors }
}
