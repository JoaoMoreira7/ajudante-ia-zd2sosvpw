// pocketbase/migrations/0004_user_role_and_document_fields.js
migrate(
  (app) => {
    // 1. Adicionar campo perfil na coleção users (auth)
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('perfil')) {
      usersCol.fields.add(
        new SelectField({
          name: 'perfil',
          values: ['dono', 'operador'],
          maxSelect: 1,
        }),
      )
      app.save(usersCol)
    }

    // 2. Adicionar campos etapa_index, geolocalizacao e data_foto na coleção documentos (se ainda não existirem)
    const docsCol = app.findCollectionByNameOrId('documentos')
    let saveDocs = false
    if (!docsCol.fields.getByName('etapa_index')) {
      docsCol.fields.add(
        new NumberField({
          name: 'etapa_index',
          onlyInt: true,
        }),
      )
      saveDocs = true
    }
    if (!docsCol.fields.getByName('geolocalizacao')) {
      docsCol.fields.add(
        new TextField({
          name: 'geolocalizacao',
        }),
      )
      saveDocs = true
    }
    if (!docsCol.fields.getByName('data_foto')) {
      docsCol.fields.add(
        new TextField({
          name: 'data_foto',
        }),
      )
      saveDocs = true
    }
    if (saveDocs) {
      app.save(docsCol)
    }
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      const perfilField = usersCol.fields.getByName('perfil')
      if (perfilField) {
        usersCol.fields.remove(perfilField)
        app.save(usersCol)
      }
    } catch (_) {}

    try {
      const docsCol = app.findCollectionByNameOrId('documentos')
      const f1 = docsCol.fields.getByName('etapa_index')
      if (f1) docsCol.fields.remove(f1)
      const f2 = docsCol.fields.getByName('geolocalizacao')
      if (f2) docsCol.fields.remove(f2)
      const f3 = docsCol.fields.getByName('data_foto')
      if (f3) docsCol.fields.remove(f3)
      app.save(docsCol)
    } catch (_) {}
  },
)
