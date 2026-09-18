import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { localDB } from '@/lib/localDB'
import { Obra, DiarioObra, Orcamento } from '@/types/database'
import {
  HardHat,
  MapPin,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Plus,
  BookOpen,
} from 'lucide-react'
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

export const ObraDetalhe: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [obra, setObra] = useState<Obra | null>(null)
  const [diarios, setDiarios] = useState<DiarioObra[]>([])
  const [dialogDiarioAberto, setDialogDiarioAberto] = useState(false)

  // Novo lançamento de diário de obra
  const [servico, setServico] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [material, setMaterial] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const carregarDados = async () => {
    if (!id) return
    const ob = await localDB.getById('obras', id)
    setObra(ob)
    const todosDiarios = await localDB.getAll('diario_obra')
    setDiarios(todosDiarios.filter((d) => d.obra_id === id))
  }

  useEffect(() => {
    carregarDados()
  }, [id])

  if (!obra) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Obra não encontrada.</p>
        <Link to="/obras">
          <Button variant="outline">Voltar para Obras</Button>
        </Link>
      </div>
    )
  }

  const handleSalvarDiario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!servico.trim()) return

    const novoDiario: DiarioObra = {
      id: 'dia_' + Date.now(),
      owner_id: 'local_user',
      obra_id: obra.id,
      data: new Date().toISOString().split('T')[0],
      servico: servico.trim(),
      quantidade: parseFloat(quantidade) || undefined,
      material: material.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      created: new Date().toISOString(),
    }

    await localDB.put('diario_obra', novoDiario)
    setDialogDiarioAberto(false)
    setServico('')
    setQuantidade('')
    setMaterial('')
    setObservacoes('')
    carregarDados()
  }

  const handleToggleEtapa = async (index: number) => {
    if (!obra.etapas) return
    const novasEtapas = [...obra.etapas]
    const atual = novasEtapas[index]
    const novoStatus = !(atual.concluida || atual.concluido)
    novasEtapas[index] = {
      ...atual,
      concluida: novoStatus,
      concluido: novoStatus,
      progresso: novoStatus ? 100 : 0,
    }

    const atualizada = { ...obra, etapas: novasEtapas }
    await localDB.put('obras', atualizada)
    setObra(atualizada)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <Link to="/obras">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-foreground tracking-tight">{obra.titulo}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            {obra.endereco || 'Sem endereço'}
          </p>
        </div>
        <Badge variant="outline" className="font-bold text-xs capitalize">
          {obra.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Resumo Financeiro da Obra */}
      <Card>
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
          <div>
            <span className="text-xs text-muted-foreground block font-semibold mb-0.5">
              Valor Contratado
            </span>
            <div className="text-xl font-black text-foreground">
              R$ {obra.valor_contratado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-semibold mb-0.5">
              Valor Recebido
            </span>
            <div className="text-xl font-black text-emerald-600">
              R$ {obra.valor_recebido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-semibold mb-0.5">
              Pendente a Receber
            </span>
            <div className="text-xl font-black text-primary">
              R$ {obra.valor_pendente?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Etapas da Obra */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          Etapas da Obra (Toque para marcar como concluída)
        </h2>
        <div className="space-y-2">
          {obra.etapas?.map((etapa, idx) => {
            const isDone = etapa.concluida || etapa.concluido
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleToggleEtapa(idx)}
                className={`w-full p-4 rounded-xl border flex items-center justify-between text-left transition-colors ${
                  isDone
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-card border-border hover:bg-muted/50 text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold text-xs ${
                      isDone
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-muted-foreground/40 text-muted-foreground'
                    }`}
                  >
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-sm font-semibold ${isDone ? 'line-through opacity-80' : ''}`}
                  >
                    {etapa.nome}
                  </span>
                </div>
                <Badge variant={isDone ? 'default' : 'outline'} className="text-[10px]">
                  {isDone ? 'Concluída' : `${etapa.progresso || 0}%`}
                </Badge>
              </button>
            )
          })}
        </div>
      </div>

      {/* Diário de Obra (Anotações do Dia a Dia) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Diário de Obra ({diarios.length})
          </h2>
          <Dialog open={dialogDiarioAberto} onOpenChange={setDialogDiarioAberto}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 font-bold">
                <Plus className="w-4 h-4" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Anotar Diário de Obra</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSalvarDiario} className="space-y-3 mt-2">
                <div>
                  <Label>Serviço Executado Hoje *</Label>
                  <Input
                    required
                    placeholder="Ex: Alvenaria do quarto ou reboco da fachada"
                    value={servico}
                    onChange={(e) => setServico(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Quantidade Produzida (m² ou metros)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 28"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Materiais Utilizados</Label>
                  <Input
                    placeholder="Ex: 280 blocos e 4 sacos de cimento"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Observações / Clima</Label>
                  <Input
                    placeholder="Ex: Dia firme sem chuva, equipe com 2 ajudantes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full font-bold h-11 mt-2">
                  Salvar Diário
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {diarios.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
            Nenhuma anotação de diário nesta obra ainda.
          </div>
        ) : (
          <div className="space-y-2.5">
            {diarios.map((d) => (
              <div
                key={d.id}
                className="p-3.5 rounded-xl bg-card border border-border text-sm space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm">{d.servico}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{d.data}</span>
                </div>
                {d.quantidade && (
                  <p className="text-xs font-semibold text-primary">Produção: {d.quantidade} m²</p>
                )}
                {d.material && (
                  <p className="text-xs text-muted-foreground">Materiais: {d.material}</p>
                )}
                {d.observacoes && (
                  <p className="text-xs italic text-muted-foreground pt-1 border-t">
                    "{d.observacoes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ObraDetalhe
