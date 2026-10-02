// src/lib/commercialEngine.test.ts
import { describe, it, expect } from 'vitest'
import {
  calcularMetricasComerciais,
  calcularProximoVencimento,
  resolverStatusAposPagamento,
  verificarVencimentoAssinatura,
  exportarVendasCSV,
  CATALOGO_PLANOS,
} from './commercialEngine'
import { Assinatura, FaturaVenda } from '@/types/database'

describe('Motor Comercial - Catálogo e Métricas', () => {
  it('deve conter os 3 planos no catálogo com preços padrão', () => {
    expect(CATALOGO_PLANOS.length).toBe(3)
    const [essencial, profissional, empresa] = CATALOGO_PLANOS
    expect(essencial.id).toBe('essencial')
    expect(essencial.precoMensal).toBe(29.9)
    expect(profissional.id).toBe('profissional')
    expect(profissional.precoMensal).toBe(49.9)
    expect(empresa.id).toBe('empresa')
    expect(empresa.precoMensal).toBe(79.9)
  })

  it('deve calcular métricas comerciais corretamente com faturas pagas, pendentes e canceladas', () => {
    const faturas: FaturaVenda[] = [
      {
        id: 'fat_1',
        user_id: 'usr_1',
        descricao: 'Plano Profissional',
        valor: 149.0,
        status: 'pago',
        origem: 'direta',
        forma_pagamento: 'pix',
        data_vencimento: '2025-01-10',
        data_pagamento: '2025-01-10',
      },
      {
        id: 'fat_2',
        user_id: 'usr_2',
        descricao: 'Plano Empresa Anual',
        valor: 2990.0,
        status: 'pago',
        origem: 'direta',
        forma_pagamento: 'transferencia',
        data_vencimento: '2025-01-15',
        data_pagamento: '2025-01-15',
      },
      {
        id: 'fat_3',
        user_id: 'usr_3',
        descricao: 'Plano Profissional Pendente',
        valor: 149.0,
        status: 'pendente',
        origem: 'internet',
        forma_pagamento: 'boleto',
        data_vencimento: '2025-02-10',
      },
      {
        id: 'fat_4',
        user_id: 'usr_4',
        descricao: 'Fatura Atrasada',
        valor: 149.0,
        status: 'atrasado',
        origem: 'direta',
        forma_pagamento: 'boleto',
        data_vencimento: '2025-01-01',
      },
      {
        id: 'fat_5',
        user_id: 'usr_5',
        descricao: 'Fatura Cancelada',
        valor: 200.0,
        status: 'cancelado',
        origem: 'direta',
        forma_pagamento: 'outro',
        data_vencimento: '2025-01-05',
      },
    ]

    const metricas = calcularMetricasComerciais(faturas)
    expect(metricas.totalRecebido).toBe(3139.0)
    expect(metricas.aReceber).toBe(298.0) // 149 pendente + 149 atrasado
    expect(metricas.quantidadeVendida).toBe(2)
    expect(metricas.cancelados).toBe(1)
    expect(metricas.totalClientes).toBe(5)
  })
})

describe('Motor Comercial - Ciclos e Vencimentos', () => {
  it('deve calcular o próximo vencimento para ciclo mensal', () => {
    const prox = calcularProximoVencimento('2025-01-15', 'mensal')
    expect(prox).toBe('2025-02-15')
  })

  it('deve calcular o próximo vencimento para ciclo trimestral', () => {
    const prox = calcularProximoVencimento('2025-01-15', 'trimestral')
    expect(prox).toBe('2025-04-15')
  })

  it('deve calcular o próximo vencimento para ciclo semestral', () => {
    const prox = calcularProximoVencimento('2025-01-15', 'semestral')
    expect(prox).toBe('2025-07-15')
  })

  it('deve calcular o próximo vencimento para ciclo anual', () => {
    const prox = calcularProximoVencimento('2025-01-15', 'anual')
    expect(prox).toBe('2026-01-15')
  })
})

