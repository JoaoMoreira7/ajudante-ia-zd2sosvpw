// pocketbase/hooks/asaas_cobranca.js
// Endpoints de integração com a API v3 do Asaas para Cobranças Pix por Voz
// Regra do Skip Cloud Hooks: variáveis e funções auxiliares inline dentro de cada callback

// 1. Endpoint para verificar status da integração (chave presente ou ausente)
routerAdd(
  'GET',
  '/backend/v1/asaas/status',
  (e) => {
    try {
      const auth = e.auth
      if (!auth) {
        return e.json(401, { error: 'Autenticação necessária' })
      }

      const apiKey = $os.getenv('ASAAS_API_KEY') || ''
      const mode = ($os.getenv('ASAAS_MODE') || 'sandbox').trim().toLowerCase()
      const configurado = Boolean(apiKey && apiKey.trim().length > 0)

      return e.json(200, {
        configurado: configurado,
        modo: mode === 'production' ? 'producao' : 'sandbox',
        status: configurado ? 'conectado' : 'nao_configurado',
        mensagem: configurado
          ? 'Integração Asaas ativa e pronta para gerar Pix.'
          : 'Chave ASAAS_API_KEY ainda não configurada no servidor.',
      })
    } catch (err) {
      return e.json(500, { error: 'Erro ao verificar status do Asaas: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

// 2. Endpoint para criar cobrança Pix no Asaas e registrar no banco
routerAdd(
  'POST',
  '/backend/v1/asaas/criar-cobranca-pix',
  (e) => {
    try {
      const auth = e.auth
      if (!auth) {
        return e.json(401, { error: 'Autenticação necessária' })
      }

      const perfil = auth.getString('perfil')
      if (perfil === 'operador') {
        return e.json(403, {
          error:
            'Acesso negado. Seu perfil é Operador. A criação e gestão de cobranças é exclusiva para o Dono ou Administrador.',
        })
      }

      const apiKey = ($os.getenv('ASAAS_API_KEY') || '').trim()
      if (!apiKey) {
        return e.json(412, {
          chaveNaoConfigurada: true,
          error: 'Pra eu criar cobranças Pix, o Dono precisa conectar o Asaas nas configurações.',
          mensagemAmigavel:
            'Pra eu criar cobranças Pix, o Dono precisa conectar o Asaas nas configurações.',
        })
      }

      const info = e.requestInfo()
      const body = info.body || {}
      const clienteNome = (body.clienteNome || '').trim()
      const valor = parseFloat(body.valor) || 0
      const descricao = (body.descricao || '').trim()
      const obraId = (body.obraId || '').trim()
      const autorNome = auth.getString('name') || 'Mestre de Obras'
      const autorId = auth.id

      if (!clienteNome) {
        return e.json(400, { error: 'O nome do cliente é obrigatório para gerar a cobrança Pix.' })
      }

      if (valor <= 0) {
        return e.json(400, { error: 'O valor da cobrança Pix deve ser maior que zero.' })
      }

      const mode = ($os.getenv('ASAAS_MODE') || 'sandbox').trim().toLowerCase()
      const baseUrl =
        mode === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3'

      const reqHeaders = {
        'Content-Type': 'application/json',
        UserAgent: 'AjudanteIA/1.0',
        access_token: apiKey,
      }

      // 2.1 Busca ou cria cliente local
      let clienteLocalId = ''
      try {
        const clientesLocal = $app.findRecordsByFilter(
          'clientes',
          "owner_id = '" + autorId + "' && nome ~ '" + clienteNome.replace(/'/g, "\\'") + "'",
          '-created',
          1,
          0,
        )
        if (clientesLocal.length > 0) {
          clienteLocalId = clientesLocal[0].id
        }
      } catch (_) {}

      if (!clienteLocalId) {
        try {
          const colCli = $app.findCollectionByNameOrId('clientes')
          const novoCli = new Record(colCli)
          novoCli.set('owner_id', autorId)
          novoCli.set('nome', clienteNome)
          novoCli.set('observacoes', 'Criado automaticamente via cobrança Pix por voz')
          $app.save(novoCli)
          clienteLocalId = novoCli.id
        } catch (_) {}
      }

      // 2.2 Procura cliente existente no Asaas por nome para evitar duplicar
      let asaasCustomerId = ''
      try {
        const resListCust = $http.send({
          url: baseUrl + '/customers?name=' + encodeURIComponent(clienteNome),
          method: 'GET',
          headers: reqHeaders,
          timeout: 15,
        })
        if (resListCust.statusCode === 200 && resListCust.json && resListCust.json.data) {
          const lista = resListCust.json.data
          if (Array.isArray(lista) && lista.length > 0) {
            asaasCustomerId = lista[0].id
          }
        }
      } catch (_) {}

      // Se não achou cliente no Asaas, cria novo
      if (!asaasCustomerId) {
        const payloadCustomer = {
          name: clienteNome,
          externalReference: clienteLocalId || 'cli_' + Date.now(),
          notificationDisabled: false,
        }
        const resCust = $http.send({
          url: baseUrl + '/customers',
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify(payloadCustomer),
          timeout: 15,
        })
        if (resCust.statusCode !== 200 && resCust.statusCode !== 201) {
          const errMsg =
            resCust.json && resCust.json.errors && resCust.json.errors[0]
              ? resCust.json.errors[0].description
              : 'Não foi possível registrar o cliente no Asaas (' + resCust.statusCode + ').'
          return e.json(502, { error: errMsg })
        }
        asaasCustomerId = resCust.json.id
      }

      // 2.3 Cria cobrança (Payment) com billingType=PIX
      const hoje = new Date()
      // Vencimento padrão: 3 dias a partir de hoje
      const vencimento = new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000)
      const dueDateStr = vencimento.toISOString().slice(0, 10)
      const dataLancamentoStr = hoje.toISOString().slice(0, 10)

      const descFinal =
        descricao || 'Cobrança de serviço - ' + clienteNome + ' (R$ ' + valor.toFixed(2) + ')'

      const payloadPayment = {
        customer: asaasCustomerId,
        billingType: 'PIX',
        value: valor,
        dueDate: dueDateStr,
        description: descFinal.slice(0, 500),
        externalReference: 'fin_' + Date.now(),
      }

      const resPayment = $http.send({
        url: baseUrl + '/payments',
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(payloadPayment),
        timeout: 20,
      })

      if (resPayment.statusCode !== 200 && resPayment.statusCode !== 201) {
        const errMsg =
          resPayment.json && resPayment.json.errors && resPayment.json.errors[0]
            ? resPayment.json.errors[0].description
            : 'Erro ao criar cobrança no Asaas (' + resPayment.statusCode + ').'
        return e.json(502, { error: errMsg })
      }

      const paymentData = resPayment.json
      const paymentId = paymentData.id
      const invoiceUrl = paymentData.invoiceUrl || ''

      // 2.4 Obtém o QR Code e o Copia-e-Cola Pix
      let pixCopiaECola = ''
      let pixQrCodeBase64 = ''
      let pixExpiracao = ''

      try {
        const resPix = $http.send({
          url: baseUrl + '/payments/' + paymentId + '/pixQrCode',
          method: 'GET',
          headers: reqHeaders,
          timeout: 15,
        })
        if (resPix.statusCode === 200 && resPix.json) {
          pixCopiaECola = resPix.json.payload || ''
          pixQrCodeBase64 = resPix.json.encodedImage || ''
          pixExpiracao = resPix.json.expirationDate || ''
        }
      } catch (_) {}

      // 2.5 Registra no Financeiro como conta a receber (entrada pendente)
      const finCol = $app.findCollectionByNameOrId('financeiro')
      const finRec = new Record(finCol)
      finRec.set('owner_id', autorId)
      if (clienteLocalId) finRec.set('cliente_id', clienteLocalId)
      if (obraId) finRec.set('obra_id', obraId)
      finRec.set('tipo', 'entrada')
      finRec.set('categoria', 'recebimento')
      finRec.set('descricao', 'Cobrança Pix: ' + clienteNome + (descricao ? ' - ' + descricao : ''))
      finRec.set('valor', valor)
      finRec.set('data', dataLancamentoStr)
      finRec.set('status', 'pendente')
      finRec.set('asaas_cobranca_id', paymentId)
      finRec.set('criado_por_nome', autorNome)
      finRec.set('criado_por_id', autorId)
      $app.save(finRec)

      // 2.6 Registra na coleção cobrancas_pix
      const cobCol = $app.findCollectionByNameOrId('cobrancas_pix')
      const cobRec = new Record(cobCol)
      cobRec.set('owner_id', autorId)
      if (clienteLocalId) cobRec.set('cliente_id', clienteLocalId)
      cobRec.set('financeiro_id', finRec.id)
      cobRec.set('cliente_nome', clienteNome)
      cobRec.set('valor', valor)
      cobRec.set('descricao', descFinal)
      cobRec.set('status', 'PENDING')
      cobRec.set('asaas_payment_id', paymentId)
      cobRec.set('asaas_customer_id', asaasCustomerId)
      cobRec.set('pix_copia_e_cola', pixCopiaECola)
      cobRec.set('pix_qr_code_base64', pixQrCodeBase64)
      cobRec.set('pix_expiracao', pixExpiracao)
      cobRec.set('invoice_url', invoiceUrl)
      cobRec.set('criado_por_nome', autorNome)
      cobRec.set('criado_por_id', autorId)
      $app.save(cobRec)

      return e.json(200, {
        success: true,
        cobranca: {
          id: cobRec.id,
          financeiroId: finRec.id,
          asaasPaymentId: paymentId,
          clienteNome: clienteNome,
          valor: valor,
          descricao: descFinal,
          status: 'PENDING',
          pixCopiaECola: pixCopiaECola,
          pixQrCodeBase64: pixQrCodeBase64,
          pixExpiracao: pixExpiracao,
          invoiceUrl: invoiceUrl,
          vencimento: dueDateStr,
          criadoPorNome: autorNome,
        },
        mensagem:
          'Cobrança Pix de R$ ' +
          valor.toFixed(2) +
          ' gerada para ' +
          clienteNome +
          '. O código Pix copia-e-cola já está disponível.',
      })
    } catch (err) {
      return e.json(500, { error: 'Falha ao processar cobrança Pix: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

// 3. Webhook do Asaas para baixa automática de pagamentos Pix (PAYMENT_RECEIVED / PAYMENT_CONFIRMED)
// Rota pública para receber eventos HTTP POST do Asaas com idempotência estrita
routerAdd('POST', '/backend/v1/asaas/webhook', (e) => {
  try {
    const info = e.requestInfo()
    const webhookTokenEsperado = ($os.getenv('ASAAS_WEBHOOK_TOKEN') || '').trim()

    // Validação de segurança opcional se ASAAS_WEBHOOK_TOKEN estiver configurado
    if (webhookTokenEsperado) {
      const headerToken = info.headers['asaas-access-token'] || ''
      if (headerToken !== webhookTokenEsperado) {
        return e.json(401, { error: 'Token do webhook inválido' })
      }
    }

    const body = info.body || {}
    const eventType = body.event || ''
    const eventId = body.id || ''
    const payment = body.payment || {}
    const paymentId = payment.id || ''

    if (!paymentId) {
      return e.json(200, { received: true, ignored: 'sem_payment_id' })
    }

    // Apenas eventos de recebimento/confirmação dão baixa
    const isPaymentSettled = eventType === 'PAYMENT_RECEIVED' || eventType === 'PAYMENT_CONFIRMED'

    if (!isPaymentSettled) {
      return e.json(200, { received: true, ignored: 'evento_sem_baixa', event: eventType })
    }

    // 3.1 Idempotência: busca a cobrança pelo asaas_payment_id
    let cobrancaRecord = null
    try {
      cobrancaRecord = $app.findFirstRecordByData('cobrancas_pix', 'asaas_payment_id', paymentId)
    } catch (_) {}

    const hojeIso = new Date().toISOString()
    const hojeData = hojeIso.slice(0, 10)

    let clienteNome = payment.customer || 'Cliente'
    let valorPago = payment.value || 0
    let ownerId = ''

    if (cobrancaRecord) {
      ownerId = cobrancaRecord.getString('owner_id')
      clienteNome = cobrancaRecord.getString('cliente_nome') || clienteNome
      valorPago = cobrancaRecord.getFloat('valor') || valorPago

      // Idempotência estrita: se já estiver marcada como RECEIVED ou CONFIRMED, não duplica
      const statusAtual = cobrancaRecord.getString('status')
      if (statusAtual === 'RECEIVED' || statusAtual === 'CONFIRMED') {
        return e.json(200, {
          received: true,
          idempotent: true,
          message: 'Cobrança já baixada anteriormente.',
          paymentId: paymentId,
        })
      }

      // Atualiza a cobrança para RECEIVED
      cobrancaRecord.set('status', eventType === 'PAYMENT_CONFIRMED' ? 'CONFIRMED' : 'RECEIVED')
      cobrancaRecord.set('pago_em', hojeIso)
      if (eventId) cobrancaRecord.set('webhook_event_id', eventId)
      $app.save(cobrancaRecord)

      // 3.2 Atualiza o lançamento correspondente no financeiro para status 'pago'
      const finId = cobrancaRecord.getString('financeiro_id')
      if (finId) {
        try {
          const finRec = $app.findRecordById('financeiro', finId)
          if (finRec && finRec.getString('status') !== 'pago') {
            finRec.set('status', 'pago')
            $app.save(finRec)
          }
        } catch (_) {}
      }
    } else {
      // Se não encontrou na coleção cobrancas_pix, tenta encontrar no financeiro pelo asaas_cobranca_id
      try {
        const finRec = $app.findFirstRecordByData('financeiro', 'asaas_cobranca_id', paymentId)
        if (finRec) {
          ownerId = finRec.getString('owner_id')
          if (finRec.getString('status') !== 'pago') {
            finRec.set('status', 'pago')
            $app.save(finRec)
          }
        }
      } catch (_) {}
    }

    // 3.3 Cria notificação no sino do app no tom de mestre de obras
    if (ownerId) {
      try {
        const notifCol = $app.findCollectionByNameOrId('notificacoes_sistema')
        const notif = new Record(notifCol)
        notif.set('user_id', ownerId)
        notif.set('titulo', 'Pagamento Pix Recebido! ✔')
        notif.set(
          'mensagem',
          clienteNome +
            ' pagou os R$ ' +
            Number(valorPago).toFixed(2) +
            ' via Pix. Baixa realizada no financeiro!',
        )
        notif.set('tipo', 'aviso_geral')
        notif.set('lida', false)
        $app.save(notif)
      } catch (_) {}
    }

    return e.json(200, {
      received: true,
      processed: true,
      paymentId: paymentId,
      cliente: clienteNome,
      valor: valorPago,
      event: eventType,
      message: 'Baixa efetuada com sucesso.',
    })
  } catch (err) {
    return e.json(500, { error: 'Erro ao processar webhook do Asaas: ' + err.message })
  }
})
