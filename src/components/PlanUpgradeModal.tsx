import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CATALOGO_PLANOS } from '@/lib/commercialEngine'
import { PlanoTipo } from '@/types/database'

interface PlanUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  titulo?: string
  mensagem: string
  planoSugerido?: PlanoTipo
}

export const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  titulo = 'Recurso Disponível no Plano Superior',
  mensagem,
  planoSugerido = 'profissional',
}) => {
  const navigate = useNavigate()
  const planoInfo = CATALOGO_PLANOS.find((p) => p.id === planoSugerido) || CATALOGO_PLANOS[1]

  const handleVerPlanos = () => {
    onClose()
    navigate('/planos')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-black text-center text-foreground">
            {titulo}
          </DialogTitle>
          <DialogDescription className="text-xs text-center leading-relaxed pt-1 text-muted-foreground">
            {mensagem}
          </DialogDescription>
        </DialogHeader>

        {/* Card do plano sugerido */}
        <div className="p-4 rounded-xl border bg-muted/30 space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              {planoInfo.nome}
            </span>
            <span className="text-sm font-black text-primary font-mono">
              R$ {planoInfo.precoMensal.toFixed(2).replace('.', ',')}/mês
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">{planoInfo.descricao}</p>
          <div className="pt-1 border-t text-[11px] text-foreground font-medium flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Liberação instantânea no seu aplicativo</span>
          </div>
        </div>

        <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto text-xs"
          >
            Voltar
          </Button>
          <Button
            type="button"
            onClick={handleVerPlanos}
            className="w-full sm:w-auto font-bold gap-2 text-xs"
          >
            Ver Planos e Fazer Upgrade
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PlanUpgradeModal
