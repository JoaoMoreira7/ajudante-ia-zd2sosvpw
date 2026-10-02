/**
 * MOTOR DETERMINÍSTICO DE CÁLCULO PARA CONSTRUÇÃO CIVIL - AJUDANTE IA
 *
 * REGRA CRÍTICA:
 * A IA NÃO DEVE SER RESPONSÁVEL PELO CÁLCULO MATEMÁTICO FINAL.
 * A IA interpreta o que o usuário falou. O motor determinístico realiza o cálculo.
 * Todas as funções são puras, tipadas e testáveis.
 */

export type CalculationType = 'EXATO' | 'ESTIMATIVA' | 'TECNICA'

export interface CalculationResult<T = number> {
  tipo: CalculationType
  valor: T
  unidade: string
  passos: string[]
  formula: string
  aviso?: string
}

// -------------------------------------------------------------
// 1. ÁREA, VOLUME, PERÍMETRO E DESCONTOS DE VÃOS
// -------------------------------------------------------------

export function calcularAreaRetangulo(
  comprimento: number,
  larguraOuAltura: number,
): CalculationResult<number> {
  const c = Math.max(0, comprimento)
  const l = Math.max(0, larguraOuAltura)
  const area = Number((c * l).toFixed(4))
  return {
    tipo: 'EXATO',
    valor: Number(area.toFixed(2)),
    unidade: 'm²',
    formula: `${c} × ${l} = ${Number(area.toFixed(2))} m²`,
    passos: [`Multiplicação do comprimento (${c} m) pela largura/altura (${l} m).`],
  }
}

export function calcularAreaComDesconto(
  comprimento: number,
  altura: number,
  aberturas: Array<{ largura: number; altura: number; descricao?: string }> = [],
): CalculationResult<{ areaBruta: number; areaAberturas: number; areaLiquida: number }> {
  const c = Math.max(0, comprimento)
  const h = Math.max(0, altura)
  const areaBruta = Number((c * h).toFixed(4))
  let totalAberturas = 0
  const passos: string[] = [`Área bruta: ${c} m × ${h} m = ${Number(areaBruta.toFixed(2))} m²`]

  aberturas.forEach((ab, idx) => {
    const areaAb = Number((Math.max(0, ab.largura) * Math.max(0, ab.altura)).toFixed(4))
    totalAberturas += areaAb
    passos.push(
      `Vão ${idx + 1} (${ab.descricao || 'abertura'}): ${ab.largura} m × ${ab.altura} m = ${Number(areaAb.toFixed(2))} m²`,
    )
  })

  const areaLiquida = Math.max(0, Number((areaBruta - totalAberturas).toFixed(4)))
  passos.push(
    `Área líquida final: ${Number(areaBruta.toFixed(2))} m² - ${Number(totalAberturas.toFixed(2))} m² = ${Number(areaLiquida.toFixed(2))} m²`,
  )

  return {
    tipo: 'EXATO',
    valor: {
      areaBruta: Number(areaBruta.toFixed(2)),
      areaAberturas: Number(totalAberturas.toFixed(2)),
      areaLiquida: Number(areaLiquida.toFixed(2)),
    },
    unidade: 'm²',
    formula: `${Number(areaBruta.toFixed(2))} - ${Number(totalAberturas.toFixed(2))} = ${Number(areaLiquida.toFixed(2))} m²`,
    passos,
  }
}

export function calcularVolume(
  comprimento: number,
  largura: number,
  altura: number,
): CalculationResult<number> {
  const c = Math.max(0, comprimento)
  const l = Math.max(0, largura)
  const h = Math.max(0, altura)
  const volume = Number((c * l * h).toFixed(4))
  return {
    tipo: 'EXATO',
    valor: Number(volume.toFixed(3)),
    unidade: 'm³',
    formula: `${c} × ${l} × ${h} = ${Number(volume.toFixed(3))} m³`,
    passos: [`Cálculo de volume: ${c} m (comprimento) × ${l} m (largura) × ${h} m (altura).`],
  }
}

export function calcularPerimetro(comprimento: number, largura: number): CalculationResult<number> {
  const c = Math.max(0, comprimento)
  const l = Math.max(0, largura)
  const perimetro = Number((2 * (c + l)).toFixed(4))
  return {
    tipo: 'EXATO',
    valor: Number(perimetro.toFixed(2)),
    unidade: 'm',
    formula: `2 × (${c} + ${l}) = ${Number(perimetro.toFixed(2))} m`,
    passos: [`Soma dos 4 lados: 2 × ${c} m + 2 × ${l} m = ${Number(perimetro.toFixed(2))} m`],
  }
}

// -------------------------------------------------------------
// 2. CONVERSÕES DE UNIDADES
// -------------------------------------------------------------

export type UnidadeComprimento = 'mm' | 'cm' | 'm' | 'km'
export type UnidadeArea = 'cm2' | 'm2'
export type UnidadeVolume = 'litros' | 'm3'
export type UnidadeMassa = 'kg' | 'toneladas'

export function converterComprimento(
  valor: number,
  de: UnidadeComprimento,
  para: UnidadeComprimento,
): CalculationResult<number> {
  const fatoresParaMetros: Record<UnidadeComprimento, number> = {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
  }
  const emMetros = valor * fatoresParaMetros[de]
  const resultado = emMetros / fatoresParaMetros[para]
  return {
    tipo: 'EXATO',
    valor: Number(resultado.toFixed(4)),
    unidade: para,
    formula: `${valor} ${de} = ${Number(resultado.toFixed(4))} ${para}`,
    passos: [`Conversão de ${de} para metros e depois para ${para}.`],
  }
}

