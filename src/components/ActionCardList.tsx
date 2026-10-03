import React from 'react'
import { CardAcaoItem } from '@/contexts/VoiceContext'
import { Volume2, Package, AlertTriangle, DollarSign, Calculator, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ActionCardListProps {
  cards: CardAcaoItem[]
  onSpeak: (text: string) => void
  isSimpleMode?: boolean
}

export const ActionCardList: React.FC<ActionCardListProps> = ({
  cards,
  onSpeak,
  isSimpleMode = false,
}) => {
  if (!cards || cards.length === 0) return null

  const getStyleForCard = (tipo: string, status: string) => {
    switch (tipo) {
      case 'material':
        return {
          border:
            'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100',
          badge: 'bg-emerald-600 text-white',
          badgeText: '🟩 Material',
          Icon: Package,
        }
      case 'ocorrencia':
        return {
          border: 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-100',
          badge: 'bg-red-600 text-white',
          badgeText: '🟥 Ocorrência',
          Icon: AlertTriangle,
        }
      case 'financeiro':
        return {
          border:
            'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100',
          badge: 'bg-amber-600 text-white',
          badgeText: '🟨 Financeiro',
          Icon: DollarSign,
        }
      case 'calculo':
        return {
          border: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100',
          badge: 'bg-blue-600 text-white',
          badgeText: '🟦 Cálculo',
          Icon: Calculator,
        }
      default:
        return {
          border:
            'border-slate-400 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100',
          badge: 'bg-slate-600 text-white',
          badgeText: 'Aviso',
          Icon: Info,
        }
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 w-full">
      {cards.map((card) => {
        const style = getStyleForCard(card.tipo, card.status)
        const IconComponent = style.Icon

        return (
          <div
            key={card.id}
            className={`border-2 rounded-xl p-3.5 shadow-sm transition-all flex flex-col justify-between ${
              style.border
            } ${isSimpleMode ? 'p-5 text-lg' : ''}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    style.badge
                  } ${isSimpleMode ? 'text-sm py-1 px-3' : ''}`}
                >
                  <IconComponent className={isSimpleMode ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
                  {style.badgeText}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSpeak(card.ttsTexto || `${card.titulo}. ${card.resumo}`)}
                  className="h-8 w-8 p-0 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                  title="Ouvir em voz alta"
                >
                  <Volume2 className={isSimpleMode ? 'w-5 h-5' : 'w-4 h-4'} />
                  <span className="sr-only">Ouvir este item</span>
                </Button>
              </div>

              <h4
                className={`font-bold leading-tight ${isSimpleMode ? 'text-xl font-black mb-1' : 'text-sm'}`}
              >
                {card.titulo}
              </h4>
              <p
                className={`font-semibold mt-1 text-slate-800 dark:text-slate-200 ${
                  isSimpleMode ? 'text-lg font-bold' : 'text-sm'
                }`}
              >
                {card.resumo}
              </p>
              {card.detalhe && (
                <p
                  className={`text-xs opacity-80 mt-1 line-clamp-2 ${isSimpleMode ? 'text-sm' : ''}`}
                >
                  {card.detalhe}
                </p>
              )}
            </div>

            <div className="mt-2.5 pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-medium opacity-75 uppercase">
                {card.status === 'sucesso' ? 'Registrado com sucesso' : 'Anotado no diário'}
              </span>
              <button
                type="button"
                onClick={() => onSpeak(card.ttsTexto || card.resumo)}
                className="text-xs font-bold flex items-center gap-1 text-primary hover:underline"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Ouvir
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
