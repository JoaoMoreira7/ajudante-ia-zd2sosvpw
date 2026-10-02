// pocketbase/hooks/commercial_admin.js
// Endpoints e validações do Painel Admin e Gestão Comercial do Ajudante IA
// Regra do Skip Cloud: todas as variáveis e lógicas inline dentro de cada callback

routerAdd('GET', '/backend/v1/admin/commercial/summary', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { error: 'Autenticação necessária' })
  }
  const perfil = auth.getString('perfil')
  if (perfil !== 'admin') {
    return e.json(403, {
      error: 'Acesso negado. Apenas administradores podem acessar a Gestão Comercial.',
    })
  }

  try {
    const assinaturas = $app.findRecordsByFilter('assinaturas', '', '-created', 500, 0)
    const faturas = $app.findRecordsByFilter('faturas_venda', '', '-created', 1000, 0)
    const users = $app.findRecordsByFilter('users', '', '-created', 500, 0)

    let totalRecebido = 0
    let aReceber = 0
    let quantidadeVendida = 0
    let cancelados = 0

    for (let i = 0; i < faturas.length; i++) {
      const f = faturas[i]
      const status = f.getString('status')
      const valor = f.getFloat('valor') || 0
      if (status === 'pago') {
        totalRecebido += valor
        quantidadeVendida += 1
      } else if (status === 'pendente' || status === 'atrasado') {
        aReceber += valor
      } else if (status === 'cancelado') {
        cancelados += 1
      }
    }

    return e.json(200, {
      totalRecebido: totalRecebido,
      aReceber: aReceber,
      quantidadeVendida: quantidadeVendida,
      cancelados: cancelados,
      totalClientes: users.length,
      totalAssinaturas: assinaturas.length,
    })
  } catch (err) {
    return e.json(500, { error: 'Não foi possível carregar o resumo comercial: ' + err.message })
  }
})

routerAdd('POST', '/backend/v1/admin/commercial/block-client', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { error: 'Autenticação necessária' })
  }
  if (auth.getString('perfil') !== 'admin') {
    return e.json(403, { error: 'Acesso negado. Apenas administradores podem bloquear contas.' })
  }

  const info = e.requestInfo()
  const body = info.body || {}
  const targetUserId = body.userId
  const motivo = (body.motivo || '').trim()
  const tipoBloqueio =
    body.tipoBloqueio === 'inadimplencia' ? 'bloqueado_inadimplencia' : 'bloqueado_manual'
  const notificarCliente = body.notificarCliente !== false

  if (!targetUserId) {
    return e.json(400, { error: 'Identificador do cliente é obrigatório.' })
  }
  if (!motivo) {
    return e.json(400, { error: 'O motivo do bloqueio é obrigatório.' })
  }

  try {
    const targetUser = $app.findRecordById('users', targetUserId)
    const adminNome = auth.getString('name') || 'Administrador'
    const hojeStr = new Date().toISOString()

    targetUser.set('status_conta', tipoBloqueio)
    targetUser.set('motivo_bloqueio', motivo)
    targetUser.set('bloqueado_em', hojeStr)
    targetUser.set('bloqueado_por_nome', adminNome)
    $app.save(targetUser)

    // Atualiza assinatura do cliente
    try {
      const ass = $app.findFirstRecordByData('assinaturas', 'user_id', targetUserId)
      ass.set('status', tipoBloqueio)
      ass.set('bloqueio_manual', tipoBloqueio === 'bloqueado_manual')
      ass.set('motivo_bloqueio', motivo)
      ass.set('bloqueado_em', hojeStr)
      ass.set('bloqueado_por_id', auth.id)
      ass.set('bloqueado_por_nome', adminNome)
      $app.save(ass)
    } catch (_) {}

    // Envia notificação no sino do app se solicitado
    if (notificarCliente) {
      const notifCol = $app.findCollectionByNameOrId('notificacoes_sistema')
      const notif = new Record(notifCol)
      notif.set('user_id', targetUserId)
      notif.set('titulo', 'Aviso Importante: Conta Bloqueada')
      notif.set(
        'mensagem',
        'Sua conta foi suspensa temporariamente. Motivo: ' +
          motivo +
          '. Regularize seu acesso com o administrador.',
      )
      notif.set('tipo', 'bloqueio')
      notif.set('lida', false)
      $app.save(notif)
    }

    // Registra Auditoria
    const auditCol = $app.findCollectionByNameOrId('auditoria_admin')
    const audit = new Record(auditCol)
    audit.set('admin_id', auth.id)
    audit.set('admin_nome', adminNome)
    audit.set('alvo_user_id', targetUserId)
    audit.set('alvo_user_nome', targetUser.getString('name') || '')
    audit.set('alvo_user_email', targetUser.getString('email') || '')
    audit.set('acao', 'bloquear')
    audit.set('motivo', motivo)
    audit.set('ip', info.remoteIP || 'desconhecido')
    audit.set('detalhes', {
      tipoBloqueio: tipoBloqueio,
      notificado: notificarCliente,
    })
    $app.save(audit)

    return e.json(200, { success: true, message: 'Conta bloqueada com sucesso no servidor.' })
  } catch (err) {
    return e.json(500, { error: 'Não foi possível bloquear a conta: ' + err.message })
  }
})

