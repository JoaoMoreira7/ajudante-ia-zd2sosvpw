import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Settings,
  Sparkles,
  Feather,
  HardHat,
  Moon,
  Volume2,
  Shield,
  LogOut,
  CreditCard,
  Clock,
  Radio,
  Users,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { pb } from '@/lib/pocketbase/client'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  obterConsumoAudio,
  formatarMinutosESegundos,
  calcularEstadoConsumoAudio,
} from '@/lib/audioUsageTracker'
import { obterLimitesPlano } from '@/lib/planLimits'

export const Configuracoes: React.FC = () => {
  const { config, updateConfig, setModo, setPerfil, perfil, user, logout, planoAtivo, profile } =
    useAuth()
  const [nome, setNome] = useState(config?.nome_profissional || '')
  const [empresa, setEmpresa] = useState((config as any)?.empresa || config?.nome_empresa || '')
  const [salvo, setSalvo] = useState(false)
  const [consumoAudio] = useState(() => obterConsumoAudio(profile?.id))

  // Estado da verificação de status do Asaas
  const [asaasStatus, setAsaasStatus] = useState<{
    configurado: boolean
    modo?: string
    carregando: boolean
  }>({
    configurado: false,
    carregando: true,
  })

  React.useEffect(() => {
    let ativo = true
    const verificarStatusAsaas = async () => {
      try {
        const res = await pb.send('/backend/v1/asaas/status', { method: 'GET' })
        if (ativo && res) {
          setAsaasStatus({
            configurado: Boolean(res.configurado),
            modo: res.modo || 'sandbox',
            carregando: false,
          })
        }
      } catch {
        if (ativo) {
          setAsaasStatus({
            configurado: false,
            modo: 'sandbox',
            carregando: false,
          })
        }
      }
    }
    verificarStatusAsaas()
    return () => {
      ativo = false
    }
  }, [])

  const limites = obterLimitesPlano(planoAtivo)
  const estadoConsumo = calcularEstadoConsumoAudio(
    consumoAudio.segundosUsados,
    limites.maxMinutosAudioMes,
  )

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateConfig({
      nome_profissional: nome.trim(),
      empresa: empresa.trim(),
    })
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            CONFIGURAÇÕES DO SISTEMA
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ajustes visuais, modos de operação do Ajudante IA e dados profissionais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/planos">
            <Button
              size="sm"
              variant="outline"
              className="font-bold text-xs gap-1.5 border-primary/40 text-primary"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Plano: {planoAtivo.toUpperCase()}
            </Button>
          </Link>
        </div>
      </div>

      {/* Cartão de Assinatura, Planos e Controle de Uso de Áudio (Melhoria 3) */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
              Assinatura Ativa
            </span>
            <h3 className="text-base font-black text-foreground mt-0.5">
              {planoAtivo === 'essencial' && 'Plano Essencial — R$ 29,90/mês'}
              {planoAtivo === 'profissional' && 'Plano Profissional — R$ 49,90/mês'}
              {planoAtivo === 'empresa' && 'Plano Empresa — R$ 79,90/mês'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {planoAtivo === 'essencial' &&
                'Até 5 clientes, 2 obras simultâneas, 60 min de IA de voz/mês e cálculos completos de construção.'}
              {planoAtivo === 'profissional' &&
                'Até 10 obras ativas simultâneas, 300 min de IA de voz/mês, emissão de PDF e diário com fotos.'}
              {planoAtivo === 'empresa' &&
                'Equipes (dono + ajudantes), áudio por IA ilimitado, relatórios consolidados e múltiplas obras.'}
            </p>
          </div>
          <Link to="/planos" className="shrink-0">
            <Button className="font-bold text-xs gap-1.5 w-full sm:w-auto">
              <Sparkles className="w-4 h-4" />
              Ver Planos e Upgrades
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* MELHORIA 3: Contador de uso de voz visível e renovado mensalmente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Consumo de Minutos de Áudio / IA por Voz
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Ciclo {consumoAudio.cicloMesAno}
            </span>
          </CardTitle>
          <CardDescription>
            Limite mensal alinhado ao plano para processamento em nuvem. Os cálculos determinísticos
            e registros offline <strong>nunca são bloqueados</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                <Radio className={`w-4 h-4 ${estadoConsumo.corTexto} animate-pulse`} />
                Voz: {formatarMinutosESegundos(consumoAudio.segundosUsados)} de{' '}
                {estadoConsumo.isIlimitado
                  ? 'Ilimitado'
                  : `${estadoConsumo.maxMinutos} minutos este mês`}
              </span>
              <div className="flex items-center gap-2">
                {!estadoConsumo.isIlimitado && (
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${estadoConsumo.corBadge}`}
                  >
                    {estadoConsumo.textoEstado}
                  </span>
                )}
                {estadoConsumo.isIlimitado && (
                  <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                    Ilimitado
                  </span>
                )}
                <span className="text-xs font-bold text-muted-foreground">
                  {consumoAudio.totalComandosVoz} comandos falados
                </span>
              </div>
            </div>

            {!estadoConsumo.isIlimitado ? (
              <div className="space-y-1.5 pt-1">
                <div className="w-full bg-border h-3 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${estadoConsumo.corBarra}`}
                    style={{
                      width: `${Math.max(estadoConsumo.percentual > 0 ? 3 : 0, estadoConsumo.percentual)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
                  <span className={`font-bold ${estadoConsumo.corTexto}`}>
                    {estadoConsumo.percentual}% utilizado
                  </span>
                  <span>
                    Resta:{' '}
                    <strong className="text-foreground">
                      {estadoConsumo.minutosRestantes} min
                    </strong>
                  </span>
                </div>
                {estadoConsumo.nivel !== 'normal' && (
                  <p className={`text-xs font-semibold ${estadoConsumo.corTexto}`}>
                    {estadoConsumo.descricaoAmigavel}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                ✓ Seu plano inclui processamento de voz ilimitado na nuvem e no aparelho.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 0. Perfil de Acesso do Usuário (Dono / Operador) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Perfil de Acesso do Usuário
          </CardTitle>
          <CardDescription>
            Se mestre de obras e engenheiro usam o mesmo app, o perfil de operador oculta custos,
            margens e valores financeiros.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPerfil('admin')}
            className={`p-4 rounded-xl border text-left transition-all ${
              perfil === 'admin'
                ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-black text-sm text-foreground">
                🛡️ Administrador do Sistema
              </span>
              {perfil === 'admin' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  Ativo
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Acesso total ao Painel Admin, Gestão Comercial de assinaturas, controle de bloqueios
              de clientes, registro de vendas diretas e logs de auditoria.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setPerfil('dono')}
            className={`p-4 rounded-xl border text-left transition-all ${
              perfil === 'dono'
                ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-black text-sm text-foreground">👑 Dono / Engenheiro</span>
              {perfil === 'dono' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  Ativo
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Acesso às obras: visualiza orçamentos com preços, margens de lucro, faturamento,
              valores contratados e controle financeiro completo.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setPerfil('operador')}
            className={`p-4 rounded-xl border text-left transition-all ${
              perfil === 'operador'
                ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-black text-sm text-foreground">
                👷 Operador / Mestre de Obras
              </span>
              {perfil === 'operador' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  Ativo
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Foco no canteiro: oculta custos, valores e saldos na interface e por voz. Mostra
              progresso físico, fotos, etapas e materiais.
            </p>
          </button>
        </CardContent>

        {/* Atalho para Gestão de Equipe (Plano Empresa) */}
        <div className="px-6 pb-5 pt-1 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-foreground block">
              Equipes e Múltiplos Operadores (Plano Empresa)
            </span>
            <span className="text-xs text-muted-foreground">
              Cadastre encarregados para lançarem diário e fotos na mesma conta.
            </span>
          </div>
          <Link to="/equipe">
            <Button variant="outline" size="sm" className="font-bold text-xs gap-1.5 shrink-0">
              <Users className="w-4 h-4 text-primary" />
              Gerenciar Equipe
            </Button>
          </Link>
        </div>
      </Card>

      {/* 1. Escolha do Modo de Operação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Modo de Operação</CardTitle>
          <CardDescription>
            Escolha como a tela e os botões se comportam para você no canteiro de obras.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setModo('simples')}
            className={`p-4 rounded-xl border text-left transition-all ${
              config.modo === 'simples'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <div className="w-3 h-3 rounded-full bg-emerald-500 mb-2" />
            <h4 className="font-bold text-sm text-foreground">Modo Simples</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Letras e botões gigantes, foco total em falar e poucos botões. Ideal para celulares
              sob sol forte.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setModo('profissional')}
            className={`p-4 rounded-xl border text-left transition-all ${
              config.modo === 'profissional'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-primary mb-2" />
            <h4 className="font-bold text-sm text-foreground">Modo Profissional</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Indicadores completos de faturamento, gráficos, relatórios e controle fino de obras.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setModo('economico')}
            className={`p-4 rounded-xl border text-left transition-all ${
              config.modo === 'economico'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <Feather className="w-4 h-4 text-blue-500 mb-2" />
            <h4 className="font-bold text-sm text-foreground">Modo Econômico</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Economiza bateria e dados de internet móvel. Carregamento ultra rápido para aparelhos
              antigos.
            </p>
          </button>
        </CardContent>
      </Card>

      {/* 2. Preferências de Voz e Acessibilidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Voz e Acessibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
            <div>
              <span className="text-sm font-semibold text-foreground block">
                Resposta Falada por Áudio
              </span>
              <span className="text-xs text-muted-foreground">
                O assistente lê em voz alta a resposta na obra
              </span>
            </div>
            <Switch
              checked={Boolean(config?.voz_respostas || (config as any)?.som_ativo)}
              onCheckedChange={(checked) => updateConfig({ voz_respostas: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
            <div>
              <span className="text-sm font-semibold text-foreground block">Alto Contraste</span>
              <span className="text-xs text-muted-foreground">
                Bordas escuras e maior visibilidade sob a luz do sol
              </span>
            </div>
            <Switch
              checked={Boolean(config?.alto_contraste)}
              onCheckedChange={(checked) => updateConfig({ alto_contraste: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2.1 Integração de Cobranças Pix por Voz com o Asaas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              Cobrança Pix por Voz (Asaas)
            </CardTitle>
            {asaasStatus.carregando ? (
              <span className="text-xs text-muted-foreground animate-pulse font-medium">
                Verificando...
              </span>
            ) : asaasStatus.configurado ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Conectado ({asaasStatus.modo === 'producao' ? 'Produção' : 'Sandbox'})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Não configurado
              </span>
            )}
          </div>
          <CardDescription>
            Gere cobranças Pix e receba avisos automáticos de pagamento na conversa dizendo "cria
            uma cobrança de 350 pro João".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {asaasStatus.configurado ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Pronto para gerar cobranças Pix por voz!
              </p>
              <p className="leading-relaxed">
                Você pode dizer diretamente no chat: <em>
                  "cria uma cobrança de 350 pro João"
                </em> ou{' '}
                <em>"cobra 500 da Maria referente à pintura"</em>. O Ajudante IA gerará o QR Code
                Pix e o código copia-e-cola em tempo real.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-muted/40 border text-xs text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <span className="font-bold text-foreground block">
                    Como conectar sua conta do Asaas:
                  </span>
                  <p>
                    1. Crie ou acesse sua conta no Asaas (sandbox ou produção) e gere uma{' '}
                    <strong>Chave de API</strong> em <em>Configurações &gt; Integrações</em>.
                  </p>
                  <p>
                    2. Adicione a chave no painel de segredos do servidor com o nome{' '}
                    <code>ASAAS_API_KEY</code>.
                  </p>
                  <p>
                    3. Para modo de produção, adicione opcionalmente o segredo{' '}
                    <code>ASAAS_MODE=production</code> (o padrão é sandbox).
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-border/40 flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Sem a chave, comandos de voz avisarão amigavelmente sem travar o aplicativo.
                </span>
                <a
                  href="https://www.asaas.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                >
                  Ir para Asaas
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Dados do Profissional / Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">
            Dados do Profissional (aparecem nos orçamentos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSalvarPerfil} className="space-y-3.5">
            <div>
              <Label>Seu Nome ou Nome Profissional</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João Carlos Mestre de Obras"
              />
            </div>
            <div>
              <Label>Nome da sua Empresa ou Empreiteira</Label>
              <Input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Ex: JC Construções e Reformas"
              />
            </div>
            <Button type="submit" className="font-bold">
              {salvo ? '✓ Dados Salvos!' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 4. Documentos Legais e Sobre o Sistema */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Transparência, Termos e Privacidade
          </CardTitle>
          <CardDescription>
            Documentos oficiais com regras de uso, proteção de dados pela LGPD e dados do titular.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/termos"
              className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors flex items-center justify-between group"
            >
              <div>
                <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors block">
                  Termos de Uso
                </span>
                <span className="text-xs text-muted-foreground">
                  Regras, planos, suporte e responsabilidades
                </span>
              </div>
              <span className="text-primary text-xs font-bold">Ver →</span>
            </Link>

            <Link
              to="/privacidade"
              className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors flex items-center justify-between group"
            >
              <div>
                <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors block">
                  Política de Privacidade
                </span>
                <span className="text-xs text-muted-foreground">
                  Seus direitos pela LGPD e proteção de dados
                </span>
              </div>
              <span className="text-primary text-xs font-bold">Ver →</span>
            </Link>
          </div>

          <div className="pt-2 text-[11px] text-muted-foreground leading-relaxed border-t">
            <strong>Titular do Sistema:</strong> QUEVRON TECNOLOGIA INOVA SIMPLES (I.S.) — CNPJ
            69.482.315/0001-19 — Águas de Lindoia/SP. E-mail:{' '}
            <a
              href="mailto:jaocarloss@gmail.com"
              className="text-primary hover:underline font-semibold"
            >
              jaocarloss@gmail.com
            </a>
          </div>
        </CardContent>
      </Card>

      {/* 5. Sessão do Usuário */}
      {user && (
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Conectado como:</span>
              <span className="text-sm font-bold text-foreground">{user.email}</span>
            </div>
            <Button variant="outline" className="text-destructive font-bold gap-2" onClick={logout}>
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Configuracoes