export function converterVolume(
  valor: number,
  de: UnidadeVolume,
  para: UnidadeVolume,
): CalculationResult<number> {
  // 1 m³ = 1000 litros
  let resultado: number
  if (de === 'litros' && para === 'm3') {
    resultado = valor / 1000
  } else if (de === 'm3' && para === 'litros') {
    resultado = valor * 1000
  } else {
    resultado = valor
  }
  return {
    tipo: 'EXATO',
    valor: Number(resultado.toFixed(4)),
    unidade: para,
    formula: `${valor} ${de} = ${Number(resultado.toFixed(4))} ${para}`,
    passos: [`1 metro cúbico equivale exatamente a 1.000 litros.`],
  }
}

export function converterMassa(
  valor: number,
  de: UnidadeMassa,
  para: UnidadeMassa,
): CalculationResult<number> {
  // 1 tonelada = 1000 kg
  let resultado: number
  if (de === 'kg' && para === 'toneladas') {
    resultado = valor / 1000
  } else if (de === 'toneladas' && para === 'kg') {
    resultado = valor * 1000
  } else {
    resultado = valor
  }
  return {
    tipo: 'EXATO',
    valor: Number(resultado.toFixed(4)),
    unidade: para,
    formula: `${valor} ${de} = ${Number(resultado.toFixed(4))} ${para}`,
    passos: [`1 tonelada métrica equivale exatamente a 1.000 quilogramas.`],
  }
}

// -------------------------------------------------------------
// 3. MATEMÁTICA FINANCEIRA E BÁSICA
// -------------------------------------------------------------

export function calcularRegraDeTres(a: number, b: number, c: number): CalculationResult<number> {
  // A está para B, assim como C está para X => X = (B * C) / A
  if (a === 0) {
    throw new Error('O valor de A não pode ser zero na regra de três.')
  }
  const x = (b * c) / a
  return {
    tipo: 'EXATO',
    valor: Number(x.toFixed(4)),
    unidade: '',
    formula: `(${b} × ${c}) ÷ ${a} = ${Number(x.toFixed(4))}`,
    passos: [
      `Proporção: ${a} ---> ${b}`,
      `           ${c} ---> X`,
      `X = (${b} × ${c}) / ${a} = ${Number(x.toFixed(4))}`,
    ],
  }
}

export function calcularPorcentagem(valor: number, porcentagem: number): CalculationResult<number> {
  const resultado = (valor * porcentagem) / 100
  return {
    tipo: 'EXATO',
    valor: Number(resultado.toFixed(2)),
    unidade: '',
    formula: `(${valor} × ${porcentagem}) ÷ 100 = ${Number(resultado.toFixed(2))}`,
    passos: [`${porcentagem}% de ${valor} = ${Number(resultado.toFixed(2))}`],
  }
}

export function calcularDesconto(
  valorOriginal: number,
  porcentagemDesconto: number,
): CalculationResult<{ valorDesconto: number; valorFinal: number }> {
  const desconto = (valorOriginal * porcentagemDesconto) / 100
  const valorFinal = Math.max(0, valorOriginal - desconto)
  return {
    tipo: 'EXATO',
    valor: {
      valorDesconto: Number(desconto.toFixed(2)),
      valorFinal: Number(valorFinal.toFixed(2)),
    },
    unidade: 'R$',
    formula: `R$ ${valorOriginal.toFixed(2)} - ${porcentagemDesconto}% = R$ ${valorFinal.toFixed(2)}`,
    passos: [
      `Desconto calculado: R$ ${desconto.toFixed(2)}`,
      `Valor com desconto: R$ ${valorFinal.toFixed(2)}`,
    ],
  }
}

export function calcularMargemLucro(
  custo: number,
  margemDesejadaPct: number,
): CalculationResult<{ precoVenda: number; lucro: number }> {
  // Preço de venda para margem sobre o custo: PV = Custo * (1 + margem/100)
  const lucro = (custo * margemDesejadaPct) / 100
  const precoVenda = custo + lucro
  return {
    tipo: 'EXATO',
    valor: {
      precoVenda: Number(precoVenda.toFixed(2)),
      lucro: Number(lucro.toFixed(2)),
    },
    unidade: 'R$',
    formula: `Custo R$ ${custo.toFixed(2)} + ${margemDesejadaPct}% = R$ ${precoVenda.toFixed(2)}`,
    passos: [
      `Lucro bruto estimado: R$ ${lucro.toFixed(2)}`,
      `Preço de venda sugerido: R$ ${precoVenda.toFixed(2)}`,
    ],
  }
}

// -------------------------------------------------------------
// 4. CALCULADORAS ESPECÍFICAS DE CONSTRUÇÃO (ESTIMATIVAS)
// -------------------------------------------------------------

export interface AlvenariaInput {
  areaM2: number
  tipoBloco?: 'ceramico_9x19x19' | 'ceramico_14x19x29' | 'concreto_14x19x39' | 'tijolo_comum'
  perdaPct?: number // padrão 10%
}

export interface AlvenariaOutput {
  quantidadeBlocos: number
  argamassaLitros: number
  cimentoKg: number
  areiaM3: number
}

