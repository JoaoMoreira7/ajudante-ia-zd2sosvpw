import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { localDB } from '@/lib/localDB'
import { Cliente, Obra, OrcamentoItem } from '@/types/database'
import * as MathEngine from '@/lib/mathEngine'
import { FileSpreadsheet, Plus, Trash2, ArrowLeft, Calculator } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { verificarLimiteOrcamentos } from '@/lib/planLimits'
import PlanUpgradeModal from '@/components/PlanUpgradeModal'

export const OrcamentoNovo: React.FC = () => {
  const navigate = useNavigate()
  const { planoAtivo, user, isTrial } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeMensagem, setUpgradeMensagem] = useState('')

  const [titulo, setTitulo] = useState('Orçamento de Construção / Reforma')
  const [clienteId, setClienteId] = useState('')
  const [obraId, setObraId] = useState('')
  const [desconto, setDesconto] = useState('0')
  const [margemLucro, setMargemLucro] = useState('0')
  const [sinal, setSinal] = useState('0')
  const [parcelas, setParcelas] = useState('1')
  const [observacoes, setObservacoes] = useState(
    'Validade da proposta: 15 dias. Pagamento conforme medição das etapas.',
  )

  // Itens do Orçamento
  const [itens, setItens] = useState<OrcamentoItem[]>([
    {
      descricao: 'Mão de obra de alvenaria e assentamento',
      quantidade: 30,
      unidade: 'm²',
      preco_unitario: 55,
      total: 1650,
      categoria: 'mão de obra',
    },
    {
      descricao: 'Mão de obra de reboco desempenado',
      quantidade: 30,
      unidade: 'm²',
      preco_unitario: 35,
      total: 1050,
      categoria: 'mão de obra',
    },
  ])

  // Novo item temporário
  const [novoDesc, setNovoDesc] = useState('')
  const [novoQtd, setNovoQtd] = useState('1')
  const [novoUn, setNovoUn] = useState('m²')
  const [novoPreco, setNovoPreco] = useState('50')
  const [novoCat, setNovoCat] = useState('mão de obra')

  useEffect(() => {
    Promise.all([localDB.getAll('clientes'), localDB.getAll('obras')]).then(([clis, obs]) => {
      setClientes(clis)
      setObras(obs)
    })
  }, [])

  const handleAdicionarItem = () => {
    if (!novoDesc.trim()) return
    const q = parseFloat(novoQtd) || 1
    const p = parseFloat(novoPreco) || 0
    const item: OrcamentoItem = {
      descricao: novoDesc.trim(),
      quantidade: q,
      unidade: novoUn,
      preco_unitario: p,
      total: q * p,
      categoria: novoCat,
    }
    setItens([...itens, item])
    setNovoDesc('')
    setNovoQtd('1')
    setNovoPreco('50')
  }

  const handleRemoverItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  // Cálculo determinístico via MathEngine
  const calcResult = MathEngine.calcularOrcamento(
    itens.map((it) => ({
      descricao: it.descricao,
      quantidade: it.quantidade,
      unidade: it.unidade,
      precoUnitario: it.preco_unitario,
      categoria: it.categoria as any,
    })),
    {
      desconto: parseFloat(desconto) || 0,
      margemLucroPct: parseFloat(margemLucro) || 0,
      sinal: parseFloat(sinal) || 0,
      numeroParcelas: parseInt(parcelas, 10) || 1,
    },
  )

  const handleSalvar = async () => {
    const mesAtual = new Date().toISOString().slice(0, 7)
    const orcs = await localDB.getAll('orcamentos')
    const orcsMes = orcs.filter((o) => (o.created || '').startsWith(mesAtual)).length

    const validacao = verificarLimiteOrcamentos(
      planoAtivo,
      orcsMes,
      user?.modulos_liberados,
      isTrial,
    )
    if (!validacao.permitido) {
      setUpgradeMensagem(validacao.mensagemBloqueio || 'Limite de orçamentos mensais atingido.')
      setUpgradeModalOpen(true)
      return
    }

    const novoOrc = {
      id: 'orc_' + Date.now(),
      owner_id: 'local_user',
      cliente_id: clienteId || undefined,
      obra_id: obraId || undefined,
      titulo: titulo.trim(),
      itens,
      subtotal: calcResult.valor.subtotal,
      desconto: calcResult.valor.desconto,
      total: calcResult.valor.total,
      status: 'criado' as const,
      sinal: calcResult.valor.sinal,
      parcelas: calcResult.valor.parcelas.map((p) => ({
        numero: p.numero,
        valor: p.valor,
        vencimento: new Date(Date.now() + p.numero * 30 * 86400000).toISOString().split('T')[0],
        status: 'pendente' as const,
      })),
      observacoes: observacoes.trim(),
      created: new Date().toISOString(),
    }

    await localDB.put('orcamentos', novoOrc)
    navigate(`/orcamentos/${novoOrc.id}`)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link to="/orcamentos">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            CRIAR NOVO ORÇAMENTO
          </h1>
          <p className="text-xs text-muted-foreground">
            Adicione serviços, materiais, margem e condições de pagamento.
          </p>
        </div>
      </div>

      {/* Dados Gerais */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label>Título da Proposta</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Selecione o cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Obra Vinculada (opcional)</Label>
              <select
                value={obraId}
                onChange={(e) => setObraId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Selecione a obra...</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Itens */}
      <Card>
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-bold">Itens e Serviços</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          <div className="space-y-2">
            {itens.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-sm"
              >
                <div className="flex-1">
                  <span className="font-semibold text-foreground block">{it.descricao}</span>
                  <span className="text-xs text-muted-foreground">
                    {it.quantidade} {it.unidade} × R$ {it.preco_unitario.toFixed(2)} ({it.categoria}
                    )
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-foreground">R$ {it.total.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoverItem(idx)}
                    className="text-destructive hover:opacity-80 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Form para adicionar item */}
          <div className="p-4 rounded-xl border border-dashed bg-muted/20 space-y-3">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              Adicionar Novo Item:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <Input
                className="sm:col-span-2"
                placeholder="Descrição do serviço/material"
                value={novoDesc}
                onChange={(e) => setNovoDesc(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Qtd"
                value={novoQtd}
                onChange={(e) => setNovoQtd(e.target.value)}
              />
              <Input
                placeholder="Un (m², un, saco)"
                value={novoUn}
                onChange={(e) => setNovoUn(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Preço Unit. (R$)"
                value={novoPreco}
                onChange={(e) => setNovoPreco(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={handleAdicionarItem}
              variant="outline"
              className="w-full font-bold gap-2"
            >
              <Plus className="w-4 h-4" />
              Inserir Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Condições Financeiras e Total */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label>Margem Lucro (%)</Label>
              <Input
                type="number"
                value={margemLucro}
                onChange={(e) => setMargemLucro(e.target.value)}
              />
            </div>
            <div>
              <Label>Desconto (R$)</Label>
              <Input type="number" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
            </div>
            <div>
              <Label>Sinal de Entrada (R$)</Label>
              <Input type="number" value={sinal} onChange={(e) => setSinal(e.target.value)} />
            </div>
            <div>
              <Label>Nº de Parcelas</Label>
              <Input
                type="number"
                min="1"
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Observações / Condições</Label>
            <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>

          {/* Resumo Final do Cálculo */}
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-muted-foreground block">
                Subtotal: R$ {calcResult.valor.subtotal.toFixed(2)}
              </span>
              {calcResult.valor.lucroAdicionado > 0 && (
                <span className="text-xs text-muted-foreground block">
                  + Margem: R$ {calcResult.valor.lucroAdicionado.toFixed(2)}
                </span>
              )}
              {calcResult.valor.desconto > 0 && (
                <span className="text-xs text-muted-foreground block">
                  - Desconto: R$ {calcResult.valor.desconto.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-primary uppercase block">Valor Total:</span>
              <span className="text-3xl font-black text-foreground">
                R$ {calcResult.valor.total.toFixed(2)}
              </span>
            </div>
          </div>

          <Button onClick={handleSalvar} className="w-full font-bold h-12 text-base">
            Salvar e Emitir Orçamento
          </Button>
        </CardContent>
      </Card>
      {/* Modal de Upgrade Amigável */}
      <PlanUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        titulo="Limite Mensal de Orçamentos Atingido"
        mensagem={upgradeMensagem}
        planoSugerido="profissional"
      />
    </div>
  )
}

export default OrcamentoNovo