routerAdd('POST', '/backend/v1/admin/commercial/unblock-client', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { error: 'Autenticação necessária' })
  }
  if (auth.getString('perfil') !== 'admin') {
    return e.json(403, { error: 'Acesso negado. Apenas administradores podem liberar contas.' })
  }

  const info = e.requestInfo()
  const body = info.body || {}
  const targetUserId = body.userId
  const observacoes = (body.observacoes || '').trim()

  if (!targetUserId) {
    return e.json(400, { error: 'Identificador do cliente é obrigatório.' })
  }

  try {
    const targetUser = $app.findRecordById('users', targetUserId)
    const adminNome = auth.getString('name') || 'Administrador'

    targetUser.set('status_conta', 'ativo')
    targetUser.set('motivo_bloqueio', '')
    targetUser.set('bloqueado_em', '')
    targetUser.set('bloqueado_por_nome', '')
    $app.save(targetUser)

    // Atualiza assinatura do cliente
    try {
      const ass = $app.findFirstRecordByData('assinaturas', 'user_id', targetUserId)
      ass.set('status', 'ativo')
      ass.set('bloqueio_manual', false)
      ass.set('motivo_bloqueio', '')
      ass.set('bloqueado_em', '')
      ass.set('bloqueado_por_id', '')
      ass.set('bloqueado_por_nome', '')
      if (observacoes) {
        ass.set(
          'observacoes',
          (ass.getString('observacoes') || '') + '\n[Liberação]: ' + observacoes,
        )
      }
      $app.save(ass)
    } catch (_) {}

    // Notificação de liberação no sino
    const notifCol = $app.findCollectionByNameOrId('notificacoes_sistema')
    const notif = new Record(notifCol)
    notif.set('user_id', targetUserId)
    notif.set('titulo', 'Acesso Restabelecido')
    notif.set(
      'mensagem',
      'Sua conta no Ajudante IA foi liberada pelo administrador. Bem-vindo de volta!' +
        (observacoes ? ' Obs: ' + observacoes : ''),
    )
    notif.set('tipo', 'liberacao')
    notif.set('lida', false)
    $app.save(notif)

    // Auditoria
    const auditCol = $app.findCollectionByNameOrId('auditoria_admin')
    const audit = new Record(auditCol)
    audit.set('admin_id', auth.id)
    audit.set('admin_nome', adminNome)
    audit.set('alvo_user_id', targetUserId)
    audit.set('alvo_user_nome', targetUser.getString('name') || '')
    audit.set('alvo_user_email', targetUser.getString('email') || '')
    audit.set('acao', 'liberar')
    audit.set('motivo', observacoes || 'Liberação manual efetuada pelo administrador')
    audit.set('ip', info.remoteIP || 'desconhecido')
    $app.save(audit)

    return e.json(200, { success: true, message: 'Conta liberada com sucesso.' })
  } catch (err) {
    return e.json(500, { error: 'Não foi possível liberar a conta: ' + err.message })
  }
})