export function calcularAlvenaria(input: AlvenariaInput): CalculationResult<AlvenariaOutput> {
  const tipo = input.tipoBloco || 'ceramico_14x19x29'
  const perda = input.perdaPct ?? 10
  const fatorPerda = 1 + perda / 100

  // Consumo médio padrão por m² na construção civil brasileira
  let blocosPorM2 = 25 // 14x19x29 com junta de 1.5cm usa ~16 a 18 em pé, deitado ~25
  let cimentoKgPorM2 = 4.5
  let areiaM3PorM2 = 0.02

  switch (tipo) {
    case 'ceramico_9x19x19':
      blocosPorM2 = 25
      cimentoKgPorM2 = 4.0
      areiaM3PorM2 = 0.018
      break
    case 'ceramico_14x19x29':
      blocosPorM2 = 17
      cimentoKgPorM2 = 4.8
      areiaM3PorM2 = 0.022
      break
    case 'concreto_14x19x39':
      blocosPorM2 = 12.5
      cimentoKgPorM2 = 5.2
      areiaM3PorM2 = 0.025
      break
    case 'tijolo_comum':
      blocosPorM2 = 75
      cimentoKgPorM2 = 7.0
      areiaM3PorM2 = 0.035
      break
  }

  const quantidadeBlocos = Math.ceil(input.areaM2 * blocosPorM2 * fatorPerda)
  const cimentoKg = Number((input.areaM2 * cimentoKgPorM2 * fatorPerda).toFixed(1))
  const areiaM3 = Number((input.areaM2 * areiaM3PorM2 * fatorPerda).toFixed(2))
  const argamassaLitros = Number((areiaM3 * 1000).toFixed(0))

  return {
    tipo: 'ESTIMATIVA',
    valor: {
      quantidadeBlocos,
      argamassaLitros,
      cimentoKg,
      areiaM3,
    },
    unidade: 'materiais',
    formula: `${input.areaM2} m² × ${blocosPorM2} un/m² + ${perda}% perda = ${quantidadeBlocos} un`,
    passos: [
      `Área da alvenaria: ${input.areaM2} m²`,
      `Consumo nominal: ${blocosPorM2} blocos/m² para o modelo selecionado`,
      `Margem de perda aplicada: ${perda}%`,
      `Cimento estimado: ~${cimentoKg} kg (~${Math.ceil(cimentoKg / 50)} sacos de 50kg)`,
      `Areia lavada estimada: ~${areiaM3} m³`,
    ],
    aviso:
      'Valor estimado com base em consumo médio. Não substitui projeto ou orientação profissional.',
  }
}

export interface RebocoInput {
  areaM2: number
  espessuraCm?: number // padrão 1.5 cm a 2.0 cm
  traco?: '1:3' | '1:4' | '1:2:8' // Cimento:areia ou cimento:cal:areia
  perdaPct?: number // padrão 10%
}

export interface RebocoOutput {
  volumeArgamassaM3: number
  cimentoSacos50kg: number
  areiaM3: number
  calSacos20kg?: number
}

export function calcularReboco(input: RebocoInput): CalculationResult<RebocoOutput> {
  const espessura = input.espessuraCm ?? 2 // 2 cm
  const perda = input.perdaPct ?? 10
  const fatorPerda = 1 + perda / 100

  // Volume m³ = Area × Espessura em metros
  const volumeNominalM3 = input.areaM2 * (espessura / 100)
  const volumeTotalM3 = Number((volumeNominalM3 * fatorPerda).toFixed(3))

  // Traço médio de emboço/reboco (1 saco de cimento 50kg rende ~0.15 a 0.18 m³ de argamassa no traço 1:4)
  const cimentoSacos50kg = Math.ceil(volumeTotalM3 / 0.16)
  const areiaM3 = Number((volumeTotalM3 * 1.15).toFixed(2)) // fator de adensamento
  const calSacos20kg = Math.ceil(cimentoSacos50kg * 1.2)

  return {
    tipo: 'ESTIMATIVA',
    valor: {
      volumeArgamassaM3: volumeTotalM3,
      cimentoSacos50kg,
      areiaM3,
      calSacos20kg,
    },
    unidade: 'materiais',
    formula: `${input.areaM2} m² × ${espessura} cm espessura = ${volumeTotalM3} m³ de argamassa`,
    passos: [
      `Área a revestir: ${input.areaM2} m² com espessura média de ${espessura} cm`,
      `Volume total com ${perda}% de perdas: ${volumeTotalM3} m³`,
      `Cimento: ~${cimentoSacos50kg} sacos de 50 kg`,
      `Cal hidratada: ~${calSacos20kg} sacos de 20 kg (para liga e plasticidade)`,
      `Areia média: ~${areiaM3} m³`,
    ],
    aviso:
      'Valor estimado com base em consumo médio. Não substitui projeto ou orientação profissional.',
  }
}

export interface ContrapisoInput {
  areaM2: number
  espessuraCm?: number // padrão 4 a 5 cm
  perdaPct?: number // padrão 10%
}

export interface ContrapisoOutput {
  volumeM3: number
  cimentoSacos50kg: number
  areiaM3: number
}

