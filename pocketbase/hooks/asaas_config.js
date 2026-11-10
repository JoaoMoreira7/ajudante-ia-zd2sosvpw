// pocketbase/hooks/asaas_config.js
// Configuração segura da chave de API do Asaas, colada pelo próprio Dono no app
// (Painel do Administrador → Gateway Online). A chave vive SOMENTE na coleção
// 'integracoes_config' (campo oculto — nunca volta pela API REST) e é escrita/lida
// apenas por estes hooks, que exigem perfil admin (Dono).
//
// PONTO ÚNICO de leitura da chave (regra do projeto): env ASAAS_API_KEY > chave
// salva na coleção integracoes_config. A MESMA prioridade está inline nos
// callbacks de asaas_cobranca.js (a plataforma PocketBase executa cada callback
// em VM isolada — funções top-level não são compartilháveis entre hooks).
//
// Endpoints (todos exigem login; conectar/desconectar exigem perfil admin = Dono):
//   GET  /backend/v1/asaas/gateway/status      → estado para a UI (nunca devolve a chave)
//   POST /backend/v1/asaas/gateway/conectar    → valida a chave na API do Asaas e salva
//   POST /backend/v1/asaas/gateway/desconectar → remove a chave salva
// (O GET /backend/v1/asaas/status existente, de asaas_cobranca.js, continua ativo.)
//
// Regra do Skip Cloud Hooks: variáveis e funções auxiliares inline dentro de cada callback.

