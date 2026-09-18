import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Mic, HardHat, MoreHorizontal } from 'lucide-react'

interface BottomNavProps {
  onOpenVoice: () => void
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenVoice }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around h-16 px-2 lg:hidden shadow-lg safe-area-pb">
      {/* Início (casa) */}
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors ${
            isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          }`
        }
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span>Início</span>
      </NavLink>

      {/* Botão Falar (Microfone, maior, centralizado, cor primária) */}
      <div className="flex-1 flex justify-center -translate-y-3">
        <button
          onClick={onOpenVoice}
          type="button"
          aria-label="Abrir assistente por voz"
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all pulse-falar border-4 border-background"
        >
          <Mic className="w-7 h-7" />
        </button>
      </div>

      {/* Obras (capacete) */}
      <NavLink
        to="/obras"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors ${
            isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          }`
        }
      >
        <HardHat className="w-5 h-5 mb-0.5" />
        <span>Obras</span>
      </NavLink>

      {/* Mais (Menu / Ferramentas / Configurações) */}
      <NavLink
        to="/configuracoes"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors ${
            isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          }`
        }
      >
        <MoreHorizontal className="w-5 h-5 mb-0.5" />
        <span>Mais</span>
      </NavLink>
    </nav>
  )
}
