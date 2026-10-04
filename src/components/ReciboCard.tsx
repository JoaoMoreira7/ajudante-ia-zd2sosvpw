import React from 'react'
import { ReciboItem, isReciboValido24h } from '@/lib/reciboEngine'
import {
  CheckCircle2,
  RotateCcw,
  Edit3,
  Clock,
  DollarSign,
  Package,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReciboCardProps {
  recibo: ReciboItem
  onDesfazer?: (recibo: ReciboItem) => void
  onEditar?: (recibo: ReciboItem) => void
  isOperador?: boolean
  isSimpleMode?: boolean
}

export const ReciboCard: React.FC<ReciboCardProps> = ({
  recibo,
  onDesfazer,
  onEditar,
  isOperador = false,
  isSimpleMode = false,
}) => {
  if (!recibo) return null

  const valido = isReciboValido24h(recibo)

  const getTipoConfig = (tipo: string) => {
    switch (tipo) {
      case 'material':
        return {
          label: 'Material em Estoque',
          badge: 'bg-emerald-600 text-white',
          border: 'border-emerald-500/50 bg-emerald-500/5',
          Icon: Package,
        }
      case 'gasto':
      case 'saida':
        return {
          label: 'Gasto / Despesa',
          badge: 'bg-amber-600 text-white',
          border: 'border-amber-500/50 bg-amber-500/5',
          Icon: DollarSign,
        }
      case 'recebimento':
      case 'pagamento':
        return {
          label: 'Recebimento',
          badge: 'bg-emerald-600 text-white',
          border: 'border-emerald-500/50 bg-emerald-500/5',
          Icon: DollarSign,
        }
      case 'parcelamento':
        return {
          label: 'Parcelamento',
          badge: 'bg-blue-600 text-white',
          border: 'border-blue-500/50 bg-blue-500/5',
          Icon: Calendar,
        }
      case 'atividade':
      default:
        return {
          label: 'Atividade no Diário',
          badge: 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900',
          border: 'border-border/80 bg-muted/30',
          Icon: CheckCircle2,
        }
    }
  }

  const config = getTipoConfig(recibo.tipo)
  const IconComponent = config.Icon

  return (
    <div
      className={`mt-2.5 rounded-2xl border-2 p-3 sm:p-4 shadow-xs transition-all ${
        config.border
      } ${isSimpleMode ? 'p-4 sm:p-5' : ''}`}
    >
      {/* Cabeçalho do Recibo */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              config.badge
            } ${isSimpleMode ? 'text-xs py-1 px-3' : ''}`}
          >
            <IconComponent className="w-3.5 h-3.5" />
            Recibo
          </span>
          <span className="text-xs font-semibold text-muted-foreground">{config.label}</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
          <Clock className="w-3 h-3" />
          <span>{valido ? 'Válido 24h' : 'Expirado'}</span>
        </div>
      </div>

      {/* Alteração anterior se foi editado por frase (Ex: valor era 120 -> passou a ser 92) */}
      {recibo.alteracaoAnterior && (
        <div className="mb-2.5 p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-1.5">
          <Edit3 className="w-3.5 h-3.5 shrink-0 text-blue-600" />
          <span>
            <strong>Atualizado por frase:</strong> {recibo.alteracaoAnterior.campo} era{' '}
            <span className="line-through opacity-70">{recibo.alteracaoAnterior.valorAntes}</span> →
            passou a ser <strong>{recibo.alteracaoAnterior.valorDepois}</strong>
          </span>
        </div>
      )}

      {/* Dados do que foi gravado */}
      <div className="space-y-1.5 text-xs sm:text-sm">
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground font-medium">Descrição:</span>
          <span className="font-bold text-foreground text-right">{recibo.descricao}</span>
        </div>

        {/* Quantidade se houver */}
        {recibo.quantidade !== undefined && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">Quantidade:</span>
            <span className="font-bold text-foreground">
              {recibo.quantidade} {recibo.unidade || 'un'}
            </span>
          </div>
        )}

        {/* Valor financeiro: respeita regra de perfil Operador (nunca mostra valores) */}
        {recibo.valor !== undefined && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">Valor:</span>
            <span className="font-bold text-foreground">
              {isOperador ? (
                <span className="text-muted-foreground italic font-normal">
                  [Reservado ao Dono]
                </span>
              ) : (
                `R$ ${recibo.valor.toFixed(2)}`
              )}
            </span>
          </div>
        )}

        {/* Categoria / Obra */}
        {recibo.categoria && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">Categoria / Obra:</span>
            <span className="font-semibold text-foreground capitalize">
              {recibo.obraNome || recibo.categoria}
            </span>
          </div>
        )}

        {/* Data e Status */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30 text-[11px] sm:text-xs">
          <span className="text-muted-foreground">Data: {recibo.data}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            {recibo.status || 'Gravado com sucesso'}
          </span>
        </div>
      </div>

      {/* Botões EDITAR e DESFAZER valendo 24h */}
      {valido && (
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-end gap-2">
          {onEditar && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEditar(recibo)}
              className="h-8 px-2.5 text-xs font-semibold gap-1 rounded-xl cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar por frase
            </Button>
          )}

          {onDesfazer && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDesfazer(recibo)}
              className="h-8 px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 gap-1 rounded-xl cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer
            </Button>
          )}
        </div>
      )}

      {!valido && (
        <div className="mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>Janela de 24 horas para edição imediata encerrada.</span>
        </div>
      )}
    </div>
  )
}