export function calcularContrapiso(input: ContrapisoInput): CalculationResult<ContrapisoOutput> {
  const espessura = input.espessuraCm ?? 4
  const perda = input.perdaPct ?? 10
  const fatorPerda = 1 + perda / 100

  const volumeNominal = input.areaM2 * (espessura / 100)
  const volumeTotal = Number((volumeNominal * fatorPerda).toFixed(3))

  // Traço típico de contrapiso farofa (1:4 ou 1:5 cimento:areia) -> ~6 sacos de cimento por m³
  const cimentoSacos50kg = Math.ceil(volumeTotal * 6.5)
  const areiaM3 = Number((volumeTotal * 1.1).toFixed(2))

  return {
    tipo: 'ESTIMATIVA',
    valor: {
      volumeM3: volumeTotal,
      cimentoSacos50kg,
      areiaM3,
    },
    unidade: 'materiais',
    formula: `${input.areaM2} m² × ${espessura} cm = ${volumeTotal} m³ de contrapiso`,
    passos: [
      `Área do contrapiso: ${input.areaM2} m² na espessura de ${espessura} cm`,
      `Volume total estimado (com ${perda}% de perda): ${volumeTotal} m³`,
      `Cimento necessário: ~${cimentoSacos50kg} sacos de 50kg`,
      `Areia média lavada: ~${areiaM3} m³`,
    ],
    aviso:
      'Valor estimado com base em consumo médio. Não substitui projeto ou orientação profissional.',
  }
}

export interface ConcretoInput {
  volumeM3: number
  traco?: '1:2:3' | '1:2.5:3.5' | '1:3:4' // cimento:areia:brita
  perdaPct?: number // padrão 5% a 10%
}

export interface ConcretoOutput {
  cimentoSacos50kg: number
  areiaM3: number
  britaM3: number
  aguaLitros: number
}

export function calcularConcreto(input: ConcretoInput): CalculationResult<ConcretoOutput> {
  const perda = input.perdaPct ?? 10
  const volTotal = input.volumeM3 * (1 + perda / 100)

  // No traço convencional estrutural 1:2:3 (aprox 25 MPa):
  // 1 m³ consome ~7.0 sacos de cimento de 50kg, 0.65 m³ de areia, 0.85 m³ de brita, ~180L de água
  const cimentoSacos50kg = Math.ceil(volTotal * 7.2)
  const areiaM3 = Number((volTotal * 0.68).toFixed(2))
  const britaM3 = Number((volTotal * 0.85).toFixed(2))
  const aguaLitros = Math.round(volTotal * 190)

  return {
    tipo: 'ESTIMATIVA',
    valor: {
      cimentoSacos50kg,
      areiaM3,
      britaM3,
      aguaLitros,
    },
    unidade: 'materiais',
    formula: `Concreto para ${input.volumeM3} m³ (+ ${perda}% perda) = ~${cimentoSacos50kg} sacos de cimento`,
    passos: [
      `Volume nominal: ${input.volumeM3} m³ de concreto`,
      `Volume com margem de segurança/perda (${perda}%): ${Number(volTotal.toFixed(2))} m³`,
      `Cimento: ~${cimentoSacos50kg} sacos de 50kg`,
      `Areia grossa/média: ~${areiaM3} m³`,
      `Brita nº 1: ~${britaM3} m³`,
      `Água limpa: ~${aguaLitros} litros`,
    ],
    aviso:
      'Valor estimado com base em consumo médio. Peças estruturais (vigas, pilares, lajes) exigem dimensionamento por engenheiro habilitado.',
  }
}

export interface PisoInput {
  areaM2: number
  perdaPct?: number // padrão 10% (retos) ou 15% (diagonal/recortes)
  m2PorCaixa?: number // padrão 2.0 m² por caixa
  precoM2?: number
}

export interface PisoOutput {
  areaTotalComPerda: number
  caixasPiso: number
  argamassaColanteSacos20kg: number
  rejunteKg: number
  custoPisoEstimado?: number
}

export function calcularPiso(input: PisoInput): CalculationResult<PisoOutput> {
  const perda = input.perdaPct ?? 10
  const m2PorCx = input.m2PorCaixa && input.m2PorCaixa > 0 ? input.m2PorCaixa : 2.0
  const areaTotalComPerda = Number((input.areaM2 * (1 + perda / 100)).toFixed(2))

  const caixasPiso = Math.ceil(areaTotalComPerda / m2PorCx)
  // Argamassa colante consome ~4.5 kg/m² para peças normais ou ~8kg para dupla colagem
  const argamassaColanteSacos20kg = Math.ceil((areaTotalComPerda * 5) / 20)
  // Rejunte consome cerca de 0.3 a 0.5 kg por m²
  const rejunteKg = Number((areaTotalComPerda * 0.4).toFixed(1))

  const custoPisoEstimado = input.precoM2
    ? Number((areaTotalComPerda * input.precoM2).toFixed(2))
    : undefined

  return {
    tipo: 'ESTIMATIVA',
    valor: {
      areaTotalComPerda,
      caixasPiso,
      argamassaColanteSacos20kg,
      rejunteKg,
      custoPisoEstimado,
    },
    unidade: 'materiais',
    formula: `${input.areaM2} m² + ${perda}% perda = ${areaTotalComPerda} m² (${caixasPiso} caixas)`,
    passos: [
      `Área útil do piso: ${input.areaM2} m²`,
      `Área total com ${perda}% para recortes: ${areaTotalComPerda} m²`,
      `Caixas de revestimento (${m2PorCx} m²/cx): ${caixasPiso} caixas`,
      `Argamassa AC-II / AC-III: ~${argamassaColanteSacos20kg} sacos de 20kg`,
      `Rejunte: ~${rejunteKg} kg`,
    ],
    aviso:
      'Valor estimado com base em consumo médio. Não substitui projeto ou orientação profissional.',
  }
}

export interface PinturaInput {
  areaM2: number
  demaos?: number // padrão 2
  rendimentoLata18LPorDemao?: number // rendimento de uma demão com 18L, ex: 250 m²
  precoLata?: number
}

export interface PinturaOutput {
  areaPinturaTotal: number
  litrosTinta: number
  latas18L: number
  galoes3_6L: number
}

