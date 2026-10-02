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
import { CheckCircle2 } from 'lucide-react'

interface UnblockClientModalProps {
  isOpen: boolean
  onClose: () => void
  clienteNome: string
  clienteEmail: string
  userId: string
  onConfirm: (userId: string, observacoes: string) => Promise<void>
}

export const UnblockClientModal: React.FC<UnblockClientModalProps> = ({
  isOpen,
  onClose,
  clienteNome,
  clienteEmail,
  userId,
  onConfirm,
}) => {
  const [observacoes, setObservacoes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setIsSubmitting(true)
    try {
      await onConfirm(userId, observacoes.trim())
      onClose()
    } catch (err: any) {
      setErro(err?.message || 'Não consegui liberar este cliente no momento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <CheckCircle2 className="w-5 h-5" />
            <DialogTitle className="text-lg font-black text-foreground">
              Liberar Conta do Cliente
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Devolve o acesso total imediatamente ao cliente. O status de bloqueio será removido no
            servidor.
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
            <Label className="text-xs font-bold">Observações da Liberação (Opcional)</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Pagamento confirmado via Pix no dia 15/03. Acesso normalizado."
              rows={3}
              className="text-xs resize-none"
            />
            <p className="text-[10px] text-muted-foreground">
              Será registrado no histórico da assinatura e nos logs de auditoria.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Liberando...' : 'Confirmar Liberação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default UnblockClientModal
