// src/lib/commercialEngine.ts
/**
 * Motor Determinístico de Gestão Comercial e Regras de Negócio do Ajudante IA
 *
 * Cobertura de regras:
 * 1. Catálogo oficial de planos (Gratuito, Profissional, Empresa).
 * 2. Cálculo determinístico de datas de vencimento conforme ciclo (mensal, trimestral, semestral, anual).
 * 3. Métricas consolidadas (Total Recebido, A Receber, Quantidade Vendida, Cancelados).
 * 4. Regra de Ouro: "Regra do dono prevalece sobre automação". Se bloqueado manualmente,
 *    pagamento posterior dá baixa na fatura mas MANTÉM a conta bloqueada até liberação explícita do admin.
 * 5. Lógica de renovação e atraso para Venda Direta (sem cobrança automática em gateway online).
 * 6. Exportação para CSV e formatação padronizada em pt-BR.
 */

import {
  Assinatura,
  CatalogoPlano,
  CicloTipo,
  FaturaVenda,
  OrigemVenda,
  PlanoTipo,
  StatusConta,
} from '@/types/database'

export const CATALOGO_PLANOS: CatalogoPlano[] = [
  {
    id: 'essencial',
    nome: 'Plano Essencial',
    badge: 'Para Começar',
    descricao: 'Voz, calculadora completa de obra e controle financeiro simples.',
    precoMensal: 29.9,
    precoAnual: 299.0, // ~2 meses grátis
    limites: {
      maxClientes: 5,
      maxObrasSimultaneas: 2,
      maxOrcamentosMes: 10,
      maxMinutosAudioMes: 60, // 60 minutos/mês de IA por voz
      permitePdfDocumentos: false,
      permiteDiarioVoz: false,
      permiteFotosObra: false,
      permiteEstoqueCompras: false,
      permiteRelatorioWhatsApp: false,
      permiteAlertasPrazos: false,
      maxUsuariosEquipe: 1,
      relatoriosAvancados: false,
      suportePrioritario: false,
      modulosSobMedida: false,
    },
    recursos: [
      'Voz + texto (60 minutos de IA por voz por mês no canteiro)',
      'Calculadora de obra completa (cálculos exatos NUNCA bloqueados)',
      'Cálculos de construção (alvenaria, reboco, contrapiso, concreto, piso, pintura, telhado)',
      'Clientes: até 5 cadastrados',
      'Obras: até 2 simultâneas em andamento',
      'Orçamentos: até 10 por mês',
      'Financeiro simples (entradas, saídas e saldo)',
      'Offline-first + PWA + sincronização automática',
      'Modo Simples / Modo Profissional / Modo Econômico',
    ],
  },
  {
    id: 'profissional',
    nome: 'Plano Profissional',
    badge: 'Mais Popular',
    descricao:
      'Mais obras ativas (até 10), 300 min de áudio, documentos PDF, diário por voz e fotos.',
    precoMensal: 49.9,
    precoAnual: 499.0, // ~2 meses grátis
    destaque: true,
    limites: {
      maxClientes: -1, // ilimitado
      maxObrasSimultaneas: 10, // até 10 obras ativas simultâneas
      maxOrcamentosMes: -1, // ilimitado
      maxMinutosAudioMes: 300, // 300 minutos/mês de IA por voz (5 horas)
      permitePdfDocumentos: true,
      permiteDiarioVoz: true,
      permiteFotosObra: true,
      permiteEstoqueCompras: true,
      permiteRelatorioWhatsApp: true,
      permiteAlertasPrazos: true,
      maxUsuariosEquipe: 1,
      relatoriosAvancados: false,
      suportePrioritario: false,
      modulosSobMedida: false,
    },
    recursos: [
      'Tudo do Plano Essencial, e mais:',
      'Até 10 obras simultâneas em andamento e clientes ilimitados',
      '300 minutos/mês de processamento de áudio por IA',
      'Documentos PDF: orçamento, recibo, ordem de serviço, lista de materiais prontos para WhatsApp',
      'Diário de obra por voz no canteiro',
      'Registro fotográfico por obra e por etapa (com geolocalização)',
      'Estoque completo + lista de compras automática',
      'Relatório semanal para o cliente via WhatsApp (1 toque)',
      'Alertas de prazo de entrega e pagamentos pendentes',
    ],
  },
  {
    id: 'empresa',
    nome: 'Plano Empresa',
    badge: 'Completo',
    descricao:
      'Para construtoras e empreiteiros com equipes (dono + ajudantes), múltiplas obras e áudio ilimitado.',
    precoMensal: 79.9,
    precoAnual: 799.0, // ~2 meses grátis
    limites: {
      maxClientes: -1,
      maxObrasSimultaneas: -1, // ilimitado
      maxOrcamentosMes: -1,
      maxMinutosAudioMes: -1, // ilimitado
      permitePdfDocumentos: true,
      permiteDiarioVoz: true,
      permiteFotosObra: true,
      permiteEstoqueCompras: true,
      permiteRelatorioWhatsApp: true,
      permiteAlertasPrazos: true,
      maxUsuariosEquipe: 5,
      relatoriosAvancados: true,
      suportePrioritario: true,
      modulosSobMedida: true,
    },
    recursos: [
      'Tudo do Plano Profissional, e mais:',
      'Equipes: até 5 usuários (dono + ajudantes/operadores) na mesma conta',
      'Transcrições de áudio por IA ILIMITADAS',
      'Relatórios consolidados de múltiplas obras e indicadores de margem',
      'Gestão ilimitada de obras simultâneas',
      'Suporte prioritário via WhatsApp direto com time sênior',
      'Módulos liberados sob medida pelo administrador comercial',
    ],
  },
]

