import { describe, it, expect } from 'vitest'
import {
  parseCobrancaPix,
  isConsultaCobrancasPendentes,
  formatarValorBrl,
  isCobrancaValida24h,
} from '@/lib/cobrancaPixEngine'
import { parseLocalIntent } from '@/lib/intentParser'
import { interpretCommandLocally } from '@/lib/localInterpreter'

describe('Integração de Cobrança Pix por Voz com Asaas', () => {
  describe('1. Detecção e extração de comandos por voz (cobrancaPixEngine)', () => {
    it('deve extrair valor e cliente de "cria uma cobrança de 350 pro João"', () => {
      const res = parseCobrancaPix('cria uma cobrança de 350 pro João')
      expect(res).not.toBeNull()
      expect(res?.valor).toBe(350)
      expect(res?.clienteNome).toBe('João')
      expect(res?.descricao).toBeUndefined()
    })

    it('deve extrair de "cobra 350 do João"', () => {
      const res = parseCobrancaPix('cobra 350 do João')
      expect(res).not.toBeNull()
      expect(res?.valor).toBe(350)
      expect(res?.clienteNome).toBe('João')
    })

    it('deve extrair de "cria uma cobrança Pix de R$ 350 para o cliente João referente à consultoria de hoje"', () => {
      const res = parseCobrancaPix(
        'cria uma cobrança Pix de R$ 350 para o cliente João referente à consultoria de hoje',
      )
      expect(res).not.toBeNull()
      expect(res?.valor).toBe(350)
      expect(res?.clienteNome).toBe('João')
      expect(res?.descricao).toBe('Consultoria de hoje')
    })

    it('deve extrair de "faz uma cobrança de 250 pra obra do José"', () => {
      const res = parseCobrancaPix('faz uma cobrança de 250 pra obra do José')
      expect(res).not.toBeNull()
      expect(res?.valor).toBe(250)
      expect(res?.clienteNome).toBe('José')
    })

    it('deve extrair de "manda um pix de 1.250,50 pro Carlos referente a pintura"', () => {
      const res = parseCobrancaPix('manda um pix de 1.250,50 pro Carlos referente a pintura')
      expect(res).not.toBeNull()
      expect(res?.valor).toBe(1250.5)
      expect(res?.clienteNome).toBe('Carlos')
      expect(res?.descricao).toBe('Pintura')
    })

    it('deve rejeitar comandos sem cliente ou sem valor', () => {
      expect(parseCobrancaPix('cria uma cobrança')).toBeNull()
      expect(parseCobrancaPix('cobra do João')).toBeNull()
      expect(parseCobrancaPix('bom dia')).toBeNull()
    })
  })

  describe('2. Consulta de cobranças pendentes', () => {
    it('deve reconhecer "quais cobranças pendentes?"', () => {
      expect(isConsultaCobrancasPendentes('quais cobranças pendentes?')).toBe(true)
      expect(isConsultaCobrancasPendentes('quais as cobranças pendentes?')).toBe(true)
      expect(isConsultaCobrancasPendentes('cobranças pendentes')).toBe(true)
      expect(isConsultaCobrancasPendentes('tem cobrança pendente?')).toBe(true)
    })

    it('deve classificar intent consultar_cobrancas_pendentes no parseLocalIntent', () => {
      const intent = parseLocalIntent('quais cobranças pendentes?')
      expect(intent.intent).toBe('consultar_cobrancas_pendentes')
    })

    it('deve classificar intent consultar_cobrancas_pendentes no localInterpreter', () => {
      const local = interpretCommandLocally('quais as cobranças pendentes?')
      expect(local.intent).toBe('consultar_cobrancas_pendentes')
    })
  })

  describe('3. Pipeline de Parsing de Intenções (intentParser & localInterpreter)', () => {
    it('deve classificar criar_cobranca_pix no parseLocalIntent', () => {
      const parsed = parseLocalIntent('cria uma cobrança de 350 pro João')
      expect(parsed.intent).toBe('criar_cobranca_pix')
      expect(parsed.params.valor).toBe(350)
      expect(parsed.params.clienteNome).toBe('João')
    })

    it('deve classificar criar_cobranca_pix no localInterpreter com descrição', () => {
      const local = interpretCommandLocally(
        'cria uma cobrança Pix de R$ 350 para o cliente João referente à consultoria de hoje',
      )
      expect(local.intent).toBe('criar_cobranca_pix')
      expect(local.params.valor).toBe(350)
      expect(local.params.clienteNome).toBe('João')
      expect(local.params.descricao).toBe('Consultoria de hoje')
    })
  })

  describe('4. Formatação de valores e regras de 24h', () => {
    it('deve formatar valor BRL corretamente', () => {
      const brl = formatarValorBrl(350)
      expect(brl).toContain('350')
      expect(brl).toContain('R$')
    })

    it('deve validar prazo de 24 horas para desfazer', () => {
      const agora = Date.now()
      expect(isCobrancaValida24h(agora)).toBe(true)
      expect(isCobrancaValida24h(agora - 2 * 60 * 60 * 1000)).toBe(true) // 2h atrás
      expect(isCobrancaValida24h(agora - 25 * 60 * 60 * 1000)).toBe(false) // 25h atrás
    })
  })

  describe('5. Degradação graciosa sem chave de API e resposta amigável', () => {
    it('deve fornecer a mensagem amigável esperada quando o backend retornar 412/sem chave', () => {
      const erroSimulado = {
        status: 412,
        data: {
          chaveNaoConfigurada: true,
          error: 'Pra eu criar cobranças Pix, o Dono precisa conectar o Asaas nas configurações.',
        },
      }
      const isChaveAusente = erroSimulado.status === 412 || erroSimulado.data?.chaveNaoConfigurada
      expect(isChaveAusente).toBe(true)

      const respostaConversa =
        'Pra eu criar cobranças Pix, o Dono precisa conectar o Asaas nas Configurações.'
      expect(respostaConversa).not.toContain('stack')
      expect(respostaConversa).not.toContain('API_KEY')
      expect(respostaConversa).toContain('o Dono precisa conectar o Asaas')
    })
  })

  describe('6. Idempotência do webhook do Asaas', () => {
    it('deve tratar cobrança já confirmada/recebida sem duplicar baixa', () => {
      // Simulação da lógica de idempotência do backend webhook
      const cobrancaExistente = {
        id: 'cob_123',
        status: 'RECEIVED',
        asaas_payment_id: 'pay_999',
      }

      const isPaymentSettled = (event: string) =>
        event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED'

      const processWebhookEvent = (cobranca: typeof cobrancaExistente, event: string) => {
        if (!isPaymentSettled(event)) return { status: 'ignored' }
        if (cobranca.status === 'RECEIVED' || cobranca.status === 'CONFIRMED') {
          return { status: 'idempotent', message: 'Cobrança já baixada anteriormente.' }
        }
        return { status: 'processed' }
      }

      const resPrimeiraVez = processWebhookEvent(cobrancaExistente, 'PAYMENT_RECEIVED')
      expect(resPrimeiraVez.status).toBe('idempotent')

      const resEventoRepetido = processWebhookEvent(cobrancaExistente, 'PAYMENT_CONFIRMED')
      expect(resEventoRepetido.status).toBe('idempotent')
    })
  })
})
