// pocketbase/migrations/0006_seed_commercial_demo.js
migrate(
  (app) => {
    // Busca usuário admin
    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'jaocarloss@gmail.com')
    } catch (_) {
      return
    }

    // Cria alguns usuários clientes do software de teste se não existirem
    const clientesSaaS = [
      {
        email: 'marcos.empreiteiro@gmail.com',
        name: 'Marcos Vinicius Empreiteiro',
        status_conta: 'ativo',
        plano: 'profissional',
        ciclo: 'mensal',
        valor: 149.0,
        origem: 'direta',
        forma: 'pix',
      },
      {
        email: 'renata.arquiteta@gmail.com',
        name: 'Renata Albuquerque Arquitetura',
        status_conta: 'trial',
        plano: 'empresa',
        ciclo: 'anual',
        valor: 1788.0,
        origem: 'internet',
        forma: 'cartao_credito',
      },
      {
        email: 'lucas.reformas@hotmail.com',
        name: 'Lucas Reformas Rápidas',
        status_conta: 'bloqueado_inadimplencia',
        plano: 'profissional',
        ciclo: 'mensal',
        valor: 149.0,
        origem: 'direta',
        forma: 'boleto',
        motivo: 'Mensalidade vencida há mais de 15 dias sem regularização',
      },
    ]

    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const assinaturasCol = app.findCollectionByNameOrId('assinaturas')
    const faturasCol = app.findCollectionByNameOrId('faturas_venda')
    const auditCol = app.findCollectionByNameOrId('auditoria_admin')

    const now = new Date()
    const hojeStr = now.toISOString().slice(0, 10)
    const proximoMes = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    for (const c of clientesSaaS) {
      let uRecord
      try {
        uRecord = app.findAuthRecordByEmail('_pb_users_auth_', c.email)
      } catch (_) {
        uRecord = new Record(usersCol)
        uRecord.setEmail(c.email)
        uRecord.setPassword('Skip@Pass123')
        uRecord.setVerified(true)
        uRecord.set('name', c.name)
        uRecord.set('perfil', 'dono')
        uRecord.set('status_conta', c.status_conta)
        if (c.motivo) {
          uRecord.set('motivo_bloqueio', c.motivo)
          uRecord.set('bloqueado_em', hojeStr)
          uRecord.set('bloqueado_por_nome', 'João Carlos Mestre de Obras')
        }
        app.save(uRecord)
      }

      // Cria assinatura para o cliente se ainda não tiver
      try {
        app.findFirstRecordByData('assinaturas', 'user_id', uRecord.id)
      } catch (_) {
        const ass = new Record(assinaturasCol)
        ass.set('user_id', uRecord.id)
        ass.set('plano', c.plano)
        ass.set('ciclo', c.ciclo)
        ass.set('valor_recorrente', c.valor)
        ass.set('status', c.status_conta)
        ass.set('origem', c.origem)
        ass.set('data_inicio', hojeStr)
        ass.set('proximo_vencimento', proximoMes)
        if (c.status_conta.startsWith('bloqueado')) {
          ass.set('bloqueio_manual', c.status_conta === 'bloqueado_manual')
          ass.set('motivo_bloqueio', c.motivo || 'Bloqueio administrativo')
          ass.set('bloqueado_em', hojeStr)
          ass.set('bloqueado_por_id', adminUser.id)
          ass.set('bloqueado_por_nome', adminUser.getString('name') || 'Admin')
        }
        app.save(ass)

        // Cria fatura
        const fat = new Record(faturasCol)
        fat.set('user_id', uRecord.id)
        fat.set('assinatura_id', ass.id)
        fat.set('descricao', `Assinatura Plano ${c.plano.toUpperCase()} (${c.ciclo})`)
        fat.set('valor', c.valor)
        fat.set('status', c.status_conta === 'bloqueado_inadimplencia' ? 'atrasado' : 'pago')
        fat.set('origem', c.origem)
        fat.set('forma_pagamento', c.forma)
        fat.set('data_vencimento', hojeStr)
        if (c.status_conta !== 'bloqueado_inadimplencia') {
          fat.set('data_pagamento', hojeStr)
        }
        fat.set(
          'observacoes',
          c.origem === 'direta'
            ? 'Venda Direta (fora do gateway online)'
            : 'Gateway Online (Simulado)',
        )
        app.save(fat)
      }
    }

    // Registra auditoria inicial se vazia
    try {
      const auditCount = app.countRecords('auditoria_admin')
      if (auditCount === 0) {
        const audit = new Record(auditCol)
        audit.set('admin_id', adminUser.id)
        audit.set('admin_nome', adminUser.getString('name') || 'Administrador')
        audit.set('alvo_user_id', adminUser.id)
        audit.set('alvo_user_nome', 'Sistema')
        audit.set('alvo_user_email', adminUser.getString('email'))
        audit.set('acao', 'atualizar_plano')
        audit.set('motivo', 'Inicialização do módulo de Gestão Comercial do Ajudante IA')
        audit.set('ip', '127.0.0.1')
        app.save(audit)
      }
    } catch (_) {}
  },
  (app) => {
    // down rollback
  },
)
