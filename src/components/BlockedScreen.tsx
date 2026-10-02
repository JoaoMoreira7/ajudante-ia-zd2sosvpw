import React from 'react'
import { ShieldAlert, PhoneCall, RefreshCw, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'

interface BlockedScreenProps {
  motivo?: string | null
  bloqueadoPor?: string
  bloqueadoEm?: string
}

export const BlockedScreen: React.FC<BlockedScreenProps> = ({
  motivo,
  bloqueadoPor,
  bloqueadoEm,
}) => {
  const { logout, refreshUserData } = useAuth()

  const handleRecarregar = async () => {
    await refreshUserData()
  }

  const handleContatoSuporte = () => {
    const texto = encodeURIComponent(
      `Olá! Minha conta no Ajudante IA está suspensa (Motivo: ${motivo || 'Regularização de pagamento'}). Gostaria de verificar e regularizar o acesso.`,
    )
    window.open(`https://wa.me/5535998765432?text=${texto}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-lg w-full border-destructive/40 shadow-xl overflow-hidden">
        <div className="bg-destructive/10 border-b border-destructive/20 p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/20 text-destructive flex items-center justify-center mb-3">
            <ShieldAlert className="w-9 h-9 stroke-[2.2]" />
          </div>
          <h1 className="text-xl font-black text-destructive tracking-tight uppercase">
            Acesso Temporariamente Suspenso
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Esta conta foi bloqueada no servidor e requer regularização com a administração.
          </p>
        </div>

        <CardContent className="p-6 space-y-5">
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
            <span className="text-xs font-bold uppercase tracking-wider text-destructive block mb-1">
              Motivo do Bloqueio:
            </span>
            <p className="text-sm font-semibold text-foreground">
              {motivo || 'Mensalidade não paga ou pendência administrativa.'}
            </p>
            {(bloqueadoPor || bloqueadoEm) && (
              <div className="mt-3 pt-3 border-t border-destructive/15 text-[11px] text-muted-foreground flex flex-col gap-0.5">
                {bloqueadoPor && (
                  <span>
                    Registrado por: <strong>{bloqueadoPor}</strong>
                  </span>
                )}
                {bloqueadoEm && (
                  <span>Data: {new Date(bloqueadoEm).toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-4 rounded-xl border border-border">
            <p className="font-semibold text-foreground mb-1">Como regularizar seu acesso?</p>
            <p>
              Para desbloquear sua conta e voltar a emitir orçamentos, lançar medições e registrar
              obras, entre em contato com o responsável comercial para emissão do comprovante ou
              confirmação de pagamento.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleContatoSuporte}
              className="flex-1 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <PhoneCall className="w-4 h-4" />
              Falar com o Administrador
            </Button>

            <Button variant="outline" onClick={handleRecarregar} className="font-bold gap-2">
              <RefreshCw className="w-4 h-4" />
              Verificar Novamente
            </Button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={logout}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center justify-center gap-1.5 mx-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              Trocar de Conta / Sair
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BlockedScreen