routerAdd('POST', '/backend/v1/admin/commercial/register-direct-sale', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { error: 'Autenticação necessária' })
  }
  if (auth.getString('perfil') !== 'admin') {
    return e.json(403, {
      error: 'Acesso negado. Apenas administradores podem registrar vendas diretas.',
    })
  }

  const info = e.requestInfo()
  const body = info.body || {}
  const adminNome = auth.getString('name') || 'Administrador'

  // Dados do cliente: existente ou novo
  let targetUserId = body.userId
  const clienteEmail = (body.email || '').trim().toLowerCase()
  const clienteNome = (body.nome || '').trim()

  if (!targetUserId && (!clienteEmail || !clienteNome)) {
    return e.json(400, {
      error: 'Selecione um cliente existente ou informe Nome e E-mail para cadastro.',
    })
  }

  const plano = body.plano || 'essencial'
  const ciclo = body.ciclo || 'mensal'
  const valorNegociado = parseFloat(body.valor) || 0
  const formaPagamento = body.formaPagamento || 'pix'
  const dataPagamento = body.dataPagamento || new Date().toISOString().slice(0, 10)
  const observacoes = (body.observacoes || '').trim()

  if (valorNegociado <= 0) {
    return e.json(400, { error: 'O valor da venda direta deve ser maior que zero.' })
  }

  try {
    const usersCol = $app.findCollectionByNameOrId('users')
    let targetUser
    if (targetUserId) {
      targetUser = $app.findRecordById('users', targetUserId)
    } else {
      try {
        targetUser = $app.findAuthRecordByEmail('_pb_users_auth_', clienteEmail)
      } catch (_) {
        targetUser = new Record(usersCol)
        targetUser.setEmail(clienteEmail)
        targetUser.setPassword('Skip@Pass123')
        targetUser.setVerified(true)
        targetUser.set('name', clienteNome)
        targetUser.set('perfil', 'dono')
        targetUser.set('status_conta', 'ativo')
        $app.save(targetUser)
      }
      targetUserId = targetUser.id
    }

    // Calcula próximo vencimento com base no ciclo
    const pDate = new Date(dataPagamento + 'T12:00:00Z')
    let mesesParaAdicionar = 1
    if (ciclo === 'trimestral') mesesParaAdicionar = 3
    else if (ciclo === 'semestral') mesesParaAdicionar = 6
    else if (ciclo === 'anual') mesesParaAdicionar = 12

    pDate.setMonth(pDate.getMonth() + mesesParaAdicionar)
    const proximoVencimentoStr = pDate.toISOString().slice(0, 10)

    // Garante que o status do usuário seja ativo
    targetUser.set('status_conta', 'ativo')
    $app.save(targetUser)

    // Cria ou atualiza assinatura
    const assinaturasCol = $app.findCollectionByNameOrId('assinaturas')
    let assinatura
    try {
      assinatura = $app.findFirstRecordByData('assinaturas', 'user_id', targetUserId)
    } catch (_) {
      assinatura = new Record(assinaturasCol)
      assinatura.set('user_id', targetUserId)
    }

    assinatura.set('plano', plano)
    assinatura.set('ciclo', ciclo)
    assinatura.set('valor_recorrente', valorNegociado)
    assinatura.set('status', 'ativo')
    assinatura.set('origem', 'direta')
    assinatura.set('data_inicio', dataPagamento)
    assinatura.set('proximo_vencimento', proximoVencimentoStr)
    assinatura.set('bloqueio_manual', false)
    assinatura.set('motivo_bloqueio', '')
    assinatura.set(
      'observacoes',
      'Venda Direta registrada por ' + adminNome + '. Obs: ' + observacoes,
    )
    $app.save(assinatura)

    // Cria fatura marcada como paga e venda direta
    const faturasCol = $app.findCollectionByNameOrId('faturas_venda')
    const fatura = new Record(faturasCol)
    fatura.set('user_id', targetUserId)
    fatura.set('assinatura_id', assinatura.id)
    fatura.set('descricao', 'Venda Direta - Plano ' + plano.toUpperCase() + ' (' + ciclo + ')')
    fatura.set('valor', valorNegociado)
    fatura.set('status', 'pago')
    fatura.set('origem', 'direta')
    fatura.set('forma_pagamento', formaPagamento)
    fatura.set('data_vencimento', dataPagamento)
    fatura.set('data_pagamento', dataPagamento)
    fatura.set(
      'observacoes',
      'Venda Direta (fora do gateway online) registrada por ' + adminNome + '. ' + observacoes,
    )
    $app.save(fatura)

    // Notificação ao cliente
    const notifCol = $app.findCollectionByNameOrId('notificacoes_sistema')
    const notif = new Record(notifCol)
    notif.set('user_id', targetUserId)
    notif.set('titulo', 'Plano Ativado com Sucesso!')
    notif.set(
      'mensagem',
      'Seu plano ' +
        plano.toUpperCase() +
        ' foi ativado. Próximo vencimento agendado para ' +
        proximoVencimentoStr +
        '.',
    )
    notif.set('tipo', 'venda_ativada')
    notif.set('lida', false)
    $app.save(notif)

    // Auditoria
    const auditCol = $app.findCollectionByNameOrId('auditoria_admin')
    const audit = new Record(auditCol)
    audit.set('admin_id', auth.id)
    audit.set('admin_nome', adminNome)
    audit.set('alvo_user_id', targetUserId)
    audit.set('alvo_user_nome', targetUser.getString('name') || clienteNome)
    audit.set('alvo_user_email', targetUser.getString('email') || clienteEmail)
    audit.set('acao', 'venda_direta')
    audit.set(
      'motivo',
      'Venda direta registrada: R$ ' + valorNegociado.toFixed(2) + ' via ' + formaPagamento,
    )
    audit.set('ip', info.remoteIP || 'desconhecido')
    audit.set('detalhes', {
      plano: plano,
      ciclo: ciclo,
      valor: valorNegociado,
      formaPagamento: formaPagamento,
      dataPagamento: dataPagamento,
      proximoVencimento: proximoVencimentoStr,
    })
    $app.save(audit)

    return e.json(200, {
      success: true,
      message: 'Venda direta registrada com sucesso! Assinatura ativada e fatura baixada.',
      assinaturaId: assinatura.id,
      faturaId: fatura.id,
    })
  } catch (err) {
    return e.json(500, { error: 'Não foi possível registrar a venda direta: ' + err.message })
  }
})

