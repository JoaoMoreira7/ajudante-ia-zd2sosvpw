import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { localDB } from '@/lib/localDB'
import { Obra, Cliente } from '@/types/database'
import { HardHat, Plus, MapPin, Calendar, CheckCircle2, TrendingUp } from 'lucide-react'
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
  const [obras, setObras] = useState<Obra[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [dialogAberto, setDialogAberto] = useState(false)

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

  const handleSalvarObra = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return

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
          <DialogTrigger asChild>
            <Button className="font-bold gap-2">
              <Plus className="w-4 h-4" />
              Nova Obra
            </Button>
          </DialogTrigger>
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

                {/* Finanças da Obra */}
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
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default Obras
