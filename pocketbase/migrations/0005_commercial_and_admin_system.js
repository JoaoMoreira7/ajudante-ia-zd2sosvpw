// pocketbase/migrations/0005_commercial_and_admin_system.js
migrate(
  (app) => {
    // 1. Atualizar campo perfil na coleção users para suportar 'admin'
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const existingPerfil = usersCol.fields.getByName('perfil')
    if (existingPerfil) {
      existingPerfil.values = ['admin', 'dono', 'operador']
    } else {
      usersCol.fields.add(
        new SelectField({
          name: 'perfil',
          values: ['admin', 'dono', 'operador'],
          maxSelect: 1,
        }),
      )
    }

    // Adicionar flag de status da conta em users
    if (!usersCol.fields.getByName('status_conta')) {
      usersCol.fields.add(
        new SelectField({
          name: 'status_conta',
          values: [
            'ativo',
            'trial',
            'atrasado',
            'bloqueado_manual',
            'bloqueado_inadimplencia',
            'cancelado',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!usersCol.fields.getByName('motivo_bloqueio')) {
      usersCol.fields.add(new TextField({ name: 'motivo_bloqueio' }))
    }

    if (!usersCol.fields.getByName('bloqueado_em')) {
      usersCol.fields.add(new TextField({ name: 'bloqueado_em' }))
    }

    if (!usersCol.fields.getByName('bloqueado_por_nome')) {
      usersCol.fields.add(new TextField({ name: 'bloqueado_por_nome' }))
    }

    if (!usersCol.fields.getByName('modulos_liberados')) {
      usersCol.fields.add(new JSONField({ name: 'modulos_liberados' }))
    }

    app.save(usersCol)

    // Garantir que o usuário principal seja 'admin'
    try {
      const adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'jaocarloss@gmail.com')
      adminUser.set('perfil', 'admin')
      adminUser.set('status_conta', 'ativo')
      app.save(adminUser)
    } catch (_) {}

    const usersId = usersCol.id

    // 2. Coleção de Notificações Internas (Sino do App)
    if (!app.hasTable('notificacoes_sistema')) {
      const notifCol = new Collection({
        name: 'notificacoes_sistema',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.perfil = 'admin')",
        viewRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.perfil = 'admin')",
        createRule: "@request.auth.id != ''",
        updateRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.perfil = 'admin')",
        deleteRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.perfil = 'admin')",
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: usersId,
            maxSelect: 1,
          },
          { name: 'titulo', type: 'text', required: true },
          { name: 'mensagem', type: 'text', required: true },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['bloqueio', 'liberacao', 'venda_ativada', 'fatura_vencida', 'aviso_geral'],
            maxSelect: 1,
          },
          { name: 'lida', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_notif_user ON notificacoes_sistema (user_id)'],
      })
      app.save(notifCol)
    }

    // 3. Coleção de Assinaturas (Planos do Ajudante IA)
    if (!app.hasTable('assinaturas')) {
      const assinaturasCol = new Collection({
        name: 'assinaturas',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.perfil = 'admin')",
        viewRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.perfil = 'admin')",
        createRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
        updateRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
        deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: usersId,
            maxSelect: 1,
          },
          {
            name: 'plano',
            type: 'select',
            required: true,
            values: ['gratuito', 'profissional', 'empresa'],
            maxSelect: 1,
          },
          {
            name: 'ciclo',
            type: 'select',
            required: true,
            values: ['mensal', 'trimestral', 'semestral', 'anual'],
            maxSelect: 1,
          },
          { name: 'valor_recorrente', type: 'number', min: 0 },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'ativo',
              'trial',
              'atrasado',
              'bloqueado_manual',
              'bloqueado_inadimplencia',
              'cancelado',
            ],
            maxSelect: 1,
          },
          {
            name: 'origem',
            type: 'select',
            required: true,
            values: ['direta', 'internet'],
            maxSelect: 1,
          },
          { name: 'data_inicio', type: 'text', required: true },
          { name: 'proximo_vencimento', type: 'text' },
          { name: 'bloqueio_manual', type: 'bool' },
          { name: 'motivo_bloqueio', type: 'text' },
          { name: 'bloqueado_em', type: 'text' },
          { name: 'bloqueado_por_id', type: 'text' },
          { name: 'bloqueado_por_nome', type: 'text' },
          { name: 'modulos_liberados', type: 'json' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_assinaturas_user ON assinaturas (user_id)',
          'CREATE INDEX idx_assinaturas_status ON assinaturas (status)',
          'CREATE INDEX idx_assinaturas_origem ON assinaturas (origem)',
        ],
      })
      app.save(assinaturasCol)
    }

    const assinaturasId = app.findCollectionByNameOrId('assinaturas').id

    // 4. Coleção de Faturas de Vendas
    if (!app.hasTable('faturas_venda')) {
      const faturasCol = new Collection({
        name: 'faturas_venda',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.perfil = 'admin')",
        viewRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.perfil = 'admin')",
        createRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
        updateRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
        deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: usersId,
            maxSelect: 1,
          },
          { name: 'assinatura_id', type: 'relation', collectionId: assinaturasId, maxSelect: 1 },
          { name: 'descricao', type: 'text', required: true },
          { name: 'valor', type: 'number', required: true, min: 0 },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['pago', 'pendente', 'atrasado', 'cancelado'],
            maxSelect: 1,
          },
          {
            name: 'origem',
            type: 'select',
            required: true,
            values: ['direta', 'internet'],
            maxSelect: 1,
          },
          {
            name: 'forma_pagamento',
            type: 'select',
            required: true,
            values: ['pix', 'dinheiro', 'boleto', 'transferencia', 'cartao_credito', 'outro'],
            maxSelect: 1,
          },
          { name: 'data_vencimento', type: 'text', required: true },
          { name: 'data_pagamento', type: 'text' },
          { name: 'comprovante_ref', type: 'text' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_faturas_user ON faturas_venda (user_id)',
          'CREATE INDEX idx_faturas_status ON faturas_venda (status)',
          'CREATE INDEX idx_faturas_origem ON faturas_venda (origem)',
        ],
      })
      app.save(faturasCol)
    }

    // 5. Coleção de Auditoria de Ações Administrativas
    if (!app.hasTable('auditoria_admin')) {
      const auditCol = new Collection({
        name: 'auditoria_admin',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
        viewRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
        createRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'admin_id',
            type: 'relation',
            required: true,
            collectionId: usersId,
            maxSelect: 1,
          },
          { name: 'admin_nome', type: 'text', required: true },
          {
            name: 'alvo_user_id',
            type: 'relation',
            required: true,
            collectionId: usersId,
            maxSelect: 1,
          },
          { name: 'alvo_user_nome', type: 'text' },
          { name: 'alvo_user_email', type: 'text' },
          {
            name: 'acao',
            type: 'select',
            required: true,
            values: ['bloquear', 'liberar', 'venda_direta', 'liberar_modulos', 'atualizar_plano'],
            maxSelect: 1,
          },
          { name: 'motivo', type: 'text' },
          { name: 'detalhes', type: 'json' },
          { name: 'ip', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_audit_admin ON auditoria_admin (admin_id)',
          'CREATE INDEX idx_audit_alvo ON auditoria_admin (alvo_user_id)',
          'CREATE INDEX idx_audit_acao ON auditoria_admin (acao)',
        ],
      })
      app.save(auditCol)
    }
  },
  (app) => {
    try {
      const faturasCol = app.findCollectionByNameOrId('faturas_venda')
      app.delete(faturasCol)
    } catch (_) {}

    try {
      const assinaturasCol = app.findCollectionByNameOrId('assinaturas')
      app.delete(assinaturasCol)
    } catch (_) {}

    try {
      const notifCol = app.findCollectionByNameOrId('notificacoes_sistema')
      app.delete(notifCol)
    } catch (_) {}

    try {
      const auditCol = app.findCollectionByNameOrId('auditoria_admin')
      app.delete(auditCol)
    } catch (_) {}
  },
)
