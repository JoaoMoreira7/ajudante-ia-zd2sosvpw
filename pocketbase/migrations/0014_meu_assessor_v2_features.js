/// <reference path="../pb_data/types.d.ts" />
// pocketbase/migrations/0014_meu_assessor_v2_features.js
// 1. Cria coleção 'tarefas_obra' para recados que viram tarefas com prazo e prioridade
// 2. Cria coleção 'lembretes_obra' para lembretes com frequência e repetição
// 3. Adiciona campo 'teto_categorias' e 'resumo_manha_hora' na coleção 'configuracoes'
// 4. Adiciona campo 'credor_nome' na coleção 'financeiro' (para contas a pagar / empréstimos de terceiros)
// 5. Atualiza o agente 'ajudante-ia' mantendo o prompt enxuto e ágil

migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const obrasCol = app.findCollectionByNameOrId('obras')

    // 1. Coleção 'tarefas_obra'
    try {
      app.findCollectionByNameOrId('tarefas_obra')
    } catch (_) {
      const tarefasCol = new Collection({
        name: 'tarefas_obra',
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
            collectionId: usersCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'obra_id',
            type: 'relation',
            required: false,
            collectionId: obrasCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'titulo', type: 'text', required: true },
          { name: 'descricao', type: 'text', required: false },
          { name: 'prazo', type: 'text', required: false }, // ISO date ou yyyy-mm-dd
          {
            name: 'prioridade',
            type: 'select',
            required: false,
            values: ['baixa', 'media', 'alta', 'urgente'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: false,
            values: ['pendente', 'concluida', 'cancelada'],
            maxSelect: 1,
          },
          { name: 'origem_fala', type: 'text', required: false },
          { name: 'concluida_em', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_tarefas_owner ON tarefas_obra (owner_id)',
          'CREATE INDEX idx_tarefas_status ON tarefas_obra (status)',
        ],
      })
      app.save(tarefasCol)
    }

    // 2. Coleção 'lembretes_obra'
    try {
      app.findCollectionByNameOrId('lembretes_obra')
    } catch (_) {
      const lembretesCol = new Collection({
        name: 'lembretes_obra',
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
            collectionId: usersCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'titulo', type: 'text', required: true },
          { name: 'horario', type: 'text', required: false }, // ex: "06:00", "08:00"
          {
            name: 'frequencia',
            type: 'select',
            required: false,
            values: ['uma_vez', 'diaria', 'semanal', 'mensal'],
            maxSelect: 1,
          },
          { name: 'dia_semana', type: 'number', required: false, min: 0, max: 6, onlyInt: true },
          { name: 'dia_mes', type: 'number', required: false, min: 1, max: 31, onlyInt: true },
          { name: 'proximo_disparo', type: 'text', required: false },
          { name: 'ativo', type: 'bool', required: false },
          { name: 'ultimo_disparo', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_lembretes_owner ON lembretes_obra (owner_id)'],
      })
      app.save(lembretesCol)
    }

    // 3. Atualizar coleção 'configuracoes'
    const configCol = app.findCollectionByNameOrId('configuracoes')
    if (!configCol.fields.getByName('teto_categorias')) {
      configCol.fields.add(
        new JSONField({
          name: 'teto_categorias',
          type: 'json',
          required: false,
        }),
      )
    }
    if (!configCol.fields.getByName('resumo_manha_hora')) {
      configCol.fields.add(
        new NumberField({
          name: 'resumo_manha_hora',
          type: 'number',
          min: 4,
          max: 12,
          onlyInt: true,
          required: false,
        }),
      )
    }
    if (!configCol.fields.getByName('ultimo_resumo_manha_data')) {
      configCol.fields.add(
        new TextField({
          name: 'ultimo_resumo_manha_data',
          type: 'text',
          required: false,
        }),
      )
    }
    app.save(configCol)

    // 4. Atualizar coleção 'financeiro' com credor_nome (para contas a pagar / "devo 300 pro Zé")
    const finCol = app.findCollectionByNameOrId('financeiro')
    if (!finCol.fields.getByName('credor_nome')) {
      finCol.fields.add(
        new TextField({
          name: 'credor_nome',
          type: 'text',
          required: false,
        }),
      )
    }
    app.save(finCol)

    // 5. Atualizar agente 'ajudante-ia'
    $ai.agents.define(app, {
      slug: 'ajudante-ia',
      name: 'Ajudante IA',
      description:
        'Ajudante experiente de obra que conversa no WhatsApp de forma humana, natural e precisa.',
      tier: 'fast',
      systemPrompt: `Você é o AJUDANTE IA: converse no WhatsApp de forma 100% natural, calorosa e direta, como um mestre de obras/parceiro experiente no Brasil. Respostas curtas (1 a 3 frases no WhatsApp).

REGRAS INVIOLÁVEIS:
1. REGRA DE OURO: Você NUNCA calcula nem inventa números. Extraia intenção e medidas para o motor local calcular.
2. OPERADOR: Se o usuário for perfil Operador, NUNCA revele valores financeiros, custos, dívidas ou saldo.
3. CONFIRMAÇÕES: Operações financeiras >= R$ 1.000 ou exclusões exigem confirmação clara ("Sim/Confirmar" ou "Cancelar").
4. JARGÕES: bardame/bar d'água -> baldrame; bater nível mangueira -> Nivelamento Hidráulico; bater traço -> Preparação de Argamassa/Concreto.

RECURSOS MEU ASSESSOR ADAPTADOS À OBRA:
- RECADO VIRA TAREFA: "pedir pro eletricista chegar sexta", "comprar tela pra janela até quinta" -> extraia tarefa com prazo e prioridade.
- TETO POR CATEGORIA: "define orçamento de 800 por mês pra material" -> extraia categoria e teto mensal.
- LEMBRETES QUE VOLTAM: "me lembra de medir o nível todo dia às 6h", "não me deixa esquecer de ligar pro fornecedor amanhã" -> extraia frequência e horário.
- CONTA A PAGAR / EMPRÉSTIMO: "peguei 300 do Zé pra material", "devo 300 pro Zé" -> conta a pagar; "quem eu estou devendo?" -> lista dívidas; "paguei os 300 do Zé" -> baixa.
- DUPLICIDADE E PADRÕES: se o mesmo valor entrar duas vezes no mesmo dia ou aluguel fixo não cair, avise como parceiro sem bronca.
- RESUMO DA MANHÃ: "resumo do dia" ou "bom dia" -> tarefas de hoje, lembretes, contas e materiais.

AÇÕES NO APP (INTENT_JSON):
Quando houver ação executável pelo app, coloque ao final, em linha separada:
INTENT_JSON:{"actions":[...]} ou INTENT_JSON:{"intent":"...","params":{...}}`,
      tools: [
        { collection: 'clientes', perms: { list: true, read: true } },
        { collection: 'obras', perms: { list: true, read: true } },
        {
          collection: 'materiais_estoque',
          perms: { list: true, read: true, create: true, update: true },
        },
        { collection: 'diario_obra', perms: { list: true, read: true, create: true } },
        {
          collection: 'financeiro',
          perms: { list: true, read: true, create: true, update: true },
        },
        {
          collection: 'configuracoes',
          perms: { list: true, read: true, update: true },
        },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: "Ajudante IA com tarefas por voz, teto por categoria, lembretes recorrentes, contas a pagar ('quem eu estou devendo'), detecção de duplicidade de gasto e resumo da manhã às 6h.",
          },
        },
      ],
    })
  },
  (app) => {
    try {
      const tarefasCol = app.findCollectionByNameOrId('tarefas_obra')
      app.delete(tarefasCol)
    } catch (_) {}
    try {
      const lembretesCol = app.findCollectionByNameOrId('lembretes_obra')
      app.delete(lembretesCol)
    } catch (_) {}
  },
)
