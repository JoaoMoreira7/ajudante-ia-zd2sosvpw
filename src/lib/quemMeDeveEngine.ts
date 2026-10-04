/**
 * src/lib/quemMeDeveEngine.ts
 * Motor determinístico para consulta "Quem está me devendo?", "Valores a receber"
 * e baixa de recebimentos por voz ("recebi os 450 do Rafael").
 *
 * REGRAS INVIOLÁVEIS:
 * 1. Perfil Operador NUNCA vê valores financeiros: se consultado, devolve mensagem
 *    amigável de bloqueio de permissão.
 * 2. Cálculo determinístico exato com agrupamento por cliente e dias de vencimento.
 */

import { FinanceiroLancamento, Cliente, Obra } from '@/types/database'

export interface DevedorClienteItem {
  clienteId?: string
  clienteNome: string
  totalPendente: number
  quantidadeTitulos: number
  dataMaisAntiga: string
  diasAtrasoOuVencimento: number // >0 = atrasado há N dias; <0 = vence em N dias
  obraTitulo?: string
}

export interface RelatorioQuemMeDeve {
  totalGeralPendente: number
  totalClientes: number
  clientes: DevedorClienteItem[]
  textoFormatado: string
}

/**
 * Calcula a lista de clientes devedores / valores a receber
 */
export function calcularQuemMeDeve(
  lancamentos: FinanceiroLancamento[],
  clientes: Cliente[],
  obras: Obra[],
  isOperador = false,
): RelatorioQuemMeDeve {
  if (isOperador) {
    return {
      totalGeralPendente: 0,
      totalClientes: 0,
      clientes: [],
      textoFormatado:
        'Seu perfil de acesso é Operador. A consulta de clientes devedores e valores a receber é reservada ao Dono da obra.',
    }
  }

  // Filtra entradas pendentes ou vencidas
  // Obs: se no financeiro o tipo for 'entrada' e status 'pendente' ou 'vencido', é conta a receber!
  const aReceber = lancamentos.filter(
    (l) => l.tipo === 'entrada' && (l.status === 'pendente' || l.status === 'vencido'),
  )

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const mapaClientes = new Map<string, DevedorClienteItem>()

  for (const item of aReceber) {
    // Tenta associar nome do cliente via cliente_id, via obra_id ou extraindo da descrição
    let cNome = 'Cliente não identificado'
    let cId = item.cliente_id

    if (cId) {
      const cli = clientes.find((c) => c.id === cId)
      if (cli) cNome = cli.nome
    } else if (item.obra_id) {
      const obra = obras.find((o) => o.id === item.obra_id)
      if (obra) {
        if (obra.cliente_id) {
          const cli = clientes.find((c) => c.id === obra.cliente_id)
          if (cli) {
            cNome = cli.nome
            cId = cli.id
          }
        }
        if (cNome === 'Cliente não identificado') {
          cNome = obra.titulo
        }
      }
    }

    if (cNome === 'Cliente não identificado') {
      // Extrai da descrição: "Recebido de Rafael" -> "Rafael"
      const matchDe = item.descricao.match(/(?:de|do|da|cliente)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i)
      if (matchDe) {
        cNome = matchDe[1].trim()
      } else {
        cNome = item.descricao
      }
    }

    const itemData = new Date(item.data)
    const diffMs = hoje.getTime() - itemData.getTime()
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    const chave = cId || cNome.toLowerCase()
    const existente = mapaClientes.get(chave)

    if (existente) {
      existente.totalPendente += item.valor
      existente.quantidadeTitulos += 1
      if (diffDias > existente.diasAtrasoOuVencimento) {
        existente.diasAtrasoOuVencimento = diffDias
        existente.dataMaisAntiga = item.data
      }
    } else {
      mapaClientes.set(chave, {
        clienteId: cId,
        clienteNome: cNome,
        totalPendente: item.valor,
        quantidadeTitulos: 1,
        dataMaisAntiga: item.data,
        diasAtrasoOuVencimento: diffDias,
      })
    }
  }

  const devedores = Array.from(mapaClientes.values()).sort(
    (a, b) => b.totalPendente - a.totalPendente,
  )
  const totalGeral = devedores.reduce((acc, d) => acc + d.totalPendente, 0)

  if (devedores.length === 0) {
    return {
      totalGeralPendente: 0,
      totalClientes: 0,
      clientes: [],
      textoFormatado:
        'Boas notícias, mestre! Não há nenhuma conta pendente a receber no momento. Todos os pagamentos estão em dia!',
    }
  }

  const linhas = devedores.map((d) => {
    let statusTempo = ''
    if (d.diasAtrasoOuVencimento > 0) {
      statusTempo = ` (mais antiga venceu há ${d.diasAtrasoOuVencimento} dias)`
    } else if (d.diasAtrasoOuVencimento === 0) {
      statusTempo = ' (vence hoje)'
    } else {
      statusTempo = ` (vence em ${Math.abs(d.diasAtrasoOuVencimento)} dias)`
    }
    return `• ${d.clienteNome}: R$ ${d.totalPendente.toFixed(2)}${statusTempo}`
  })

  const texto =
    `Você tem ${devedores.length} cliente(s) com valores a receber, totalizando R$ ${totalGeral.toFixed(2)}:\n\n` +
    linhas.join('\n')

  return {
    totalGeralPendente: totalGeral,
    totalClientes: devedores.length,
    clientes: devedores,
    textoFormatado: texto,
  }
}

/**
 * Tenta encontrar um lançamento pendente a receber correspondente à fala de baixa:
 * Ex: "recebi os 450 do Rafael" -> encontra o título do Rafael de 450
 */
export function identificarBaixaRecebimento(
  texto: string,
  lancamentos: FinanceiroLancamento[],
  clientes: Cliente[],
): {
  lancamentoAlvo?: FinanceiroLancamento
  valor: number
  clienteNome?: string
} | null {
  const clean = texto.toLowerCase().trim()

  const matchRecebi = clean.match(
    /(?:recebi|deu\s+baixa|baixa\s+de|entrou\s+o\s+pagamento\s+de)\s+(?:os\s+|as\s+|o\s+|a\s+)?(?:r\$\s*)?([0-9.,]+)(?:\s+(?:do|da|de|cliente)\s+([a-zá-ú\s]+))?/i,
  )
  if (!matchRecebi) return null

  const valor = parseFloat(matchRecebi[1].replace('.', '').replace(',', '.'))
  const clienteNome = (matchRecebi[2] || '').trim()

  // Procura no financeiro um item de entrada pendente
  const pendentes = lancamentos.filter((l) => l.tipo === 'entrada' && l.status !== 'pago')

  let alvo: FinanceiroLancamento | undefined

  if (clienteNome) {
    // Procura por cliente + valor aproximado
    alvo = pendentes.find((l) => {
      const matchValor = Math.abs(l.valor - valor) < 0.05
      const matchNome = l.descricao.toLowerCase().includes(clienteNome)
      return matchValor && matchNome
    })
  }

  if (!alvo) {
    // Procura apenas pelo valor exato
    alvo = pendentes.find((l) => Math.abs(l.valor - valor) < 0.05)
  }

  return {
    lancamentoAlvo: alvo,
    valor,
    clienteNome,
  }
}
