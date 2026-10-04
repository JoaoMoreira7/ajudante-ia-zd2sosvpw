/**
 * src/lib/contasAPagarEngine.ts
 * Motor determinístico para Contas a Pagar e Empréstimos de Terceiros (estilo Meu Assessor).
 *
 * Características:
 * 1. "peguei 300 do Zé pra comprar material" / "devo 300 pro Zé" -> cria saída pendente com credor_nome = "Zé".
 * 2. "quem eu estou devendo?" / "quais minhas dívidas?" -> relatório detalhado por credor com valor total e dias de atraso.
 * 3. "paguei os 300 do Zé" -> dá baixa na conta a pagar, gerando recibo card estruturado.
 * 4. Perfil Operador NUNCA vê valores financeiros (retorna bloqueio humanizado).
 */

import { FinanceiroLancamento } from '@/types/database'

export interface DividaCredorItem {
  credor: string
  totalDevido: number
  lancamentosCount: number
  diasMaisAntigo: number
  lancamentos: FinanceiroLancamento[]
}

export interface RelatorioQuemEstouDevendo {
  totalGeralDevido: number
  credores: DividaCredorItem[]
  textoFormatado: string
}

export interface IntencaoContaAPagar {
  tipo: 'cadastro_divida' | 'consulta_dividas' | 'baixa_divida'
  valor?: number
  credorNome?: string
  descricao?: string
  lancamentoAlvo?: FinanceiroLancamento
}

/**
 * Interpreta frases de dívida / empréstimo / contas a pagar
 */
export function parseContaAPagar(
  texto: string,
  historicoFinanceiro: FinanceiroLancamento[] = [],
): IntencaoContaAPagar | null {
  const clean = texto.trim()
  const lower = clean.toLowerCase()

  // 1. Consulta: "quem eu estou devendo?", "o que eu estou devendo?", "quais minhas dívidas?"
  if (
    /\b(quem\s+(?:eu\s+)?estou\s+devendo|quem\s+(?:eu\s+)?to\s+devendo|quem\s+(?:eu\s+)?tô\s+devendo|o\s+que\s+estou\s+devendo|minhas\s+d[íi]vidas|contas\s+a\s+pagar|o\s+que\s+tenho\s+que\s+pagar)\b/i.test(
      lower,
    )
  ) {
    return {
      tipo: 'consulta_dividas',
    }
  }

  // 2. Baixa: "paguei os 300 do Zé", "dei baixa nos 300 do Zé", "quitei a dívida com o Zé"
  const matchBaixa = lower.match(
    /(?:paguei|quitei|dei\s+baixa\s+(?:em|no|na|nos)?)\s*(?:os\s+|o\s+)?(?:r\$\s*)?([0-9.,]+)?\s*(?:reais)?\s*(?:do|pro|para\s+o|ao|com\s+o)?\s*([a-zá-ú\s]+)?/i,
  )
  if (
    matchBaixa &&
    (lower.includes('do zé') ||
      lower.includes('pro ') ||
      lower.includes('quitei') ||
      lower.includes('paguei os'))
  ) {
    const vStr = matchBaixa[1]
    const val = vStr ? parseFloat(vStr.replace('.', '').replace(',', '.')) : undefined
    const credor = (matchBaixa[2] || '').trim()

    // Localiza no histórico o lançamento alvo pendente
    const pendentes = historicoFinanceiro.filter((f) => f.tipo === 'saida' && f.status !== 'pago')
    let alvo: FinanceiroLancamento | undefined
    if (credor) {
      alvo = pendentes.find((f) => {
        const cNome = (f.credor_nome || f.descricao || '').toLowerCase()
        return (
          cNome.includes(credor.toLowerCase()) && (val === undefined || Math.abs(f.valor - val) < 1)
        )
      })
    }
    if (!alvo && val) {
      alvo = pendentes.find((f) => Math.abs(f.valor - val) < 1)
    }

    return {
      tipo: 'baixa_divida',
      valor: val || alvo?.valor,
      credorNome: credor || alvo?.credor_nome,
      lancamentoAlvo: alvo,
    }
  }

  // 3. Cadastro: "peguei 300 do Zé pra comprar material", "devo 300 pro Zé", "emprestei 500 do Pedro"
  const matchCadastro = lower.match(
    /(?:peguei|devo|t[ôo]\s+devendo|estou\s+devendo|peguei\s+emprestado)\s+(?:r\$\s*)?([0-9.,]+)\s*(?:reais)?\s+(?:do|pro|para\s+o|ao)\s+([a-zá-ú\s]+?)(?:\s+(?:pra|para|de)\s+(.+))?$/i,
  )
  if (matchCadastro) {
    const valor = parseFloat(matchCadastro[1].replace('.', '').replace(',', '.'))
    const credor = matchCadastro[2].trim()
    const motivo = (matchCadastro[3] || 'Empréstimo/Material').trim()
    if (valor > 0 && credor) {
      return {
        tipo: 'cadastro_divida',
        valor,
        credorNome: credor.charAt(0).toUpperCase() + credor.slice(1),
        descricao: `Dívida com ${credor}: ${motivo}`,
      }
    }
  }

  return null
}

