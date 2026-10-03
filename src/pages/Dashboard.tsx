import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { localDB } from '@/lib/localDB'
import { Obra, Orcamento, FinanceiroLancamento } from '@/types/database'
import {
  Mic,
  Calculator,
  Package,
  FileSpreadsheet,
  HardHat,
  Users,
  DollarSign,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, AlertCircle, Calendar, ChevronRight, CheckCircle2 } from 'lucide-react'
import { WalkieTalkieButton } from '@/components/WalkieTalkieButton'
import { ActionCardList } from '@/components/ActionCardList'
import { useVoiceContext } from '@/contexts/VoiceContext'
import { useVoiceHybrid } from '@/hooks/useVoiceHybrid'
import { obterConsumoAudio, formatarMinutosESegundos } from '@/lib/audioUsageTracker'
import { obterLimitesPlano } from '@/lib/planLimits'
import { formatarMoedaSegura, formatarDataSegura, parseDataSegura } from '@/lib/utils'

interface AlertaItem {
  id: string
  tipo: 'etapa_vencida' | 'pagamento_atrasado' | 'prazo_proximo'
  criticidade: 'alta' | 'media'
  titulo: string
  descricao: string
  link: string
  tag: string
}

export const Dashboard: React.FC = () => {
  const { user, config, isDono, isOperador, plano, profile } = useAuth()
  const navigate = useNavigate()
  const { interactions, isProcessing, processUserInput } = useVoiceContext()
  const { speakText, stopSpeaking } = useVoiceHybrid()

  const [obras, setObras] = useState<Obra[]>([])
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [financeiro, setFinanceiro] = useState<FinanceiroLancamento[]>([])
  const [documentos, setDocumentos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [consumoAudio, setConsumoAudio] = useState(() => obterConsumoAudio(profile?.id))

  const limites = obterLimitesPlano(plano)

  const handleWalkieSend = async (text: string, durationSeconds: number) => {
    stopSpeaking()
    await processUserInput(text, durationSeconds)
    setConsumoAudio(obterConsumoAudio(profile?.id))
  }

  // Última resposta da IA para exibir cards coloridos na tela principal se houver
  const ultimaInteracao = interactions.length > 0 ? interactions[interactions.length - 1] : null
  const ultimosCards = ultimaInteracao?.autor === 'ajudante' ? ultimaInteracao.cardsAcao : null

  useEffect(() => {
    const loadData = async () => {
      try {
        const [obs, orcs, fins, docs] = await Promise.all([
          localDB.getAll('obras'),
          localDB.getAll('orcamentos'),
          localDB.getAll('financeiro'),
          localDB.getAll('documentos'),
        ])
        setObras(obs)
        setOrcamentos(orcs)
        setFinanceiro(fins)
        setDocumentos(docs)
      } catch (err) {
        console.warn('Erro ao carregar dashboard:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const totalObras = obras.length
  const totalOrcamentos = orcamentos.length

  // Cálculos de Alertas: Etapas vencidas, Pagamentos atrasados, Prazos próximos (3 dias)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const limiteProximo = new Date(hoje)
  limiteProximo.setDate(limiteProximo.getDate() + 3)

  const alertas: AlertaItem[] = []

  // 1. Alertas de Obras e Etapas
  obras.forEach((obra) => {
    if (obra && obra.status === 'em_andamento') {
      if (obra.previsao_termino) {
        const dataTermino = parseDataSegura(obra.previsao_termino)
        if (dataTermino) {
          const dataFormatada = formatarDataSegura(dataTermino) || obra.previsao_termino
          if (dataTermino < hoje) {
            alertas.push({
              id: `obra_vencida_${obra.id}`,
              tipo: 'etapa_vencida',
              criticidade: 'alta',
              titulo: `Prazo final vencido: ${obra.titulo || 'Obra sem nome'}`,
              descricao: `Previsão era ${dataFormatada}. Verifique o andamento das etapas.`,
              link: `/obras/${obra.id}`,
              tag: 'Obra Vencida',
            })
          } else if (dataTermino <= limiteProximo) {
            alertas.push({
              id: `obra_prox_${obra.id}`,
              tipo: 'prazo_proximo',
              criticidade: 'media',
              titulo: `Prazo próximo: ${obra.titulo || 'Obra sem nome'}`,
              descricao: `Previsão de término em ${dataFormatada} (próximos 3 dias).`,
              link: `/obras/${obra.id}`,
              tag: 'Vencendo',
            })
          }
        }
      }
    }
  })

  // 2. Alertas de Pagamentos Atrasados ou Parcelas de Orçamentos (visível se Dono)
  if (isDono) {
    orcamentos.forEach((orc) => {
      if (orc && Array.isArray(orc.parcelas)) {
        orc.parcelas.forEach((parc) => {
          if (parc && parc.status === 'pendente' && parc.vencimento) {
            const dataVenc = parseDataSegura(parc.vencimento)
            if (dataVenc) {
              const dataVencFormatada = formatarDataSegura(dataVenc) || parc.vencimento
              const valorFormatado = formatarMoedaSegura(parc.valor)
              if (dataVenc < hoje) {
                alertas.push({
                  id: `parc_atrasada_${orc.id}_${parc.numero || 1}`,
                  tipo: 'pagamento_atrasado',
                  criticidade: 'alta',
                  titulo: `Pagamento atrasado: ${orc.titulo || 'Orçamento'}`,
                  descricao: `Parcela ${parc.numero || 1} de R$ ${valorFormatado} venceu em ${dataVencFormatada}.`,
                  link: `/orcamentos/${orc.id}`,
                  tag: 'Atrasado',
                })
              } else if (dataVenc <= limiteProximo) {
                alertas.push({
                  id: `parc_prox_${orc.id}_${parc.numero || 1}`,
                  tipo: 'prazo_proximo',
                  criticidade: 'media',
                  titulo: `Parcela a vencer: ${orc.titulo || 'Orçamento'}`,
                  descricao: `Parcela ${parc.numero || 1} de R$ ${valorFormatado} vence em ${dataVencFormatada}.`,
                  link: `/orcamentos/${orc.id}`,
                  tag: 'A Vencer',
                })
              }
            }
          }
        })
      }
    })

    // Financeiro com status vencido ou pendente passado
    financeiro.forEach((f) => {
      if (f && f.status === 'vencido') {
        const dataFormatada = formatarDataSegura(f.data) || f.data || 'data não informada'
        alertas.push({
          id: `fin_venc_${f.id}`,
          tipo: 'pagamento_atrasado',
          criticidade: 'alta',
          titulo: `Lançamento vencido: ${f.descricao || 'Despesa/Receita'}`,
          descricao: `R$ ${formatarMoedaSegura(f.valor)} (${f.tipo === 'entrada' ? 'A receber' : 'A pagar'}) datado de ${dataFormatada}.`,
          link: '/financeiro',
          tag: 'Financeiro',
        })
      }
    })
  }

  // Cálculos financeiros reais do banco
  const aReceber = obras.reduce((acc, o) => acc + (Number(o?.valor_pendente) || 0), 0)
  const despesas = financeiro
    .filter((f) => f?.tipo === 'saida')
    .reduce((acc, f) => acc + (Number(f?.valor) || 0), 0)
  const recebido = financeiro
    .filter((f) => f?.tipo === 'entrada')
    .reduce((acc, f) => acc + (Number(f?.valor) || 0), 0)
  const resultadoEstimado = recebido - despesas

  const nomeExibicao = user?.name || config.nome_profissional || 'Mestre'

  // MODO SIMPLES: interface ultra simplificada (alto contraste e botões gigantes)
  if (config.modo === 'simples') {
    const alertaCriticoModoSimples = alertas.find((a) => a.criticidade === 'alta')

    return (
      <div className="space-y-6 max-w-xl mx-auto">
        {/* Bloco de Alerta Crítico no Topo do Modo Simples (se houver) */}
        {alertaCriticoModoSimples && (
          <Link
            to={alertaCriticoModoSimples.link}
            className="block p-4 rounded-2xl bg-destructive text-destructive-foreground font-black border-2 border-red-700 shadow-lg active:scale-95 transition-all text-left"
          >
            <div className="flex items-center gap-2 text-sm uppercase tracking-wider mb-1">
              <AlertTriangle className="w-5 h-5 animate-bounce shrink-0" />
              <span>ATENÇÃO NA OBRA!</span>
            </div>
            <p className="text-lg font-black leading-tight">{alertaCriticoModoSimples.titulo}</p>
            <p className="text-xs font-semibold opacity-90 mt-1">
              {alertaCriticoModoSimples.descricao}
            </p>
          </Link>
        )}

        <div className="p-6 rounded-3xl bg-card border-2 border-primary/40 shadow-sm text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Olá, {nomeExibicao}!</h1>
          <p className="text-base text-muted-foreground font-medium mt-1">
            Pare de preencher planilha. Fale e pronto.
          </p>
        </div>

        {/* Botão Central Walkie-Talkie no Modo Simples (Melhoria 2) */}
        <div className="p-4 rounded-3xl bg-card border-2 border-primary/40 shadow-md">
          <WalkieTalkieButton
            onSendMessage={handleWalkieSend}
            isProcessing={isProcessing}
            disabled={false}
            isSimpleMode={true}
          />
        </div>

        {/* Confirmação em cards coloridos na tela se houver retorno recente */}
        {ultimosCards && ultimosCards.length > 0 && (
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-primary">
                Resultado Reconhecido:
              </span>
              <button
                type="button"
                onClick={() => navigate('/falar')}
                className="text-xs font-bold text-primary underline"
              >
                Abrir conversa completa
              </button>
            </div>
            <ActionCardList
              cards={ultimosCards}
              onSpeak={(tts) => speakText(tts)}
              isSimpleMode={true}
            />
          </div>
        )}

        {/* Atalhos diretos de 1 clique no Modo Simples (regra de 2 cliques) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/obras"
            className="h-24 rounded-2xl bg-muted/80 border-2 border-border flex flex-col items-center justify-center gap-1.5 text-base font-bold text-foreground hover:bg-muted text-center p-2"
          >
            <HardHat className="w-7 h-7 text-primary" />
            <span>Obras ({totalObras})</span>
          </Link>
          <Link
            to="/materiais"
            className="h-24 rounded-2xl bg-muted/80 border-2 border-border flex flex-col items-center justify-center gap-1.5 text-base font-bold text-foreground hover:bg-muted text-center p-2"
          >
            <Package className="w-7 h-7 text-amber-500" />
            <span>Materiais</span>
          </Link>
          <Link
            to="/financeiro"
            className="h-24 rounded-2xl bg-muted/80 border-2 border-border flex flex-col items-center justify-center gap-1.5 text-base font-bold text-foreground hover:bg-muted text-center p-2"
          >
            <DollarSign className="w-7 h-7 text-emerald-600" />
            <span>Gastos</span>
          </Link>
          <Link
            to="/calculadora"
            className="h-24 rounded-2xl bg-muted/80 border-2 border-border flex flex-col items-center justify-center gap-1.5 text-base font-bold text-foreground hover:bg-muted text-center p-2"
          >
            <Calculator className="w-7 h-7 text-primary" />
            <span>Calculadora</span>
          </Link>
        </div>
      </div>
    )
  }

  // MODO PROFISSIONAL E MODO ECONÔMICO
  return (
    <div className="space-y-6">
      {/* 5. BLOCO DE ALERTAS NO TOPO DO INÍCIO */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Alertas Prioritários da Obra ({alertas.length})
            </h2>
            <span className="text-[11px] text-muted-foreground">Toque para resolver</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {alertas.map((alerta) => {
              const isAlta = alerta.criticidade === 'alta'
              return (
                <Link
                  key={alerta.id}
                  to={alerta.link}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-2xs ${
                    isAlta
                      ? 'bg-red-50/90 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-950 dark:text-red-100 hover:border-red-400'
                      : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isAlta
                          ? 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                      }`}
                    >
                      {alerta.tipo === 'etapa_vencida' ? (
                        <Calendar className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs sm:text-sm truncate">
                          {alerta.titulo}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 font-bold shrink-0 uppercase ${
                            isAlta
                              ? 'border-red-400 text-red-700 dark:text-red-300'
                              : 'border-amber-400 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {alerta.tag}
                        </Badge>
                      </div>
                      <p className="text-[11px] opacity-85 truncate mt-0.5">{alerta.descricao}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Saudação, Contador de Uso de Áudio e Walkie-Talkie Central (Melhoria 2) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-card to-muted/40 border border-border shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3 h-3" />
            <span>2 horas de papelada viram 15 minutos de fala</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Olá, {nomeExibicao}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Aperte o botão, fale tudo o que aconteceu e solte. A IA faz o resto.
          </p>

          <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>
              Uso de voz este mês:{' '}
              <strong className="text-foreground">
                {formatarMinutosESegundos(consumoAudio.segundosUsados)}
              </strong>{' '}
              de{' '}
              {limites.maxMinutosAudioMes === -1
                ? 'Ilimitado'
                : `${limites.maxMinutosAudioMes} min`}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <WalkieTalkieButton
            onSendMessage={handleWalkieSend}
            isProcessing={isProcessing}
            disabled={false}
            isSimpleMode={false}
          />
        </div>
      </div>

      {/* Confirmação recente em cards coloridos na tela principal (Melhoria 2) */}
      {ultimosCards && ultimosCards.length > 0 && (
        <div className="p-4 rounded-2xl bg-card border-2 border-primary/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-primary tracking-wider">
              Último Comando Processado:
            </span>
            <button
              type="button"
              onClick={() => navigate('/falar')}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              Ver no Chat Completo →
            </button>
          </div>
          <ActionCardList
            cards={ultimosCards}
            onSpeak={(tts) => speakText(tts)}
            isSimpleMode={false}
          />
        </div>
      )}

      {/* Cards Resumo com Dados Reais do Banco (Modo Dono: financeiro completo; Modo Operador: etapas e obras) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="shadow-xs hover:border-primary/50 transition-colors">
          <CardHeader className="p-3.5 sm:p-4 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Obras</span>
              <HardHat className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4 pt-1">
            <div className="text-xl sm:text-2xl font-black">{totalObras}</div>
            <p className="text-[11px] text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>

        {isDono ? (
          <>
            <Card className="shadow-xs hover:border-primary/50 transition-colors">
              <CardHeader className="p-3.5 sm:p-4 pb-1">
                <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Orçamentos</span>
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 pt-1">
                <div className="text-xl sm:text-2xl font-black">{totalOrcamentos}</div>
                <p className="text-[11px] text-muted-foreground">Emitidos</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs hover:border-primary/50 transition-colors">
              <CardHeader className="p-3.5 sm:p-4 pb-1">
                <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>A Receber</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 pt-1">
                <div className="text-xl sm:text-2xl font-black text-emerald-600">
                  R${' '}
                  {aReceber.toLocaleString('pt-BR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">Obras ativas</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs hover:border-primary/50 transition-colors">
              <CardHeader className="p-3.5 sm:p-4 pb-1">
                <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Despesas</span>
                  <DollarSign className="w-4 h-4 text-destructive" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 pt-1">
                <div className="text-xl sm:text-2xl font-black text-destructive">
                  R${' '}
                  {despesas.toLocaleString('pt-BR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">Materiais e equipe</p>
              </CardContent>
            </Card>

            <Card className="col-span-2 sm:col-span-1 shadow-xs hover:border-primary/50 transition-colors">
              <CardHeader className="p-3.5 sm:p-4 pb-1">
                <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Resultado</span>
                  <TrendingUp className="w-4 h-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 pt-1">
                <div className="text-xl sm:text-2xl font-black text-primary">
                  R${' '}
                  {resultadoEstimado.toLocaleString('pt-BR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">Saldo atual de caixa</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="shadow-xs hover:border-primary/50 transition-colors">
              <CardHeader className="p-3.5 sm:p-4 pb-1">
                <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Fotos da Obra</span>
                  <Sparkles className="w-4 h-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 pt-1">
                <div className="text-xl sm:text-2xl font-black">
                  {documentos.filter((d) => d.tipo === 'foto').length}
                </div>
                <p className="text-[11px] text-muted-foreground">Registros fotográficos</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs hover:border-primary/50 transition-colors col-span-2 sm:col-span-1">
              <CardHeader className="p-3.5 sm:p-4 pb-1">
                <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Etapas Concluídas</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 pt-1">
                <div className="text-xl sm:text-2xl font-black text-emerald-600">
                  {obras.reduce(
                    (acc, o) =>
                      acc + (o.etapas?.filter((e) => e.concluida || e.concluido).length || 0),
                    0,
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Nas obras ativas</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs hover:border-primary/50 transition-colors col-span-2 sm:col-span-2">
              <CardHeader className="p-3.5 sm:p-4 pb-1">
                <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Perfil Operador</span>
                  <Badge variant="outline" className="text-[10px]">
                    Ativo
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 pt-1">
                <p className="text-xs text-muted-foreground">
                  Interface simplificada para o canteiro. Custos e faturamento estão resguardados.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Grade de Ações Rápidas */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          <Link
            to="/calculadora"
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Calculator className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground">Calcular</span>
          </Link>

          <Link
            to="/materiais"
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground">Materiais</span>
          </Link>

          {isDono ? (
            <Link
              to="/orcamentos/novo"
              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Orçamento</span>
            </Link>
          ) : (
            <Link
              to="/obras"
              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Etapas</span>
            </Link>
          )}

          <Link
            to="/obras"
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <HardHat className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground">Obras</span>
          </Link>

          <Link
            to="/clientes"
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground">Clientes</span>
          </Link>

          {isDono ? (
            <Link
              to="/financeiro"
              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Financeiro</span>
            </Link>
          ) : null}

          <Link
            to="/ferramentas"
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground">Mais</span>
          </Link>
        </div>
      </div>

      {/* Lista "Últimas Atividades" e Obras em Andamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Obras em Andamento */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <HardHat className="w-4 h-4 text-primary" />
              Obras em Andamento
            </h3>
            <Link to="/obras" className="text-xs font-bold text-primary hover:underline">
              Ver todas
            </Link>
          </div>

          <div className="space-y-3">
            {obras.slice(0, 3).map((obra) => (
              <Link
                key={obra.id}
                to={`/obras/${obra.id}`}
                className="block p-3.5 rounded-xl bg-muted/40 hover:bg-muted border border-border/60 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-foreground">{obra.titulo}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {obra.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">{obra.endereco}</p>
                {isDono ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-600">
                      Contratado: R$ {obra.valor_contratado?.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-muted-foreground">
                      A receber: R$ {obra.valor_pendente?.toLocaleString('pt-BR')}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {obra.etapas?.filter((e) => e.concluida || e.concluido).length || 0} de{' '}
                      {obra.etapas?.length || 0} etapas concluídas
                    </span>
                    <span>Ver detalhes</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Últimas Atividades: Financeiro para Dono, Fotos/Diário para Operador */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          {isDono ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Últimas Atividades Financeiras
                </h3>
                <Link to="/financeiro" className="text-xs font-bold text-primary hover:underline">
                  Ver extrato
                </Link>
              </div>

              <div className="space-y-2.5">
                {financeiro.slice(0, 4).map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-foreground text-xs sm:text-sm">
                        {f.descricao || 'Lançamento financeiro'}
                      </p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {f.categoria || 'Geral'} • {formatarDataSegura(f.data) || f.data || 'Hoje'}
                      </p>
                    </div>
                    <span
                      className={`font-black text-sm ${
                        f.tipo === 'entrada' ? 'text-emerald-600' : 'text-destructive'
                      }`}
                    >
                      {f.tipo === 'entrada' ? '+' : '-'} R$ {formatarMoedaSegura(f.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Últimos Registros e Fotos do Canteiro
                </h3>
                <Link to="/obras" className="text-xs font-bold text-primary hover:underline">
                  Ver obras
                </Link>
              </div>

              <div className="space-y-2.5">
                {documentos
                  .filter((d) => d.tipo === 'foto')
                  .slice(0, 3)
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm"
                    >
                      {doc.arquivo && (
                        <img
                          src={doc.arquivo}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs truncate text-foreground">
                          {doc.descricao || 'Foto de acompanhamento'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {doc.etapa_nome ? `Etapa: ${doc.etapa_nome} • ` : ''}
                          {doc.data_foto || 'Registrada recentemente'}
                        </p>
                      </div>
                    </div>
                  ))}
                {documentos.filter((d) => d.tipo === 'foto').length === 0 && (
                  <p className="text-xs text-muted-foreground p-3 text-center">
                    Nenhuma foto registrada recentemente.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
