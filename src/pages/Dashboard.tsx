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

export const Dashboard: React.FC = () => {
  const { user, config } = useAuth()
  const navigate = useNavigate()

  const [obras, setObras] = useState<Obra[]>([])
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [financeiro, setFinanceiro] = useState<FinanceiroLancamento[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [obs, orcs, fins] = await Promise.all([
          localDB.getAll('obras'),
          localDB.getAll('orcamentos'),
          localDB.getAll('financeiro'),
        ])
        setObras(obs)
        setOrcamentos(orcs)
        setFinanceiro(fins)
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

  // Cálculos financeiros reais do banco
  const aReceber = obras.reduce((acc, o) => acc + (o.valor_pendente || 0), 0)
  const despesas = financeiro
    .filter((f) => f.tipo === 'saida')
    .reduce((acc, f) => acc + (f.valor || 0), 0)
  const recebido = financeiro
    .filter((f) => f.tipo === 'entrada')
    .reduce((acc, f) => acc + (f.valor || 0), 0)
  const resultadoEstimado = recebido - despesas

  const nomeExibicao = user?.name || config.nome_profissional || 'Mestre'

  // MODO SIMPLES: interface ultra simplificada (alto contraste e botões gigantes)
  if (config.modo === 'simples') {
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <div className="p-6 rounded-3xl bg-card border-2 border-primary/40 shadow-sm text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">Olá, {nomeExibicao}!</h1>
          <p className="text-base text-muted-foreground font-medium mt-1">
            Como posso te ajudar na obra hoje?
          </p>
        </div>

        {/* Botão Gigante FALAR (mínimo 144px de altura) */}
        <Link
          to="/falar"
          className="w-full h-40 sm:h-48 rounded-3xl bg-primary text-primary-foreground font-black text-2xl sm:text-3xl flex flex-col items-center justify-center gap-3 shadow-xl hover:bg-primary/95 active:scale-[0.98] transition-all pulse-falar"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Mic className="w-10 h-10" />
          </div>
          <span>🎙️ APERTE E FALE</span>
        </Link>

        {/* Atalhos grandes no Modo Simples */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/obras"
            className="h-24 rounded-2xl bg-muted/80 border-2 border-border flex items-center justify-center gap-3 text-lg font-bold text-foreground hover:bg-muted"
          >
            <HardHat className="w-8 h-8 text-primary" />
            <span>Minhas Obras ({totalObras})</span>
          </Link>
          <Link
            to="/calculadora"
            className="h-24 rounded-2xl bg-muted/80 border-2 border-border flex items-center justify-center gap-3 text-lg font-bold text-foreground hover:bg-muted"
          >
            <Calculator className="w-8 h-8 text-primary" />
            <span>Calculadora</span>
          </Link>
        </div>
      </div>
    )
  }

  // MODO PROFISSIONAL E MODO ECONÔMICO
  return (
    <div className="space-y-6">
      {/* Saudação e Botão FALAR Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-card to-muted/40 border border-border shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Olá, {nomeExibicao}!
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Como posso ajudar você hoje na obra?
          </p>
        </div>

        <Link
          to="/falar"
          className="h-24 sm:h-16 px-6 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-3 shadow-md hover:bg-primary/95 active:scale-95 transition-all pulse-falar text-center"
        >
          <Mic className="w-7 h-7 shrink-0" />
          <span>FALAR COM AJUDANTE</span>
        </Link>
      </div>

      {/* Cards Resumo com Dados Reais do Banco (Modo Profissional) */}
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

          <Link
            to="/orcamentos/novo"
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground">Orçamento</span>
          </Link>

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

          <Link
            to="/financeiro"
            className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-foreground">Financeiro</span>
          </Link>

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
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-600">
                    Contratado: R$ {obra.valor_contratado?.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-muted-foreground">
                    A receber: R$ {obra.valor_pendente?.toLocaleString('pt-BR')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Últimos Lançamentos Financeiros */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
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
                  <p className="font-semibold text-foreground text-xs sm:text-sm">{f.descricao}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {f.categoria} • {f.data}
                  </p>
                </div>
                <span
                  className={`font-black text-sm ${
                    f.tipo === 'entrada' ? 'text-emerald-600' : 'text-destructive'
                  }`}
                >
                  {f.tipo === 'entrada' ? '+' : '-'} R$ {f.valor.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
