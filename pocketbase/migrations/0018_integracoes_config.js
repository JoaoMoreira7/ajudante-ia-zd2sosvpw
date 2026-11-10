/// <reference path="../pb_data/types.d.ts" />
// pocketbase/migrations/0018_integracoes_config.js
// Coleção de configurações de integração (chaves de API guardadas no servidor).
// A chave do Asaas é gravada SOMENTE aqui (campo oculto: nunca volta via API REST).
// Leitura/escrita apenas pelo Dono (perfil admin) através dos hooks de backend.

migrate(
  (app) => {
    // Regras: nenhuma regra REST direta (null = superuser only).
    // O Dono acessa os dados exclusivamente via hooks /backend/v1/asaas/*,
    // que validam e.auth.perfil === 'admin' antes de ler/gravar a chave.
    try {
      app.findCollectionByNameOrId('integracoes_config')
      return // já existe — não recria
    } catch (_) {}

    const col = new Collection({
      name: 'integracoes_config',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        // Chave única de configuração (ex: 'asaas')
        { name: 'chave', type: 'text', required: true },
        // Valor secreto — oculto: a API REST nunca devolve este campo
        { name: 'valor_secreto', type: 'text', required: false, hidden: true },
        // 'sandbox' | 'producao'
        {
          name: 'modo',
          type: 'select',
          required: false,
          values: ['sandbox', 'producao'],
          maxSelect: 1,
        },
        { name: 'conectado', type: 'bool', required: false },
        { name: 'ultima_validacao_em', type: 'text', required: false },
        { name: 'ultima_validacao_ok', type: 'bool', required: false },
        { name: 'atualizado_por_nome', type: 'text', required: false },
        { name: 'atualizado_por_id', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_integracoes_config_chave ON integracoes_config (chave)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('integracoes_config')
      app.delete(col)
    } catch (_) {}
  },
)