export function calcularPintura(input: PinturaInput): CalculationResult<PinturaOutput> {
  const demaos = input.demaos ?? 2
  const areaPinturaTotal = input.areaM2 * demaos
  // Média de mercado: 1 litro de tinta cobre ~10 a 12 m² por demão
  const litrosTinta = Number((areaPinturaTotal / 11).toFixed(1))

  const latas18L = Math.floor(litrosTinta / 18)
  const restoLitros = litrosTinta % 18
  const galoes3_6L = Math.ceil(restoLitros / 3.6)

  return {
    tipo: 'ESTIMATIVA',
    valor: {
      areaPinturaTotal,
      litrosTinta,
      latas18L,
      galoes3_6L,
    },
    unidade: 'latas/galões',
    formula: `${input.areaM2} m² × ${demaos} demãos = ${areaPinturaTotal} m² de cobertura (~${litrosTinta} L)`,
    passos: [
      `Área das paredes: ${input.areaM2} m² para aplicar ${demaos} demãos`,
      `Volume total estimado de tinta: ~${litrosTinta} litros`,
      `Sugestão de compra: ${latas18L > 0 ? `${latas18L} lata(s) de 18L e ` : ''}${galoes3_6L} galão(ões) de 3,6L`,
    ],
    aviso:
      'Valor estimado com base em consumo médio. Não substitui projeto ou orientação profissional.',
  }
}

export interface TelhadoInput {
  areaPlantaM2: number
  inclinacaoPct?: number // padrão 30% a 35%
  tipoTelha?: 'ceramica_romana' | 'ceramica_portuguesa' | 'fibrocimento_ondulada' | 'metalica'
  perdaPct?: number // padrão 5% a 10%
}

export interface TelhadoOutput {
  areaInclinadaM2: number
  quantidadeTelhas: number
  cumeeirasMetrosLineares?: number
}

export function calcularTelhado(input: TelhadoInput): CalculationResult<TelhadoOutput> {
  const inclinacao = input.inclinacaoPct ?? 30 // 30%
  const perda = input.perdaPct ?? 8
  const tipoTelha = input.tipoTelha || 'ceramica_romana'

  // Fator de correção de inclinação: sqrt(1 + (inclinacao/100)^2)
  const fatorInclinacao = Math.sqrt(1 + Math.pow(inclinacao / 100, 2))
  const areaInclinadaM2 = Number((input.areaPlantaM2 * fatorInclinacao).toFixed(2))

  let telhasPorM2 = 16 // Cerâmica romana consome ~16 un/m²
  if (tipoTelha === 'ceramica_portuguesa') telhasPorM2 = 17
  if (tipoTelha === 'fibrocimento_ondulada') telhasPorM2 = 0.5 // telhões 2.44x1.10
  if (tipoTelha === 'metalica') telhasPorM2 = 0.35

  const quantidadeTelhas = Math.ceil(areaInclinadaM2 * telhasPorM2 * (1 + perda / 100))

  return {
    tipo: 'ESTIMATIVA',
    valor: {
      areaInclinadaM2,
      quantidadeTelhas,
    },
    unidade: 'telhas',
    formula: `${input.areaPlantaM2} m² em planta (${inclinacao}% inclinação) = ${areaInclinadaM2} m² de telhado`,
    passos: [
      `Área de projeção horizontal: ${input.areaPlantaM2} m²`,
      `Correção para inclinação de ${inclinacao}%: ${areaInclinadaM2} m² real de telhas`,
      `Quantidade estimada de telhas (com ${perda}% de perdas/recortes): ${quantidadeTelhas} unidades`,
    ],
    aviso:
      'Valor estimado com base em consumo médio. A estrutura de madeira ou aço exige cálculo e verificação por profissional habilitado.',
  }
}

export function informacaoFundacao(): CalculationResult<string> {
  return {
    tipo: 'TECNICA',
    valor: 'Fundação exige sondagem do solo (SPT) e projeto estrutural assinado.',
    unidade: '',
    formula: 'Norma ABNT NBR 6122 - Projeto e Execução de Fundações',
    passos: [
      '1. Sondagem de solo para identificar a resistência do terreno.',
      '2. Dimensionamento das sapatas, brocas ou estacas por engenheiro responsável.',
      '3. Nunca execute fundação sem projeto estrutural para evitar trincas e recalques.',
    ],
    aviso:
      'INFORMAÇÃO TÉCNICA: Consulte sempre um engenheiro civil ou profissional habilitado para o cálculo e dimensionamento de fundações.',
  }
}

// -------------------------------------------------------------
// 5. CÁLCULOS DE ORÇAMENTO, FINANCEIRO E CONTROLE DE ESTOQUE
// -------------------------------------------------------------

export interface ItemOrcamentoCalculo {
  descricao: string
  quantidade: number
  unidade: string
  precoUnitario: number
  categoria?: 'mão de obra' | 'materiais' | 'transporte' | 'ferramentas' | 'equipamentos' | 'outros'
}

export interface OrcamentoCalculado {
  itens: Array<ItemOrcamentoCalculo & { total: number }>
  subtotal: number
  desconto: number
  margemLucroPct: number
  lucroAdicionado: number
  total: number
  sinal: number
  saldoRestante: number
  parcelas: Array<{ numero: number; valor: number; vencimento?: string }>
}