describe('Motor Comercial - Regra de Ouro (Dono prevalece sobre automação)', () => {
  it('deve manter bloqueado se bloqueio_manual for verdadeiro, mesmo após novo pagamento', () => {
    const resultado = resolverStatusAposPagamento('bloqueado_manual', true)
    expect(resultado.mantemBloqueio).toBe(true)
    expect(resultado.novoStatus).toBe('bloqueado_manual')
    expect(resultado.justificativa).toContain('bloqueio MANUAL do administrador prevalece')
  })

  it('deve liberar automaticamente se o bloqueio for puramente por inadimplência', () => {
    const resultado = resolverStatusAposPagamento('bloqueado_inadimplencia', false)
    expect(resultado.mantemBloqueio).toBe(false)
    expect(resultado.novoStatus).toBe('ativo')
  })

  it('deve regularizar conta atrasada após pagamento', () => {
    const resultado = resolverStatusAposPagamento('atrasado', false)
    expect(resultado.mantemBloqueio).toBe(false)
    expect(resultado.novoStatus).toBe('ativo')
  })
})

describe('Motor Comercial - Vencimento de Venda Direta', () => {
  it('deve sinalizar atraso quando a data atual ultrapassar o proximo_vencimento', () => {
    const assinatura: Assinatura = {
      id: 'ass_1',
      user_id: 'usr_1',
      plano: 'profissional',
      ciclo: 'mensal',
      valor_recorrente: 149.0,
      status: 'ativo',
      origem: 'direta',
      data_inicio: '2025-01-01',
      proximo_vencimento: '2025-02-01',
      bloqueio_manual: false,
    }

    // 5 dias após o vencimento
    const res = verificarVencimentoAssinatura(assinatura, '2025-02-06')
    expect(res.estaVencida).toBe(true)
    expect(res.novoStatusSugerido).toBe('atrasado')
    expect(res.diasAtraso).toBe(5)
  })

  it('deve sugerir bloqueio por inadimplência após 15 dias de atraso se não bloqueado manualmente', () => {
    const assinatura: Assinatura = {
      id: 'ass_1',
      user_id: 'usr_1',
      plano: 'profissional',
      ciclo: 'mensal',
      valor_recorrente: 149.0,
      status: 'atrasado',
      origem: 'direta',
      data_inicio: '2025-01-01',
      proximo_vencimento: '2025-02-01',
      bloqueio_manual: false,
    }

    // 20 dias após o vencimento
    const res = verificarVencimentoAssinatura(assinatura, '2025-02-21')
    expect(res.estaVencida).toBe(true)
    expect(res.novoStatusSugerido).toBe('bloqueado_inadimplencia')
  })

  it('deve manter bloqueio_manual se o admin tiver bloqueado, ignorando cálculo automático', () => {
    const assinatura: Assinatura = {
      id: 'ass_1',
      user_id: 'usr_1',
      plano: 'profissional',
      ciclo: 'mensal',
      valor_recorrente: 149.0,
      status: 'bloqueado_manual',
      origem: 'direta',
      data_inicio: '2025-01-01',
      proximo_vencimento: '2025-02-01',
      bloqueio_manual: true,
    }

    const res = verificarVencimentoAssinatura(assinatura, '2025-01-15')
    expect(res.novoStatusSugerido).toBe('bloqueado_manual')
  })
})

describe('Motor Comercial - Exportação CSV', () => {
  it('deve gerar string CSV com delimitador brasileiro (ponto e vírgula)', () => {
    const faturas: FaturaVenda[] = [
      {
        id: 'fat_10',
        user_id: 'usr_10',
        descricao: 'Assinatura Teste',
        valor: 150.5,
        status: 'pago',
        origem: 'direta',
        forma_pagamento: 'pix',
        data_vencimento: '2025-03-01',
        data_pagamento: '2025-03-01',
        observacoes: 'Venda direta balcão',
        expand: {
          user_id: {
            id: 'usr_10',
            name: 'Cliente Teste',
            email: 'cliente@teste.com',
          },
        },
      },
    ]

    const csv = exportarVendasCSV(faturas)
    expect(csv).toContain('ID Fatura;Cliente;E-mail;Descrição')
    expect(csv).toContain('Cliente Teste')
    expect(csv).toContain('150,50')
    expect(csv).toContain('Venda Direta')
  })
})
