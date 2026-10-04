// src/lib/planLimits.ts
/**
 * Motor de Avaliação e Aplicação de Limites dos Planos no Ajudante IA
 *
 * Planos:
 * 1. Essencial (R$ 29,90): até 5 clientes, até 2 obras simultâneas, até 10 orçamentos/mês,
 *    cálculos completos e voz liberados (NUNCA bloqueados), 1 usuário.
 * 2. Profissional (R$ 49,90): clientes, obras e orçamentos ilimitados, PDF timbrado, diário por voz,
 *    fotos por obra/etapa, estoque + compras, relatórios WhatsApp.
 * 3. Empresa (R$ 79,90): tudo do profissional + até 5 usuários/equipes, relatórios avançados,
 *    suporte prioritário e módulos liberados sob medida.
 */

import { CATALOGO_PLANOS } from './commercialEngine'
import { Assinatura, CatalogoPlano, LimitesPlano, PlanoTipo } from '@/types/database'

export interface VerificacaoLimiteResultado {
  permitido: boolean
  motivo?: string
  planoRequerido?: PlanoTipo
  planoAtual?: PlanoTipo
  planoMinimoRecomendado?: PlanoTipo
  limiteAtual?: number
  totalAtual?: number
  mensagemBloqueio?: string
}

export function obterPlanoInfo(planoId: PlanoTipo): CatalogoPlano {
  const plano = CATALOGO_PLANOS.find((p) => p.id === planoId)
  return plano || CATALOGO_PLANOS[0]
}

export function obterLimitesPlano(planoId: PlanoTipo): LimitesPlano {
  return obterPlanoInfo(planoId).limites
}

/**
 * Valida se o usuário pode cadastrar mais um cliente
 */
export function verificarLimiteClientes(
  planoId: PlanoTipo,
  totalClientesAtuais: number,
  modulosLiberados?: Record<string, boolean>,
  isTrial: boolean = false,
): VerificacaoLimiteResultado {
  if (modulosLiberados?.['clientes_ilimitados'] || isTrial) {
    return { permitido: true }
  }

  const limites = obterLimitesPlano(planoId)
  if (limites.maxClientes === -1) {
    return { permitido: true }
  }

  if (totalClientesAtuais >= limites.maxClientes) {
    return {
      permitido: false,
      planoRequerido: 'profissional',
      limiteAtual: limites.maxClientes,
      totalAtual: totalClientesAtuais,
      motivo: `O Plano Essencial permite cadastrar até ${limites.maxClientes} clientes. Você já possui ${totalClientesAtuais}.`,
      mensagemBloqueio: `Você atingiu o limite de ${limites.maxClientes} clientes do Plano Essencial. Faça o upgrade para o Plano Profissional (R$ 49,90/mês) para ter clientes ilimitados.`,
    }
  }

  return { permitido: true, limiteAtual: limites.maxClientes, totalAtual: totalClientesAtuais }
}

/**
 * Valida se o usuário pode cadastrar mais uma obra em andamento
 */
export function verificarLimiteObras(
  planoId: PlanoTipo,
  totalObrasEmAndamento: number,
  modulosLiberados?: Record<string, boolean>,
  isTrial: boolean = false,
): VerificacaoLimiteResultado {
  if (modulosLiberados?.['obras_ilimitadas'] || isTrial) {
    return { permitido: true }
  }

  const limites = obterLimitesPlano(planoId)
  if (limites.maxObrasSimultaneas === -1) {
    return { permitido: true }
  }

  if (totalObrasEmAndamento >= limites.maxObrasSimultaneas) {
    const planoReq: PlanoTipo = planoId === 'essencial' ? 'profissional' : 'empresa'
    const planoNome = planoId === 'essencial' ? 'Plano Essencial' : 'Plano Profissional'
    const planoUpgradeNome =
      planoReq === 'profissional'
        ? 'Plano Profissional (R$ 49,90/mês)'
        : 'Plano Empresa (R$ 79,90/mês)'
    return {
      permitido: false,
      planoRequerido: planoReq,
      limiteAtual: limites.maxObrasSimultaneas,
      totalAtual: totalObrasEmAndamento,
      motivo: `O ${planoNome} permite até ${limites.maxObrasSimultaneas} obras simultâneas em andamento. Você já possui ${totalObrasEmAndamento}.`,
      mensagemBloqueio: `Você atingiu o limite de ${limites.maxObrasSimultaneas} obras simultâneas do ${planoNome}. Faça o upgrade para o ${planoUpgradeNome} para gerenciar mais obras.`,
    }
  }

  return {
    permitido: true,
    limiteAtual: limites.maxObrasSimultaneas,
    totalAtual: totalObrasEmAndamento,
  }
}

