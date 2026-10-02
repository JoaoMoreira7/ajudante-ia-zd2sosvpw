import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { localDB } from '@/lib/localDB'
import { Obra, Cliente } from '@/types/database'
import { HardHat, Plus, MapPin, Calendar, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { verificarLimiteObras } from '@/lib/planLimits'
import PlanUpgradeModal from '@/components/PlanUpgradeModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Obras: React.FC = () => {
  const { isDono, isOperador, planoAtivo, user, isTrial } = useAuth()
  const [obras, setObras] = useState<Obra[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [dialogAberto, setDialogAberto] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeMensagem, setUpgradeMensagem] = useState('')

  // Formulário Nova Obra
  const [titulo, setTitulo] = useState('')
  const [endereco, setEndereco] = useState('')
  const [valorContratado, setValorContratado] = useState('')
  const [valorRecebido, setValorRecebido] = useState('')
  const [clienteId, setClienteId] = useState('')

  const carregarObras = async () => {
    const [obs, clis] = await Promise.all([localDB.getAll('obras'), localDB.getAll('clientes')])
    setObras(obs)
    setClientes(clis)
  }

  useEffect(() => {
    carregarObras()
  }, [])

  const obrasEmAndamento = obras.filter((o) => o.status === 'em_andamento')

  const handleTentativaNovaObra = () => {
    const validacao = verificarLimiteObras(
      planoAtivo,
      obrasEmAndamento.length,
      user?.modulos_liberados,
      isTrial,
    )

    if (!validacao.permitido) {
      setUpgradeMensagem(
        validacao.mensagemBloqueio ||
          'Você atingiu o limite de obras simultâneas do seu plano atual. Faça o upgrade para o Plano Profissional para gerenciar obras ilimitadas.',
      )
      setUpgradeModalOpen(true)
      return
    }

    setDialogAberto(true)
  }

  const handleSalvarObra = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return

    const validacao = verificarLimiteObras(
      planoAtivo,
      obrasEmAndamento.length,
      user?.modulos_liberados,
      isTrial,
    )
    if (!validacao.permitido) {
      setDialogAberto(false)
      setUpgradeMensagem(validacao.mensagemBloqueio || 'Limite de obras atingido.')
      setUpgradeModalOpen(true)
      return
    }

    const contratado = parseFloat(valorContratado) || 0
    const recebido = parseFloat(valorRecebido) || 0
    const pendente = Math.max(0, contratado - recebido)

    const nova: Obra = {
      id: 'obra_' + Date.now(),
      owner_id: 'local_user',
      titulo: titulo.trim(),
      endereco: endereco.trim(),
      cliente_id: clienteId || undefined,
      valor_contratado: contratado,
      valor_recebido: recebido,
      valor_pendente: pendente,
      status: 'em_andamento',
      etapas: [
        { nome: 'Fundação / Demolição', concluida: false, progresso: 0 },
        { nome: 'Alvenaria e Estrutura', concluida: false, progresso: 0 },
        { nome: 'Acabamentos', concluida: false, progresso: 0 },
      ],
      created: new Date().toISOString(),
    }

    await localDB.put('obras', nova)
    setDialogAberto(false)
    setTitulo('')
    setEndereco('')
    setValorContratado('')
    setValorRecebido('')
    setClienteId('')
    carregarObras()
  }

  const totalContratado = obras.reduce((acc, o) => acc + (o.valor_contratado || 0), 0)
  const totalRecebido = obras.reduce((acc, o) => acc + (o.valor_recebido || 0), 0)
  const totalPendente = obras.reduce((acc, o) => acc + (o.valor_pendente || 0), 0)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <HardHat className="w-6 h-6 text-primary" />
            PAINEL DE OBRAS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhamento de custos, medições, pagamentos recebidos e etapas.
          </p>
        </div>

        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <Button onClick={handleTentativaNovaObra} className="font-bold gap-2">
            <Plus className="w-4 h-4" />
            Nova Obra
          </Button>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Cadastrar Nova Obra</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSalvarObra} className="space-y-3.5 mt-2">
              <div>
                <Label>Nome da Obra *</Label>
                <Input
                  required
                  placeholder="Ex: Reforma Cozinha Dona Maria"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input
                  placeholder="Rua, número, bairro"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>
              <div>
                <Label>Vincular a Cliente</Label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Selecione um cliente (opcional)...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor Contratado (R$)</Label>
                  <Input
                    type="number"
                    placeholder="25000"
                    value={valorContratado}
                    onChange={(e) => setValorContratado(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Valor Já Recebido (R$)</Label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={valorRecebido}
                    onChange={(e) => setValorRecebido(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full font-bold h-11 mt-2">
                Salvar Obra
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Aviso de limite do plano se aplicável */}
      {planoAtivo === 'essencial' && !isTrial && (
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>Plano Essencial:</strong> {obrasEmAndamento.length} de 2 obras ativas em
              andamento.
            </span>
          </div>
          {obrasEmAndamento.length >= 2 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setUpgradeMensagem(
                  'Você atingiu o limite de 2 obras simultâneas do Plano Essencial. Faça o upgrade para o Plano Profissional (R$ 49,90/mês) para ter obras ilimitadas.',
                )
                setUpgradeModalOpen(true)
              }}
              className="h-7 text-xs font-bold"
            >
              Liberar Obras Ilimitadas
            </Button>
          )}
        </div>
      )}

      {/* Indicadores Resumo das Obras */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground block font-semibold mb-1">
              Total Contratado
            </span>
            <div className="text-xl sm:text-2xl font-black text-foreground">
              R$ {totalContratado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground block font-semibold mb-1">
              Total Já Recebido
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600">
              R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground block font-semibold mb-1">
              Pendente a Receber
            </span>
            <div className="text-xl sm:text-2xl font-black text-primary">
              R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Obras */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {obras.map((obra) => {
          const progressoMedio =
            obra.etapas && obra.etapas.length > 0
              ? Math.round(
                  obra.etapas.reduce((acc, et) => acc + (et.progresso || 0), 0) /
                    obra.etapas.length,
                )
              : 0

          return (
            <Link key={obra.id} to={`/obras/${obra.id}`} className="block group">
              <Card className="h-full hover:border-primary/60 transition-all hover:shadow-md p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {obra.titulo}
                    </h3>
                    {obra.endereco && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{obra.endereco}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs capitalize font-bold">
                    {obra.status.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Progresso Geral</span>
                    <span className="text-foreground">{progressoMedio}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progressoMedio}%` }}
                    />
                  </div>
                </div>

                {/* Finanças ou Progresso da Obra */}
                {isDono ? (
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t text-xs">
                    <div>
                      <span className="text-muted-foreground block">Contratado</span>
                      <span className="font-bold text-foreground">
                        R$ {obra.valor_contratado?.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block">A Receber</span>
                      <span className="font-black text-emerald-600">
                        R$ {obra.valor_pendente?.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      {obra.etapas?.filter((e) => e.concluida || e.concluido).length || 0} de{' '}
                      {obra.etapas?.length || 0} etapas
                    </span>
                    <span className="text-[11px] font-medium">Modo Operador</span>
                  </div>
                )}
              </Card>
            </Link>
          )
        })}
      </div>
      {/* Modal de Upgrade Amigável */}
      <PlanUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        titulo="Limite de Obras Simultâneas Atingido"
        mensagem={upgradeMensagem}
        planoSugerido="profissional"
      />
    </div>
  )
}

export default Obras
