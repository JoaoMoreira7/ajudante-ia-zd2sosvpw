// pocketbase/hooks/agent_interpret.js
// Endpoint customizado para interpretar comandos de voz/texto com o agente Skip Cloud "ajudante-ia"
// Segue rigorosamente a regra do Skip Cloud Hooks: variáveis e lógica inline dentro do callback

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
            extractedIntent = JSON.parse(jsonStr)
            friendlyText = rawContent.slice(0, markerIndex).trim()
            if (!friendlyText) {
              friendlyText = jsonSub.slice(endBrace + 1).trim()
            }
          }
        } catch (parseErr) {
          // Fallback se JSON falhar
        }
      }

      return e.json(200, {
        conversation_id: result.conversation_id,
        message_id: result.message_id,
        content: friendlyText || rawContent,
        intent: extractedIntent,
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
