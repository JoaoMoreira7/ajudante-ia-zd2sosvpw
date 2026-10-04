/// <reference path="../pb_data/types.d.ts" />
// pocketbase/migrations/0013_meu_assessor_features.js
// Adiciona campos de preferências conversacionais (apelido, tom, notas de contexto),
// suporte a recorrências e parcelas no financeiro,
// e atualiza o agente Skip Cloud 'ajudante-ia' com as novas diretrizes do Meu Assessor adaptadas à obra.

migrate(
  (app) => {
    // 1. Ampliar coleção 'configuracoes' com campos de personalização e memória
    const configCol = app.findCollectionByNameOrId('configuracoes')
    if (!configCol.fields.getByName('apelido_usuario')) {
      configCol.fields.add(
        new TextField({
          name: 'apelido_usuario',
          type: 'text',
          required: false,
        }),
      )
    }
    if (!configCol.fields.getByName('tom_conversa')) {
      configCol.fields.add(
        new SelectField({
          name: 'tom_conversa',
          type: 'select',
          values: ['padrao', 'curto', 'sem_emoji'],
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!configCol.fields.getByName('notas_contexto')) {
      configCol.fields.add(
        new JSONField({
          name: 'notas_contexto',
          type: 'json',
          required: false,
        }),
      )
    }
    app.save(configCol)

    // 2. Ampliar coleção 'financeiro' com parcelamento e recorrência
    const finCol = app.findCollectionByNameOrId('financeiro')
    if (!finCol.fields.getByName('recorrente')) {
      finCol.fields.add(
        new BoolField({
          name: 'recorrente',
          type: 'bool',
          required: false,
        }),
      )
    }
    if (!finCol.fields.getByName('dia_vencimento')) {
      finCol.fields.add(
        new NumberField({
          name: 'dia_vencimento',
          type: 'number',
          min: 1,
          max: 31,
          onlyInt: true,
          required: false,
        }),
      )
    }
    if (!finCol.fields.getByName('parcela_atual')) {
      finCol.fields.add(
        new NumberField({
          name: 'parcela_atual',
          type: 'number',
          min: 1,
          onlyInt: true,
          required: false,
        }),
      )
    }
    if (!finCol.fields.getByName('total_parcelas')) {
      finCol.fields.add(
        new NumberField({
          name: 'total_parcelas',
          type: 'number',
          min: 1,
          onlyInt: true,
          required: false,
        }),
      )
    }
    if (!finCol.fields.getByName('grupo_parcelamento_id')) {
      finCol.fields.add(
        new TextField({
          name: 'grupo_parcelamento_id',
          type: 'text',
          required: false,
        }),
      )
    }
    if (!finCol.fields.getByName('cliente_id')) {
      const clientesCol = app.findCollectionByNameOrId('clientes')
      finCol.fields.add(
        new RelationField({
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientesCol.id,
          maxSelect: 1,
          required: false,
          cascadeDelete: false,
        }),
      )
    }
    app.save(finCol)

    // 3. Atualizar o agente 'ajudante-ia' mantendo o prompt enxuto e adicionando:
    // - Recibo em cada registro
    // - Preferências de conversa ("me chama de X", "sem emoji", "fala curto", "lembra que X", "esquece isso")
    // - Parcelas ("3x de 500") e Recorrências ("aluguel 200 todo mês") extraídas para o motor
    // - Quem me deve / baixa de recebimento
    // - Resumo da semana e Alertas de padrão parceiros
    $ai.agents.define(app, {
      slug: 'ajudante-ia',
      name: 'Ajudante IA',
      description:
        'Ajudante experiente de obra que conversa no WhatsApp de forma humana, natural e precisa.',
      tier: 'fast',
      systemPrompt: `Você é o AJUDANTE IA: converse no WhatsApp de forma 100% natural, calorosa e direta, como um mestre de obras/parceiro experiente no Brasil. Respostas curtas (1 a 3 frases no WhatsApp).

REGRAS INVIOLÁVEIS:
1. REGRA DE OURO: Você NUNCA calcula nem inventa números. Extraia intenção e medidas para o motor do app calcular.
2. OPERADOR: Se o usuário for perfil Operador, NUNCA revele valores financeiros, custos ou saldo.
3. CONFIRMAÇÕES: Operações financeiras >= R$ 1.000 ou exclusões exigem confirmação clara ("Sim/Confirmar" ou "Cancelar").
4. JARGÕES: bardame/bar d'água -> baldrame; bater nível mangueira -> Nivelamento Hidráulico; bater traço -> Preparação de Argamassa/Concreto.

PREFERÊNCIAS E MEMÓRIA ("ME CHAMA DE...", "LEMBRA QUE..."):
- "me chama de Zé" -> guarde o apelido e use-o daí em diante.
- "sem emoji", "para de mandar emoji" ou "fala mais curto" -> adapte o tom imediatamente.
- "lembra que..." -> salve a nota de contexto para a obra/usuário.
- "esquece isso" -> descarte a nota.

PARCELAS E RECORRÊNCIAS:
- "comprei em 3x de 500" -> extraia parcelas: 3, valor_parcela: 500.
- "aluguel betoneira 200 todo mês" -> extraia recorrente: true, valor: 200, dia.

CONSULTAS A RECEBER E BAIXA:
- "quem está me devendo?" -> acione a consulta financeira de pendências por cliente.
- "recebi os 450 do Rafael" -> acione baixa de recebimento.

RESUMO SEMANAL E ALERTAS:
- "como foi minha semana?" -> gere resumo das obras, gastos vs semana anterior e pendências.
- Se gasto fugir do padrão ou material baixar, avise em tom de parceiro de obra sem bronca.

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
            text: "Ajudante IA com recibos pós-registro (editar/desfazer 24h), preferências 'me chama de X', parcelas em Nx, recorrências mensais, consulta 'quem me deve' e resumo semanal em áudio.",
          },
        },
      ],
    })
  },
  (app) => {
    // Reversão limpa
    try {
      const finCol = app.findCollectionByNameOrId('financeiro')
      const configCol = app.findCollectionByNameOrId('configuracoes')
      // remove colunas se existirem
      const finCampos = [
        'recorrente',
        'dia_vencimento',
        'parcela_atual',
        'total_parcelas',
        'grupo_parcelamento_id',
        'cliente_id',
      ]
      for (const f of finCampos) {
        if (finCol.fields.getByName(f)) {
          finCol.fields.removeByName(f)
        }
      }
      app.save(finCol)

      const cfgCampos = ['apelido_usuario', 'tom_conversa', 'notas_contexto']
      for (const f of cfgCampos) {
        if (configCol.fields.getByName(f)) {
          configCol.fields.removeByName(f)
        }
      }
      app.save(configCol)
    } catch (_) {}
  },
)