/**
 * Valida se o usuário pode criar mais um orçamento no mês corrente
 */
export function verificarLimiteOrcamentos(
  planoId: PlanoTipo,
  totalOrcamentosMes: number,
  modulosLiberados?: Record<string, boolean>,
  isTrial: boolean = false,
): VerificacaoLimiteResultado {
  if (modulosLiberados?.['orcamentos_ilimitados'] || isTrial) {
    return { permitido: true }
  }

  const limites = obterLimitesPlano(planoId)
  if (limites.maxOrcamentosMes === -1) {
    return { permitido: true }
  }

  if (totalOrcamentosMes >= limites.maxOrcamentosMes) {
    return {
      permitido: false,
      planoRequerido: 'profissional',
      limiteAtual: limites.maxOrcamentosMes,
      totalAtual: totalOrcamentosMes,
      motivo: `O Plano Essencial permite até ${limites.maxOrcamentosMes} orçamentos por mês. Você já emitiu ${totalOrcamentosMes} neste mês.`,
      mensagemBloqueio: `Você atingiu o limite de ${limites.maxOrcamentosMes} orçamentos mensais do Plano Essencial. Faça o upgrade para o Plano Profissional (R$ 49,90/mês) para orçamentos ilimitados.`,
    }
  }

  return { permitido: true, limiteAtual: limites.maxOrcamentosMes, totalAtual: totalOrcamentosMes }
}

/**
 * Valida permissão para emissão de Documentos PDF (recibo, OS, lista de materiais, proposta timbrada)
 */
export function verificarPermissaoDocumentosPdf(
  planoId: PlanoTipo,
  modulosLiberados?: Record<string, boolean>,
  isTrial: boolean = false,
): VerificacaoLimiteResultado {
  if (modulosLiberados?.['documentos_personalizados'] || isTrial) {
    return { permitido: true }
  }

  const limites = obterLimitesPlano(planoId)
  if (limites.permitePdfDocumentos) {
    return { permitido: true }
  }

  return {
    permitido: false,
    planoRequerido: 'profissional',
    motivo:
      'A emissão de documentos PDF oficiais (recibos, ordem de serviço e propostas timbradas) está disponível a partir do Plano Profissional.',
    mensagemBloqueio:
      'Este recurso está disponível no Plano Profissional (R$ 49,90/mês). Você poderá emitir recibos, ordens de serviço e relatórios timbrados com sua marca.',
  }
}

/**
 * Valida permissão para Diário de Obra por Voz e Registro Fotográfico
 */
export function verificarPermissaoDiarioVozEFotos(
  planoId: PlanoTipo,
  tipoRecurso: 'diario' | 'fotos',
  modulosLiberados?: Record<string, boolean>,
  isTrial: boolean = false,
): VerificacaoLimiteResultado {
  if (
    isTrial ||
    (tipoRecurso === 'fotos' && modulosLiberados?.['diario_obra_geoloc']) ||
    (tipoRecurso === 'diario' && modulosLiberados?.['assistente_ia_ilimitado'])
  ) {
    return { permitido: true }
  }

  const limites = obterLimitesPlano(planoId)
  const permitido = tipoRecurso === 'fotos' ? limites.permiteFotosObra : limites.permiteDiarioVoz

  if (permitido) {
    return { permitido: true }
  }

  const nomeRecurso =
    tipoRecurso === 'fotos'
      ? 'O registro fotográfico com geolocalização'
      : 'O diário de obra por voz'

  return {
    permitido: false,
    planoRequerido: 'profissional',
    motivo: `${nomeRecurso} é um recurso exclusivo a partir do Plano Profissional.`,
    mensagemBloqueio: `${nomeRecurso} está disponível no Plano Profissional (R$ 49,90/mês). Facilite a comprovação de serviços no canteiro.`,
  }
}

/**
 * Valida relatórios e indicadores avançados (disponível no Plano Empresa)
 */