export function calcularOrcamento(
  itens: ItemOrcamentoCalculo[],
  opcoes: {
    desconto?: number
    margemLucroPct?: number
    sinal?: number
    numeroParcelas?: number
  } = {},
): CalculationResult<OrcamentoCalculado> {
  const itensCalculados = itens.map((it) => {
    const q = Math.max(0, it.quantidade || 0)
    const p = Math.max(0, it.precoUnitario || 0)
    const total = Number((q * p).toFixed(2))
    return {
      ...it,
      quantidade: q,
      precoUnitario: p,
      total,
    }
  })

  const subtotal = Number(itensCalculados.reduce((acc, it) => acc + it.total, 0).toFixed(2))
  const margemLucroPct = Math.max(0, opcoes.margemLucroPct || 0)
  const lucroAdicionado = Number(((subtotal * margemLucroPct) / 100).toFixed(2))
  const valorComMargem = subtotal + lucroAdicionado

  const desconto = Math.max(0, Math.min(valorComMargem, opcoes.desconto || 0))
  const total = Number((valorComMargem - desconto).toFixed(2))

  const sinal = Math.max(0, Math.min(total, opcoes.sinal || 0))
  const saldoRestante = Number((total - sinal).toFixed(2))

  const numParcelas = Math.max(1, opcoes.numeroParcelas || 1)
  const valorParcelaBase = Number((saldoRestante / numParcelas).toFixed(2))

  const parcelas: Array<{ numero: number; valor: number }> = []
  let acumulado = 0
  for (let i = 1; i <= numParcelas; i++) {
    if (i === numParcelas) {
      // Ajuste de centavos na última parcela
      const ultimaParcela = Number((saldoRestante - acumulado).toFixed(2))
      parcelas.push({ numero: i, valor: ultimaParcela })
    } else {
      parcelas.push({ numero: i, valor: valorParcelaBase })
      acumulado += valorParcelaBase
    }
  }

  return {
    tipo: 'EXATO',
    valor: {
      itens: itensCalculados,
      subtotal,
      desconto,
      margemLucroPct,
      lucroAdicionado,
      total,
      sinal,
      saldoRestante,
      parcelas,
    },
    unidade: 'R$',
    formula: `Subtotal R$ ${subtotal.toFixed(2)} + Margem (${margemLucroPct}%) - Desconto R$ ${desconto.toFixed(2)} = R$ ${total.toFixed(2)}`,
    passos: [
      `Soma dos itens: R$ ${subtotal.toFixed(2)}`,
      margemLucroPct > 0
        ? `Margem de lucro (${margemLucroPct}%): +R$ ${lucroAdicionado.toFixed(2)}`
        : 'Sem margem adicional de lucro',
      desconto > 0 ? `Desconto concedido: -R$ ${desconto.toFixed(2)}` : 'Sem desconto',
      `Total final: R$ ${total.toFixed(2)}`,
      sinal > 0
        ? `Sinal: R$ ${sinal.toFixed(2)} + ${numParcelas}x de R$ ${parcelas[0]?.valor || 0}`
        : `Parcelamento: ${numParcelas}x de R$ ${parcelas[0]?.valor || 0}`,
    ],
  }
}

export interface LancamentoFinanceiroInput {
  tipo: 'entrada' | 'saida'
  valor: number
}

export interface ResumoFinanceiro {
  totalEntradas: number
  totalSaidas: number
  saldoAtual: number
  resultadoEstimado: number
}

export function calcularResumoFinanceiro(
  lancamentos: LancamentoFinanceiroInput[],
): CalculationResult<ResumoFinanceiro> {
  let totalEntradas = 0
  let totalSaidas = 0

  for (const item of lancamentos) {
    const val = Math.max(0, item.valor || 0)
    if (item.tipo === 'entrada') {
      totalEntradas += val
    } else {
      totalSaidas += val
    }
  }

  totalEntradas = Number(totalEntradas.toFixed(2))
  totalSaidas = Number(totalSaidas.toFixed(2))
  const saldoAtual = Number((totalEntradas - totalSaidas).toFixed(2))

  return {
    tipo: 'EXATO',
    valor: {
      totalEntradas,
      totalSaidas,
      saldoAtual,
      resultadoEstimado: saldoAtual,
    },
    unidade: 'R$',
    formula: `Entradas R$ ${totalEntradas.toFixed(2)} - Saídas R$ ${totalSaidas.toFixed(2)} = Saldo R$ ${saldoAtual.toFixed(2)}`,
    passos: [
      `Total de receitas recebidas: R$ ${totalEntradas.toFixed(2)}`,
      `Total de despesas pagas: R$ ${totalSaidas.toFixed(2)}`,
      `Saldo líquido em caixa: R$ ${saldoAtual.toFixed(2)}`,
    ],
  }
}

export interface MovimentacaoEstoqueInput {
  quantidadeAtual: number
  quantidadeAlteracao: number
  tipo: 'adicionar' | 'baixar'
  estoqueMinimo?: number
}

export interface MovimentacaoEstoqueOutput {
  novaQuantidade: number
  estaAcabando: boolean
  mensagem: string
}

// -------------------------------------------------------------
// 6. ESTIMATIVAS DETERMINÍSTICAS DE MATERIAIS PARA LISTA DE COMPRAS
// -------------------------------------------------------------

export interface ItemEstimativaMaterial {
  nome: string
  quantidade: number
  unidade: 'saco' | 'un' | 'kg' | 'L' | 'm2'
  categoria: string
  observacao?: string
}

export interface ListaMateriaisEstimativa {
  tipoServico: string
  areaOuVolume: number
  unidadeMedida: string
  perdaPct: number
  itens: ItemEstimativaMaterial[]
  avisoLegal: string
}

/**
 * Produz a lista consolidada de materiais a partir de medidas e serviço.
 * SEMPRE rotulado com a advertência obrigatória.
 */