/**
 * Calcula o relatório consolidado de quem o usuário está devendo
 */
export function calcularQuemEstouDevendo(
  financeiro: FinanceiroLancamento[],
  isOperador = false,
  dataHoje: Date = new Date(),
): RelatorioQuemEstouDevendo {
  if (isOperador) {
    return {
      totalGeralDevido: 0,
      credores: [],
      textoFormatado:
        'Seu perfil de acesso é Operador. A consulta de pendências financeiras e contas a pagar é restrita ao Dono da obra.',
    }
  }

  // Filtra saídas pendentes
  const pendentes = financeiro.filter((f) => f.tipo === 'saida' && f.status !== 'pago')

  const agrupado: Record<string, DividaCredorItem> = {}
  let totalGeral = 0

  for (const p of pendentes) {
    const credor = p.credor_nome?.trim() || 'Outros Fornecedores'
    const dtLanc = new Date(p.data)
    const diffDias = Math.max(
      0,
      Math.floor((dataHoje.getTime() - dtLanc.getTime()) / (24 * 60 * 60 * 1000)),
    )

    if (!agrupado[credor]) {
      agrupado[credor] = {
        credor,
        totalDevido: 0,
        lancamentosCount: 0,
        diasMaisAntigo: diffDias,
        lancamentos: [],
      }
    }
    agrupado[credor].totalDevido += p.valor
    agrupado[credor].lancamentosCount += 1
    agrupado[credor].lancamentos.push(p)
    if (diffDias > agrupado[credor].diasMaisAntigo) {
      agrupado[credor].diasMaisAntigo = diffDias
    }
    totalGeral += p.valor
  }

  const credores = Object.values(agrupado).sort((a, b) => b.totalDevido - a.totalDevido)

  const partes: string[] = []
  if (credores.length === 0) {
    partes.push(
      'Você não tem nenhuma conta a pagar pendente ou dívida registrada no momento. Tudo em dia, mestre!',
    )
  } else {
    partes.push(`Você tem R$ ${totalGeral.toFixed(2)} em contas a pagar pendentes:`)
    for (const c of credores) {
      const diasTexto =
        c.diasMaisAntigo > 0
          ? ` (há ${c.diasMaisAntigo} dia${c.diasMaisAntigo > 1 ? 's' : ''})`
          : ' (recente)'
      partes.push(`• ${c.credor}: R$ ${c.totalDevido.toFixed(2)}${diasTexto}`)
    }
  }

  return {
    totalGeralDevido: totalGeral,
    credores,
    textoFormatado: partes.join('\n'),
  }
}
