// pocketbase/hooks/agent_interpret.js
// Endpoint customizado para conversar com o agente Skip Cloud "ajudante-ia" nativo
// Segue rigorosamente a convenção do Skip Cloud Hooks: variáveis e lógica inline dentro do callback,
// suportando persistência de conversação, histórico e extração segura de parâmetros.

routerAdd(
  'POST',
  '/backend/v1/interpret',
  (e) => {
    try {
      const info = e.requestInfo()
      const body = info.body || {}
      const message = (body.message || '').trim()
      if (!message) {
        return e.badRequestError('Mensagem é obrigatória')
      }

      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
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

      // Procura por INTENT_JSON: na resposta do agente
      const intentMarker = 'INTENT_JSON:'
      const markerIndex = rawContent.indexOf(intentMarker)
      let friendlyText = rawContent

      if (markerIndex !== -1) {
        const jsonSub = rawContent.slice(markerIndex + intentMarker.length).trim()
        try {
          // Encontra o fim do bloco JSON
          const endBrace = jsonSub.lastIndexOf('}')
          if (endBrace !== -1) {
            const jsonStr = jsonSub.slice(0, endBrace + 1)
            const parsedObj = JSON.parse(jsonStr)
            if (parsedObj && typeof parsedObj === 'object') {
              extractedIntent = parsedObj.intent || parsedObj.name || null
              extractedParams = parsedObj.params || parsedObj
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

// Endpoint para streaming em tempo real do assistente nativo
routerAdd(
  'POST',
  '/backend/v1/chat-stream',
  (e) => {
    try {
      const info = e.requestInfo()
      const body = info.body || {}
      const message = (body.message || '').trim()
      if (!message) {
        return e.badRequestError('Mensagem é obrigatória')
      }

      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

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
