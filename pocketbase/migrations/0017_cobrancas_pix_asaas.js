/// <reference path="../pb_data/types.d.ts" />
// pocketbase/migrations/0017_cobrancas_pix_asaas.js
// Coleção de cobranças Pix geradas via Asaas com baixa automática idempotente

migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const usersId = usersCol.id
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const financeiroCol = app.findCollectionByNameOrId('financeiro')

    try {
      app.findCollectionByNameOrId('cobrancas_pix')
    } catch (_) {
      const cobrancasCol = new Collection({
        name: 'cobrancas_pix',
        type: 'base',
        listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
        viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
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
            name: 'cliente_id',
            type: 'relation',
            required: false,
            collectionId: clientesCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'financeiro_id',
            type: 'relation',
            required: false,
            collectionId: financeiroCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'cliente_nome', type: 'text', required: true },
          { name: 'valor', type: 'number', required: true },
          { name: 'descricao', type: 'text', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'CANCELLED'],
            maxSelect: 1,
          },
          { name: 'asaas_payment_id', type: 'text', required: false },
          { name: 'asaas_customer_id', type: 'text', required: false },
          { name: 'pix_copia_e_cola', type: 'text', required: false },
          { name: 'pix_qr_code_base64', type: 'text', required: false },
          { name: 'pix_expiracao', type: 'text', required: false },
          { name: 'invoice_url', type: 'text', required: false },
          { name: 'pago_em', type: 'text', required: false },
          { name: 'webhook_event_id', type: 'text', required: false },
          { name: 'criado_por_nome', type: 'text', required: false },
          { name: 'criado_por_id', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cobrancas_pix_owner ON cobrancas_pix (owner_id)',
          'CREATE INDEX idx_cobrancas_pix_asaas ON cobrancas_pix (asaas_payment_id)',
          'CREATE INDEX idx_cobrancas_pix_status ON cobrancas_pix (status)',
        ],
      })
      app.save(cobrancasCol)
    }

    // Adiciona campo opcional asaas_cobranca_id em financeiro para vinculação bidirecional
    try {
      const fin = app.findCollectionByNameOrId('financeiro')
      if (!fin.fields.getByName('asaas_cobranca_id')) {
        fin.fields.add(
          new TextField({
            name: 'asaas_cobranca_id',
            type: 'text',
            required: false,
          }),
        )
        app.save(fin)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('cobrancas_pix')
      app.delete(col)
    } catch (_) {}

    try {
      const fin = app.findCollectionByNameOrId('financeiro')
      const f = fin.fields.getByName('asaas_cobranca_id')
      if (f) {
        fin.fields.remove(f)
        app.save(fin)
      }
    } catch (_) {}
  },
)
