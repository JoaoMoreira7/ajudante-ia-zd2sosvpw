/**
 * src/lib/tetoEngine.ts
 * Motor determinístico para Teto de Gastos por Categoria (estilo Meu Assessor adaptado à obra).
 *
 * REGRAS INVIOLÁVEIS:
 * - A IA nunca calcula números: o motor local calcula a soma acumulada de saídas no mês atual,
 *   a porcentagem atingida e formula o aviso com exatidão matemática.
 * - Tom da resposta:
 *   - >= 70% e < 100%: muda o tom ("atenção, já foi 78% do orçamento de R$ 800").
 *   - >= 100%: avisa sem bronca ("passou do teto de R$ 800: já foram R$ 850").
 *   - Na virada do mês zera automaticamente (filtra data do mês corrente).
 * - Se o usuário não souber o número ("define um teto pra cimento"), calcula a média dos últimos meses
 *   e solicita confirmação ("Média dos últimos meses deu R$ 650. Pode definir esse teto?").
 */

import { FinanceiroLancamento } from '@/types/database'

export interface VerificacaoTetoResultado {
  categoria: string
  tetoDefinido: number
  totalGastoMes: number
  porcentagemAtingida: number
  status: 'ok' | 'alerta_70' | 'estourado'
  mensagemAviso?: string
}

export interface IntencaoTeto {
  categoria: string
  valor?: number
  solicitarSugestaoMedia?: boolean
  removerTeto?: boolean
}

/**
 * Normaliza categorias de materiais/despesas de obra
 */
export function normalizarCategoriaTeto(catRaw: string): string {
  const c = catRaw.toLowerCase().trim()
  if (/cimento/.test(c)) return 'cimento'
  if (/areia|pedra|brita/.test(c)) return 'areia'
  if (/bloco|tijolo/.test(c)) return 'bloco'
  if (/combustivel|gasolina|diesel/.test(c)) return 'combustivel'
  if (/ferramenta/.test(c)) return 'ferramenta'
  if (/almoço|refeição|comida|alimentação|alimentacao/.test(c)) return 'alimentacao'
  if (/ajudante|diária|diaria|peão/.test(c)) return 'ajudante'
  if (/transporte|frete/.test(c)) return 'transporte'
  if (/material|materiais/.test(c)) return 'material'
  return c || 'outros'
}

/**
 * Extrai intenção de definir teto por categoria de frase
 * Ex: "define um orçamento de 800 por mês pra material"
 * Ex: "teto de 500 para combustível"
 * Ex: "qual o teto de cimento?"
 */
export function parseDefinicaoTeto(texto: string): IntencaoTeto | null {
  const clean = texto.trim()
  const lower = clean.toLowerCase()

  const ehComandoTeto =
    /\b(teto|orçamento\s+(?:de\s+gasto|mensal|por\s+mês)|limite\s+(?:de\s+gasto|mensal|por\s+mês)|limite\s+pra|teto\s+pra)\b/i.test(
      lower,
    )

  if (!ehComandoTeto) return null

  // Remover teto: "remove o teto de material", "cancela o teto de cimento"
  if (/\b(remove|apaga|cancela|tira)\s+(?:o\s+)?teto/i.test(lower)) {
    const catMatch = lower.match(/(?:de|do|da|pra|para)\s+([a-zá-ú\s]+)$/i)
    return {
      categoria: normalizarCategoriaTeto(catMatch ? catMatch[1] : 'outros'),
      removerTeto: true,
    }
  }

  // Define teto com valor: "define um orçamento de 800 por mês pra material"
  const valMatch = lower.match(
    /(?:teto|orçamento|limite)?\s*(?:de\s+)?(?:r\$\s*)?([0-9.,]+)\s*(?:reais)?\s*(?:por\s+mês|mensal)?\s*(?:pra|para|de|com)\s+([a-zá-ú\s]+)/i,
  )
  if (valMatch) {
    const val = parseFloat(valMatch[1].replace('.', '').replace(',', '.'))
    const cat = normalizarCategoriaTeto(valMatch[2])
    if (val > 0) {
      return {
        categoria: cat,
        valor: val,
      }
    }
  }

  // Usuário pergunta sem dizer o valor: "define um teto pra material", "sugere um teto pra cimento"
  const semValorMatch = lower.match(
    /(?:define|coloca|sugere|qual)\s+(?:um\s+)?(?:teto|orçamento|limite)\s+(?:pra|para|de)\s+([a-zá-ú\s]+)/i,
  )
  if (semValorMatch) {
    return {
      categoria: normalizarCategoriaTeto(semValorMatch[1]),
      solicitarSugestaoMedia: true,
    }
  }

  return null
}

