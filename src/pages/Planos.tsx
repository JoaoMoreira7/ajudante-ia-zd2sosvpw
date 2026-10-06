import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CATALOGO_PLANOS } from '@/lib/commercialEngine'
import { PlanoTipo } from '@/types/database'
import {
  Check,
  Sparkles,
  ShieldCheck,
  Zap,
  Building2,
  Crown,
  PhoneCall,
  BadgeCheck,
  ArrowRight,
  Clock,
  Mic,
  TrendingUp,
  Scale,
  Cloud,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

export const PlanosPage: React.FC = () => {
  const { planoAtivo, user, refreshUserData, isAdmin } = useAuth()
  const [ciclo, setCiclo] = useState<'mensal' | 'anual'>('mensal')
  const [planoProcessando, setPlanoProcessando] = useState<PlanoTipo | null>(null)

  const handleContratar = (planoId: PlanoTipo) => {
    const planoEscolhido = CATALOGO_PLANOS.find((p) => p.id === planoId)
    if (!planoEscolhido) return

    const preco = ciclo === 'anual' ? planoEscolhido.precoAnual : planoEscolhido.precoMensal
    const textoMensagem = encodeURIComponent(
      `Olá! Tenho interesse em assinar o *${planoEscolhido.nome}* (${ciclo === 'anual' ? 'Anual R$ ' + preco.toFixed(2) : 'Mensal R$ ' + preco.toFixed(2)}) do Ajudante IA para a minha conta (${user?.email || 'meu e-mail'}). Como realizo o pagamento?`,
    )

    // Redireciona para contato comercial via WhatsApp oficial
    window.open(`https://wa.me/5535998765432?text=${textoMensagem}`, '_blank')

    toast({
      title: 'Redirecionando para ativação comercial',
      description: `Você escolheu o ${planoEscolhido.nome}. Nosso suporte ativará seu plano na hora.`,
    })
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. SEÇÃO DE ROI EM TEMPO: QUANTO VOCÊ GANHA USANDO */}
      <section className="bg-gradient-to-b from-primary/10 via-card to-card border-2 border-primary/30 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-6">
        <div className="space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-black uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Retorno Rápido Garantido</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Quanto você ganha usando o Ajudante IA?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Você gasta de 1 a 2 horas por dia com relatórios e planilhas. Falando com o Ajudante IA,
            esse tempo cai para 15 minutos. No primeiro mês, o aplicativo já se paga sozinho.
          </p>
        </div>

        {/* 3 Números Grandes de Impacto */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto pt-2">
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              2h por dia
            </span>
            <p className="text-xs font-semibold text-muted-foreground">
              perdidas em papelada, anotações de canteiro e planilhas manuais.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-primary/10 border-2 border-primary/40 shadow-xs flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <span className="text-3xl sm:text-4xl font-black text-primary tracking-tight">
              15 minutos
            </span>
            <p className="text-xs font-semibold text-foreground">
              apenas falando comandos de voz direto da obra. Rápido e prático.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-xs flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              1ª semana
            </span>
            <p className="text-xs font-semibold text-muted-foreground">
              é o tempo médio para a economia de horas pagar o investimento.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs font-bold text-foreground tracking-wide uppercase">
            VOCÊ FALA. O AJUDANTE IA FAZ.
          </p>
          <p className="text-xs text-muted-foreground">
            Você fala. O Ajudante IA entende, calcula, registra e responde.
          </p>
        </div>
      </section>

      {/* 2. FAIXA DE POSICIONAMENTO DE MERCADO & TRIAL DE 7 DIAS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bloco Mercado */}
        <div className="p-5 sm:p-6 rounded-2xl bg-muted/60 border border-border flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-primary block">
              Comparação de Mercado
            </span>
            <h3 className="text-base sm:text-lg font-black text-foreground leading-snug">
              Muito mais valor por uma fração do preço
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Ferramentas de gestão de obra do mercado cobram de{' '}
              <strong>R$ 50 a R$ 200 por mês</strong> — e nenhuma trabalha por voz como o Ajudante
              IA. Aqui você tem praticidade total{' '}
              <strong className="text-foreground">a partir de R$ 29,90</strong>.
            </p>
          </div>
        </div>

        {/* Bloco Trial com Gancho de ROI */}
        <div className="p-5 sm:p-6 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
              Teste Sem Riscos
            </span>
            <h3 className="text-base sm:text-lg font-black text-foreground leading-snug">
              Teste 7 dias grátis no seu canteiro
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Se o Ajudante IA não te economizar tempo logo na primeira semana, não continue. Você
              experimenta todas as funções sem compromisso e sem pegadinhas.
            </p>
          </div>
        </div>
      </section>

      {/* Top Banner dos Planos */}
      <div className="text-center space-y-3 max-w-3xl mx-auto pt-2">
        <Badge
          variant="outline"
          className="text-primary font-bold border-primary/40 px-3 py-1 text-xs uppercase tracking-wider"
        >
          Planos Determinísticos e Transparentes
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          Escolha o Plano Ideal para a sua Obra
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Sem contratos de fidelidade. A calculadora de obra e os comandos de voz essenciais estão
          100% disponíveis para você desde o primeiro dia.
        </p>

        {/* Toggle Mensal / Anual */}
        <div className="flex items-center justify-center gap-3 pt-3">
          <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border">
            <button
              type="button"
              onClick={() => setCiclo('mensal')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                ciclo === 'mensal'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cobrança Mensal
            </button>
            <button
              type="button"
              onClick={() => setCiclo('anual')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                ciclo === 'anual'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Cobrança Anual</span>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full font-black">
                Economize 2 meses
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid com os 3 Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {CATALOGO_PLANOS.map((plano) => {
          const isAtual = planoAtivo === plano.id
          const preco = ciclo === 'anual' ? plano.precoAnual : plano.precoMensal
          const precoFormatado = preco.toFixed(2).replace('.', ',')

          return (
            <Card
              key={plano.id}
              className={`relative flex flex-col transition-all rounded-2xl overflow-hidden ${
                plano.destaque
                  ? 'border-2 border-primary shadow-xl bg-card'
                  : 'border-border shadow-sm hover:shadow-md bg-card/60'
              } ${isAtual ? 'ring-2 ring-emerald-500/60' : ''}`}
            >
              {plano.destaque && (
                <div className="bg-primary text-primary-foreground text-center text-[11px] font-black uppercase py-1 tracking-wider flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {plano.badge || 'Mais Popular'}
                </div>
              )}

              <CardHeader className="pb-3 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    {plano.id === 'essencial' && 'Início Seguro'}
                    {plano.id === 'profissional' && 'Crescimento Profissional'}
                    {plano.id === 'empresa' && 'Gestão de Construtora'}
                  </span>
                  {isAtual && (
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px] gap-1">
                      <Check className="w-3 h-3" />
                      Seu Plano Atual
                    </Badge>
                  )}
                </div>

                <CardTitle className="text-2xl font-black text-foreground pt-1 flex items-center gap-2">
                  {plano.id === 'essencial' && <Zap className="w-5 h-5 text-amber-500" />}
                  {plano.id === 'profissional' && <Crown className="w-5 h-5 text-primary" />}
                  {plano.id === 'empresa' && <Building2 className="w-5 h-5 text-blue-600" />}
                  {plano.nome}
                </CardTitle>

                <CardDescription className="text-xs min-h-[36px] mt-1 leading-snug">
                  {plano.descricao}
                </CardDescription>

                {/* Preço em destaque */}
                <div className="pt-4 pb-2 border-b">
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-xs text-muted-foreground font-sans">R$</span>
                    <span className="text-4xl font-black text-foreground tracking-tight">
                      {precoFormatado}
                    </span>
                    <span className="text-xs text-muted-foreground font-sans">
                      /{ciclo === 'anual' ? 'ano' : 'mês'}
                    </span>
                  </div>
                  {ciclo === 'anual' && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      Equivalente a R$ {(preco / 12).toFixed(2).replace('.', ',')}/mês
                    </p>
                  )}
                </div>
              </CardHeader>

              {/* Lista de recursos */}
              <CardContent className="flex-1 pb-6 space-y-3 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  O que está incluído:
                </span>
                <ul className="space-y-2.5">
                  {plano.recursos.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="leading-snug">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-2 pb-6 border-t bg-muted/10">
                {isAtual ? (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full font-bold h-11 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
                  >
                    <BadgeCheck className="w-4 h-4 mr-1.5" />
                    Plano Ativo nesta Conta
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleContratar(plano.id)}
                    className={`w-full font-bold h-11 text-xs gap-2 ${
                      plano.destaque
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
                        : 'bg-foreground text-background hover:bg-foreground/90'
                    }`}
                  >
                    <span>Assinar {plano.nome}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Garantia, Infraestrutura de IA e Regra de Cálculos Livres */}
      <div className="p-6 rounded-2xl bg-muted/40 border border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
            ✓
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Cálculos Essenciais Nunca Bloqueiam
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              O motor matemático, a calculadora de construção e comandos de voz rápidos continuam
              acessíveis mesmo se sua assinatura expirar.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Inteligência e Voz em Nuvem
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Sua assinatura garante processamento contínuo de voz inteligente e sincronização
              segura sempre atualizada com a melhor tecnologia.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 font-bold">
            ⚡
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              100% Offline-First
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Seus dados ficam gravados no celular no canteiro mesmo sem sinal de internet e
              sincronizam quando reconectar.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 font-bold">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Ativação por Venda Direta
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Pague via Pix direto, boleto ou transferência com confirmação rápida e liberação
              imediata sem burocracia.
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé informativo de Termos e Privacidade */}
      <div className="text-center pt-2 pb-6 text-xs text-muted-foreground">
        <span>Dúvidas sobre o funcionamento, privacidade e garantias? Consulte nossos </span>
        <Link to="/termos" className="font-bold text-primary hover:underline">
          Termos de Uso
        </Link>
        <span> e a </span>
        <Link to="/privacidade" className="font-bold text-primary hover:underline">
          Política de Privacidade
        </Link>
        <span>.</span>
      </div>
    </div>
  )
}

export default PlanosPage
