/// <reference path="../pb_data/types.d.ts" />
// pocketbase/migrations/0015_equipes_e_autoria.js
// 1. Cria coleção 'equipe_membros' para os operadores vinculados à conta do Dono (Plano Empresa)
// 2. Adiciona campos de autoria e conta compartilhada nos registros:
//    - 'criado_por_nome' e 'criado_por_id' em diario_obra, financeiro, materiais_estoque, tarefas_obra, documentos
// 3. Adiciona campo 'dono_id' na coleção users para vincular contas de operadores diretamente ao seu Dono

migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const usersId = usersCol.id
    const obrasCol = app.findCollectionByNameOrId('obras')

    // 1. Adicionar campo 'dono_id' em users para operadores vinculados
    if (!usersCol.fields.getByName('dono_id')) {
      usersCol.fields.add(
        new RelationField({
          name: 'dono_id',
          type: 'relation',
          collectionId: usersId,
          maxSelect: 1,
          required: false,
          cascadeDelete: false,
        }),
      )
      app.save(usersCol)
    }

    // 2. Criar coleção 'equipe_membros'
    try {
      app.findCollectionByNameOrId('equipe_membros')
    } catch (_) {
      const equipeCol = new Collection({
        name: 'equipe_membros',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (owner_id = @request.auth.id || operador_user_id = @request.auth.id)",
        viewRule:
          "@request.auth.id != '' && (owner_id = @request.auth.id || operador_user_id = @request.auth.id)",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && owner_id = @request.auth.id",
        deleteRule: "@request.auth.id != '' && owner_id = @request.auth.id",
        fields: [
          {
            name: 'owner_id',
            type: 'relation',
            required: true,
            collectionId: usersId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'operador_user_id',
            type: 'relation',
            required: false,
            collectionId: usersId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'nome', type: 'text', required: true },
          { name: 'email', type: 'email', required: false },
          { name: 'telefone', type: 'text', required: false },
          {
            name: 'cargo',
            type: 'select',
            required: false,
            values: ['operador', 'encarregado', 'pedreiro', 'ajudante'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: false,
            values: ['ativo', 'convidado', 'inativo'],
            maxSelect: 1,
          },
          {
            name: 'obras_permitidas',
            type: 'relation',
            required: false,
            collectionId: obrasCol.id,
            cascadeDelete: false,
            maxSelect: 50,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_equipe_owner ON equipe_membros (owner_id)',
          'CREATE INDEX idx_equipe_operador ON equipe_membros (operador_user_id)',
        ],
      })
      app.save(equipeCol)
    }

    // 3. Adicionar campos 'criado_por_nome' e 'criado_por_id' nas coleções de registros diários e operacionais
    const colecoesAlvo = [
      'diario_obra',
      'financeiro',
      'materiais_estoque',
      'tarefas_obra',
      'documentos',
    ]
    for (const nomeCol of colecoesAlvo) {
      try {
        const col = app.findCollectionByNameOrId(nomeCol)
        let alterou = false
        if (!col.fields.getByName('criado_por_nome')) {
          col.fields.add(
            new TextField({
              name: 'criado_por_nome',
              type: 'text',
              required: false,
            }),
          )
          alterou = true
        }
        if (!col.fields.getByName('criado_por_id')) {
          col.fields.add(
            new TextField({
              name: 'criado_por_id',
              type: 'text',
              required: false,
            }),
          )
          alterou = true
        }
        if (alterou) {
          app.save(col)
        }
      } catch (_) {}
    }
  },
  (app) => {
    try {
      const equipeCol = app.findCollectionByNameOrId('equipe_membros')
      app.delete(equipeCol)
    } catch (_) {}

    const colecoesAlvo = [
      'diario_obra',
      'financeiro',
      'materiais_estoque',
      'tarefas_obra',
      'documentos',
    ]
    for (const nomeCol of colecoesAlvo) {
      try {
        const col = app.findCollectionByNameOrId(nomeCol)
        const f1 = col.fields.getByName('criado_por_nome')
        if (f1) col.fields.remove(f1)
        const f2 = col.fields.getByName('criado_por_id')
        if (f2) col.fields.remove(f2)
        app.save(col)
      } catch (_) {}
    }
  },
)