/**
 * Calcula a média de gastos dos últimos 3 meses em uma categoria
 */
export function calcularMediaGastosCategoria(
  categoria: string,
  historicoFinanceiro: FinanceiroLancamento[],
  dataReferencia: Date = new Date(),
): number {
  const normCat = normalizarCategoriaTeto(categoria)
  const tresMesesAtras = new Date(dataReferencia.getTime() - 90 * 24 * 60 * 60 * 1000)

  const gastos = historicoFinanceiro.filter((f) => {
    if (f.tipo !== 'saida') return false
    const fCat = normalizarCategoriaTeto(f.categoria)
    if (normCat !== 'material' && fCat !== normCat) return false
    // se pediu "material" genérico, soma categorias de materiais
    if (
      normCat === 'material' &&
      !['cimento', 'areia', 'bloco', 'ferramenta', 'outros'].includes(fCat)
    ) {
      return false
    }
    const d = new Date(f.data)
    return d >= tresMesesAtras && d <= dataReferencia
  })

  if (gastos.length === 0) return 0
  const soma = gastos.reduce((acc, g) => acc + g.valor, 0)
  // Divide por 3 meses para estimar média mensal
  const mediaMensal = Math.round(soma / 3)
  return mediaMensal > 0 ? mediaMensal : Math.round(soma / gastos.length)
}

/**
 * Verifica se um gasto novo (ou consulta) atinge/ultrapassa o teto do mês
 */
export function verificarTetoCategoria(
  categoria: string,
  novoGastoValor: number,
  tetosConfig: Record<string, number> | undefined,
  historicoFinanceiro: FinanceiroLancamento[],
  dataReferencia: Date = new Date(),
): VerificacaoTetoResultado | null {
  if (!tetosConfig) return null

  const normCat = normalizarCategoriaTeto(categoria)
  // Busca teto específico da categoria ou genérico "material"
  const teto =
    tetosConfig[normCat] ||
    (['cimento', 'areia', 'bloco', 'ferramenta'].includes(normCat)
      ? tetosConfig['material']
      : undefined)
  if (!teto || teto <= 0) return null

  // Filtra gastos do mês corrente (reseta automaticamente na virada do mês)
  const anoAtual = dataReferencia.getFullYear()
  const mesAtual = dataReferencia.getMonth()

  let totalMes = 0
  for (const f of historicoFinanceiro) {
    if (f.tipo === 'saida') {
      const d = new Date(f.data)
      if (d.getFullYear() === anoAtual && d.getMonth() === mesAtual) {
        const fCat = normalizarCategoriaTeto(f.categoria)
        if (
          fCat === normCat ||
          (normCat === 'material' && ['cimento', 'areia', 'bloco', 'ferramenta'].includes(fCat))
        ) {
          totalMes += f.valor
        }
      }
    }
  }

  const totalComNovo = totalMes + novoGastoValor
  const pct = Math.round((totalComNovo / teto) * 100)

  let status: 'ok' | 'alerta_70' | 'estourado' = 'ok'
  let mensagemAviso: string | undefined

  if (pct >= 100) {
    status = 'estourado'
    mensagemAviso = `Aviso amigável: esse lançamento atinge R$ ${totalComNovo.toFixed(2)} e passou do teto mensal de R$ ${teto.toFixed(2)} para ${normCat} (${pct}% do orçamento consumido).`
  } else if (pct >= 70) {
    status = 'alerta_70'
    mensagemAviso = `Atenção: com esse gasto, já foi ${pct}% do orçamento de R$ ${teto.toFixed(2)} definido para ${normCat} neste mês.`
  }

  return {
    categoria: normCat,
    tetoDefinido: teto,
    totalGastoMes: totalComNovo,
    porcentagemAtingida: pct,
    status,
    mensagemAviso,
  }
}