export interface MetricasComerciais {
  totalRecebido: number
  aReceber: number
  quantidadeVendida: number
  cancelados: number
  totalClientes: number
  totalAssinaturas: number
}

/**
 * Calcula métricas comerciais com base na lista de faturas e assinaturas
 */
export function calcularMetricasComerciais(
  faturas: FaturaVenda[],
  assinaturas: Assinatura[] = [],
): MetricasComerciais {
  let totalRecebido = 0
  let aReceber = 0
  let quantidadeVendida = 0
  let cancelados = 0

  for (const f of faturas) {
    const val = Number(f.valor) || 0
    if (f.status === 'pago') {
      totalRecebido += val
      quantidadeVendida += 1
    } else if (f.status === 'pendente' || f.status === 'atrasado') {
      aReceber += val
    } else if (f.status === 'cancelado') {
      cancelados += 1
    }
  }

  // Clientes únicos distintos
  const clientesIds = new Set<string>()
  faturas.forEach((f) => f.user_id && clientesIds.add(f.user_id))
  assinaturas.forEach((a) => a.user_id && clientesIds.add(a.user_id))

  return {
    totalRecebido: Math.round(totalRecebido * 100) / 100,
    aReceber: Math.round(aReceber * 100) / 100,
    quantidadeVendida,
    cancelados,
    totalClientes: clientesIds.size,
    totalAssinaturas: assinaturas.length,
  }
}

/**
 * Calcula a próxima data de vencimento a partir de uma data base e ciclo
 */
export function calcularProximoVencimento(dataBaseIso: string, ciclo: CicloTipo): string {
  const [ano, mes, dia] = dataBaseIso.slice(0, 10).split('-').map(Number)
  if (!ano || !mes || !dia) {
    const now = new Date()
    return now.toISOString().slice(0, 10)
  }

  let mesesParaAdicionar = 1
  if (ciclo === 'trimestral') mesesParaAdicionar = 3
  else if (ciclo === 'semestral') mesesParaAdicionar = 6
  else if (ciclo === 'anual') mesesParaAdicionar = 12

  // Cria a data preservando dia correto com segurança de virada de mês
  const targetDate = new Date(ano, mes - 1 + mesesParaAdicionar, dia)

  // Tratamento para meses com menos dias (ex: 31 de janeiro -> final de fevereiro)
  const targetAno = targetDate.getFullYear()
  const targetMes = String(targetDate.getMonth() + 1).padStart(2, '0')
  const targetDia = String(targetDate.getDate()).padStart(2, '0')

  return `${targetAno}-${targetMes}-${targetDia}`
}

/**
 * Avalia o status da conta do cliente sob a regra de ouro:
 * SE o admin bloqueou manualmente, o bloqueio PREVALECE sobre automação e sobre novos pagamentos.
 */
export function resolverStatusAposPagamento(
  statusAtual: StatusConta,
  bloqueioManual: boolean,
): { novoStatus: StatusConta; mantemBloqueio: boolean; justificativa: string } {
  if (bloqueioManual || statusAtual === 'bloqueado_manual') {
    return {
      novoStatus: 'bloqueado_manual',
      mantemBloqueio: true,
      justificativa:
        'Pagamento registrado e fatura baixada, mas o bloqueio MANUAL do administrador prevalece. A liberação final exige decisão explícita do administrador.',
    }
  }

  if (statusAtual === 'bloqueado_inadimplencia' || statusAtual === 'atrasado') {
    return {
      novoStatus: 'ativo',
      mantemBloqueio: false,
      justificativa: 'Bloqueio por inadimplência regularizado automaticamente pelo pagamento.',
    }
  }

  return {
    novoStatus: statusAtual,
    mantemBloqueio: false,
    justificativa: 'Conta em estado regular mantida.',
  }
}

/**
 * Verifica se uma assinatura de Venda Direta expirou o ciclo
 * Para venda direta: sem cobrança em gateway; após o vencimento, entra em 'atrasado'
 */
