// pocketbase/hooks/agent_interpret.js
// Endpoint customizado e otimizado para conversar com o agente Skip Cloud "ajudante-ia" nativo
// Segue rigorosamente a convenção do Skip Cloud Hooks: variáveis e lógica inline dentro do callback,
// suportando persistência de conversação, histórico, separação de múltiplas ações,
// normalização rápida de jargões de obra e controle de teto mensal de minutos de áudio.

routerAdd(
  'POST',
  '/backend/v1/interpret',
  (e) => {
    try {
      const info = e.requestInfo()
      const body = info.body || {}
      const rawMessage = (body.message || '').trim()

      if (!rawMessage) {
        return e.badRequestError('Mensagem é obrigatória')
      }

      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      // 1. CHECAGEM RÁPIDA DE TETO DE ÁUDIO SE SOLICITADO EXPLICITAMENTE
      if (body.verificar_somente_limite) {
        let userAssinatura = null
        try {
          userAssinatura = $app.findFirstRecordByData('assinaturas', 'user_id', userId)
        } catch (_) {}

        const planoId = userAssinatura ? userAssinatura.getString('plano') : 'essencial'
        let maxSegundos = 3600
        if (planoId === 'profissional') maxSegundos = 18000
        else if (planoId === 'empresa') maxSegundos = -1

        return e.json(200, {
          permitido: true,
          limite_segundos: maxSegundos,
          limite_minutos: maxSegundos === -1 ? -1 : Math.round(maxSegundos / 60),
          plano: planoId,
        })
      }

      // 2. GLOSSÁRIO DE NORMALIZAÇÃO ÁGIL DE JARGÕES E DIALETOS
      // Substituições compiladas e diretas para mínimo overhead de CPU
      let message = rawMessage
      const correcoes = []

      // Normalizações essenciais requeridas
      const substituicoes = [
        [/\bviga\s+de\s+bar\s*d['’]?\s*á?gua\b/gi, 'viga baldrame', 'viga baldrame'],
        [/\bviga\s+bar\s*d['’]?\s*á?gua\b/gi, 'viga baldrame', 'viga baldrame'],
        [/\bviga\s+de\s+baldrame\b/gi, 'viga baldrame', 'viga baldrame'],
        [/\bbar\s*d['’]?\s*á?gua\b/gi, 'baldrame', 'baldrame'],
        [/\bbardame\b/gi, 'baldrame', 'baldrame'],
        [/\bbar\s*drame\b/gi, 'baldrame', 'baldrame'],
        [/\bbandrame\b/gi, 'baldrame', 'baldrame'],
        [/\bcontra[- ]piso\b/gi, 'contrapiso', 'contrapiso'],
        [/\bcontra\s+piso\b/gi, 'contrapiso', 'contrapiso'],
        [/\breboque\b/gi, 'reboco', 'reboco'],
        [/\bemboçar?\b/gi, 'emboço', 'emboço'],
        [/\basfalto\s+frio\b/gi, 'asfalto frio', 'asfalto frio'],
        [/\bestribu\b/gi, 'estribo', 'estribo'],
        [/\bextribo\b/gi, 'estribo', 'estribo'],
        [/\bferro\s+caixa\b/gi, 'ferro caixa', 'ferro caixa'],
        [/\blaje\s+treli[çc]ad?a\b/gi, 'laje treliça', 'laje treliça'],
        [/\bmuro\s+de\s+rimo\b/gi, 'muro de arrimo', 'muro de arrimo'],
        [/\bcinta\s+de\s+amarra[çc][ãa]o\b/gi, 'cinta de amarração', 'cinta de amarração'],
        [/\bbitoneira\b/gi, 'betoneira', 'betoneira'],
        [/\bgalego\b/gi, 'carrinho de mão', 'galego'],
        [/\bpião\b/gi, 'peão de obra', 'peão'],
        [/\bdesempoladeira\b/gi, 'desempenadeira', 'desempenadeira'],
        [/\bnivel\s+de\s+mangueira\b/gi, 'nível de mangueira', 'nível de mangueira'],
      ]

      for (let i = 0; i < substituicoes.length; i++) {
        const item = substituicoes[i]
        const padrao = item[0]
        const subs = item[1]
        const termo = item[2]
        if (padrao.test(message)) {
          const m = message.match(padrao) || []
          for (let j = 0; j < m.length; j++) {
            correcoes.push({ original: m[j], corrigido: subs, termo: termo })
          }
          message = message.replace(padrao, subs)
        }
      }

      const conversationId = body.conversation_id || null

      const result = $ai.agent('ajudante-ia').chat({
        user_id: userId,
        conversation_id: conversationId,
        message: message,
      })

      const rawContent = result.content || ''
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
        .replace(/\bbardame\b/gi, 'baldrame')
        .replace(/\bbar\s*d['’]?\s*á?gua\b/gi, 'baldrame')
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
