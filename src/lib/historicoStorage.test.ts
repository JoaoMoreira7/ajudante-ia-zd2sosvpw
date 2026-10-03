import { describe, it, expect, beforeEach } from 'vitest'
import {
  normalizarParaBusca,
  salvarChatPersistido,
  carregarChatPersistido,
  limparChatPersistido,
  registrarCalculoPersistente,
  carregarCalculosPersistidos,
  limparCalculosPersistidos,
  buscarNoHistorico,
} from './historicoStorage'

describe('Memória e Busca de Histórico (Conversas e Cálculos Determinísticos)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('1. Normalização tolerante a acentos e maiúsculas', () => {
    it('deve normalizar acentos variados (á, é, í, ó, ú, â, ê, õ, ã, ç)', () => {
      expect(normalizarParaBusca('parêde')).toBe('parede')
      expect(normalizarParaBusca('PAREDE')).toBe('parede')
      expect(normalizarParaBusca('Piso Cerâmico')).toBe('piso ceramico')
      expect(normalizarParaBusca('AÇO')).toBe('aco')
      expect(normalizarParaBusca('Cálculo')).toBe('calculo')
      expect(normalizarParaBusca('CONCRETO ARMADO')).toBe('concreto armado')
    })

    it('busca por "cimento" deve encontrar "CIMENTO" e "Cimento"', () => {
      const q = normalizarParaBusca('cimento')
      const target = normalizarParaBusca('50 sacos de CIMENTO')
      expect(target.includes(q)).toBe(true)
    })
  })

  describe('2. Persistência de Chat Offline', () => {
    it('deve salvar e carregar histórico de mensagens', () => {
      const interacoes = [
        {
          id: 'msg_1',
          autor: 'usuario',
          texto: 'Calcula uma parede de 8 por 3',
          timestamp: 1700000000000,
        },
        {
          id: 'msg_2',
          autor: 'ajudante',
          texto: 'ÁREA DA PAREDE: 8 × 3 = 24 m²',
          tipoCalculo: 'EXATO',
          timestamp: 1700000001000,
        },
      ]

      salvarChatPersistido(interacoes, 'user_123')
      const carregados = carregarChatPersistido('user_123')

      expect(carregados.length).toBe(2)
      expect(carregados[0].texto).toBe('Calcula uma parede de 8 por 3')
      expect(carregados[1].tipoCalculo).toBe('EXATO')
    })

    it('deve respeitar isolamento de usuário', () => {
      salvarChatPersistido(
        [{ id: 'msg_x', autor: 'usuario', texto: 'Segredo A', timestamp: Date.now() }],
        'user_dono_1',
      )
      const deOutro = carregarChatPersistido('user_outro_2')
      expect(deOutro.length).toBe(0)
    })

    it('deve limpar histórico quando solicitado', () => {
      salvarChatPersistido(
        [{ id: 'msg_1', autor: 'usuario', texto: 'Oi', timestamp: Date.now() }],
        'user_1',
      )
      limparChatPersistido('user_1')
      const aposLimpar = carregarChatPersistido('user_1')
      expect(aposLimpar.length).toBe(0)
    })
  })

  describe('3. Persistência e Recuperação de Cálculos Determinísticos', () => {
    it('deve registrar cálculo de alvenaria e permitir carregar', () => {
      registrarCalculoPersistente({
        owner_id: 'user_1',
        titulo: 'Cálculo de Alvenaria (24 m²)',
        tipoCalculo: 'ESTIMATIVA',
        categoria: 'alvenaria',
        parametrosEntrada: { areaM2: 24, perdaPct: 10 },
        resumoEntrada: '24 m² de parede, perda 10%',
        resumoResultado: '456 blocos cerâmicos e 5 sacos de cimento',
        formula: '456 blocos',
        ttsTexto: 'Alvenaria para 24 metros: 456 blocos e 5 sacos de cimento.',
        origem: 'falar',
      })

      const salvos = carregarCalculosPersistidos('user_1')
      expect(salvos.length).toBe(1)
      expect(salvos[0].titulo).toContain('Alvenaria')
      expect(salvos[0].resumoResultado).toContain('456 blocos')
    })
  })

  describe('4. Busca Unificada (Conversas + Cálculos na mesma pesquisa)', () => {
    beforeEach(() => {
      salvarChatPersistido(
        [
          {
            id: 'chat_c1',
            autor: 'usuario',
            texto: 'Preciso de cálculo para parede da sala',
            timestamp: 1700000000000,
          },
          {
            id: 'chat_c2',
            autor: 'ajudante',
            texto: 'Área total de 30 m² calculada.',
            tipoCalculo: 'EXATO',
            timestamp: 1700000001000,
          },
        ],
        'user_teste',
      )

      registrarCalculoPersistente({
        owner_id: 'user_teste',
        titulo: 'Cálculo de Concreto para Fundação',
        tipoCalculo: 'ESTIMATIVA',
        categoria: 'concreto',
        parametrosEntrada: { volume: 3.5 },
        resumoEntrada: 'Volume 3.5 m³',
        resumoResultado: '25 sacos de cimento CP II, 1.8 m³ areia e 2.4 m³ brita',
        ttsTexto: 'Concreto para 3.5 m³: 25 sacos de cimento.',
        origem: 'calculadora',
      })
    })

    it('busca por "parede" deve encontrar a mensagem do chat', () => {
      const res = buscarNoHistorico('parede', { userId: 'user_teste' })
      expect(res.length).toBeGreaterThanOrEqual(1)
      expect(res.some((r) => r.tipoItem === 'conversa_usuario')).toBe(true)
    })

    it('busca por "cimento" deve encontrar o cálculo de concreto', () => {
      const res = buscarNoHistorico('cimento', { userId: 'user_teste' })
      expect(res.length).toBeGreaterThanOrEqual(1)
      const itemCalc = res.find((r) => r.tipoItem === 'calculo')
      expect(itemCalc).toBeDefined()
      expect(itemCalc?.titulo).toContain('Concreto')
      expect(itemCalc?.ttsTexto).toContain('cimento')
    })

    it('busca com acento "parêde" deve encontrar o registro "parede"', () => {
      const res = buscarNoHistorico('parêde', { userId: 'user_teste' })
      expect(res.length).toBeGreaterThanOrEqual(1)
    })

    it('busca em maiúsculas "CIMENTO" deve encontrar', () => {
      const res = buscarNoHistorico('CIMENTO', { userId: 'user_teste' })
      expect(res.length).toBeGreaterThanOrEqual(1)
    })

    it('quando não encontra nada deve retornar array vazio', () => {
      const res = buscarNoHistorico('palavra_inexistente_xyz', { userId: 'user_teste' })
      expect(res.length).toBe(0)
    })

    it('perfil operador não deve ter expostos cálculos ou conversas com valores financeiros de caixa', () => {
      salvarChatPersistido(
        [
          {
            id: 'chat_fin',
            autor: 'ajudante',
            texto: 'Saldo recebido de R$ 50.000,00 no faturamento',
            timestamp: 1700000005000,
          },
        ],
        'user_teste',
      )
      registrarCalculoPersistente({
        owner_id: 'user_teste',
        titulo: 'Orçamento com Margem Financeira',
        tipoCalculo: 'EXATO',
        categoria: 'financeiro',
        parametrosEntrada: { total: 50000 },
        resumoEntrada: 'Entrada financeira',
        resumoResultado: 'Lucro líquido de R$ 15.000',
        ttsTexto: 'Lucro de 15 mil.',
        origem: 'orcamento',
      })

      const resOperador = buscarNoHistorico('financeira', {
        userId: 'user_teste',
        isOperador: true,
      })
      expect(resOperador.length).toBe(0)

      const resDono = buscarNoHistorico('financeira', {
        userId: 'user_teste',
        isOperador: false,
      })
      expect(resDono.length).toBeGreaterThanOrEqual(1)
    })
  })
})
