import React, { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Users,
  AlertCircle,
  FileDown,
  PlusCircle,
  Search,
  Filter,
  Lock,
  Unlock,
  Layers,
  MessageCircle,
  PhoneCall,
  History,
  ShieldAlert,
  ArrowUpDown,
  CheckCircle,
  AlertTriangle,
  CreditCard,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Assinatura,
  AuditoriaAdmin,
  FaturaVenda,
  OrigemVenda,
  StatusConta,
  UserProfile,
} from '@/types/database'
import {
  calcularMetricasComerciais,
  exportarVendasCSV,
  formatarMoedaBrl,
  getStatusBadgeConfig,
  MetricasComerciais,
} from '@/lib/commercialEngine'
import { toast } from '@/hooks/use-toast'
import DirectSaleModal from '@/components/admin/DirectSaleModal'
import BlockClientModal from '@/components/admin/BlockClientModal'
import UnblockClientModal from '@/components/admin/UnblockClientModal'
import ReleaseModulesModal from '@/components/admin/ReleaseModulesModal'

export const AdminPage: React.FC = () => {
  const { user, isAdmin, setPerfil } = useAuth()

  // Estados de dados
  const [faturas, setFaturas] = useState<FaturaVenda[]>([])
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [usuarios, setUsuarios] = useState<UserProfile[]>([])
  const [auditorias, setAuditorias] = useState<AuditoriaAdmin[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros de busca na lista de vendas
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todas')

  // Modais
  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(false)
  const [selectedClientForBlock, setSelectedClientForBlock] = useState<UserProfile | null>(null)
  const [selectedClientForUnblock, setSelectedClientForUnblock] = useState<UserProfile | null>(null)
  const [selectedClientForModules, setSelectedClientForModules] = useState<UserProfile | null>(null)

  const carregarDadosComerciais = async () => {
    setIsLoading(true)
    try {
      if (pb.authStore.isValid && navigator.onLine) {
        // Tenta puxar do PocketBase com tratamento gracioso
        const [usersRes, fatRes, assRes, auditRes] = await Promise.allSettled([
          pb.collection('users').getFullList<UserProfile>({ sort: '-created', requestKey: null }),
          pb.collection('faturas_venda').getFullList<FaturaVenda>({
            expand: 'user_id',
            sort: '-created',
            requestKey: null,
          }),
          pb.collection('assinaturas').getFullList<Assinatura>({
            expand: 'user_id',
            sort: '-created',
            requestKey: null,
          }),
          pb.collection('auditoria_admin').getFullList<AuditoriaAdmin>({
            sort: '-created',
            requestKey: null,
          }),
        ])

        if (usersRes.status === 'fulfilled') setUsuarios(usersRes.value)
        if (fatRes.status === 'fulfilled') setFaturas(fatRes.value)
        if (assRes.status === 'fulfilled') setAssinaturas(assRes.value)
        if (auditRes.status === 'fulfilled') setAuditorias(auditRes.value)
      } else {
        // Mock offline fallback
        const cachedFaturas = localStorage.getItem('ajudante_faturas_cache')
        if (cachedFaturas) setFaturas(JSON.parse(cachedFaturas))
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do admin:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarDadosComerciais()
  }, [])

  // Métricas calculadas pelo motor determinístico
  const metricas: MetricasComerciais = useMemo(() => {
    return calcularMetricasComerciais(faturas, assinaturas)
  }, [faturas, assinaturas])

  // Mapa de assinaturas por ID e por UserID
  const assinaturasByUser = useMemo(() => {
    const map = new Map<string, Assinatura>()
    assinaturas.forEach((a) => map.set(a.user_id, a))
    return map
  }, [assinaturas])

  // Lista consolidada de clientes/vendas combinando dados
  const linhasConsolidadas = useMemo(() => {
    return usuarios
      .filter((u) => u.perfil !== 'admin')
      .map((u) => {
        const ass = assinaturasByUser.get(u.id)
        const faturaMaisRecente = faturas.find((f) => f.user_id === u.id)
        const statusConta: StatusConta = (u.status_conta as StatusConta) || ass?.status || 'ativo'
        const origem: OrigemVenda = ass?.origem || faturaMaisRecente?.origem || 'direta'
        const valor = ass?.valor_recorrente || faturaMaisRecente?.valor || 0

        return {
          user: u,
          assinatura: ass,
          fatura: faturaMaisRecente,
          statusConta,
          origem,
          valor,
        }
      })
  }, [usuarios, assinaturasByUser, faturas])

  // Filtro de pesquisa e select
  const linhasFiltradas = useMemo(() => {
    return linhasConsolidadas.filter((item) => {
      // Filtro de texto (nome, email)
      const termo = busca.toLowerCase().trim()
      const matchTexto =
        !termo ||
        item.user.name?.toLowerCase().includes(termo) ||
        item.user.email?.toLowerCase().includes(termo)

      // Filtro de status da conta
      let matchStatus = true
      if (filtroStatus !== 'todos') {
        matchStatus = item.statusConta === filtroStatus
      }

      // Filtro de origem
      let matchOrigem = true
      if (filtroOrigem !== 'todas') {
        matchOrigem = item.origem === filtroOrigem
      }

      return matchTexto && matchStatus && matchOrigem
    })
  }, [linhasConsolidadas, busca, filtroStatus, filtroOrigem])

  // Ações Administrativas
  const handleBloquear = async (dados: {
    userId: string
    motivo: string
    tipoBloqueio: 'manual' | 'inadimplencia'
    notificarCliente: boolean
  }) => {
    if (!navigator.onLine) {
      toast({
        title: 'Sem conexão com a internet',
        description: 'Bloqueios de conta exigem conexão para sincronização imediata no servidor.',
        variant: 'destructive',
      })
      return
    }

    try {
      const res = await pb.send('/backend/v1/admin/commercial/block-client', {
        method: 'POST',
        body: dados,
      })

      toast({
        title: 'Cliente bloqueado com sucesso',
        description: 'O acesso foi interrompido no servidor imediatamente.',
      })
      await carregarDadosComerciais()
    } catch (err: any) {
      toast({
        title: 'Não consegui bloquear o cliente',
        description: err?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    }
  }

  const handleLiberar = async (targetUserId: string, observacoes: string) => {
    if (!navigator.onLine) {
      toast({
        title: 'Sem conexão com a internet',
        description: 'Liberação de conta exige conexão com o servidor.',
        variant: 'destructive',
      })
      return
    }

    try {
      await pb.send('/backend/v1/admin/commercial/unblock-client', {
        method: 'POST',
        body: { userId: targetUserId, observacoes },
      })

      toast({
        title: 'Conta liberada com sucesso',
        description: 'O cliente já pode voltar a acessar o sistema.',
      })
      await carregarDadosComerciais()
    } catch (err: any) {
      toast({
        title: 'Não consegui liberar o cliente',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleLiberarModulos = async (targetUserId: string, modulos: Record<string, boolean>) => {
    try {
      await pb.send('/backend/v1/admin/commercial/update-modules', {
        method: 'POST',
        body: { userId: targetUserId, modulos },
      })
      toast({
        title: 'Módulos atualizados',
        description: 'Permissões específicas aplicadas para este cliente.',
      })
      await carregarDadosComerciais()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar módulos',
        description: err?.message || 'Não foi possível salvar os módulos.',
        variant: 'destructive',
      })
    }
  }

  const handleRegistrarVendaDireta = async (dados: any) => {
    try {
      await pb.send('/backend/v1/admin/commercial/register-direct-sale', {
        method: 'POST',
        body: dados,
      })
      toast({
        title: 'Venda Direta Registrada com Sucesso!',
        description: 'Assinatura ativada e fatura baixada como paga.',
      })
      await carregarDadosComerciais()
    } catch (err: any) {
      throw new Error(err?.message || 'Não consegui registrar a venda direta no servidor.')
    }
  }

  const handleExportarCsv = () => {
    const csvContent = exportarVendasCSV(faturas)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `vendas_ajudante_ia_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({
      title: 'Planilha exportada',
      description: 'O arquivo CSV foi baixado com sucesso.',
    })
  }

  const handleContatoCliente = (cliente: UserProfile) => {
    const texto = encodeURIComponent(
      `Olá ${cliente.name || ''}! Aqui é o João Carlos do Ajudante IA. Entro em contato referente à sua assinatura.`,
    )
    window.open(`https://wa.me/?text=${texto}`, '_blank')
  }

  // Se o usuário atual não for administrador, exibe tela de acesso restrito (403)
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-foreground">Acesso Restrito ao Administrador</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Esta área é reservada exclusivamente para a administração geral e gestão comercial do
          Ajudante IA. Qualquer requisição não autorizada é rejeitada com código 403 no servidor.
        </p>
        <div className="pt-2">
          <Button onClick={() => setPerfil('admin')} className="font-bold gap-2">
            <ShieldCheck className="w-4 h-4" />
            Ativar Modo Administrador (Dono)
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Painel Admin */}
      <div className="p-5 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-primary font-bold border-primary/40 text-[10px]"
            >
              ADMINISTRAÇÃO MASTER
            </Badge>
            <span className="text-xs text-muted-foreground">Regras e assinaturas</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2 mt-1">
            <ShieldCheck className="w-6 h-6 text-primary" />
            PAINEL DO ADMINISTRADOR
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão comercial de assinaturas, controle direto de clientes, bloqueios e auditoria de
            vendas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsDirectSaleOpen(true)}
            className="font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Registrar Venda Direta
          </Button>

          <Button variant="outline" onClick={handleExportarCsv} className="font-bold gap-2 text-xs">
            <FileDown className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Tabs Principais */}
      <Tabs defaultValue="comercial" className="w-full">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="comercial" className="font-bold text-xs gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Gestão Comercial
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="font-bold text-xs gap-1.5">
            <History className="w-3.5 h-3.5" />
            Logs de Auditoria ({auditorias.length})
          </TabsTrigger>
          <TabsTrigger value="gateway" className="font-bold text-xs gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Gateway Online (Pendente)
          </TabsTrigger>
        </TabsList>

        {/* ABA: GESTÃO COMERCIAL */}
        <TabsContent value="comercial" className="space-y-6 mt-4">
          {/* CARDS DE MÉTRICAS NO TOPO */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-semibold flex items-center justify-between">
                  <span>Total Recebido</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </CardDescription>
                <CardTitle className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                  {formatarMoedaBrl(metricas.totalRecebido)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] text-muted-foreground">
                Pagamentos confirmados e baixados
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-semibold flex items-center justify-between">
                  <span>A Receber</span>
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </CardDescription>
                <CardTitle className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
                  {formatarMoedaBrl(metricas.aReceber)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] text-muted-foreground">
                Faturas pendentes ou em atraso
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-semibold flex items-center justify-between">
                  <span>Quantidade Vendida</span>
                  <TrendingUp className="w-4 h-4 text-primary" />
                </CardDescription>
                <CardTitle className="text-xl sm:text-2xl font-black text-foreground font-mono">
                  {metricas.quantidadeVendida}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] text-muted-foreground">
                Assinaturas e ciclos quitados
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-semibold flex items-center justify-between">
                  <span>Cancelados</span>
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                </CardDescription>
                <CardTitle className="text-xl sm:text-2xl font-black text-muted-foreground font-mono">
                  {metricas.cancelados}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] text-muted-foreground">
                Assinaturas encerradas
              </CardContent>
            </Card>
          </div>

          {/* BARRA DE FILTROS E BUSCA */}
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome do cliente ou e-mail..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro por Estado */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Estado:</span>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="h-9 text-xs min-w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="text-xs">
                      Todos os estados
                    </SelectItem>
                    <SelectItem value="bloqueado_manual" className="text-xs">
                      BLOQUEADO MANUALMENTE
                    </SelectItem>
                    <SelectItem value="bloqueado_inadimplencia" className="text-xs">
                      BLOQUEADO INADIMPLÊNCIA
                    </SelectItem>
                    <SelectItem value="ativo" className="text-xs">
                      Ativo
                    </SelectItem>
                    <SelectItem value="trial" className="text-xs">
                      Trial
                    </SelectItem>
                    <SelectItem value="atrasado" className="text-xs">
                      Atrasado
                    </SelectItem>
                    <SelectItem value="cancelado" className="text-xs">
                      Cancelado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Origem */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Origem:</span>
                <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                  <SelectTrigger className="h-9 text-xs min-w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas" className="text-xs">
                      Todas as origens
                    </SelectItem>
                    <SelectItem value="direta" className="text-xs">
                      Venda Direta
                    </SelectItem>
                    <SelectItem value="internet" className="text-xs">
                      Via internet-online
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* LISTA CONSOLIDADA DE VENDAS E CLIENTES */}
          <Card className="border-border shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Clientes & Assinaturas ({linhasFiltradas.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Gerenciamento comercial, controle de bloqueios manuais e liberação de módulos
                    sob medida.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-bold">Cliente / E-mail</TableHead>
                    <TableHead className="text-xs font-bold">Status da Conta</TableHead>
                    <TableHead className="text-xs font-bold">Plano & Ciclo</TableHead>
                    <TableHead className="text-xs font-bold">Origem</TableHead>
                    <TableHead className="text-xs font-bold">Valor Negociado</TableHead>
                    <TableHead className="text-xs font-bold">Próx. Vencimento</TableHead>
                    <TableHead className="text-xs font-bold text-right">
                      Ações do Administrador
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-xs text-muted-foreground"
                      >
                        Nenhum cliente encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    linhasFiltradas.map((item) => {
                      const badgeCfg = getStatusBadgeConfig(item.statusConta)
                      const isBloqueadoItem =
                        item.statusConta === 'bloqueado_manual' ||
                        item.statusConta === 'bloqueado_inadimplencia'

                      return (
                        <TableRow key={item.user.id} className="hover:bg-muted/30">
                          {/* Cliente */}
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-foreground">
                                {item.user.name || 'Sem nome informado'}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {item.user.email}
                              </span>
                              {item.user.motivo_bloqueio && (
                                <span className="text-[10px] text-destructive mt-0.5 line-clamp-1 italic">
                                  Motivo: {item.user.motivo_bloqueio}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Status Badge */}
                          <TableCell className="py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${badgeCfg.bgClass} ${badgeCfg.colorClass} ${badgeCfg.borderClass}`}
                              title={badgeCfg.descricao}
                            >
                              {badgeCfg.label}
                            </span>
                          </TableCell>

                          {/* Plano & Ciclo */}
                          <TableCell className="py-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase text-foreground">
                                {item.assinatura?.plano || 'Profissional'}
                              </span>
                              <span className="text-[10px] text-muted-foreground capitalize">
                                Ciclo: {item.assinatura?.ciclo || 'Mensal'}
                              </span>
                            </div>
                          </TableCell>

                          {/* Origem */}
                          <TableCell className="py-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium ${
                                item.origem === 'direta'
                                  ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                                  : 'border-blue-500/40 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              {item.origem === 'direta' ? 'Venda Direta' : 'Internet/Online'}
                            </Badge>
                          </TableCell>

                          {/* Valor */}
                          <TableCell className="py-3 font-mono font-bold text-xs text-foreground">
                            {formatarMoedaBrl(item.valor)}
                          </TableCell>

                          {/* Vencimento */}
                          <TableCell className="py-3 text-xs text-muted-foreground font-mono">
                            {item.assinatura?.proximo_vencimento
                              ? new Date(
                                  item.assinatura.proximo_vencimento + 'T12:00:00Z',
                                ).toLocaleDateString('pt-BR')
                              : 'Sem agenda'}
                          </TableCell>

                          {/* Ações */}
                          <TableCell className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Bloquear / Liberar */}
                              {isBloqueadoItem ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedClientForUnblock(item.user)}
                                  className="h-7 text-xs font-bold gap-1 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                  <Unlock className="w-3 h-3" />
                                  Liberar Conta
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedClientForBlock(item.user)}
                                  className="h-7 text-xs font-bold gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                                >
                                  <Lock className="w-3 h-3" />
                                  Bloquear Conta
                                </Button>
                              )}

                              {/* Liberar módulos */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedClientForModules(item.user)}
                                className="h-7 text-xs font-semibold gap-1"
                                title="Liberar módulos sob medida"
                              >
                                <Layers className="w-3 h-3" />
                                <span className="hidden sm:inline">Módulos</span>
                              </Button>

                              {/* Falar com o cliente */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleContatoCliente(item.user)}
                                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                title="Falar com o cliente no WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA: LOGS DE AUDITORIA */}
        <TabsContent value="auditoria" className="space-y-4 mt-4">
          <Card className="border-border">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Trilha Completa de Auditoria Administrativa
              </CardTitle>
              <CardDescription className="text-xs">
                Registra quem fez, quando, de qual IP e por qual motivo cada bloqueio, liberação ou
                venda direta foi executada.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-bold">Data/Hora</TableHead>
                    <TableHead className="text-xs font-bold">Administrador</TableHead>
                    <TableHead className="text-xs font-bold">Ação</TableHead>
                    <TableHead className="text-xs font-bold">Cliente Afetado</TableHead>
                    <TableHead className="text-xs font-bold">Motivo / Justificativa</TableHead>
                    <TableHead className="text-xs font-bold">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditorias.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-6 text-xs text-muted-foreground"
                      >
                        Nenhum registro de auditoria gravado ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditorias.map((a) => (
                      <TableRow key={a.id} className="text-xs">
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                          {a.created ? new Date(a.created).toLocaleString('pt-BR') : 'N/D'}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">{a.admin_nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {a.acao}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{a.alvo_user_nome}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {a.alvo_user_email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs text-muted-foreground">
                          {a.motivo || 'Sem justificativa gravada'}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {a.ip || 'Local'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA: GATEWAY ONLINE (PENDENTE DE CONFIGURAÇÃO) */}
        <TabsContent value="gateway" className="space-y-4 mt-4">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <AlertTriangle className="w-5 h-5" />
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px]"
                >
                  MOCK EXPLICITAMENTE ROTULADO
                </Badge>
              </div>
              <CardTitle className="text-lg font-black text-foreground">
                Conector de Gateway de Pagamento Online (Asaas / Cartão)
              </CardTitle>
              <CardDescription className="text-xs">
                Camada de abstração pronta para plugar API Key do gateway de pagamentos recorrentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 dark:text-amber-200 space-y-2">
                <p className="font-bold">Status Atual: PENDENTE DE CONFIGURAÇÃO DE CHAVE</p>
                <p>
                  As vendas &quot;Via Internet&quot; só serão ativadas de verdade quando o
                  proprietário cadastrar o token de produção da conta Asaas ou outro gateway. Todas
                  as vendas ativas hoje são processadas pelo canal seguro de{' '}
                  <strong>Venda Direta</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-muted-foreground block text-[11px]">
                    Provedor Suportado:
                  </span>
                  <span className="font-bold text-foreground">Asaas Pagamentos S.A.</span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-muted-foreground block text-[11px]">Webhook Endpoint:</span>
                  <span className="font-mono text-[11px] text-foreground">
                    /backend/v1/webhooks/asaas (aguardando plug)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais de Ação */}
      <DirectSaleModal
        isOpen={isDirectSaleOpen}
        onClose={() => setIsDirectSaleOpen(false)}
        clientesExistentes={usuarios.filter((u) => u.perfil !== 'admin')}
        onSuccess={handleRegistrarVendaDireta}
      />

      {selectedClientForBlock && (
        <BlockClientModal
          isOpen={Boolean(selectedClientForBlock)}
          onClose={() => setSelectedClientForBlock(null)}
          clienteNome={selectedClientForBlock.name || 'Cliente'}
          clienteEmail={selectedClientForBlock.email}
          userId={selectedClientForBlock.id}
          onConfirm={handleBloquear}
        />
      )}

      {selectedClientForUnblock && (
        <UnblockClientModal
          isOpen={Boolean(selectedClientForUnblock)}
          onClose={() => setSelectedClientForUnblock(null)}
          clienteNome={selectedClientForUnblock.name || 'Cliente'}
          clienteEmail={selectedClientForUnblock.email}
          userId={selectedClientForUnblock.id}
          onConfirm={handleLiberar}
        />
      )}

      {selectedClientForModules && (
        <ReleaseModulesModal
          isOpen={Boolean(selectedClientForModules)}
          onClose={() => setSelectedClientForModules(null)}
          clienteNome={selectedClientForModules.name || 'Cliente'}
          clienteEmail={selectedClientForModules.email}
          userId={selectedClientForModules.id}
          modulosAtuais={selectedClientForModules.modulos_liberados || {}}
          onConfirm={handleLiberarModulos}
        />
      )}
    </div>
  )
}

export default AdminPage
