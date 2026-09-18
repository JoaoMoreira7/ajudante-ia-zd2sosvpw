// pocketbase/migrations/0003_seed_initial_data.js
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const obrasCol = app.findCollectionByNameOrId('obras')
    const orcamentosCol = app.findCollectionByNameOrId('orcamentos')
    const financeiroCol = app.findCollectionByNameOrId('financeiro')
    const materiaisCol = app.findCollectionByNameOrId('materiais_estoque')
    const diarioCol = app.findCollectionByNameOrId('diario_obra')
    const configCol = app.findCollectionByNameOrId('configuracoes')

    // 1. Seed user jaocarloss@gmail.com
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'jaocarloss@gmail.com')
    } catch (_) {
      userRecord = new Record(usersCol)
      userRecord.setEmail('jaocarloss@gmail.com')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'João Carlos Mestre de Obras')
      app.save(userRecord)
    }
    const userId = userRecord.id

    // 2. Configurações padrão
    try {
      app.findFirstRecordByData('configuracoes', 'owner_id', userId)
    } catch (_) {
      const config = new Record(configCol)
      config.set('owner_id', userId)
      config.set('modo', 'profissional')
      config.set('fonte_tamanho', 'm')
      config.set('alto_contraste', false)
      config.set('voz_respostas', true)
      config.set('tema', 'claro')
      config.set('nome_profissional', 'João Carlos Construtor')
      config.set('nome_empresa', 'JC Construções e Reformas')
      config.set('telefone', '(35) 99876-5432')
      app.save(config)
    }

    // 3. Clientes (2 amostras reais brasileiras)
    let cliente1, cliente2
    try {
      cliente1 = app.findFirstRecordByData('clientes', 'nome', 'Carlos Eduardo Silva')
    } catch (_) {
      cliente1 = new Record(clientesCol)
      cliente1.set('owner_id', userId)
      cliente1.set('nome', 'Carlos Eduardo Silva')
      cliente1.set('telefone', '(35) 98765-4321')
      cliente1.set('whatsapp', '5535987654321')
      cliente1.set('endereco', 'Rua das Flores, 142 - Monte Sião, MG')
      cliente1.set('observacoes', 'Construção da casa de campo. Prefere contato pelo WhatsApp.')
      app.save(cliente1)
    }

    try {
      cliente2 = app.findFirstRecordByData('clientes', 'nome', 'Dona Maria Oliveira')
    } catch (_) {
      cliente2 = new Record(clientesCol)
      cliente2.set('owner_id', userId)
      cliente2.set('nome', 'Dona Maria Oliveira')
      cliente2.set('telefone', '(35) 99123-8877')
      cliente2.set('whatsapp', '5535991238877')
      cliente2.set('endereco', 'Av. Central, 520, Bairro Jardim - Águas de Lindóia, SP')
      cliente2.set('observacoes', 'Reforma da cozinha, banheiro e troca de piso da sala.')
      app.save(cliente2)
    }

    // 4. Obras (2 amostras)
    let obra1, obra2
    try {
      obra1 = app.findFirstRecordByData('obras', 'titulo', 'Casa de Campo - Monte Sião')
    } catch (_) {
      obra1 = new Record(obrasCol)
      obra1.set('owner_id', userId)
      obra1.set('cliente_id', cliente1.id)
      obra1.set('titulo', 'Casa de Campo - Monte Sião')
      obra1.set('endereco', 'Rua das Flores, 142 - Monte Sião, MG')
      obra1.set('data_inicio', '2025-01-15 00:00:00.000Z')
      obra1.set('previsao_termino', '2025-06-30 00:00:00.000Z')
      obra1.set('valor_contratado', 45000)
      obra1.set('valor_recebido', 20000)
      obra1.set('valor_pendente', 25000)
      obra1.set('status', 'em_andamento')
      obra1.set('etapas', [
        { nome: 'Fundação e Alvenaria', concluida: true, progresso: 100 },
        { nome: 'Reboco e Contrapiso', concluida: false, progresso: 60 },
        { nome: 'Instalações e Telhado', concluida: false, progresso: 20 },
        { nome: 'Acabamentos e Pintura', concluida: false, progresso: 0 },
      ])
      app.save(obra1)
    }

    try {
      obra2 = app.findFirstRecordByData('obras', 'titulo', 'Reforma Cozinha e Banheiro')
    } catch (_) {
      obra2 = new Record(obrasCol)
      obra2.set('owner_id', userId)
      obra2.set('cliente_id', cliente2.id)
      obra2.set('titulo', 'Reforma Cozinha e Banheiro')
      obra2.set('endereco', 'Av. Central, 520 - Águas de Lindóia, SP')
      obra2.set('data_inicio', '2025-02-01 00:00:00.000Z')
      obra2.set('previsao_termino', '2025-03-20 00:00:00.000Z')
      obra2.set('valor_contratado', 18500)
      obra2.set('valor_recebido', 10000)
      obra2.set('valor_pendente', 8500)
      obra2.set('status', 'em_andamento')
      obra2.set('etapas', [
        { nome: 'Demolição e Limpeza', concluida: true, progresso: 100 },
        { nome: 'Encanamento e Elétrica', concluida: true, progresso: 100 },
        { nome: 'Assentamento de Porcelanato', concluida: false, progresso: 70 },
        { nome: 'Pintura final', concluida: false, progresso: 0 },
      ])
      app.save(obra2)
    }

    // 5. Orçamentos (3 amostras)
    try {
      app.findFirstRecordByData('orcamentos', 'titulo', 'Orçamento Alvenaria e Reboco - Carlos')
    } catch (_) {
      const orc1 = new Record(orcamentosCol)
      orc1.set('owner_id', userId)
      orc1.set('cliente_id', cliente1.id)
      orc1.set('obra_id', obra1.id)
      orc1.set('titulo', 'Orçamento Alvenaria e Reboco - Carlos')
      orc1.set('itens', [
        {
          descricao: 'Mão de obra alvenaria (120 m²)',
          quantidade: 120,
          unidade: 'm²',
          preco_unitario: 55,
          total: 6600,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Mão de obra reboco interno e externo (240 m²)',
          quantidade: 240,
          unidade: 'm²',
          preco_unitario: 35,
          total: 8400,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Argamassa e cimento para assentamento',
          quantidade: 40,
          unidade: 'saco',
          preco_unitario: 38,
          total: 1520,
          categoria: 'materiais',
        },
      ])
      orc1.set('subtotal', 16520)
      orc1.set('desconto', 520)
      orc1.set('total', 16000)
      orc1.set('status', 'em_execucao')
      orc1.set('sinal', 5000)
      orc1.set('parcelas', [
        { numero: 1, valor: 5000, vencimento: '2025-01-20', status: 'pago' },
        { numero: 2, valor: 5500, vencimento: '2025-02-20', status: 'pago' },
        { numero: 3, valor: 5500, vencimento: '2025-03-20', status: 'pendente' },
      ])
      orc1.set('observacoes', 'Materiais pesados por conta do cliente. Entrega conforme etapas.')
      app.save(orc1)
    }

    try {
      app.findFirstRecordByData(
        'orcamentos',
        'titulo',
        'Orçamento Troca de Piso e Azulejo - Dona Maria',
      )
    } catch (_) {
      const orc2 = new Record(orcamentosCol)
      orc2.set('owner_id', userId)
      orc2.set('cliente_id', cliente2.id)
      orc2.set('obra_id', obra2.id)
      orc2.set('titulo', 'Orçamento Troca de Piso e Azulejo - Dona Maria')
      orc2.set('itens', [
        {
          descricao: 'Colocação de piso porcelanato (45 m²)',
          quantidade: 45,
          unidade: 'm²',
          preco_unitario: 65,
          total: 2925,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Revestimento parede cozinha (28 m²)',
          quantidade: 28,
          unidade: 'm²',
          preco_unitario: 60,
          total: 1680,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Argamassa ACIII 20kg (12 sacos)',
          quantidade: 12,
          unidade: 'saco',
          preco_unitario: 42,
          total: 504,
          categoria: 'materiais',
        },
        {
          descricao: 'Rejunte epóxi (4 caixas)',
          quantidade: 4,
          unidade: 'cx',
          preco_unitario: 85,
          total: 340,
          categoria: 'materiais',
        },
      ])
      orc2.set('subtotal', 5449)
      orc2.set('desconto', 149)
      orc2.set('total', 5300)
      orc2.set('status', 'aprovado')
      orc2.set('sinal', 2000)
      orc2.set('parcelas', [
        { numero: 1, valor: 2000, vencimento: '2025-02-05', status: 'pago' },
        { numero: 2, valor: 3300, vencimento: '2025-03-05', status: 'pendente' },
      ])
      orc2.set('observacoes', 'Inclui nivelamento do contrapiso existente.')
      app.save(orc2)
    }

    try {
      app.findFirstRecordByData('orcamentos', 'titulo', 'Orçamento Muro de Fechamento')
    } catch (_) {
      const orc3 = new Record(orcamentosCol)
      orc3.set('owner_id', userId)
      orc3.set('cliente_id', cliente1.id)
      orc3.set('titulo', 'Orçamento Muro de Fechamento')
      orc3.set('itens', [
        {
          descricao: 'Muro em bloco de concreto 14x19x39 (35m lineares x 2,20m)',
          quantidade: 77,
          unidade: 'm²',
          preco_unitario: 70,
          total: 5390,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Sapata corrida e brocas a cada 2,5m',
          quantidade: 35,
          unidade: 'm',
          preco_unitario: 40,
          total: 1400,
          categoria: 'mão de obra',
        },
        {
          descricao: 'Chapisco e reboco paulista',
          quantidade: 154,
          unidade: 'm²',
          preco_unitario: 30,
          total: 4620,
          categoria: 'mão de obra',
        },
      ])
      orc3.set('subtotal', 11410)
      orc3.set('desconto', 410)
      orc3.set('total', 11000)
      orc3.set('status', 'aguardando_resposta')
      orc3.set('sinal', 3000)
      orc3.set('parcelas', [
        { numero: 1, valor: 3000, vencimento: '2025-04-01', status: 'pendente' },
        { numero: 2, valor: 4000, vencimento: '2025-05-01', status: 'pendente' },
        { numero: 3, valor: 4000, vencimento: '2025-06-01', status: 'pendente' },
      ])
      orc3.set('observacoes', 'Proposta válida por 15 dias corridos.')
      app.save(orc3)
    }

    // 6. Financeiro (4 lançamentos: 2 entradas, 2 saídas)
    try {
      app.findFirstRecordByData('financeiro', 'descricao', 'Sinal da Obra Casa de Campo')
    } catch (_) {
      const fin1 = new Record(financeiroCol)
      fin1.set('owner_id', userId)
      fin1.set('obra_id', obra1.id)
      fin1.set('tipo', 'entrada')
      fin1.set('categoria', 'sinal')
      fin1.set('descricao', 'Sinal da Obra Casa de Campo')
      fin1.set('valor', 5000)
      fin1.set('data', '2025-01-20 10:00:00.000Z')
      fin1.set('status', 'pago')
      app.save(fin1)
    }

    try {
      app.findFirstRecordByData('financeiro', 'descricao', 'Medição da primeira etapa alvenaria')
    } catch (_) {
      const fin2 = new Record(financeiroCol)
      fin2.set('owner_id', userId)
      fin2.set('obra_id', obra1.id)
      fin2.set('tipo', 'entrada')
      fin2.set('categoria', 'pagamento')
      fin2.set('descricao', 'Medição da primeira etapa alvenaria')
      fin2.set('valor', 3500)
      fin2.set('data', '2025-02-10 14:00:00.000Z')
      fin2.set('status', 'pago')
      app.save(fin2)
    }

    try {
      app.findFirstRecordByData('financeiro', 'descricao', 'Compra de cimento e areia lavada')
    } catch (_) {
      const fin3 = new Record(financeiroCol)
      fin3.set('owner_id', userId)
      fin3.set('obra_id', obra1.id)
      fin3.set('tipo', 'saida')
      fin3.set('categoria', 'cimento')
      fin3.set('descricao', 'Compra de cimento e areia lavada')
      fin3.set('valor', 1850)
      fin3.set('data', '2025-01-25 08:30:00.000Z')
      fin3.set('status', 'pago')
      app.save(fin3)
    }

    try {
      app.findFirstRecordByData('financeiro', 'descricao', 'Diária do Ajudante Tião (semana 1)')
    } catch (_) {
      const fin4 = new Record(financeiroCol)
      fin4.set('owner_id', userId)
      fin4.set('obra_id', obra1.id)
      fin4.set('tipo', 'saida')
      fin4.set('categoria', 'ajudante')
      fin4.set('descricao', 'Diária do Ajudante Tião (semana 1)')
      fin4.set('valor', 1350)
      fin4.set('data', '2025-02-01 17:00:00.000Z')
      fin4.set('status', 'pago')
      app.save(fin4)
    }

    // 7. Materiais de estoque (5 amostras com estoque mínimo)
    const materiaisExemplo = [
      {
        nome: 'Cimento CP II 50kg',
        quantidade: 14,
        unidade: 'saco',
        preco: 38.5,
        fornecedor: 'Depósito Alvorada',
        estoque_minimo: 10,
      },
      {
        nome: 'Areia Média Lavada',
        quantidade: 4,
        unidade: 'm2',
        preco: 140,
        fornecedor: 'Areeiro Rio Claro',
        estoque_minimo: 3,
      },
      {
        nome: 'Bloco Cerâmico 14x19x29',
        quantidade: 450,
        unidade: 'un',
        preco: 2.8,
        fornecedor: 'Olaria Paulistana',
        estoque_minimo: 500,
      },
      {
        nome: 'Argamassa AC-II 20kg',
        quantidade: 6,
        unidade: 'saco',
        preco: 27.9,
        fornecedor: 'Depósito Alvorada',
        estoque_minimo: 12,
      },
      {
        nome: 'Tinta Látex Branco Neve 18L',
        quantidade: 3,
        unidade: 'un',
        preco: 260,
        fornecedor: 'Tintas & Cores',
        estoque_minimo: 2,
      },
    ]

    for (const mat of materiaisExemplo) {
      try {
        app.findFirstRecordByData('materiais_estoque', 'nome', mat.nome)
      } catch (_) {
        const rec = new Record(materiaisCol)
        rec.set('owner_id', userId)
        rec.set('nome', mat.nome)
        rec.set('quantidade', mat.quantidade)
        rec.set('unidade', mat.unidade)
        rec.set('preco', mat.preco)
        rec.set('fornecedor', mat.fornecedor)
        rec.set('estoque_minimo', mat.estoque_minimo)
        app.save(rec)
      }
    }

    // 8. Diário de obra (3 registros)
    const diarioExemplos = [
      {
        data: '2025-02-12 16:30:00.000Z',
        servico: 'Alvenaria do quarto e sala',
        quantidade: 28,
        material: '280 blocos cerâmicos e 4 sacos de cimento',
        observacoes: 'Dia produtivo, tempo firme sem chuva.',
      },
      {
        data: '2025-02-13 16:45:00.000Z',
        servico: 'Chapisco e preparação para reboco',
        quantidade: 35,
        material: '3 sacos de cimento e 6 latas de areia grossa',
        observacoes: 'Paredes niveladas e prontas para emboço.',
      },
      {
        data: '2025-02-14 17:00:00.000Z',
        servico: 'Reboco paulista parede externa',
        quantidade: 30,
        material: '8 sacos de cimento e 1 caminhão pequeno de areia fina',
        observacoes: 'Feito com acabamento desempenado.',
      },
    ]

    for (const d of diarioExemplos) {
      try {
        app.findFirstRecordByData('diario_obra', 'servico', d.servico)
      } catch (_) {
        const rec = new Record(diarioCol)
        rec.set('owner_id', userId)
        rec.set('obra_id', obra1.id)
        rec.set('data', d.data)
        rec.set('servico', d.servico)
        rec.set('quantidade', d.quantidade)
        rec.set('material', d.material)
        rec.set('observacoes', d.observacoes)
        app.save(rec)
      }
    }
  },
  (app) => {
    // Revert idempotent
  },
)
