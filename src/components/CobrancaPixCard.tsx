import React, { useState } from 'react'
import { CobrancaPixItem, formatarValorBrl, isCobrancaValida24h } from '@/lib/cobrancaPixEngine'
import {
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  QrCode,
  Clock,
  ExternalLink,
  Edit3,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CobrancaPixCardProps {
  cobranca: CobrancaPixItem
  onDesfazer?: (cobranca: CobrancaPixItem) => void
  onEditar?: (cobranca: CobrancaPixItem) => void
  isOperador?: boolean
  isSimpleMode?: boolean
}

export const CobrancaPixCard: React.FC<CobrancaPixCardProps> = ({
  cobranca,
  onDesfazer,
  onEditar,
  isOperador = false,
  isSimpleMode = false,
}) => {
  const [copiado, setCopiado] = useState(false)
  const [mostrarQrCode, setMostrarQrCode] = useState(false)

  if (!cobranca) return null

  // Se o usuário for perfil Operador, não pode ver cobranças financeiras
  if (isOperador) {
    return (
      <div className="mt-2.5 rounded-2xl border-2 border-border/80 bg-muted/40 p-3 sm:p-4 text-xs text-muted-foreground flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
        <span>
          Cobrança Pix criada pelo Dono. Valores e detalhes são reservados ao administrador.
        </span>
      </div>
    )
  }

  const valido24h = isCobrancaValida24h(cobranca.timestamp)
  const isPago = cobranca.status === 'RECEIVED' || cobranca.status === 'CONFIRMED'

  const handleCopiarPix = async () => {
    if (!cobranca.pix_copia_e_cola) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(cobranca.pix_copia_e_cola)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = cobranca.pix_copia_e_cola
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div
      className={`mt-2.5 rounded-2xl border-2 shadow-xs transition-all ${
        isPago
          ? 'border-emerald-500/60 bg-emerald-500/5'
          : 'border-emerald-600/40 bg-card hover:border-emerald-500/80'
      } p-3 sm:p-4.5 ${isSimpleMode ? 'p-4 sm:p-5' : ''}`}
    >
      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between gap-2 mb-2.5 pb-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isPago ? 'bg-emerald-600 text-white' : 'bg-emerald-700 text-white dark:bg-emerald-600'
            } ${isSimpleMode ? 'text-xs py-1 px-3' : ''}`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Cobrança Pix
          </span>
          <span className="text-xs font-semibold text-muted-foreground">Asaas</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          {isPago ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Pago ✔
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
              <Clock className="w-3 h-3" />
              Aguardando pagamento
            </span>
          )}
        </div>
      </div>

      {/* Dados Principais */}
      <div className="space-y-2 text-xs sm:text-sm">
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground font-medium">Cliente:</span>
          <span className="font-bold text-foreground text-right">{cobranca.cliente_nome}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground font-medium">Valor:</span>
          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
            {formatarValorBrl(cobranca.valor)}
          </span>
        </div>

        {cobranca.descricao && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-muted-foreground font-medium">Descrição:</span>
            <span className="font-medium text-foreground text-right">{cobranca.descricao}</span>
          </div>
        )}

        {cobranca.vencimento && (
          <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
            <span className="text-muted-foreground">Vencimento:</span>
            <span className="text-muted-foreground font-medium">{cobranca.vencimento}</span>
          </div>
        )}

        {/* QR Code Pix Base64 se a API devolver (renderiza sem erro se ausente) */}
        {cobranca.pix_qr_code_base64 && (
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">QR Code Pix:</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMostrarQrCode((prev) => !prev)}
                className="h-7 text-xs font-semibold gap-1 text-primary cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                {mostrarQrCode ? 'Ocultar imagem' : 'Mostrar QR Code'}
              </Button>
            </div>
            {mostrarQrCode && (
              <div className="mt-2 p-3 bg-white rounded-xl border flex flex-col items-center justify-center">
                <img
                  src={`data:image/png;base64,${cobranca.pix_qr_code_base64}`}
                  alt="QR Code Pix"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
                <span className="text-[10px] text-slate-600 mt-1 font-medium">
                  Aponte a câmera do aplicativo do seu banco
                </span>
              </div>
            )}
          </div>
        )}

        {/* Código Pix Copia e Cola */}
        {cobranca.pix_copia_e_cola && (
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">Pix Copia e Cola:</span>
              <Button
                type="button"
                size="sm"
                onClick={handleCopiarPix}
                className={`h-7 px-2.5 text-xs font-bold gap-1 rounded-lg cursor-pointer ${
                  copiado
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {copiado ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <div className="p-2 rounded-xl bg-muted/60 border border-border/50 font-mono text-[11px] text-muted-foreground break-all select-all leading-tight max-h-18 overflow-y-auto">
              {cobranca.pix_copia_e_cola}
            </div>
          </div>
        )}

        {/* Link da Fatura / Boleto Web se existir */}
        {cobranca.invoice_url && (
          <div className="pt-1 flex justify-end">
            <a
              href={cobranca.invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              Abrir comprovante Asaas
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Autoria */}
        {cobranca.criado_por_nome && (
          <div className="pt-1 text-[11px] text-muted-foreground flex items-center justify-end gap-1 border-t border-border/30">
            <span>👤 Registrado por:</span>
            <strong className="text-foreground font-semibold">{cobranca.criado_por_nome}</strong>
          </div>
        )}
      </div>

      {/* Botões Editar / Desfazer valendo 24h (estilo padrão dos recibos do app) */}
      {!isPago && valido24h && (
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-end gap-2">
          {onEditar && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEditar(cobranca)}
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
              onClick={() => onDesfazer(cobranca)}
              className="h-8 px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 gap-1 rounded-xl cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer
            </Button>
          )}
        </div>
      )}

      {!isPago && !valido24h && (
        <div className="mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Cobrança ativa no Asaas. Janela de 24h para cancelamento direto encerrada.</span>
        </div>
      )}
    </div>
  )
}
