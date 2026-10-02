// pocketbase/hooks/block_check.js
// Hook de segurança para impedir mutações em contas bloqueadas
// Clientes com status_conta 'bloqueado_manual' ou 'bloqueado_inadimplencia' não conseguem criar nem atualizar dados

onRecordCreateRequest(
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.next()
    }

    // Admins nunca são bloqueados
    if (auth.getString('perfil') === 'admin') {
      return e.next()
    }

    const statusConta = auth.getString('status_conta')
    if (statusConta === 'bloqueado_manual' || statusConta === 'bloqueado_inadimplencia') {
      const motivo = auth.getString('motivo_bloqueio') || 'Sua conta está suspensa.'
      return e.forbiddenError(
        'Operação bloqueada. Sua conta no Ajudante IA está suspensa (' +
          motivo +
          '). Entre em contato com o suporte/administrador para regularizar.',
      )
    }

    return e.next()
  },
  'clientes',
  'obras',
  'orcamentos',
  'financeiro',
  'materiais_estoque',
  'diario_obra',
  'documentos',
)

onRecordUpdateRequest(
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.next()
    }

    if (auth.getString('perfil') === 'admin') {
      return e.next()
    }

    const statusConta = auth.getString('status_conta')
    if (statusConta === 'bloqueado_manual' || statusConta === 'bloqueado_inadimplencia') {
      const motivo = auth.getString('motivo_bloqueio') || 'Sua conta está suspensa.'
      return e.forbiddenError(
        'Operação bloqueada. Sua conta no Ajudante IA está suspensa (' +
          motivo +
          '). Entre em contato com o suporte/administrador para regularizar.',
      )
    }

    return e.next()
  },
  'clientes',
  'obras',
  'orcamentos',
  'financeiro',
  'materiais_estoque',
  'diario_obra',
  'documentos',
)

onRecordDeleteRequest(
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.next()
    }

    if (auth.getString('perfil') === 'admin') {
      return e.next()
    }

    const statusConta = auth.getString('status_conta')
    if (statusConta === 'bloqueado_manual' || statusConta === 'bloqueado_inadimplencia') {
      const motivo = auth.getString('motivo_bloqueio') || 'Sua conta está suspensa.'
      return e.forbiddenError(
        'Operação bloqueada. Sua conta no Ajudante IA está suspensa (' +
          motivo +
          '). Entre em contato com o suporte/administrador para regularizar.',
      )
    }

    return e.next()
  },
  'clientes',
  'obras',
  'orcamentos',
  'financeiro',
  'materiais_estoque',
  'diario_obra',
  'documentos',
)