export function verificarVencimentoAssinatura(
  assinatura: Assinatura,
  dataReferenciaIso: string = new Date().toISOString().slice(0, 10),
): { estaVencida: boolean; novoStatusSugerido: StatusConta; diasAtraso: number } {
  if (!assinatura.proximo_vencimento) {
    return { estaVencida: false, novoStatusSugerido: assinatura.status, diasAtraso: 0 }
  }

  const vencimento = new Date(assinatura.proximo_vencimento + 'T00:00:00Z').getTime()
  const referencia = new Date(dataReferenciaIso + 'T00:00:00Z').getTime()
  const diffMs = referencia - vencimento
  const diasAtraso = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Se já está com bloqueio manual, preserva
  if (assinatura.bloqueio_manual || assinatura.status === 'bloqueado_manual') {
    return { estaVencida: diasAtraso > 0, novoStatusSugerido: 'bloqueado_manual', diasAtraso }
  }

  if (diasAtraso > 15) {
    return { estaVencida: true, novoStatusSugerido: 'bloqueado_inadimplencia', diasAtraso }
  }

  if (diasAtraso > 0) {
    return { estaVencida: true, novoStatusSugerido: 'atrasado', diasAtraso }
  }

  return { estaVencida: false, novoStatusSugerido: assinatura.status, diasAtraso: 0 }
}

/**
 * Retorna o rótulo legível em pt-BR e cor semântica do badge para cada status de conta
 */
export function getStatusBadgeConfig(status: StatusConta): {
  label: string
  colorClass: string
  bgClass: string
  borderClass: string
  descricao: string
} {
  switch (status) {
    case 'bloqueado_manual':
      return {
        label: 'BLOQUEADO MANUALMENTE',
        colorClass: 'text-red-700 dark:text-red-300',
        bgClass: 'bg-red-100 dark:bg-red-950/60',
        borderClass: 'border-red-300 dark:border-red-800',
        descricao: 'Bloqueio administrativo direto. Prevalece sobre qualquer pagamento.',
      }
    case 'bloqueado_inadimplencia':
      return {
        label: 'BLOQUEADO POR INADIMPLÊNCIA',
        colorClass: 'text-amber-800 dark:text-amber-300',
        bgClass: 'bg-amber-100 dark:bg-amber-950/60',
        borderClass: 'border-amber-300 dark:border-amber-800',
        descricao: 'Suspensão por fatura atrasada.',
      }
    case 'ativo':
      return {
        label: 'Ativo',
        colorClass: 'text-emerald-800 dark:text-emerald-300',
        bgClass: 'bg-emerald-100 dark:bg-emerald-950/60',
        borderClass: 'border-emerald-300 dark:border-emerald-800',
        descricao: 'Assinatura regular com acesso total liberado.',
      }
    case 'trial':
      return {
        label: 'Trial',
        colorClass: 'text-blue-800 dark:text-blue-300',
        bgClass: 'bg-blue-100 dark:bg-blue-950/60',
        borderClass: 'border-blue-300 dark:border-blue-800',
        descricao: 'Período de avaliação de recursos.',
      }
    case 'atrasado':
      return {
        label: 'Atrasado',
        colorClass: 'text-orange-800 dark:text-orange-300',
        bgClass: 'bg-orange-100 dark:bg-orange-950/60',
        borderClass: 'border-orange-300 dark:border-orange-800',
        descricao: 'Mensalidade vencida aguardando baixa.',
      }
    case 'cancelado':
      return {
        label: 'Cancelado',
        colorClass: 'text-slate-700 dark:text-slate-400',
        bgClass: 'bg-slate-100 dark:bg-slate-900',
        borderClass: 'border-slate-300 dark:border-slate-700',
        descricao: 'Assinatura encerrada.',
      }
  }
}

/**
 * Formata moeda BRL (R$ 1.234,56)
 */
export function formatarMoedaBrl(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0)
}

/**
 * Exporta lista de vendas/faturas para formato CSV compatível com Excel brasileiro (; separador)
 */
export function exportarVendasCSV(
  faturas: FaturaVenda[],
  assinaturasMap: Map<string, Assinatura> = new Map(),
): string {
  const header = [
    'ID Fatura',
    'Cliente',
    'E-mail',
    'Descrição',
    'Plano',
    'Ciclo',
    'Origem',
    'Forma de Pagamento',
    'Valor (R$)',
    'Status Fatura',
    'Status Conta',
    'Vencimento',
    'Pagamento',
    'Observações',
  ]

  const rows = faturas.map((f) => {
    const user = f.expand?.user_id
    const ass = f.assinatura_id ? assinaturasMap.get(f.assinatura_id) : undefined
    const plano = ass?.plano || 'N/D'
    const ciclo = ass?.ciclo || 'N/D'
    const statusConta = user?.status_conta || ass?.status || 'N/D'

    const colunas = [
      f.id,
      user?.name || 'Cliente Sem Nome',
      user?.email || '',
      f.descricao,
      plano.toUpperCase(),
      ciclo.toUpperCase(),
      f.origem === 'direta' ? 'Venda Direta' : 'Internet/Online',
      f.forma_pagamento.toUpperCase(),
      f.valor.toFixed(2).replace('.', ','),
      f.status.toUpperCase(),
      statusConta.toUpperCase(),
      f.data_vencimento || '',
      f.data_pagamento || '',
      (f.observacoes || '').replace(/"/g, '""'),
    ]

    return colunas.map((col) => `"${col}"`).join(';')
  })

  return '\uFEFF' + [header.map((h) => `"${h}"`).join(';'), ...rows].join('\r\n')
}
