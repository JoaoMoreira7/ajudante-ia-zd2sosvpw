import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import {
  Wifi,
  WifiOff,
  HardHat,
  Sparkles,
  Feather,
  RefreshCw,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react'
import { subscribeSyncStatus, syncNow, SyncStatus } from '@/lib/syncService'
import { toast } from '@/hooks/use-toast'
import { NotificationBell } from '@/components/NotificationBell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Link } from 'react-router-dom'

export const TopBar: React.FC = () => {
  const { config, setModo, user, isAdmin } = useAuth()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
  })

  useEffect(() => {
    const unsub = subscribeSyncStatus((st) => {
      setSyncStatus(st)
    })
    return () => unsub()
  }, [])

  const handleForcarSync = async () => {
    if (syncStatus.isSyncing) return
    if (!syncStatus.isOnline) {
      toast({
        title: 'Sem conexão de rede',
        description: 'Os dados continuam salvos no aparelho e serão sincronizados ao conectar.',
      })
      return
    }
    await syncNow()
    toast({
      title: 'Sincronização concluída',
      description: 'Todos os registros locais foram enviados para a nuvem.',
    })
  }

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

        {/* Indicador de Sincronização Pendente */}
        {syncStatus.pendingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleForcarSync}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-amber-950 hover:bg-amber-400 active:scale-95 transition-all shadow-xs animate-pulse"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`}
                />
                <span>
                  {syncStatus.pendingCount}{' '}
                  <span className="hidden sm:inline">
                    {syncStatus.pendingCount === 1 ? 'registro pendente' : 'registros pendentes'}
                  </span>
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="max-w-xs text-xs p-3">
              <p className="font-bold mb-1">
                {syncStatus.pendingCount}{' '}
                {syncStatus.pendingCount === 1 ? 'registro salvo' : 'registros salvos'} no aparelho
              </p>
              <p>
                {syncStatus.isOnline
                  ? 'Toque para sincronizar com a nuvem agora.'
                  : 'Aguardando conexão com a internet. Nada será perdido.'}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Indicador Online/Offline com tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleForcarSync}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                syncStatus.isOnline
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200'
              }`}
            >
              {syncStatus.isOnline ? (
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
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" className="max-w-xs text-xs p-3">
            {syncStatus.isOnline ? (
              <div>
                <p className="font-bold text-emerald-700 dark:text-emerald-300">
                  Conectado à internet
                </p>
                <p className="mt-0.5">
                  {syncStatus.pendingCount === 0
                    ? 'Todos os dados estão sincronizados.'
                    : `${syncStatus.pendingCount} pendente(s) de envio. Toque para sincronizar.`}
                </p>
                {syncStatus.lastSyncTime && (
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                    Última sincronização: {syncStatus.lastSyncTime}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="font-bold text-amber-700 dark:text-amber-300">
                  Modo Offline no canteiro
                </p>
                <p className="mt-0.5">
                  Você está sem internet. Todos os gastos, fotos e etapas ficam salvos com segurança
                  no seu celular e sincronizam automaticamente ao reconectar.
                </p>
              </div>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Link direto para o Admin se for Administrador */}
        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all"
            title="Acessar Painel do Administrador"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}

        {/* Sino de Notificações */}
        <NotificationBell userId={user?.id} />
      </div>
    </header>
  )
}
