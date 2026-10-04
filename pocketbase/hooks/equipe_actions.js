// pocketbase/hooks/equipe_actions.js
// Gestão completa de membros da equipe (Plano Empresa):
// - Convidar operador (gera/vincula conta de operador em users com dono_id e registra em equipe_membros)
// - Editar membro (nome, whatsapp, email, cargo, obras permitidas, status)
// - Remover membro (inativa ou exclui)

routerAdd('POST', '/backend/v1/equipe/convidar', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { error: 'Autenticação necessária' })
  }

  // Verifica se o usuário autenticado tem direito (Admin ou Dono no plano Empresa / com módulo equipes)
  const userPerfil = auth.getString('perfil') || 'dono'
  let permiteEquipe = userPerfil === 'admin'

  if (!permiteEquipe) {
    // Checa assinatura ou módulos
    try {
      const ass = $app.findFirstRecordByData('assinaturas', 'user_id', auth.id)
      const plano = ass.getString('plano')
      const statusAss = ass.getString('status')
      if (plano === 'empresa' || statusAss === 'trial') {
        permiteEquipe = true
      }
    } catch (_) {}

    if (!permiteEquipe) {
      const modulos = auth.get('modulos_liberados') || {}
      if (modulos['equipes'] || modulos['equipe']) {
        permiteEquipe = true
      }
    }
  }

  if (!permiteEquipe) {
    return e.json(403, {
      error: 'A gestão de equipes requer o Plano Empresa (R$ 79,90/mês). Faça o upgrade em Planos.',
    })
  }

  const info = e.requestInfo()
  const body = info.body || {}
  const nome = (body.nome || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const telefone = (body.telefone || '').trim()
  const cargo = body.cargo || 'operador'
  const obrasPermitidas = Array.isArray(body.obras_permitidas) ? body.obras_permitidas : []
  const senhaInicial = body.senha || 'Mestre@123'

  if (!nome) {
    return e.json(400, { error: 'Nome do operador é obrigatório.' })
  }

  try {
    let operadorUserId = null

    // Se email foi fornecido, verifica ou cria a conta de usuário na coleção users
    if (email) {
      const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
      let userOp = null
      try {
        userOp = $app.findAuthRecordByEmail('_pb_users_auth_', email)
      } catch (_) {}

      if (!userOp) {
        userOp = new Record(usersCol)
        userOp.setEmail(email)
        userOp.setPassword(senhaInicial)
        userOp.setVerified(true)
        userOp.set('name', nome)
        userOp.set('perfil', 'operador')
        userOp.set('status_conta', 'ativo')
        userOp.set('dono_id', auth.id)
        $app.save(userOp)
      } else {
        // Se a conta já existe, vincula dono_id se não tiver
        userOp.set('dono_id', auth.id)
        userOp.set('perfil', 'operador')
        $app.save(userOp)
      }
      operadorUserId = userOp.id
    }

    // Salva na coleção equipe_membros
    const equipeCol = $app.findCollectionByNameOrId('equipe_membros')
    const membroRec = new Record(equipeCol)
    membroRec.set('owner_id', auth.id)
    if (operadorUserId) {
      membroRec.set('operador_user_id', operadorUserId)
    }
    membroRec.set('nome', nome)
    if (email) membroRec.set('email', email)
    if (telefone) membroRec.set('telefone', telefone)
    membroRec.set('cargo', cargo)
    membroRec.set('status', 'ativo')
    if (obrasPermitidas.length > 0) {
      membroRec.set('obras_permitidas', obrasPermitidas)
    }
    $app.save(membroRec)

    return e.json(200, {
      success: true,
      membro: {
        id: membroRec.id,
        owner_id: auth.id,
        operador_user_id: operadorUserId,
        nome: nome,
        email: email || undefined,
        telefone: telefone || undefined,
        cargo: cargo,
        status: 'ativo',
        obras_permitidas: obrasPermitidas,
        created: membroRec.getString('created'),
      },
    })
  } catch (err) {
    return e.json(500, { error: 'Falha ao salvar membro da equipe: ' + err.message })
  }
})
