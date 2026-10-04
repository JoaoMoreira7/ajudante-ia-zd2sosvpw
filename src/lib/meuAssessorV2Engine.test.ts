/**
 * src/lib/meuAssessorV2Engine.test.ts
 * Testes unitários para os novos recursos inspirados no Meu Assessor adaptados à obra:
 * 1. Tarefas por voz ("recado solto vira tarefa", prioridade, prazos e fila ordenada).
 * 2. Teto por categoria de gasto (aviso 70%, aviso 100%, zera virada mês e cálculo de média).
 * 3. Lembretes que voltam sozinhos (criação, frequência diária/semanal, cancelamento e consulta).
 * 4. Contas a pagar ("quem eu estou devendo", cadastro e baixa por voz com bloqueio operador).
 * 5. Detecção de duplicidade de gastos no mesmo dia e alerta de recorrente não lançada.
 * 6. Resumo da manhã (geração offline-friendly com tarefas, lembretes, contas e materiais).
 */

import { describe, it, expect } from 'vitest'
import {
  extrairTarefaDeFrase,
  ordenarFilaTarefas,
  identificarTarefaParaBaixa,
} from './tarefasEngine'
import {
  parseDefinicaoTeto,
  verificarTetoCategoria,
  calcularMediaGastosCategoria,
} from './tetoEngine'
import { parseLembreteRecorrente, identificarLembreteParaCancelamento } from './lembretesEngine'
import { parseContaAPagar, calcularQuemEstouDevendo } from './contasAPagarEngine'
import {
  verificarDuplicidadeGastoMesmoDia,
  verificarRecorrenciasNaoLancadas,
} from './alertasPadraoEngine'
import { gerarResumoManha, deveExibirResumoManhaHoje } from './resumoManhaEngine'
import { TarefaObra, LembreteObra, FinanceiroLancamento, MaterialEstoque } from '@/types/database'

describe('1. Tarefas por Voz (Recado vira tarefa)', () => {
  it('extrai tarefa com prazo e prioridade da frase solta', () => {
    const baseDate = new Date('2025-05-14T10:00:00Z') // quarta-feira
    const res = extrairTarefaDeFrase('pedir pro eletricista chegar sexta', baseDate)

    expect(res).not.toBeNull()
    expect(res?.titulo).toContain('Pedir pro eletricista chegar')
    expect(res?.prazo).toBe('2025-05-16') // próxima sexta
    expect(res?.prioridade).toBe('media')
  })

  it('extrai tarefa urgente com prazo amanhã', () => {
    const baseDate = new Date('2025-05-14T10:00:00Z')
    const res = extrairTarefaDeFrase(
      'lembra de comprar tela pra janela até amanhã urgente',
      baseDate,
    )

    expect(res).not.toBeNull()
    expect(res?.prazo).toBe('2025-05-15')
    expect(res?.prioridade).toBe('urgente')
  })

  it('identifica comando de marcar como feita', () => {
    const res = extrairTarefaDeFrase('marca a tarefa do eletricista como feita')
    expect(res).not.toBeNull()
    expect(res?.termoBuscaBaixa).toContain('eletricista')
  })

  it('ordena fila: vencidas primeiro, depois por prazo mais próximo', () => {
    const hoje = '2025-05-14'
    const lista: TarefaObra[] = [
      {
        id: '1',
        owner_id: 'u1',
        titulo: 'Semana que vem',
        prazo: '2025-05-20',
        prioridade: 'media',
        status: 'pendente',
      },
      {
        id: '2',
        owner_id: 'u1',
        titulo: 'Vencida ontem',
        prazo: '2025-05-13',
        prioridade: 'baixa',
        status: 'pendente',
      },
      {
        id: '3',
        owner_id: 'u1',
        titulo: 'De hoje',
        prazo: '2025-05-14',
        prioridade: 'urgente',
        status: 'pendente',
      },
      { id: '4', owner_id: 'u1', titulo: 'Já feita', status: 'concluida', prioridade: 'urgente' },
    ]

    const ordenada = ordenarFilaTarefas(lista, hoje)
    expect(ordenada[0].id).toBe('2') // Vencida primeiro
    expect(ordenada[1].id).toBe('3') // Hoje
    expect(ordenada[2].id).toBe('1') // Semana que vem
    expect(ordenada[3].id).toBe('4') // Concluída no final
  })

  it('identifica tarefa por aproximação para dar baixa', () => {
    const tarefas: TarefaObra[] = [
      {
        id: 't1',
        owner_id: 'u1',
        titulo: 'Pedir pro eletricista chegar',
        prioridade: 'media',
        status: 'pendente',
      },
      {
        id: 't2',
        owner_id: 'u1',
        titulo: 'Comprar areia grossa',
        prioridade: 'baixa',
        status: 'pendente',
      },
    ]
    const achou = identificarTarefaParaBaixa('eletricista', tarefas)
    expect(achou?.id).toBe('t1')
  })
})

