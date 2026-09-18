import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, HardHat, Sparkles, Feather } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Link } from 'react-router-dom'

export const TopBar: React.FC = () => {
  const { config, setModo } = useAuth()
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 py-2.5 flex items-center justify-between shadow-xs">
      {/* Wordmark à esquerda */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-xs group-hover:scale-105 transition-transform">
          <HardHat className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-lg tracking-tight text-foreground leading-none flex items-center gap-1.5">
            AJUDANTE IA
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono px-1 py-0 border-primary/40 text-primary"
            >
              Construção
            </Badge>
          </span>
          <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
            Você fala. Ele calcula e organiza.
          </span>
        </div>
      </Link>

      {/* Ações à direita: Alternador de Modo e Indicador Online/Offline */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Alternador de Modo */}
        <div className="flex items-center gap-1">
          <Select value={config.modo} onValueChange={(val: any) => setModo(val)}>
            <SelectTrigger className="h-8 text-xs font-semibold bg-muted/60 border-muted-foreground/20 px-2.5 rounded-lg w-[130px] sm:w-[155px]">
              <SelectValue placeholder="Modo" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="simples" className="text-xs font-medium">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Modo Simples
                </span>
              </SelectItem>
              <SelectItem value="profissional" className="text-xs font-medium">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Modo Profissional
                </span>
              </SelectItem>
              <SelectItem value="economico" className="text-xs font-medium">
                <span className="flex items-center gap-2">
                  <Feather className="w-3.5 h-3.5 text-blue-500" />
                  Modo Econômico
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Indicador Online/Offline com tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-help ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Online</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Offline</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="max-w-xs text-xs p-3">
            {isOnline ? (
              <p>Conectado à internet. Todos os dados são sincronizados com a nuvem.</p>
            ) : (
              <p>
                Você está offline. Os dados estão salvos no aparelho e serão sincronizados quando a
                internet voltar.
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
