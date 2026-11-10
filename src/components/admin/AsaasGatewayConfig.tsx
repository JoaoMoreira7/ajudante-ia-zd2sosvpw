import React, { useCallback, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  RefreshCw,
  Unplug,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type GatewayStatus = {
  configurado: boolean
  modo: 'sandbox' | 'producao'
  status: 'conectado' | 'pendente'
  origem: 'env' | 'app'
  podeGerenciar: boolean
  atualizadoPorNome?: string
  ultimaValidacaoOk?: boolean
  ultimaValidacaoEm?: string
  aviso?: string
  mensagem?: string
}

type FormularioChaveProps = {
  tituloCampo: string
  idCampo: string
  chave: string
  setChave: (v: string) => void
  modo: 'sandbox' | 'producao'
  setModo: (v: 'sandbox' | 'producao') => void
  conectando: boolean
  onConectar: () => void
  onCancel?: () => void
}

/** Campo mascarado + seletor de ambiente + botão Conectar (com aviso de sandbox). */
const FormularioChave: React.FC<FormularioChaveProps> = ({
  tituloCampo,
  idCampo,
  chave,
  setChave,
  modo,
  setModo,
  conectando,
  onConectar,
  onCancel,
}) => {
  const [mostrar, setMostrar] = useState(false)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div className="space-y-1.5">
          <label
            htmlFor={idCampo}
            className="text-xs font-bold text-foreground flex items-center gap-1"
          >
            <KeyRound className="w-3 h-3" />
            {tituloCampo}
          </label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Input
                id={idCampo}
                type={mostrar ? 'text' : 'password'}
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                placeholder="Cole aqui a sua API Key do Asaas"
                className="pr-10 h-10 text-xs font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setMostrar((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={mostrar ? 'Ocultar chave' : 'Mostrar chave'}
              >
                {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs font-bold gap-1"
              title="Colar da área de transferência (e manter oculta)"
              onClick={async () => {
                try {
                  const texto = await navigator.clipboard.readText()
                  if (texto) {
                    setChave(texto.trim())
                    setMostrar(false)
                  }
                } catch {
                  toast({
                    title: 'Não consegui ler a área de transferência',
                    description: 'Cole manualmente no campo (toque e segure → Colar).',
                    variant: 'destructive',
                  })
                }
              }}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              Colar
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-foreground block">Ambiente</span>
          <Select value={modo} onValueChange={(v: 'sandbox' | 'producao') => setModo(v)}>
            <SelectTrigger className="h-10 text-xs min-w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox" className="text-xs">
                Sandbox (teste)
              </SelectItem>
              <SelectItem value="producao" className="text-xs">
                Produção
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onConectar}
            className="h-10 text-xs font-bold gap-1.5"
            disabled={conectando}
          >
            {conectando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Link2 className="w-3.5 h-3.5" />
            )}
            {conectando ? 'Validando…' : 'Conectar'}
          </Button>
          {onCancel && (
            <Button variant="ghost" className="h-10 text-xs" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
      {modo === 'sandbox' && (
        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
          Ambiente Sandbox selecionado: as cobranças geradas são de TESTE (nenhum Pix real é
          emitido). Para cobrar de verdade, escolha Produção com a chave de produção do Asaas.
        </p>
      )}
    </div>
  )
}

/**
 * Bloco seguro de configuração da chave do Asaas — visível APENAS para o Dono
 * (perfil admin; o Painel do Administrador inteiro já é renderizado só nesse caso).
 * A chave nunca toca o localStorage: vai direto do input ao endpoint do servidor,
 * que a valida na API do Asaas antes de persistir.
 */
export const AsaasGatewayConfig: React.FC = () => {
  const [status, setStatus] = useState<GatewayStatus | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [chave, setChave] = useState('')
  const [formAberto, setFormAberto] = useState(false) // "Trocar de chave" com o gateway já conectado
  const [modo, setModo] = useState<'sandbox' | 'producao'>('sandbox')
  const [conectando, setConectando] = useState(false)
  const [desconectando, setDesconectando] = useState(false)

  const carregarStatus = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true)
    try {
      const res = await pb.send<GatewayStatus>('/backend/v1/asaas/gateway/status', {
        method: 'GET',
      })
      setStatus(res)
    } catch {
      // Sem servidor (offline): mantém o aviso de pendente, sem inventar estado
      setStatus(null)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarStatus()
    // Revalidação periódica (a cada 60s enquanto a aba estiver montada)
    const timer = setInterval(() => carregarStatus(true), 60_000)
    return () => clearInterval(timer)
  }, [carregarStatus])

  const handleConectar = async () => {
    const chaveLimpa = chave.trim()
    if (!chaveLimpa) {
      toast({
        title: 'Cole a chave primeiro',
        description:
          'Copie a API Key no painel do Asaas (Financeiro → Integrações) e cole no campo.',
        variant: 'destructive',
      })
      return
    }
    setConectando(true)
    try {
      const res = await pb.send<GatewayStatus>('/backend/v1/asaas/gateway/conectar', {
        method: 'POST',
        body: { chave: chaveLimpa, modo },
      })
      setStatus(res)
      setChave('')
      setFormAberto(false)
      toast({
        title: `Conectado ✔ (${res.modo === 'producao' ? 'Produção' : 'Sandbox'})`,
        description: 'A chave foi validada no Asaas e salva com segurança no servidor.',
      })
    } catch (err: any) {
      toast({
        title: 'Chave inválida ou sem acesso',
        description: err?.message || 'Confira a chave no painel do Asaas e tente novamente.',
        variant: 'destructive',
      })
      // Atualiza o status (a checagem periódica pode ter pego rejeição)
      carregarStatus(true)
    } finally {
      setConectando(false)
    }
  }

  const handleDesconectar = async () => {
    setDesconectando(true)
    try {
      const res = await pb.send<GatewayStatus>('/backend/v1/asaas/gateway/desconectar', {
        method: 'POST',
      })
      setStatus(res)
      setFormAberto(false)
      toast({
        title: 'Desconectado',
        description: 'A chave do Asaas foi removida do servidor.',
      })
    } catch (err: any) {
      toast({
        title: 'Não consegui desconectar',
        description: err?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setDesconectando(false)
    }
  }

  const conectado = status?.configurado === true
  const modoRotulo = status?.modo === 'producao' ? 'Produção' : 'Sandbox'
  const origemEnv = status?.origem === 'env'
  const validacaoFalhou = conectado && status?.ultimaValidacaoOk === false

  return (
    <Card className="border-border">
      <CardHeader>
        <div
          className={`flex items-center gap-2 mb-1 ${
            conectado && !validacaoFalhou ? 'text-emerald-600' : 'text-amber-600'
          }`}
        >
          {conectado && !validacaoFalhou ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <Badge
            variant="outline"
            className={`text-[10px] ${
              conectado && !validacaoFalhou
                ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-500/40 text-amber-700 dark:text-amber-300'
            }`}
          >
            {carregando
              ? 'VERIFICANDO…'
              : validacaoFalhou
                ? 'CHAVE REJEITADA PELO ASAAS'
                : conectado
                  ? `CONECTADO (${modoRotulo.toUpperCase()})`
                  : 'PENDENTE DE CONFIGURAÇÃO DE CHAVE'}
          </Badge>
        </div>
        <CardTitle className="text-lg font-black text-foreground">
          Conector de Gateway de Pagamento Online (Asaas / Cartão)
        </CardTitle>
        <CardDescription className="text-xs">
          {conectado
            ? `Integração ativa via ${origemEnv ? 'variável de ambiente do servidor' : 'chave salva no servidor'}${status?.atualizadoPorNome ? ` por ${status.atualizadoPorNome}` : ''}.`
            : 'Cole sua API Key do Asaas para ativar a cobrança Pix por voz. A chave é validada e guardada apenas no servidor.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status atual */}
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 ${
            validacaoFalhou
              ? 'bg-destructive/10 border-destructive/20 text-destructive'
              : conectado
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-200'
          }`}
        >
          <p className="font-bold">
            {validacaoFalhou
              ? 'Atenção: a chave salva parou de ser aceita pelo Asaas'
              : conectado
                ? `Status Atual: CONECTADO (${modoRotulo})`
                : 'Status Atual: PENDENTE DE CONFIGURAÇÃO DE CHAVE'}
          </p>
          <p>
            {validacaoFalhou
              ? status?.aviso || 'O Asaas rejeitou a chave. Desconecte e conecte uma chave válida.'
              : conectado
                ? status?.mensagem || 'Cobranças Pix por voz já podem ser geradas normalmente.'
                : 'A cobrança Pix por voz só ativa de verdade depois que a chave for conectada aqui. Cole a API Key gerada no painel do Asaas (Financeiro → Integrações → API).'}
          </p>
          {validacaoFalhou && !origemEnv && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-bold gap-1"
              onClick={handleDesconectar}
              disabled={desconectando}
            >
              {desconectando ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Unplug className="w-3 h-3" />
              )}
              Desconectar chave rejeitada
            </Button>
          )}
        </div>

        {/* Bloco de configuração — Dono */}
        {conectado && !formAberto && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFormAberto(true)
                setChave('')
              }}
              className="h-9 text-xs font-bold gap-1.5"
              title="Trocar a chave do Asaas"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Trocar de chave
            </Button>
            <Button
              variant="outline"
              onClick={() => carregarStatus()}
              className="h-9 text-xs font-bold gap-1.5"
              disabled={carregando}
            >
              {carregando ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Revalidar agora
            </Button>
            <Button
              variant="destructive"
              onClick={handleDesconectar}
              className="h-9 text-xs font-bold gap-1.5"
              disabled={desconectando || origemEnv}
              title={
                origemEnv
                  ? 'A chave vem da variável de ambiente ASAAS_API_KEY do servidor — gerencie pelo painel Skip Cloud'
                  : 'Remove a chave do servidor'
              }
            >
              {desconectando ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unplug className="w-3.5 h-3.5" />
              )}
              Desconectar
            </Button>
          </div>
        )}

        {conectado && formAberto && (
          <div className="p-3 rounded-xl border bg-muted/20">
            <FormularioChave
              tituloCampo="Nova chave de API do Asaas"
              idCampo="asaas-chave-nova"
              chave={chave}
              setChave={setChave}
              modo={modo}
              setModo={setModo}
              conectando={conectando}
              onConectar={handleConectar}
              onCancel={() => {
                setFormAberto(false)
                setChave('')
              }}
            />
          </div>
        )}

        {!conectado && (
          <FormularioChave
            tituloCampo="Chave de API do Asaas"
            idCampo="asaas-chave"
            chave={chave}
            setChave={setChave}
            modo={modo}
            setModo={setModo}
            conectando={conectando}
            onConectar={handleConectar}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg border bg-muted/30">
            <span className="text-muted-foreground block text-[11px]">Provedor Suportado:</span>
            <span className="font-bold text-foreground">Asaas Pagamentos S.A.</span>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30">
            <span className="text-muted-foreground block text-[11px]">Webhook Endpoint:</span>
            <span className="font-mono text-[11px] text-foreground">
              /backend/v1/webhooks/s/asaas
            </span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Segurança: a chave nunca fica no seu celular nem no navegador — ela é enviada uma única
          vez, validada no Asaas e guardada apenas no servidor, visível só para o Dono.
        </p>
      </CardContent>
    </Card>
  )
}

export default AsaasGatewayConfig
