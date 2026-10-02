import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  Mic,
  Calculator,
  Users,
  HardHat,
  FileSpreadsheet,
  DollarSign,
  Package,
  Wrench,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface SidebarProps {
  onOpenVoice: () => void
}

const navItems = [
  { label: 'Início', path: '/', icon: Home },
  { label: 'Falar com IA', path: '/falar', icon: Mic, highlight: true },
  { label: 'Calculadora', path: '/calculadora', icon: Calculator },
  { label: 'Clientes', path: '/clientes', icon: Users },
  { label: 'Obras', path: '/obras', icon: HardHat },
  { label: 'Orçamentos', path: '/orcamentos', icon: FileSpreadsheet },
  { label: 'Financeiro', path: '/financeiro', icon: DollarSign },
  { label: 'Materiais', path: '/materiais', icon: Package },
  { label: 'Ferramentas', path: '/ferramentas', icon: Wrench },
  { label: 'Configurações', path: '/configuracoes', icon: Settings },
  { label: 'Painel Admin', path: '/admin', icon: ShieldCheck, adminOnly: true },
]

export const DesktopSidebar: React.FC<SidebarProps> = ({ onOpenVoice }) => {
  const { isOperador, isAdmin } = useAuth()

  const itensFiltrados = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false
    }
    if (isOperador) {
      // Oculta finanças e orçamentos da barra lateral para o perfil Operador
      if (item.path === '/financeiro' || item.path === '/orcamentos') {
        return false
      }
    }
    return true
  })

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/60 backdrop-blur p-4 shrink-0 min-h-[calc(100vh-61px)]">
      {/* Botão de Destaque Falar */}
      <button
        type="button"
        onClick={onOpenVoice}
        className="w-full mb-6 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary/95 hover:scale-[1.02] active:scale-[0.98] transition-all pulse-falar text-sm cursor-pointer"
      >
        <Mic className="w-5 h-5" />
        <span>FALAR COM AJUDANTE</span>
      </button>

      {/* Navegação Principal */}
      <nav className="flex flex-col gap-1 flex-1">
        {itensFiltrados.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Caixa de status do sistema */}
      <div className="mt-auto pt-4 border-t border-border">
        <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Ajudante IA v0.0.2</p>
          <p className="text-[11px] mt-0.5">100% Funcional Offline</p>
          <p className="text-[10px] text-muted-foreground/80 mt-1">Motor determinístico ativo</p>
        </div>
      </div>
    </aside>
  )
}
