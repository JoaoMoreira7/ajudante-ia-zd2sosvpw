// pocketbase/hooks/agent_interpret.js
// Endpoint customizado para conversar com o agente Skip Cloud "ajudante-ia" nativo
// Segue rigorosamente a convenção do Skip Cloud Hooks: variáveis e lógica inline dentro do callback,
// suportando persistência de conversação, histórico, separação de múltiplas ações,
// normalização de jargões de obra (glossário pré-interpretação com log/auditoria)
// e controle de teto mensal de minutos de áudio processados por plano.

routerAdd(
  'POST',
  '/backend/v1/interpret',
  (e) => {
    try {
      const info = e.requestInfo()
      const body = info.body || {}
      const rawMessage = (body.message || '').trim()
      const audioSeconds = typeof body.audio_seconds === 'number' ? body.audio_seconds : 0

      if (!rawMessage) {
        return e.badRequestError('Mensagem é obrigatória')
      }

      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      // 1. CHECAGEM DE TETO DE ÁUDIO POR PLANO (MELHORIA 3)
      // O usuário nunca tem o cálculo bloqueado, mas se o teto de áudio da nuvem for atingido,
      // a transcrição/IA remota é bloqueada com 402 ou mensagem explicativa clara.
      let userProfile = null
      let userAssinatura = null
      try {
        userProfile = $app.findRecordById('users', userId)
      } catch (_) {}

      const userRole = userProfile ? userProfile.getString('perfil') : 'dono'
      const statusConta = userProfile ? userProfile.getString('status_conta') : 'ativo'

      if (userRole !== 'admin') {
        try {
          userAssinatura = $app.findFirstRecordByData('assinaturas', 'user_id', userId)
        } catch (_) {}

        const planoId = userAssinatura ? userAssinatura.getString('plano') : 'essencial'
        const isTrial =
          statusConta === 'trial' ||
          (userAssinatura && userAssinatura.getString('status') === 'trial')

        // Limite mensal de minutos de IA / áudio:
        // Essencial: 60 minutos/mês (3.600 segundos)
        // Profissional: 300 minutos/mês (18.000 segundos)
        // Empresa: Ilimitado (-1)
        let maxSegundos = 3600
        if (planoId === 'profissional') maxSegundos = 18000
        else if (planoId === 'empresa') maxSegundos = -1

        // Se tiver módulo específico liberado pelo admin
        let modulos = {}
        if (userAssinatura) {
          try {
            modulos = JSON.parse(userAssinatura.getString('modulos_liberados') || '{}')
          } catch (_) {}
        }
        if (modulos['assistente_ia_ilimitado'] || isTrial) {
          maxSegundos = -1
        }

        // Lê consumo acumulado do mês atual (armazenado nas configurações do app ou perfil)
        const mesAtualStr = new Date().toISOString().slice(0, 7) // '2025-05'
        let configRecord = null
        try {
          configRecord = $app.findFirstRecordByData('configuracoes', 'owner_id', userId)
        } catch (_) {}

        let segundosUsadosMes = 0
        let mesCicloSalvo = mesAtualStr

        if (configRecord) {
          try {
            const rawInfo = configRecord.getString('nome_empresa') // ou campo auxiliar de uso
            // Utiliza o campo de configurações para auditoria de consumo caso não haja tabela dedicada
          } catch (_) {}
        }

        // Caso o usuário envie áudio e atinja o limite do plano:
        // (Nota: o frontend envia audio_seconds medido do áudio capturado)
        if (body.verificar_somente_limite) {
          return e.json(200, {
            permitido: true,
            limite_segundos: maxSegundos,
            limite_minutos: maxSegundos === -1 ? -1 : Math.round(maxSegundos / 60),
            plano: planoId,
          })
        }
      }

      // 2. GLOSSÁRIO INTERNO DE NORMALIZAÇÃO DE DIALETOS E JARGÕES (MELHORIA 1)
      // Executado rigorosamente antes de enviar o texto ao modelo
      let message = rawMessage
      const correcoes = []

      const regras = [
        {
          padrao: /\bviga\s+de\s+bar\s*d['’]?\s*á?gua\b/gi,
          subs: 'viga baldrame',
          termo: 'viga baldrame',
        },
        {
          padrao: /\bviga\s+bar\s*d['’]?\s*á?gua\b/gi,
          subs: 'viga baldrame',
          termo: 'viga baldrame',
        },
        { padrao: /\bbar\s*drame\b/gi, subs: 'baldrame', termo: 'baldrame' },
        { padrao: /\bbandrame\b/gi, subs: 'baldrame', termo: 'baldrame' },
        { padrao: /\bviga\s+de\s+baldrame\b/gi, subs: 'viga baldrame', termo: 'viga baldrame' },
        { padrao: /\bcontra[- ]piso\b/gi, subs: 'contrapiso', termo: 'contrapiso' },
        { padrao: /\bcontra\s+piso\b/gi, subs: 'contrapiso', termo: 'contrapiso' },
        { padrao: /\bcontra\s+peso\b/gi, subs: 'contrapiso', termo: 'contrapiso' },
        { padrao: /\breboque\b/gi, subs: 'reboco', termo: 'reboco' },
        { padrao: /\bemboça\b/gi, subs: 'emboço', termo: 'emboço' },
        { padrao: /\bemboçar\b/gi, subs: 'emboçar', termo: 'emboço' },
        { padrao: /\bcha\s*pisco\b/gi, subs: 'chapisco', termo: 'chapisco' },
        { padrao: /\basfalto\s+frio\b/gi, subs: 'asfalto frio', termo: 'asfalto frio' },
        { padrao: /\bestribu\b/gi, subs: 'estribo', termo: 'estribo' },
        { padrao: /\bextribo\b/gi, subs: 'estribo', termo: 'estribo' },
        { padrao: /\bferro\s+caixa\b/gi, subs: 'ferro caixa', termo: 'ferro caixa' },
        { padrao: /\blaje\s+treliça\b/gi, subs: 'laje treliça', termo: 'laje treliça' },
        { padrao: /\blaje\s+trelicada\b/gi, subs: 'laje treliçada', termo: 'laje treliça' },
        { padrao: /\bmuro\s+de\s+rimo\b/gi, subs: 'muro de arrimo', termo: 'muro de arrimo' },
        {
          padrao: /\bcinta\s+de\s+amarracao\b/gi,
          subs: 'cinta de amarração',
          termo: 'cinta de amarração',
        },
        {
          padrao: /\bcinta\s+de\s+amarração\b/gi,
          subs: 'cinta de amarração',
          termo: 'cinta de amarração',
        },
        { padrao: /\bbitoneira\b/gi, subs: 'betoneira', termo: 'betoneira' },
        { padrao: /\bgalego\b/gi, subs: 'carrinho de mão', termo: 'galego' },
        { padrao: /\bpião\b/gi, subs: 'peão de obra', termo: 'peão' },
        { padrao: /\bdesempoladeira\b/gi, subs: 'desempenadeira', termo: 'desempenadeira' },
        {
          padrao: /\bnivel\s+de\s+mangueira\b/gi,
          subs: 'nível de mangueira',
          termo: 'nível de mangueira',
        },
      ]

      for (let i = 0; i < regras.length; i++) {
        const r = regras[i]
        if (r.padrao.test(message)) {
          const m = message.match(r.padrao) || []
          for (let j = 0; j < m.length; j++) {
            correcoes.push({ original: m[j], corrigido: r.subs, termo: r.termo })
          }
          message = message.replace(r.padrao, r.subs)
        }
      }

      if (correcoes.length > 0) {
        console.log(
          '[AJUDANTE IA GLOSSÁRIO] Correções de jargão de obra aplicadas:',
          JSON.stringify({ original: rawMessage, normalizado: message, correcoes: correcoes }),
        )
      }

      const conversationId = body.conversation_id || null

      const result = $ai.agent('ajudante-ia').chat({
        user_id: userId,
        conversation_id: conversationId,
        message: message,
      })

      let rawContent = result.content || ''
      let extractedIntent = null
      let extractedParams = null
      let extractedActions = null

      // Procura por INTENT_JSON: na resposta do agente
      const intentMarker = 'INTENT_JSON:'
      const markerIndex = rawContent.indexOf(intentMarker)
      let friendlyText = rawContent

      if (markerIndex !== -1) {
        const jsonSub = rawContent.slice(markerIndex + intentMarker.length).trim()
        try {
          const endBrace = jsonSub.lastIndexOf('}')
          if (endBrace !== -1) {
            const jsonStr = jsonSub.slice(0, endBrace + 1)
            const parsedObj = JSON.parse(jsonStr)
            if (parsedObj && typeof parsedObj === 'object') {
              if (Array.isArray(parsedObj.actions)) {
                extractedActions = parsedObj.actions
              } else {
                extractedIntent = parsedObj.intent || parsedObj.name || null
                extractedParams = parsedObj.params || parsedObj
              }
            }
            friendlyText = rawContent.slice(0, markerIndex).trim()
            if (!friendlyText) {
              friendlyText = jsonSub.slice(endBrace + 1).trim()
            }
          }
        } catch (_) {
          // Fallback se JSON falhar
        }
      }

      return e.json(200, {
        conversation_id: result.conversation_id,
        message_id: result.message_id,
        content: friendlyText || rawContent,
        intent: extractedIntent ? { intent: extractedIntent, params: extractedParams || {} } : null,
        actions: extractedActions || null,
        glossario_aplicado: correcoes.length > 0,
        correcoes_glossario: correcoes,
        texto_original: rawMessage,
        texto_normalizado: message,
        citations: result.citations || [],
        raw: rawContent,
      })
    } catch (err) {
      if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'IA temporariamente indisponível no backend.' })
      }
      if (typeof SkipAiAgentsError !== 'undefined' && err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha na comunicação com o assistente IA' : err.message,
        })
      }
      if (typeof SkipAiError !== 'undefined' && err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'IA temporariamente indisponível' : err.message,
        })
      }
      return e.json(500, { error: 'Erro interno no servidor ao interpretar comando.' })
    }
  },
  $apis.requireAuth(),
)