// ---------------------------------------------------------------------------
// 1. GET status — o que a UI do Dono mostra (nunca devolve a chave)
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/asaas/gateway/status',
  (e) => {
    try {
      const auth = e.auth
      if (!auth) {
        return e.json(401, { error: 'Autenticação necessária' })
      }

      // PONTO ÚNICO (inline): prioridade env ASAAS_API_KEY > coleção integracoes_config
      const envKey = ($os.getenv('ASAAS_API_KEY') || '').trim()
      const envMode = ($os.getenv('ASAAS_MODE') || 'sandbox').trim().toLowerCase()

      if (envKey) {
        // Prioridade: variável de ambiente do painel Skip Cloud
        return e.json(200, {
          configurado: true,
          modo: envMode === 'production' ? 'producao' : 'sandbox',
          status: 'conectado',
          origem: 'servidor',
          podeGerenciar: false,
          mensagem: 'Integração Asaas ativa via configuração do servidor (painel Skip Cloud).',
        })
      }

      let cfgConectado = false
      let cfgModo = 'sandbox'
      let cfgNome = ''
      let cfgValidacaoOk = false
      let cfgValidacaoEm = ''
      try {
        const rec = $app.findFirstRecordByData('integracoes_config', 'chave', 'asaas')
        const secretValue = rec.getString('valor_secreto') || ''
        cfgConectado = rec.getBool('conectado') && secretValue.length > 0
        cfgModo = rec.getString('modo') === 'producao' ? 'producao' : 'sandbox'
        cfgNome = rec.getString('atualizado_por_nome') || ''
        cfgValidacaoOk = rec.getBool('ultima_validacao_ok')
        cfgValidacaoEm = rec.getString('ultima_validacao_em') || ''
      } catch (_) {
        cfgConectado = false
      }

      if (cfgConectado) {
        // Checagem de validade: reconfirma a chave na API do Asaas a cada consulta
        // de status (a UI consulta ao abrir a aba e periodicamente).
        let chaveValida = true
        let avisoValidacao = ''
        try {
          const recSecret = $app.findFirstRecordByData('integracoes_config', 'chave', 'asaas')
          const secretKey = recSecret.getString('valor_secreto') || ''
          const baseUrlCheck =
            cfgModo === 'producao' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3'
          const resCheck = $http.send({
            url: baseUrlCheck + '/customers?perPage=1',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              UserAgent: 'AjudanteIA/1.0',
              access_token: secretKey,
            },
            timeout: 10,
          })
          if (resCheck.statusCode === 401 || resCheck.statusCode === 403) {
            chaveValida = false
            avisoValidacao =
              'A chave salva foi rejeitada pelo Asaas. Desconecte e conecte uma chave válida.'
            try {
              recSecret.set('ultima_validacao_ok', false)
              recSecret.set('ultima_validacao_em', new Date().toISOString())
              $app.save(recSecret)
            } catch (_) {}
          } else if (resCheck.statusCode === 200) {
            try {
              recSecret.set('ultima_validacao_ok', true)
              recSecret.set('ultima_validacao_em', new Date().toISOString())
              $app.save(recSecret)
            } catch (_) {}
          }
        } catch (_) {
          // Falha de rede na checagem: não marca como inválida (evita falso negativo)
        }

        return e.json(200, {
          configurado: true,
          modo: cfgModo,
          status: 'conectado',
          origem: 'app',
          podeGerenciar: true,
          atualizadoPorNome: cfgNome,
          ultimaValidacaoOk: chaveValida,
          ultimaValidacaoEm: cfgValidacaoEm,
          aviso: avisoValidacao,
          mensagem: chaveValida
            ? 'Integração Asaas ativa (' +
              (cfgModo === 'producao' ? 'Produção' : 'Sandbox') +
              '). Cobranças Pix por voz já podem ser geradas.'
            : avisoValidacao,
        })
      }

      return e.json(200, {
        configurado: false,
        modo: 'sandbox',
        status: 'nao_configurado',
        origem: 'nenhuma',
        podeGerenciar: true,
        mensagem: 'Chave de API do Asaas ainda não conectada.',
      })
    } catch (err) {
      return e.json(500, { error: 'Erro ao verificar status do Asaas: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// 2. POST conectar — valida a chave na API do Asaas e só persiste se OK
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/asaas/gateway/conectar',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Autenticação necessária' })
    }
    // Exclusivo do Dono/Admin: Operador nunca vê nem configura o Gateway
    if (auth.getString('perfil') !== 'admin') {
      return e.json(403, {
        error:
          'Acesso negado. A configuração do gateway de pagamento é exclusiva do Dono (administrador).',
      })
    }

    try {
      const info = e.requestInfo()
      const body = info.body || {}
      const apiKey = (body.apiKey || '').trim()
      const modo = body.modo === 'producao' || body.modo === 'production' ? 'producao' : 'sandbox'

      if (!apiKey || apiKey.length < 10) {
        return e.json(400, {
          error: 'Cole a chave de API do Asaas para conectar.',
          erroAmigavel: 'Cole a chave de API do Asaas para conectar.',
        })
      }

      // 2.1 Validação real na API do Asaas (consulta de informações da conta)
      const baseUrl =
        modo === 'producao' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3'
      let validou = false
      let nomeConta = ''
      let erroAsaas = ''
      try {
        const resCheck = $http.send({
          url: baseUrl + '/my-account/commercial-info',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            UserAgent: 'AjudanteIA/1.0',
            access_token: apiKey,
          },
          timeout: 15,
        })
        if (resCheck.statusCode === 200) {
          validou = true
          if (resCheck.json && resCheck.json.name) nomeConta = resCheck.json.name
        } else if (resCheck.statusCode === 401 || resCheck.statusCode === 403) {
          erroAsaas = 'Chave inválida ou sem acesso — confira no painel do Asaas.'
        } else if (resCheck.statusCode === 404) {
          // Endpoint inexistente nesta base: confirma a chave com uma chamada
          // que existe em toda conta Asaas.
          try {
            const resList = $http.send({
              url: baseUrl + '/customers?perPage=1',
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                UserAgent: 'AjudanteIA/1.0',
                access_token: apiKey,
              },
              timeout: 15,
            })
            if (resList.statusCode === 200) {
              validou = true
            } else if (resList.statusCode === 401 || resList.statusCode === 403) {
              erroAsaas = 'Chave inválida ou sem acesso — confira no painel do Asaas.'
            } else {
              erroAsaas =
                'O Asaas respondeu ' +
                resList.statusCode +
                ' ao validar a chave. Tente novamente em instantes.'
            }
          } catch (errC) {
            erroAsaas =
              'Não consegui falar com o Asaas agora (' +
              (errC && errC.message ? errC.message : 'erro de rede') +
              '). Tente novamente.'
          }
        } else {
          erroAsaas =
            'O Asaas respondeu ' +
            resCheck.statusCode +
            ' ao validar a chave. Tente novamente em instantes.'
        }
      } catch (errNet) {
        erroAsaas =
          'Não consegui falar com o Asaas agora (' +
          (errNet && errNet.message ? errNet.message : 'erro de rede') +
          '). Verifique a conexão e tente novamente.'
      }

      if (!validou) {
        return e.json(400, {
          error: erroAsaas || 'Chave inválida ou sem acesso — confira no painel do Asaas.',
          erroAmigavel: erroAsaas || 'Chave inválida ou sem acesso — confira no painel do Asaas.',
          validou: false,
        })
      }

      // 2.2 Persistência (somente após validação OK) na coleção de integrações
      const col = $app.findCollectionByNameOrId('integracoes_config')
      let rec = null
      try {
        rec = $app.findFirstRecordByData('integracoes_config', 'chave', 'asaas')
      } catch (_) {
        rec = null
      }
      if (!rec) {
        rec = new Record(col)
        rec.set('chave', 'asaas')
      }
      rec.set('valor_secreto', apiKey)
      rec.set('modo', modo)
      rec.set('conectado', true)
      rec.set('ultima_validacao_em', new Date().toISOString())
      rec.set('ultima_validacao_ok', true)
      rec.set('atualizado_por_id', auth.id)
      rec.set('atualizado_por_nome', auth.getString('name') || 'Dono')
      $app.save(rec)

      return e.json(200, {
        success: true,
        modo: modo,
        status: 'conectado',
        contaNome: nomeConta,
        mensagem:
          'Asaas conectado com sucesso (' +
          (modo === 'producao' ? 'Produção' : 'Sandbox') +
          ')!' +
          (nomeConta ? ' Conta: ' + nomeConta + '.' : '') +
          (modo === 'producao'
            ? ''
            : ' Cobranças em sandbox são de teste — nenhum Pix real é gerado.'),
      })
    } catch (err) {
      return e.json(500, { error: 'Erro ao conectar o Asaas: ' + err.message })
    }
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// 3. POST desconectar — remove a chave salva no app
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/asaas/gateway/desconectar',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { error: 'Autenticação necessária' })
    }
    if (auth.getString('perfil') !== 'admin') {
      return e.json(403, {
        error:
          'Acesso negado. A configuração do gateway de pagamento é exclusiva do Dono (administrador).',
      })
    }

    try {
      try {
        const rec = $app.findFirstRecordByData('integracoes_config', 'chave', 'asaas')
        $app.delete(rec)
      } catch (_) {
        // nada salvo ainda — ok
      }
      return e.json(200, {
        success: true,
        status: 'nao_configurado',
        mensagem: 'Asaas desconectado. A chave foi removida do servidor.',
      })
    } catch (err) {
      return e.json(500, { error: 'Erro ao desconectar o Asaas: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
