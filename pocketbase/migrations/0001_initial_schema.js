// pocketbase/migrations/0001_initial_schema.js
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const usersId = usersCol.id

    // 1. clientes
    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.owner_id = @request.auth.id",
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
        { name: 'nome', type: 'text', required: true, min: 1 },
        { name: 'telefone', type: 'text' },
        { name: 'whatsapp', type: 'text' },
        { name: 'endereco', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_clientes_owner ON clientes (owner_id)',
        'CREATE INDEX idx_clientes_nome ON clientes (nome)',
      ],
    })
    app.save(clientes)
    const clientesId = clientes.id

    // 2. obras
    const obras = new Collection({
      name: 'obras',
      type: 'base',
      listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.owner_id = @request.auth.id",
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
          collectionId: clientesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text' },
        { name: 'endereco', type: 'text' },
        { name: 'data_inicio', type: 'date' },
        { name: 'previsao_termino', type: 'date' },
        { name: 'valor_contratado', type: 'number' },
        { name: 'valor_recebido', type: 'number' },
        { name: 'valor_pendente', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['em_andamento', 'orcada', 'concluida', 'parada'],
          maxSelect: 1,
        },
        { name: 'etapas', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_obras_owner ON obras (owner_id)',
        'CREATE INDEX idx_obras_cliente ON obras (cliente_id)',
        'CREATE INDEX idx_obras_status ON obras (status)',
      ],
    })
    app.save(obras)
    const obrasId = obras.id

    // 3. orcamentos
    const orcamentos = new Collection({
      name: 'orcamentos',
      type: 'base',
      listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.owner_id = @request.auth.id",
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
          collectionId: clientesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'obra_id',
          type: 'relation',
          collectionId: obrasId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text' },
        { name: 'itens', type: 'json' },
        { name: 'subtotal', type: 'number' },
        { name: 'desconto', type: 'number' },
        { name: 'total', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: [
            'criado',
            'enviado',
            'aguardando_resposta',
            'aprovado',
            'recusado',
            'em_execucao',
            'concluido',
          ],
          maxSelect: 1,
        },
        { name: 'sinal', type: 'number' },
        { name: 'parcelas', type: 'json' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_orcamentos_owner ON orcamentos (owner_id)',
        'CREATE INDEX idx_orcamentos_cliente ON orcamentos (cliente_id)',
        'CREATE INDEX idx_orcamentos_status ON orcamentos (status)',
      ],
    })
    app.save(orcamentos)

    // 4. financeiro
    const financeiro = new Collection({
      name: 'financeiro',
      type: 'base',
      listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.owner_id = @request.auth.id",
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
          name: 'obra_id',
          type: 'relation',
          collectionId: obrasId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['entrada', 'saida'],
          maxSelect: 1,
        },
        {
          name: 'categoria',
          type: 'select',
          values: [
            'pagamento',
            'sinal',
            'parcela',
            'recebimento',
            'cimento',
            'areia',
            'bloco',
            'combustivel',
            'ferramenta',
            'alimentacao',
            'ajudante',
            'transporte',
            'outros',
          ],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text' },
        { name: 'valor', type: 'number', required: true },
        { name: 'data', type: 'date' },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'pago', 'vencido'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fin_owner ON financeiro (owner_id)',
        'CREATE INDEX idx_fin_tipo ON financeiro (tipo)',
        'CREATE INDEX idx_fin_data ON financeiro (data)',
      ],
    })
    app.save(financeiro)

    // 5. materiais_estoque
    const materiaisEstoque = new Collection({
      name: 'materiais_estoque',
      type: 'base',
      listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.owner_id = @request.auth.id",
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
        { name: 'nome', type: 'text', required: true },
        { name: 'quantidade', type: 'number' },
        {
          name: 'unidade',
          type: 'select',
          values: ['saco', 'un', 'kg', 'L', 'm2'],
          maxSelect: 1,
        },
        { name: 'preco', type: 'number' },
        { name: 'fornecedor', type: 'text' },
        { name: 'estoque_minimo', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_materiais_owner ON materiais_estoque (owner_id)',
        'CREATE INDEX idx_materiais_nome ON materiais_estoque (nome)',
      ],
    })
    app.save(materiaisEstoque)

    // 6. diario_obra
    const diarioObra = new Collection({
      name: 'diario_obra',
      type: 'base',
      listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.owner_id = @request.auth.id",
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
          name: 'obra_id',
          type: 'relation',
          collectionId: obrasId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'data', type: 'date' },
        { name: 'servico', type: 'text' },
        { name: 'quantidade', type: 'number' },
        { name: 'material', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_diario_owner ON diario_obra (owner_id)',
        'CREATE INDEX idx_diario_obra ON diario_obra (obra_id)',
      ],
    })
    app.save(diarioObra)

    // 7. documentos
    const documentos = new Collection({
      name: 'documentos',
      type: 'base',
      listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.owner_id = @request.auth.id",
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
          name: 'obra_id',
          type: 'relation',
          collectionId: obrasId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          values: [
            'orcamento',
            'recibo',
            'ordem_servico',
            'relatorio',
            'lista_materiais',
            'resumo_financeiro',
            'foto',
            'outro',
          ],
          maxSelect: 1,
        },
        {
          name: 'arquivo',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        },
        { name: 'descricao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_documentos_owner ON documentos (owner_id)'],
    })
    app.save(documentos)

    // 8. sync_queue
    const syncQueue = new Collection({
      name: 'sync_queue',
      type: 'base',
      listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.owner_id = @request.auth.id",
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
        { name: 'entidade', type: 'text', required: true },
        { name: 'entidade_id', type: 'text', required: true },
        {
          name: 'operacao',
          type: 'select',
          required: true,
          values: ['create', 'update', 'delete'],
          maxSelect: 1,
        },
        { name: 'payload', type: 'json' },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'processado', 'erro'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sync_owner ON sync_queue (owner_id)',
        'CREATE INDEX idx_sync_status ON sync_queue (status)',
      ],
    })
    app.save(syncQueue)

    // 9. configuracoes
    const configuracoes = new Collection({
      name: 'configuracoes',
      type: 'base',
      listRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner_id = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.owner_id = @request.auth.id",
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
          name: 'modo',
          type: 'select',
          values: ['simples', 'profissional', 'economico'],
          maxSelect: 1,
        },
        {
          name: 'fonte_tamanho',
          type: 'select',
          values: ['p', 'm', 'g'],
          maxSelect: 1,
        },
        { name: 'alto_contraste', type: 'bool' },
        { name: 'voz_respostas', type: 'bool' },
        {
          name: 'tema',
          type: 'select',
          values: ['claro', 'escuro'],
          maxSelect: 1,
        },
        { name: 'nome_profissional', type: 'text' },
        { name: 'nome_empresa', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_config_owner ON configuracoes (owner_id)'],
    })
    app.save(configuracoes)
  },
  (app) => {
    const collections = [
      'configuracoes',
      'sync_queue',
      'documentos',
      'diario_obra',
      'materiais_estoque',
      'financeiro',
      'orcamentos',
      'obras',
      'clientes',
    ]
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