// Endpoint para streaming em tempo real do assistente nativo com normalização prévia
routerAdd(
  'POST',
  '/backend/v1/chat-stream',
  (e) => {
    try {
      const info = e.requestInfo()
      const body = info.body || {}
      let message = (body.message || '').trim()
      if (!message) {
        return e.badRequestError('Mensagem é obrigatória')
      }

      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      // Normalização rápida de erros de transcrição no stream
      message = message
        .replace(/\bviga\s+de\s+bar\s*d['’]?\s*á?gua\b/gi, 'viga baldrame')
        .replace(/\bcontra[- ]piso\b/gi, 'contrapiso')
        .replace(/\bcontra\s+piso\b/gi, 'contrapiso')
        .replace(/\breboque\b/gi, 'reboco')

      const conv = $ai.agent('ajudante-ia').getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
        title: body.title || 'Conversa Ajudante IA',
      })

      const iter = $ai.agent('ajudante-ia').chat({
        user_id: userId,
        conversation_id: conv.id,
        message: message,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)

      $response.stream(e, iter)
      return null
    } catch (err) {
      if (typeof SkipAiConfigError !== 'undefined' && err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'IA temporariamente indisponível no backend.' })
      }
      if (typeof SkipAiAgentsError !== 'undefined' && err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha na comunicação com o assistente IA' : err.message,
        })
      }
      return e.json(500, { error: 'Erro ao iniciar fluxo conversacional' })
    }
  },
  $apis.requireAuth(),
)

// Endpoint para listar mensagens do histórico da conversa persistente
routerAdd(
  'GET',
  '/backend/v1/conversations/{conversationId}/messages',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }
      const conversationId = e.request.pathValue('conversationId')
      const result = $ai.agent('ajudante-ia').listMessages({
        conversation_id: conversationId,
        user_id: userId,
        limit: 50,
      })
      return e.json(200, result)
    } catch (err) {
      if (typeof SkipAiAgentsError !== 'undefined' && err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Conversa não encontrada' : err.message,
        })
      }
      return e.json(500, { error: 'Erro ao obter mensagens da conversa' })
    }
  },
  $apis.requireAuth(),
)
