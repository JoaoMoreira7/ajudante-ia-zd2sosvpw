import { describe, it, expect } from 'vitest'
import { parseEdicaoFraseRecibo, isReciboValido24h, ReciboItem } from '@/lib/reciboEngine'
import { parsePreferenciaConversa, aplicarPreferenciaAoTexto } from '@/lib/preferencesEngine'
import { calcularParcelamento, parseParcelamentoOuRecorrencia } from '@/lib/recorrenciasEngine'
import { calcularQuemMeDeve, identificarBaixaRecebimento } from '@/lib/quemMeDeveEngine'
import { gerarResumoSemana, verificarAlertaPadraoGasto } from '@/lib/resumoSemanalEngine'

describe('Meu Assessor Adaptado - Módulo de Recibos', () => {
  const reciboBase: ReciboItem = {
    id: 'rec_1',
    tipo: 'gasto',
    entidade: 'financeiro',
    entidadeId: 'fin_1',
    titulo: 'Gasto',
    descricao: 'Areia fina',
    valor: 120,
    categoria: 'areia',
    data: '2025-05-10',
    status: 'Gravado',
    timestamp: Date.now(),
  }

  it('valida se recibo está dentro da janela de 24h', () => {
    expect(isReciboValido24h(reciboBase)).toBe(true)
    const expirado: ReciboItem = {
      ...reciboBase,
      timestamp: Date.now() - 25 * 60 * 60 * 1000,
    }
    expect(isReciboValido24h(expirado)).toBe(false)
  })

  it('interpreta frase de edição de valor ("o valor é 92")', () => {
    const res = parseEdicaoFraseRecibo('o valor é 92', reciboBase)
    expect(res).not.toBeNull()
    expect(res?.campo).toBe('valor')
    expect(res?.novoValor).toBe(92)
  })

  it('interpreta frase de edição de quantidade ("a quantidade é 40")', () => {
    const res = parseEdicaoFraseRecibo('a quantidade é 40', reciboBase)
    expect(res).not.toBeNull()
    expect(res?.campo).toBe('quantidade')
    expect(res?.novoValor).toBe(40)
  })

  it('interpreta frase de edição de categoria ("a categoria é combustível")', () => {
    const res = parseEdicaoFraseRecibo('a categoria é combustível', reciboBase)
    expect(res).not.toBeNull()
    expect(res?.campo).toBe('categoria')
    expect(res?.novoValor).toBe('combustível')
  })
})

describe('Meu Assessor Adaptado - Preferências por Conversa', () => {
  it('detecta "me chama de Zé"', () => {
    const res = parsePreferenciaConversa('me chama de Zé')
    expect(res).not.toBeNull()
    expect(res?.tipo).toBe('apelido')
    expect(res?.valor).toBe('Zé')
  })

  it('detecta mudança de tom "para de mandar emoji"', () => {
    const res = parsePreferenciaConversa('para de mandar emoji')
    expect(res).not.toBeNull()
    expect(res?.tipo).toBe('tom')
    expect(res?.valor).toBe('sem_emoji')
  })

  it('detecta nota de contexto "lembra que o portão é azul"', () => {
    const res = parsePreferenciaConversa('lembra que o portão da obra é azul')
    expect(res).not.toBeNull()
    expect(res?.tipo).toBe('lembrete_adicionar')
    expect(res?.valor).toContain('o portão da obra é azul')
  })

  it('remove emojis quando tom configurado para sem_emoji', () => {
    const texto = 'Beleza, mestre! 👍 Tudo pronto 🚀'
    const ajustado = aplicarPreferenciaAoTexto(texto, undefined, 'sem_emoji')
    expect(ajustado).not.toContain('👍')
    expect(ajustado).not.toContain('🚀')
  })
})

describe('Meu Assessor Adaptado - Parcelamentos e Recorrências Determinísticos', () => {
  it('calcula 3x de 500 sem IA, total 1500 com datas sequenciais', () => {
    const plano = calcularParcelamento(3, 500, undefined, 'Cimento Votoran', 'cimento')
    expect(plano.totalParcelas).toBe(3)
    expect(plano.valorParcela).toBe(500)
    expect(plano.valorTotal).toBe(1500)
    expect(plano.parcelas.length).toBe(3)
    expect(plano.parcelas[0].descricao).toBe('Cimento Votoran (1/3)')
  })

  it('detecta comando "comprei material em 3x de 500"', () => {
    const res = parseParcelamentoOuRecorrencia('comprei material em 3x de 500')
    expect(res).not.toBeNull()
    expect(res?.tipo).toBe('parcelamento')
    expect(res?.params.numParcelas).toBe(3)
    expect(res?.params.valorParcela).toBe(500)
  })

  it('detecta recorrência "aluguel do betoneira é 200 todo mês"', () => {
    const res = parseParcelamentoOuRecorrencia('aluguel da betoneira é 200 todo mês')
    expect(res).not.toBeNull()
    expect(res?.tipo).toBe('recorrente')
    expect(res?.params.valor).toBe(200)
  })
})

describe('Meu Assessor Adaptado - Quem Me Deve e Resumo Semanal', () => {
  it('bloqueia valores para perfil Operador', () => {
    const rel = calcularQuemMeDeve([], [], [], true)
    expect(rel.totalGeralPendente).toBe(0)
    expect(rel.textoFormatado).toContain('Operador')
  })

  it('calcula pendências por cliente para perfil Dono', () => {
    const lancs: any[] = [
      {
        id: '1',
        tipo: 'entrada',
        status: 'pendente',
        valor: 450,
        descricao: 'Entrada Rafael',
        data: '2025-05-01',
      },
    ]
    const rel = calcularQuemMeDeve(lancs, [], [], false)
    expect(rel.totalGeralPendente).toBe(450)
    expect(rel.clientes.length).toBe(1)
    expect(rel.textoFormatado).toContain('450.00')
  })

  it('identifica baixa por fala "recebi os 450 do Rafael"', () => {
    const lancs: any[] = [
      {
        id: '1',
        tipo: 'entrada',
        status: 'pendente',
        valor: 450,
        descricao: 'Recebido de Rafael',
        data: '2025-05-01',
      },
    ]
    const baixa = identificarBaixaRecebimento('recebi os 450 do Rafael', lancs, [])
    expect(baixa).not.toBeNull()
    expect(baixa?.lancamentoAlvo?.id).toBe('1')
  })

  it('gera resumo da semana com comparação de gastos e obras', () => {
    const resumo = gerarResumoSemana([], [], [], [], false)
    expect(resumo.textoFormatado).toContain('resumo da sua semana')
  })

  it('gera alerta parceiro de padrão se gasto for muito acima da média', () => {
    const hist: any[] = [
      { tipo: 'saida', categoria: 'combustivel', valor: 100 },
      { tipo: 'saida', categoria: 'combustivel', valor: 110 },
      { tipo: 'saida', categoria: 'combustivel', valor: 90 },
    ]
    const alerta = verificarAlertaPadraoGasto('combustivel', 350, hist)
    expect(alerta).not.toBeNull()
    expect(alerta).toContain('acima da média')
  })
})