export function gerarEstimativaMateriais(
  servico: 'alvenaria' | 'reboco' | 'contrapiso' | 'concreto' | 'piso' | 'pintura' | 'telhado',
  medida: number,
  perdaPct = 10,
): CalculationResult<ListaMateriaisEstimativa> {
  const p = Math.max(0, perdaPct)
  const itens: ItemEstimativaMaterial[] = []
  let unidadeMedida = 'm²'

  if (servico === 'alvenaria') {
    const res = calcularAlvenaria({ areaM2: medida, perdaPct: p })
    itens.push(
      {
        nome: 'Bloco Cerâmico 14x19x29',
        quantidade: res.valor.quantidadeBlocos,
        unidade: 'un',
        categoria: 'alvenaria',
        observacao: `Consumo médio com ${p}% de perda/recorte`,
      },
      {
        nome: 'Cimento CP II 50kg',
        quantidade: Math.ceil(res.valor.cimentoKg / 50),
        unidade: 'saco',
        categoria: 'cimento',
        observacao: `Aprox. ${res.valor.cimentoKg} kg no traço 1:2:8`,
      },
      {
        nome: 'Areia Média Lavada',
        quantidade: res.valor.areiaM3,
        unidade: 'm2',
        categoria: 'areia',
        observacao: 'Para argamassa de assentamento',
      },
    )
  } else if (servico === 'reboco') {
    const res = calcularReboco({ areaM2: medida, perdaPct: p, espessuraCm: 2 })
    itens.push(
      {
        nome: 'Cimento CP II 50kg',
        quantidade: res.valor.cimentoSacos50kg,
        unidade: 'saco',
        categoria: 'cimento',
        observacao: 'Traço para reboco/emboço',
      },
      {
        nome: 'Cal Hidratada 20kg',
        quantidade: res.valor.calSacos20kg || Math.ceil(res.valor.cimentoSacos50kg * 1.2),
        unidade: 'saco',
        categoria: 'outros',
        observacao: 'Para liga e retenção de água',
      },
      {
        nome: 'Areia Média Lavada',
        quantidade: res.valor.areiaM3,
        unidade: 'm2',
        categoria: 'areia',
        observacao: 'Areia peneirada',
      },
    )
  } else if (servico === 'contrapiso') {
    const res = calcularContrapiso({ areaM2: medida, perdaPct: p, espessuraCm: 4 })
    itens.push(
      {
        nome: 'Cimento CP II 50kg',
        quantidade: res.valor.cimentoSacos50kg,
        unidade: 'saco',
        categoria: 'cimento',
        observacao: 'Argamassa farofa 1:4',
      },
      {
        nome: 'Areia Média Lavada',
        quantidade: res.valor.areiaM3,
        unidade: 'm2',
        categoria: 'areia',
      },
    )
  } else if (servico === 'concreto') {
    unidadeMedida = 'm³'
    const res = calcularConcreto({ volumeM3: medida, perdaPct: p })
    itens.push(
      {
        nome: 'Cimento CP II 50kg',
        quantidade: res.valor.cimentoSacos50kg,
        unidade: 'saco',
        categoria: 'cimento',
      },
      {
        nome: 'Areia Grossa Lavada',
        quantidade: res.valor.areiaM3,
        unidade: 'm2',
        categoria: 'areia',
      },
      {
        nome: 'Brita nº 1',
        quantidade: res.valor.britaM3,
        unidade: 'm2',
        categoria: 'outros',
      },
    )
  } else if (servico === 'piso') {
    const res = calcularPiso({ areaM2: medida, perdaPct: p })
    itens.push(
      {
        nome: 'Piso / Revestimento Cerâmico',
        quantidade: res.valor.areaTotalComPerda,
        unidade: 'm2',
        categoria: 'outros',
        observacao: `${res.valor.caixasPiso} caixas (base 2m²/cx)`,
      },
      {
        nome: 'Argamassa Colante AC-II 20kg',
        quantidade: res.valor.argamassaColanteSacos20kg,
        unidade: 'saco',
        categoria: 'cimento',
      },
      {
        nome: 'Rejunte',
        quantidade: res.valor.rejunteKg,
        unidade: 'kg',
        categoria: 'outros',
      },
    )
  } else if (servico === 'pintura') {
    const res = calcularPintura({ areaM2: medida, demaos: 2 })
    itens.push(
      {
        nome: 'Tinta Látex / Acrílica 18L',
        quantidade: Math.max(1, res.valor.latas18L),
        unidade: 'un',
        categoria: 'outros',
        observacao: `Aprox. ${res.valor.litrosTinta} litros para 2 demãos`,
      },
      {
        nome: 'Fita Crepe e Lixas para Parede',
        quantidade: 2,
        unidade: 'un',
        categoria: 'ferramenta',
      },
    )
  } else if (servico === 'telhado') {
    const res = calcularTelhado({ areaPlantaM2: medida, inclinacaoPct: 30, perdaPct: p })
    itens.push(
      {
        nome: 'Telha Cerâmica Romana',
        quantidade: res.valor.quantidadeTelhas,
        unidade: 'un',
        categoria: 'outros',
        observacao: `Para ${res.valor.areaInclinadaM2} m² de telhado real`,
      },
      {
        nome: 'Cumeeiras Cerâmicas',
        quantidade: Math.ceil(Math.sqrt(medida) * 3),
        unidade: 'un',
        categoria: 'outros',
      },
    )
  }

  const avisoLegal =
    'ESTIMATIVA — não substitui projeto ou orientação técnica. Consumo médio na construção civil.'

  return {
    tipo: 'ESTIMATIVA',
    valor: {
      tipoServico: servico,
      areaOuVolume: medida,
      unidadeMedida,
      perdaPct: p,
      itens,
      avisoLegal,
    },
    unidade: 'itens',
    formula: `Estimativa para ${medida} ${unidadeMedida} de ${servico} (+${p}% folga)`,
    passos: [
      `Serviço selecionado: ${servico} (${medida} ${unidadeMedida})`,
      `Margem de perda/folga aplicada: ${p}%`,
      `Total de insumos calculados: ${itens.length} itens`,
    ],
    aviso: avisoLegal,
  }
}

