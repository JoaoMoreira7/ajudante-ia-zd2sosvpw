import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ShieldAlert, AlertTriangle } from 'lucide-react'

interface BlockClientModalProps {
  isOpen: boolean
  onClose: () => void
  clienteNome: string
  clienteEmail: string
  userId: string
  onConfirm: (dados: {
    userId: string
    motivo: string
    tipoBloqueio: 'manual' | 'inadimplencia'
    notificarCliente: boolean
  }) => Promise<void>
}

export const BlockClientModal: React.FC<BlockClientModalProps> = ({
  isOpen,
  onClose,
  clienteNome,
  clienteEmail,
  userId,
  onConfirm,
}) => {
  const [motivo, setMotivo] = useState('')
  const [tipoBloqueio, setTipoBloqueio] = useState<'manual' | 'inadimplencia'>('manual')
  const [notificarCliente, setNotificarCliente] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motivo.trim()) {
      setErro('O motivo do bloqueio é obrigatório.')
      return
    }

    setErro(null)
    setIsSubmitting(true)
    try {
      await onConfirm({
        userId,
        motivo: motivo.trim(),
        tipoBloqueio,
        notificarCliente,
      })
      onClose()
    } catch (err: any) {
      setErro(err?.message || 'Não consegui bloquear este cliente no momento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <ShieldAlert className="w-5 h-5" />
            <DialogTitle className="text-lg font-black text-destructive">
              Bloquear Conta de Cliente
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Ao bloquear, o cliente é impedido imediatamente de criar ou editar orçamentos, obras e
            lançamentos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {erro && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive">
              {erro}
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted/40 border text-xs">
            <span className="text-muted-foreground block text-[11px]">Cliente Selecionado:</span>
            <span className="font-bold text-foreground text-sm block">{clienteNome}</span>
            <span className="text-muted-foreground">{clienteEmail}</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Tipo do Bloqueio</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={tipoBloqueio === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTipoBloqueio('manual')}
                className="text-xs font-bold"
              >
                Manual (Decisão Admin)
              </Button>
              <Button
                type="button"
                variant={tipoBloqueio === 'inadimplencia' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTipoBloqueio('inadimplencia')}
                className="text-xs font-bold"
              >
                Inadimplência
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {tipoBloqueio === 'manual'
                ? '⚠️ Regra do Dono: O bloqueio manual não sai automaticamente nem se houver pagamento posterior. Apenas o administrador poderá liberar.'
                : 'Pode ser regularizado caso a fatura seja quitada.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold">
                Motivo do Bloqueio <span className="text-destructive">* (Obrigatório)</span>
              </Label>
            </div>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Mensalidade não paga referente a fevereiro, aguardando comprovante."
              rows={3}
              className="text-xs resize-none"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Este motivo será exibido ao cliente na tela de bloqueio e registrado no log de
              auditoria.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
            <div>
              <span className="text-xs font-bold text-foreground block">
                Enviar aviso formal ao cliente
              </span>
              <span className="text-[10px] text-muted-foreground">
                Gera notificação no sino do app e registra intenção de e-mail
              </span>
            </div>
            <Switch checked={notificarCliente} onCheckedChange={setNotificarCliente} />
          </div>

          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Ação com auditoria completa. Seu usuário, IP e data/hora serão gravados no servidor.
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
              className="font-bold gap-2"
            >
              {isSubmitting ? 'Bloqueando...' : 'Confirmar Bloqueio Imediato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default BlockClientModal
