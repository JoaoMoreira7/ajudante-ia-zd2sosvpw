/**
 * src/components/TarefasELembretesModal.tsx
 * Modal / Painel de Tarefas e Lembretes acessível em até 2 cliques da Home e Falar.
 * Suporta Modo Simples com alvos de toque grandes (mínimo 48px).
 *
 * RECURSOS:
 * - Fila de tarefas ordenada (vencidas primeiro com destaque, depois por prazo).
 * - Conclusão de tarefa por toque simples.
 * - Adição manual rápida de tarefa ou lembrete.
 * - Gestão de lembretes ativos e tetos de gastos.
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { localDB } from '@/lib/localDB'
import { TarefaObra, LembreteObra } from '@/types/database'
import { ordenarFilaTarefas } from '@/lib/tarefasEngine'
import { useAuth } from '@/contexts/AuthContext'
import { CheckCircle2, Clock, AlertTriangle, Plus, Bell, Calendar, Trash2 } from 'lucide-react'

interface TarefasELembretesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: 'tarefas' | 'lembretes' | 'tetos'
}

export function TarefasELembretesModal({
  open,
  onOpenChange,
  initialTab = 'tarefas',
}: TarefasELembretesModalProps) {
  const { config, profile } = useAuth()
  const modoSimples = config?.modo === 'simples'
  const [tab, setTab] = useState<'tarefas' | 'lembretes' | 'tetos'>(initialTab)

  const [tarefas, setTarefas] = useState<TarefaObra[]>([])
  const [lembretes, setLembretes] = useState<LembreteObra[]>([])
  const [tetos, setTetos] = useState<Record<string, number>>({})

  // Formulário rápido nova tarefa
  const [novoTituloTarefa, setNovoTituloTarefa] = useState('')
  const [novoPrazoTarefa, setNovoPrazoTarefa] = useState('')
  const [novaPrioridade, setNovaPrioridade] = useState<'baixa' | 'media' | 'alta' | 'urgente'>(
    'media',
  )

  // Formulário rápido novo lembrete
  const [novoTituloLembrete, setNovoTituloLembrete] = useState('')
  const [novoHorarioLembrete, setNovoHorarioLembrete] = useState('06:00')
  const [novaFrequencia, setNovaFrequencia] = useState<'uma_vez' | 'diaria' | 'semanal' | 'mensal'>(
    'diaria',
  )

  // Formulário teto
  const [novaCatTeto, setNovaCatTeto] = useState('material')
  const [novoValorTeto, setNovoValorTeto] = useState('')

  const carregarDados = async () => {
    try {
      const tars = await localDB.getAll('tarefas_obra')
      setTarefas(ordenarFilaTarefas(tars))

      const lems = await localDB.getAll('lembretes_obra')
      setLembretes(lems)

      const cfgs = await localDB.getAll('configuracoes')
      if (cfgs[0]?.teto_categorias) {
        setTetos(cfgs[0].teto_categorias)
      }
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    if (open) {
      setTab(initialTab)
      carregarDados()
    }
  }, [open, initialTab])

  const alternarStatusTarefa = async (tarefa: TarefaObra) => {
    const novoStatus = tarefa.status === 'pendente' ? 'concluida' : 'pendente'
    const atualizada: TarefaObra = {
      ...tarefa,
      status: novoStatus,
      concluida_em: novoStatus === 'concluida' ? new Date().toISOString() : undefined,
    }
    await localDB.put('tarefas_obra', atualizada)
    await carregarDados()
  }

  const handleCriarTarefa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoTituloTarefa.trim()) return

    const nova: TarefaObra = {
      id: 'tar_' + Date.now(),
      owner_id: profile?.id || 'local_user',
      titulo: novoTituloTarefa.trim(),
      prazo: novoPrazoTarefa || undefined,
      prioridade: novaPrioridade,
      status: 'pendente',
      created: new Date().toISOString(),
    }
    await localDB.put('tarefas_obra', nova)
    setNovoTituloTarefa('')
    setNovoPrazoTarefa('')
    setNovaPrioridade('media')
    await carregarDados()
  }

  const handleExcluirTarefa = async (id: string) => {
    await localDB.delete('tarefas_obra', id)
    await carregarDados()
  }

  const handleCriarLembrete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoTituloLembrete.trim()) return

    const novo: LembreteObra = {
      id: 'lem_' + Date.now(),
      owner_id: profile?.id || 'local_user',
      titulo: novoTituloLembrete.trim(),
      horario: novoHorarioLembrete,
      frequencia: novaFrequencia,
      ativo: true,
      created: new Date().toISOString(),
    }
    await localDB.put('lembretes_obra', novo)
    setNovoTituloLembrete('')
    await carregarDados()
  }

  const handleAlternarLembrete = async (lembrete: LembreteObra) => {
    await localDB.put('lembretes_obra', {
      ...lembrete,
      ativo: !lembrete.ativo,
    })
    await carregarDados()
  }

  const handleExcluirLembrete = async (id: string) => {
    await localDB.delete('lembretes_obra', id)
    await carregarDados()
  }

  const handleSalvarTeto = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(novoValorTeto.replace(',', '.'))
    if (!val || val <= 0) return

    const novosTetos = { ...tetos, [novaCatTeto]: val }
    const cfgs = await localDB.getAll('configuracoes')
    const cfgAtual = cfgs[0] || {
      id: 'cfg_1',
      owner_id: profile?.id || 'local_user',
      modo: 'profissional' as const,
      fonte_tamanho: 'm' as const,
      alto_contraste: false,
      voz_respostas: true,
    }
    await localDB.put('configuracoes', {
      ...cfgAtual,
      teto_categorias: novosTetos,
    })
    setTetos(novosTetos)
    setNovoValorTeto('')
  }

  const handleRemoverTeto = async (cat: string) => {
    const novosTetos = { ...tetos }
    delete novosTetos[cat]
    const cfgs = await localDB.getAll('configuracoes')
    const cfgAtual = cfgs[0] || {
      id: 'cfg_1',
      owner_id: profile?.id || 'local_user',
      modo: 'profissional' as const,
      fonte_tamanho: 'm' as const,
      alto_contraste: false,
      voz_respostas: true,
    }
    await localDB.put('configuracoes', {
      ...cfgAtual,
      teto_categorias: novosTetos,
    })
    setTetos(novosTetos)
  }

  const hojeIso = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={modoSimples ? 'text-2xl font-bold' : 'text-xl font-bold'}>
            Tarefas, Lembretes e Tetos
          </DialogTitle>
          <DialogDescription>
            Tudo o que você fala vira tarefa ou lembrete automático. Gerencie aqui.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="tarefas" className="font-semibold">
              Tarefas ({tarefas.filter((t) => t.status === 'pendente').length})
            </TabsTrigger>
            <TabsTrigger value="lembretes" className="font-semibold">
              Lembretes ({lembretes.filter((l) => l.ativo).length})
            </TabsTrigger>
            <TabsTrigger value="tetos" className="font-semibold">
              Tetos de Gasto
            </TabsTrigger>
          </TabsList>

          {/* ABA TAREFAS */}
          <TabsContent value="tarefas" className="space-y-4">
            <form
              onSubmit={handleCriarTarefa}
              className="p-3 bg-muted/40 rounded-lg space-y-2 border"
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Adicionar Tarefa Rápida
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Ex: Pedir pro eletricista chegar sexta"
                  value={novoTituloTarefa}
                  onChange={(e) => setNovoTituloTarefa(e.target.value)}
                  className={modoSimples ? 'h-12 text-base' : 'h-10'}
                />
                <Input
                  type="date"
                  value={novoPrazoTarefa}
                  onChange={(e) => setNovoPrazoTarefa(e.target.value)}
                  className={`w-full sm:w-40 ${modoSimples ? 'h-12' : 'h-10'}`}
                />
                <Button
                  type="submit"
                  className={`shrink-0 ${modoSimples ? 'h-12 px-6 text-base' : 'h-10'}`}
                >
                  <Plus className="w-4 h-4 mr-1" /> Salvar
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              {tarefas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma tarefa cadastrada. Você pode falar "pedir pro eletricista chegar sexta"
                  que ela vira tarefa!
                </div>
              ) : (
                tarefas.map((t) => {
                  const isPendente = t.status === 'pendente'
                  const isVencida = isPendente && t.prazo && t.prazo < hojeIso
                  const isHoje = isPendente && t.prazo === hojeIso

                  return (
                    <div
                      key={t.id}
                      className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors ${
                        !isPendente
                          ? 'bg-muted/30 border-muted opacity-60'
                          : isVencida
                            ? 'bg-red-500/10 border-red-500/30'
                            : isHoje
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={!isPendente}
                          onCheckedChange={() => alternarStatusTarefa(t)}
                          className={modoSimples ? 'w-6 h-6 mt-1' : 'w-5 h-5 mt-0.5'}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-medium ${modoSimples ? 'text-lg' : 'text-sm'} ${
                              !isPendente ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {t.titulo}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {t.prazo && (
                              <span
                                className={`text-xs flex items-center gap-1 font-medium ${
                                  isVencida ? 'text-red-600 font-bold' : 'text-muted-foreground'
                                }`}
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                {t.prazo.split('-').reverse().join('/')}
                                {isVencida && ' (Vencida)'}
                                {isHoje && ' (Hoje)'}
                              </span>
                            )}
                            <Badge
                              variant={
                                t.prioridade === 'urgente'
                                  ? 'destructive'
                                  : t.prioridade === 'alta'
                                    ? 'default'
                                    : 'secondary'
                              }
                              className="text-[10px] uppercase"
                            >
                              {t.prioridade}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExcluirTarefa(t.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </TabsContent>

          {/* ABA LEMBRETES */}
          <TabsContent value="lembretes" className="space-y-4">
            <form
              onSubmit={handleCriarLembrete}
              className="p-3 bg-muted/40 rounded-lg space-y-2 border"
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Novo Lembrete Recorrente
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Ex: Medir o nível da fundação"
                  value={novoTituloLembrete}
                  onChange={(e) => setNovoTituloLembrete(e.target.value)}
                  className={modoSimples ? 'h-12 text-base' : 'h-10'}
                />
                <Input
                  type="time"
                  value={novoHorarioLembrete}
                  onChange={(e) => setNovoHorarioLembrete(e.target.value)}
                  className={`w-full sm:w-28 ${modoSimples ? 'h-12' : 'h-10'}`}
                />
                <select
                  value={novaFrequencia}
                  onChange={(e) => setNovaFrequencia(e.target.value as any)}
                  className={`px-3 rounded-md border bg-background text-sm ${modoSimples ? 'h-12 text-base' : 'h-10'}`}
                >
                  <option value="diaria">Todo dia</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                  <option value="uma_vez">Uma vez</option>
                </select>
                <Button
                  type="submit"
                  className={`shrink-0 ${modoSimples ? 'h-12 px-6 text-base' : 'h-10'}`}
                >
                  <Bell className="w-4 h-4 mr-1" /> Salvar
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              {lembretes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lembrete configurado. Experimente dizer: "me lembra de medir o nível todo
                  dia às 6h".
                </div>
              ) : (
                lembretes.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${l.ativo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                      >
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <p
                          className={`font-medium ${modoSimples ? 'text-lg' : 'text-sm'} ${!l.ativo ? 'text-muted-foreground line-through' : ''}`}
                        >
                          {l.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.frequencia === 'diaria'
                            ? 'Todo dia'
                            : l.frequencia === 'semanal'
                              ? 'Semanalmente'
                              : 'Uma vez'}{' '}
                          às {l.horario || '06:00'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAlternarLembrete(l)}
                        className={modoSimples ? 'h-10 px-4' : 'h-8 px-3'}
                      >
                        {l.ativo ? 'Pausar' : 'Ativar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExcluirLembrete(l.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* ABA TETOS DE GASTO */}
          <TabsContent value="tetos" className="space-y-4">
            <form
              onSubmit={handleSalvarTeto}
              className="p-3 bg-muted/40 rounded-lg space-y-2 border"
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Definir Teto Mensal por Categoria
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={novaCatTeto}
                  onChange={(e) => setNovaCatTeto(e.target.value)}
                  className={`px-3 rounded-md border bg-background text-sm ${modoSimples ? 'h-12 text-base' : 'h-10'}`}
                >
                  <option value="material">Materiais em Geral</option>
                  <option value="cimento">Cimento</option>
                  <option value="areia">Areia / Pedra</option>
                  <option value="bloco">Blocos / Tijolos</option>
                  <option value="combustivel">Combustível</option>
                  <option value="alimentacao">Alimentação / Almoço</option>
                  <option value="ferramenta">Ferramentas</option>
                </select>
                <Input
                  type="number"
                  placeholder="Ex: 800"
                  value={novoValorTeto}
                  onChange={(e) => setNovoValorTeto(e.target.value)}
                  className={modoSimples ? 'h-12 text-base' : 'h-10'}
                />
                <Button
                  type="submit"
                  className={`shrink-0 ${modoSimples ? 'h-12 px-6 text-base' : 'h-10'}`}
                >
                  Definir Teto
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              {Object.keys(tetos).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum teto de categoria definido. Diga: "define um orçamento de 800 por mês pra
                  material".
                </div>
              ) : (
                Object.entries(tetos).map(([cat, val]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div>
                      <p className="font-semibold capitalize text-foreground">{cat}</p>
                      <p className="text-xs text-muted-foreground">
                        Teto mensal:{' '}
                        <strong className="text-primary">R$ {Number(val).toFixed(2)}</strong> (aviso
                        aos 70% e 100%)
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoverTeto(cat)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
