import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Bell, Check, Info, ShieldAlert, CheckCircle2, DollarSign } from 'lucide-react'
import { NotificacaoSistema } from '@/types/database'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface NotificationBellProps {
  userId?: string
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [notificacoes, setNotificacoes] = useState<NotificacaoSistema[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const carregarNotificacoes = async () => {
    if (!pb.authStore.isValid || !userId) {
      // Mock inicial offline
      const stored = localStorage.getItem('ajudante_notificacoes_mock')
      if (stored) {
        try {
          setNotificacoes(JSON.parse(stored))
          return
        } catch {
          /* intentionally ignored */
        }
      }
      return
    }

    try {
      const records = await pb.collection('notificacoes_sistema').getList(1, 20, {
        filter: `user_id = "${userId}"`,
        sort: '-created',
        requestKey: null,
      })
      const items: NotificacaoSistema[] = records.items.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        titulo: r.titulo,
        mensagem: r.mensagem,
        tipo: r.tipo,
        lida: Boolean(r.lida),
        created: r.created,
      }))
      setNotificacoes(items)
      localStorage.setItem('ajudante_notificacoes_mock', JSON.stringify(items))
    } catch (_) {
      const stored = localStorage.getItem('ajudante_notificacoes_mock')
      if (stored) {
        try {
          setNotificacoes(JSON.parse(stored))
        } catch {
          /* intentionally ignored */
        }
      }
    }
  }

  useEffect(() => {
    carregarNotificacoes()
    const interval = setInterval(carregarNotificacoes, 30000)
    return () => clearInterval(interval)
  }, [userId])

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  const marcarComoLida = async (id: string) => {
    const atualizadas = notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n))
    setNotificacoes(atualizadas)
    localStorage.setItem('ajudante_notificacoes_mock', JSON.stringify(atualizadas))

    if (pb.authStore.isValid && !id.startsWith('mock_')) {
      try {
        await pb.collection('notificacoes_sistema').update(id, { lida: true })
      } catch {
        /* intentionally ignored */
      }
    }
  }

  const marcarTodasLidas = async () => {
    const atualizadas = notificacoes.map((n) => ({ ...n, lida: true }))
    setNotificacoes(atualizadas)
    localStorage.setItem('ajudante_notificacoes_mock', JSON.stringify(atualizadas))

    for (const n of notificacoes.filter((item) => !item.lida)) {
      if (pb.authStore.isValid && !n.id.startsWith('mock_')) {
        try {
          await pb.collection('notificacoes_sistema').update(n.id, { lida: true })
        } catch {
          /* intentionally ignored */
        }
      }
    }
  }

  const getIcone = (tipo: NotificacaoSistema['tipo']) => {
    switch (tipo) {
      case 'bloqueio':
        return <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
      case 'liberacao':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      case 'venda_ativada':
        return <DollarSign className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notificações do sistema"
          className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {naoLidas > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black flex items-center justify-center animate-pulse">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-xl">
        <div className="p-3 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">Notificações</span>
            {naoLidas > 0 && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                {naoLidas} nova(s)
              </Badge>
            )}
          </div>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={marcarTodasLidas}
              className="text-xs h-7 text-muted-foreground hover:text-foreground"
            >
              Marcar lidas
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {notificacoes.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhuma notificação no momento.
            </div>
          ) : (
            notificacoes.map((item) => (
              <div
                key={item.id}
                onClick={() => marcarComoLida(item.id)}
                className={`p-3 text-left transition-colors cursor-pointer flex gap-3 ${
                  !item.lida ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'
                }`}
              >
                {getIcone(item.tipo)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-xs ${!item.lida ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}
                    >
                      {item.titulo}
                    </p>
                    {!item.lida && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-3">
                    {item.mensagem}
                  </p>
                  {item.created && (
                    <span className="text-[9px] text-muted-foreground/70 mt-1 block">
                      {new Date(item.created).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(item.created).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationBell
