// pocketbase/migrations/0007_update_subscription_plans.js
migrate(
  (app) => {
    // 1. Atualizar a coleção assinaturas com os 3 novos planos: essencial, profissional, empresa
    // Mantemos 'gratuito' no array temporariamente ou migramos os registros antes para evitar rejeição
    const assinaturasCol = app.findCollectionByNameOrId('assinaturas')
    const planoField = assinaturasCol.fields.getByName('plano')

    // Atualiza valores permitidos no campo plano (incluindo essencial, profissional, empresa)
    if (planoField) {
      planoField.values = ['essencial', 'profissional', 'empresa', 'gratuito']
    }
    app.save(assinaturasCol)

    // 2. Migrar registros que estejam como 'gratuito' para 'essencial' com valor 29.90
    try {
      app
        .db()
        .newQuery(
          "UPDATE assinaturas SET plano = 'essencial', valor_recorrente = 29.90 WHERE plano = 'gratuito'",
        )
        .execute()
    } catch (_) {}

    // 3. Atualizar faturas de demonstração antigas para refletir os novos valores
    try {
      app
        .db()
        .newQuery(
          "UPDATE assinaturas SET valor_recorrente = 49.90 WHERE plano = 'profissional' AND valor_recorrente = 149",
        )
        .execute()
      app
        .db()
        .newQuery(
          "UPDATE assinaturas SET valor_recorrente = 79.90 WHERE plano = 'empresa' AND valor_recorrente = 299",
        )
        .execute()
    } catch (_) {}

    // 4. Agora podemos remover 'gratuito' da lista oficial de valores aceitos
    const assinaturasColRefreshed = app.findCollectionByNameOrId('assinaturas')
    const planoFieldFinal = assinaturasColRefreshed.fields.getByName('plano')
    if (planoFieldFinal) {
      planoFieldFinal.values = ['essencial', 'profissional', 'empresa']
    }
    app.save(assinaturasColRefreshed)
  },
  (app) => {
    try {
      const assinaturasCol = app.findCollectionByNameOrId('assinaturas')
      const planoField = assinaturasCol.fields.getByName('plano')
      if (planoField) {
        planoField.values = ['gratuito', 'profissional', 'empresa']
      }
      app.save(assinaturasCol)
    } catch (_) {}
  },
)