routerAdd('POST', '/backend/v1/admin/commercial/update-modules', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { error: 'Autenticação necessária' })
  }
  if (auth.getString('perfil') !== 'admin') {
    return e.json(403, { error: 'Acesso negado. Apenas administradores podem liberar módulos.' })
  }

  const info = e.requestInfo()
  const body = info.body || {}
  const targetUserId = body.userId
  const modulos = body.modulos || {}

  if (!targetUserId) {
    return e.json(400, { error: 'Identificador do cliente é obrigatório.' })
  }

  try {
    const targetUser = $app.findRecordById('users', targetUserId)
    const adminNome = auth.getString('name') || 'Administrador'

    targetUser.set('modulos_liberados', modulos)
    $app.save(targetUser)

    try {
      const ass = $app.findFirstRecordByData('assinaturas', 'user_id', targetUserId)
      ass.set('modulos_liberados', modulos)
      $app.save(ass)
    } catch (_) {}

    // Auditoria
    const auditCol = $app.findCollectionByNameOrId('auditoria_admin')
    const audit = new Record(auditCol)
    audit.set('admin_id', auth.id)
    audit.set('admin_nome', adminNome)
    audit.set('alvo_user_id', targetUserId)
    audit.set('alvo_user_nome', targetUser.getString('name') || '')
    audit.set('alvo_user_email', targetUser.getString('email') || '')
    audit.set('acao', 'liberar_modulos')
    audit.set('motivo', 'Módulos customizados atualizados pelo administrador')
    audit.set('ip', info.remoteIP || 'desconhecido')
    audit.set('detalhes', { modulos: modulos })
    $app.save(audit)

    return e.json(200, { success: true, message: 'Módulos liberados atualizados com sucesso.' })
  } catch (err) {
    return e.json(500, { error: 'Não foi possível atualizar os módulos: ' + err.message })
  }
})