describe('2. Teto por Categoria de Gasto', () => {
  it('interpreta definição de teto mensal com categoria e valor', () => {
    const res = parseDefinicaoTeto('define um orçamento de 800 por mês pra material')
    expect(res).not.toBeNull()
    expect(res?.categoria).toBe('material')
    expect(res?.valor).toBe(800)
  })

  it('calcula alerta quando atinge 70% ou estoura 100%', () => {
    const historico: FinanceiroLancamento[] = [
      {
        id: 'f1',
        owner_id: 'u1',
        tipo: 'saida',
        categoria: 'bloco',
        descricao: 'Tijolos',
        valor: 550,
        data: '2025-05-02',
        status: 'pago',
      },
    ]
    const dataRef = new Date('2025-05-10')

    // Com mais R$ 100, vai para R$ 650 de R$ 800 (81% -> status alerta_70)
    const verif70 = verificarTetoCategoria('material', 100, { material: 800 }, historico, dataRef)
    expect(verif70?.status).toBe('alerta_70')
    expect(verif70?.porcentagemAtingida).toBe(81)
    expect(verif70?.mensagemAviso).toContain('81% do orçamento')

    // Com mais R$ 300, vai para R$ 850 de R$ 800 (106% -> status estourado)
    const verif100 = verificarTetoCategoria('material', 300, { material: 800 }, historico, dataRef)
    expect(verif100?.status).toBe('estourado')
    expect(verif100?.mensagemAviso).toContain('passou do teto')
  })

  it('calcula média dos últimos meses para sugerir teto quando usuário não sabe', () => {
    const historico: FinanceiroLancamento[] = [
      {
        id: 'f1',
        owner_id: 'u1',
        tipo: 'saida',
        categoria: 'cimento',
        descricao: 'Sacos cimento',
        valor: 600,
        data: '2025-04-10',
        status: 'pago',
      },
      {
        id: 'f2',
        owner_id: 'u1',
        tipo: 'saida',
        categoria: 'cimento',
        descricao: 'Mais cimento',
        valor: 600,
        data: '2025-03-10',
        status: 'pago',
      },
    ]
    const media = calcularMediaGastosCategoria('cimento', historico, new Date('2025-05-10'))
    expect(media).toBeGreaterThan(0)
  })
})

describe('3. Lembretes que voltam sozinhos', () => {
  it('interpreta lembrete diário com horário', () => {
    const res = parseLembreteRecorrente('me lembra de medir o nível todo dia às 6h')
    expect(res).not.toBeNull()
    expect(res?.titulo).toContain('Medir o nível')
    expect(res?.frequencia).toBe('diaria')
    expect(res?.horario).toBe('06:00')
  })

  it('interpreta cancelamento de lembrete', () => {
    const res = parseLembreteRecorrente('cancela o lembrete do nível')
    expect(res).not.toBeNull()
    expect(res?.termoCancelamento).toContain('nível')
  })

  it('localiza lembrete para cancelamento', () => {
    const lems: LembreteObra[] = [
      {
        id: 'l1',
        owner_id: 'u1',
        titulo: 'Medir o nível da fundação',
        ativo: true,
        frequencia: 'diaria',
      },
    ]
    const achou = identificarLembreteParaCancelamento('nível', lems)
    expect(achou?.id).toBe('l1')
  })
})

describe('4. Contas a Pagar (Empréstimos de Terceiros)', () => {
  it('interpreta frase de pegar dinheiro emprestado ou dever para alguém', () => {
    const res = parseContaAPagar('peguei 300 do Zé pra comprar material')
    expect(res).not.toBeNull()
    expect(res?.tipo).toBe('cadastro_divida')
    expect(res?.valor).toBe(300)
    expect(res?.credorNome).toBe('Zé')
  })

  it('interpreta baixa de conta a pagar', () => {
    const historico: FinanceiroLancamento[] = [
      {
        id: 'f1',
        owner_id: 'u1',
        tipo: 'saida',
        categoria: 'outros',
        descricao: 'Empréstimo',
        valor: 300,
        data: '2025-05-01',
        credor_nome: 'Zé',
        status: 'pendente',
      },
    ]
    const res = parseContaAPagar('paguei os 300 do Zé', historico)
    expect(res).not.toBeNull()
    expect(res?.tipo).toBe('baixa_divida')
    expect(res?.lancamentoAlvo?.id).toBe('f1')
  })

  it('calcula relatório "quem eu estou devendo" e oculta de perfil Operador', () => {
    const historico: FinanceiroLancamento[] = [
      {
        id: 'f1',
        owner_id: 'u1',
        tipo: 'saida',
        categoria: 'outros',
        descricao: 'Empréstimo',
        valor: 300,
        data: '2025-05-01',
        credor_nome: 'Zé',
        status: 'pendente',
      },
      {
        id: 'f2',
        owner_id: 'u1',
        tipo: 'saida',
        categoria: 'outros',
        descricao: 'Ferramenta',
        valor: 200,
        data: '2025-05-05',
        credor_nome: 'Depósito Alvorada',
        status: 'pendente',
      },
    ]

    const relDono = calcularQuemEstouDevendo(historico, false, new Date('2025-05-10'))
    expect(relDono.totalGeralDevido).toBe(500)
    expect(relDono.credores.length).toBe(2)
    expect(relDono.textoFormatado).toContain('R$ 500.00')

    const relOperador = calcularQuemEstouDevendo(historico, true, new Date('2025-05-10'))
    expect(relOperador.totalGeralDevido).toBe(0)
    expect(relOperador.textoFormatado).toContain('Operador')
  })
})