// -------------------------------------------------------------
// 7. PARSER DETERMINÍSTICO DE DATAS RELATIVAS EM PT-BR
// -------------------------------------------------------------

/**
 * Converte expressões relativas em português ("ontem", "hoje", "anteontem",
 * "na segunda", "na terça", "semana passada", "há 3 dias") para YYYY-MM-DD
 */
export function parseRelativeDatePtBr(
  expression: string,
  baseDate: Date = new Date(),
): { dateStr: string; label: string } | null {
  if (!expression) return null
  const clean = expression.toLowerCase().trim()
  const d = new Date(baseDate.getTime())

  // Hoje
  if (/\b(hoje)\b/.test(clean)) {
    return { dateStr: d.toISOString().split('T')[0], label: 'hoje' }
  }

  // Ontem
  if (/\b(ontem)\b/.test(clean) && !clean.includes('anteontem')) {
    d.setDate(d.getDate() - 1)
    return { dateStr: d.toISOString().split('T')[0], label: 'ontem' }
  }

  // Anteontem
  if (/\b(anteontem)\b/.test(clean)) {
    d.setDate(d.getDate() - 2)
    return { dateStr: d.toISOString().split('T')[0], label: 'anteontem' }
  }

  // Há N dias / N dias atrás
  const matchDias = clean.match(/(?:há|a)\s*(\d+)\s*dias?|(\d+)\s*dias?\s*atrás/)
  if (matchDias) {
    const num = parseInt(matchDias[1] || matchDias[2], 10)
    d.setDate(d.getDate() - num)
    return { dateStr: d.toISOString().split('T')[0], label: `há ${num} dias` }
  }

  // Semana passada
  if (clean.includes('semana passada')) {
    d.setDate(d.getDate() - 7)
    return { dateStr: d.toISOString().split('T')[0], label: 'semana passada' }
  }

  // Dias da semana: domingo(0), segunda(1), terça(2), quarta(3), quinta(4), sexta(5), sábado(6)
  const mapaDias: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    terca: 2,
    terça: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6,
    sábado: 6,
  }

  for (const [diaNome, targetDay] of Object.entries(mapaDias)) {
    if (clean.includes(diaNome)) {
      const currentDay = d.getDay()
      let diff = currentDay - targetDay
      if (diff <= 0) diff += 7 // dia mais recente daquela semana para trás
      d.setDate(d.getDate() - diff)
      return { dateStr: d.toISOString().split('T')[0], label: `na última ${diaNome}` }
    }
  }

  // Data explícita no formato DD/MM ou DD/MM/AAAA
  const matchData = clean.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/)
  if (matchData) {
    const dia = parseInt(matchData[1], 10)
    const mes = parseInt(matchData[2], 10) - 1
    const ano = matchData[3] ? parseInt(matchData[3], 10) : d.getFullYear()
    const finalAno = ano < 100 ? 2000 + ano : ano
    const parsed = new Date(finalAno, mes, dia)
    if (!isNaN(parsed.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0')
      return {
        dateStr: `${finalAno}-${pad(mes + 1)}-${pad(dia)}`,
        label: `${pad(dia)}/${pad(mes + 1)}/${finalAno}`,
      }
    }
  }

  return null
}

export function calcularMovimentacaoEstoque(
  input: MovimentacaoEstoqueInput,
): CalculationResult<MovimentacaoEstoqueOutput> {
  const atual = Math.max(0, input.quantidadeAtual || 0)
  const delta = Math.max(0, input.quantidadeAlteracao || 0)
  const minimo = input.estoqueMinimo ?? 0

  let novaQtd = atual
  if (input.tipo === 'adicionar') {
    novaQtd = atual + delta
  } else {
    novaQtd = Math.max(0, atual - delta)
  }
  novaQtd = Number(novaQtd.toFixed(2))

  const estaAcabando = novaQtd <= minimo

  const msg =
    input.tipo === 'adicionar'
      ? `Entrada de ${delta} unidades registrada. Estoque atual: ${novaQtd}.`
      : `Baixa de ${delta} unidades registrada. Estoque restante: ${novaQtd}. ${estaAcabando ? 'ATENÇÃO: Produto atingiu o nível mínimo!' : ''}`

  return {
    tipo: 'EXATO',
    valor: {
      novaQuantidade: novaQtd,
      estaAcabando,
      mensagem: msg,
    },
    unidade: 'unidades',
    formula:
      input.tipo === 'adicionar'
        ? `${atual} + ${delta} = ${novaQtd}`
        : `${atual} - ${delta} = ${novaQtd}`,
    passos: [
      `Estoque anterior: ${atual}`,
      `${input.tipo === 'adicionar' ? 'Adicionado' : 'Baixado'}: ${delta}`,
      `Novo saldo: ${novaQtd} (Mínimo recomendado: ${minimo})`,
    ],
  }
}
