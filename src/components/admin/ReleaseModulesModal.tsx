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
import { Switch } from '@/components/ui/switch'
import { Layers } from 'lucide-react'

interface ReleaseModulesModalProps {
  isOpen: boolean
  onClose: () => void
  clienteNome: string
  clienteEmail: string
  userId: string
  modulosAtuais?: Record<string, boolean>
  onConfirm: (userId: string, modulos: Record<string, boolean>) => Promise<void>
}

const MODULOS_DISPONIVEIS = [
  {
    id: 'calculadora_avancada',
    nome: 'Calculadora de Obra Avançada',
    desc: 'Cálculos de lajes, vigas, margem de lucro e perdas',
  },
  {
    id: 'diario_obra_geoloc',
    nome: 'Diário de Obra com Geolocalização',
    desc: 'Registro de fotos com GPS e carimbo de data/hora',
  },
  {
    id: 'documentos_personalizados',
    nome: 'Documentos Timbrados (Logo/PDF)',
    desc: 'Emissão de recibos, ordens de serviço e relatórios',
  },
  {
    id: 'assistente_ia_ilimitado',
    nome: 'Assistente IA Ilimitado',
    desc: 'Comandos de voz e interpretação contínua sem limite',
  },
  {
    id: 'gestao_equipes',
    nome: 'Gestão de Múltiplas Equipes',
    desc: 'Divisão de mestres e operadores de canteiro',
  },
  {
    id: 'exportacao_erp',
    nome: 'Exportação Avançada (Excel/ERP)',
    desc: 'Planilhas abertas para contabilidade e compras',
  },
]

export const ReleaseModulesModal: React.FC<ReleaseModulesModalProps> = ({
  isOpen,
  onClose,
  clienteNome,
  clienteEmail,
  userId,
  modulosAtuais = {},
  onConfirm,
}) => {
  const [modulos, setModulos] = useState<Record<string, boolean>>(modulosAtuais)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const toggleModulo = (id: string, checked: boolean) => {
    setModulos((prev) => ({ ...prev, [id]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setIsSubmitting(true)
    try {
      await onConfirm(userId, modulos)
      onClose()
    } catch (err: any) {
      setErro(err?.message || 'Não consegui atualizar os módulos.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Layers className="w-5 h-5" />
            <DialogTitle className="text-lg font-black text-foreground">
              Liberar Módulos Sob Medida
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Habilite ou desabilite recursos customizados especificamente para esta conta de cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {erro && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive">
              {erro}
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted/40 border text-xs">
            <span className="text-muted-foreground block text-[11px]">Cliente:</span>
            <span className="font-bold text-foreground text-sm block">{clienteNome}</span>
            <span className="text-muted-foreground">{clienteEmail}</span>
          </div>

          <div className="space-y-2.5">
            {MODULOS_DISPONIVEIS.map((mod) => (
              <div
                key={mod.id}
                className="p-3 rounded-xl bg-card border flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-foreground block">{mod.nome}</span>
                  <span className="text-[11px] text-muted-foreground">{mod.desc}</span>
                </div>
                <Switch
                  checked={Boolean(modulos[mod.id])}
                  onCheckedChange={(checked) => toggleModulo(mod.id, checked)}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="font-bold">
              {isSubmitting ? 'Salvando...' : 'Salvar Módulos'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ReleaseModulesModal