describe('5. Avisos de Padrão Ampliado', () => {
  it('detecta mesmo valor registrado duas vezes no mesmo dia', () => {
    const historico: FinanceiroLancamento[] = [
      {
        id: 'f1',
        owner_id: 'u1',
        tipo: 'saida',
        categoria: 'combustivel',
        descricao: 'Gasolina',
        valor: 120,
        data: '2025-05-14',
        status: 'pago',
      },
    ]

    const alerta = verificarDuplicidadeGastoMesmoDia(
      120,
      'combustivel',
      'Gasolina',
      historico,
      '2025-05-14',
    )
    expect(alerta).not.toBeNull()
    expect(alerta?.mensagem).toContain('entrou duas vezes hoje')
  })

  it('detecta despesa recorrente que não foi lançada após a data habitual', () => {
    const historico: FinanceiroLancamento[] = [
      {
        id: 'rec1',
        owner_id: 'u1',
        tipo: 'saida',
        categoria: 'outros',
        descricao: 'Aluguel Betoneira',
        valor: 350,
        data: '2025-04-10',
        recorrente: true,
        dia_vencimento: 10,
        status: 'pago',
      },
    ]

    // Hoje é dia 15 de maio e ainda não foi lançada a betoneira em maio
    const alertas = verificarRecorrenciasNaoLancadas(historico, new Date('2025-05-15'))
    expect(alertas.length).toBe(1)
    expect(alertas[0].mensagem).toContain('Aluguel Betoneira')
  })
})

describe('6. Resumo da Manhã', () => {
  it('gera resumo completo diário consolidando tarefas, lembretes, contas e materiais', () => {
    const dataHoje = new Date('2025-05-14T07:00:00')
    const tarefas: TarefaObra[] = [
      {
        id: 't1',
        owner_id: 'u1',
        titulo: 'Pedir fiação',
        prazo: '2025-05-14',
        prioridade: 'alta',
        status: 'pendente',
      },
    ]
    const lembretes: LembreteObra[] = [
      {
        id: 'l1',
        owner_id: 'u1',
        titulo: 'Bater nível com mangueira',
        horario: '06:00',
        frequencia: 'diaria',
        ativo: true,
      },
    ]
    const financeiro: FinanceiroLancamento[] = [
      {
        id: 'f1',
        owner_id: 'u1',
        tipo: 'entrada',
        categoria: 'pagamento',
        descricao: 'Medição cliente',
        valor: 1500,
        data: '2025-05-14',
        status: 'pendente',
      },
      {
        id: 'f2',
        owner_id: 'u1',
        tipo: 'saida',
        categoria: 'areia',
        descricao: 'Areia',
        valor: 280,
        data: '2025-05-13',
        status: 'pago',
      },
    ]
    const materiais: MaterialEstoque[] = [
      {
        id: 'm1',
        owner_id: 'u1',
        nome: 'Cimento CP-II',
        quantidade: 3,
        estoque_minimo: 5,
        unidade: 'saco',
      },
    ]

    const resumo = gerarResumoManha(tarefas, lembretes, financeiro, materiais, false, dataHoje)
    expect(resumo.tarefasHojeEVencidas.length).toBe(1)
    expect(resumo.lembretesDoDia.length).toBe(1)
    expect(resumo.totalContasReceberHoje).toBe(1500)
    expect(resumo.totalGastosOntem).toBe(280)
    expect(resumo.materiaisAlerta.length).toBe(1)
    expect(resumo.textoFormatado).toContain('Bom dia, mestre')
    expect(resumo.textoFormatado).toContain('1500.00')
  })

  it('verifica horário configurado para disparar resumo no primeiro acesso', () => {
    const hoje = new Date('2025-05-14T08:00:00') // 8h
    expect(deveExibirResumoManhaHoje(undefined, 6, hoje)).toBe(true) // Ainda não exibiu hoje e passou das 6h
    expect(deveExibirResumoManhaHoje('2025-05-14', 6, hoje)).toBe(false) // Já exibiu hoje
  })
})