export function verificarPermissaoRelatoriosAvancados(
  planoId: PlanoTipo,
  modulosLiberados?: Record<string, boolean>,
  isTrial: boolean = false,
): VerificacaoLimiteResultado {
  if (modulosLiberados?.['exportacao_erp'] || isTrial) {
    return { permitido: true }
  }

  const limites = obterLimitesPlano(planoId)
  if (limites.relatoriosAvancados) {
    return { permitido: true }
  }

  return {
    permitido: false,
    planoRequerido: 'empresa',
    motivo:
      'Indicadores executivos consolidados e relatórios avançados de margem são exclusivos do Plano Empresa.',
    mensagemBloqueio:
      'Este recurso executivo está disponível no Plano Empresa (R$ 79,90/mês), ideal para gestão consolidada e múltiplas equipes.',
  }
}

/**
 * Valida o limite mensal de processamento de áudio/voz em minutos
 * REGRA DO PRODUTO: quando o limite mensal de voz é atingido, bloqueia SOMENTE
 * a transcrição e o agente de IA na nuvem. Os cálculos determinísticos,
 * registros manuais e o uso offline NUNCA são bloqueados.
 */
export function verificarPermissaoEquipes(
  plano: PlanoTipo,
  modulosLiberados?: Record<string, boolean> | string[],
  isTrial?: boolean,
): VerificacaoLimiteResultado {
  if (isTrial) {
    return {
      permitido: true,
      planoAtual: plano,
    }
  }

  // Suporta tanto array quanto Record<string, boolean> (padrão de users.modulos_liberados)
  if (Array.isArray(modulosLiberados)) {
    if (modulosLiberados.includes('equipes') || modulosLiberados.includes('relatorios')) {
      return {
        permitido: true,
        planoAtual: plano,
      }
    }
  } else if (modulosLiberados) {
    if (
      modulosLiberados['equipes'] ||
      modulosLiberados['equipe'] ||
      modulosLiberados['relatorios']
    ) {
      return {
        permitido: true,
        planoAtual: plano,
      }
    }
  }

  // Apenas Empresa libera membros de equipe
  if (plano === 'empresa') {
    return {
      permitido: true,
      planoAtual: plano,
    }
  }

  return {
    permitido: false,
    planoAtual: plano,
    planoMinimoRecomendado: 'empresa',
    mensagemBloqueio:
      'A gestão de equipes e múltiplos operadores em obras faz parte do Plano Empresa (R$ 79,90/mês). No Plano Essencial e Profissional o acesso é individual.',
  }
}

export function verificarLimiteAudioMinutos(
  planoId: PlanoTipo,
  minutosUsadosNoMes: number,
  modulosLiberados?: Record<string, boolean>,
  isTrial: boolean = false,
): VerificacaoLimiteResultado {
  if (modulosLiberados?.['assistente_ia_ilimitado'] || isTrial) {
    return { permitido: true }
  }

  const limites = obterLimitesPlano(planoId)
  if (limites.maxMinutosAudioMes === -1) {
    return { permitido: true }
  }

  if (minutosUsadosNoMes >= limites.maxMinutosAudioMes) {
    const planoReq: PlanoTipo = planoId === 'essencial' ? 'profissional' : 'empresa'
    const planoReqPreco = planoReq === 'profissional' ? 'R$ 49,90' : 'R$ 79,90'
    const planoNome = planoId === 'essencial' ? 'Plano Essencial' : 'Plano Profissional'
    return {
      permitido: false,
      planoRequerido: planoReq,
      limiteAtual: limites.maxMinutosAudioMes,
      totalAtual: minutosUsadosNoMes,
      motivo: `Você usou ${minutosUsadosNoMes.toFixed(1)} de ${limites.maxMinutosAudioMes} minutos de IA por voz este mês no ${planoNome}.`,
      mensagemBloqueio: `Você atingiu o teto mensal de ${limites.maxMinutosAudioMes} minutos de voz da IA do ${planoNome}. Faça o upgrade para o plano ${planoReq.toUpperCase()} (${planoReqPreco}/mês) para continuar conversando por voz com a IA. Todos os cálculos matemáticos continuam funcionando normalmente!`,
    }
  }

  return {
    permitido: true,
    limiteAtual: limites.maxMinutosAudioMes,
    totalAtual: minutosUsadosNoMes,
  }
}
