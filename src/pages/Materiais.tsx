import React, { useState, useEffect } from 'react'
import { localDB } from '@/lib/localDB'
import { MaterialEstoque } from '@/types/database'
import * as MathEngine from '@/lib/mathEngine'
import { Package, Plus, AlertTriangle, ArrowDown, ArrowUp, ShoppingCart } from 'lucide-react'
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

export const Materiais: React.FC = () => {
  const [materiais, setMateriais] = useState<MaterialEstoque[]>([])
  const [dialogAberto, setDialogAberto] = useState(false)

  // Form Novo Material
  const [nome, setNome] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [unidade, setUnidade] = useState<any>('saco')
  const [estoqueMinimo, setEstoqueMinimo] = useState('5')
  const [preco, setPreco] = useState('')
  const [fornecedor, setFornecedor] = useState('')

  const carregarMateriais = async () => {
    const list = await localDB.getAll('materiais_estoque')
    setMateriais(list)
  }

  useEffect(() => {
    carregarMateriais()
  }, [])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    const novo: MaterialEstoque = {
      id: 'mat_' + Date.now(),
      owner_id: 'local_user',
      nome: nome.trim(),
      quantidade: parseFloat(quantidade) || 0,
      unidade,
      estoque_minimo: parseFloat(estoqueMinimo) || 5,
      preco: parseFloat(preco) || undefined,
      fornecedor: fornecedor.trim() || undefined,
      created: new Date().toISOString(),
    }

    await localDB.put('materiais_estoque', novo)
    setDialogAberto(false)
    setNome('')
    setQuantidade('')
    setPreco('')
    carregarMateriais()
  }

  const handleAlterarQtd = async (item: MaterialEstoque, delta: number) => {
    const res = MathEngine.calcularMovimentacaoEstoque({
      quantidadeAtual: item.quantidade,
      quantidadeAlteracao: Math.abs(delta),
      tipo: delta > 0 ? 'adicionar' : 'baixar',
      estoqueMinimo: item.estoque_minimo,
    })

    const atualizado: MaterialEstoque = {
      ...item,
      quantidade: res.valor.novaQuantidade,
    }

    await localDB.put('materiais_estoque', atualizado)
    carregarMateriais()
  }

  const acabando = materiais.filter(
    (m) => m.estoque_minimo !== undefined && m.quantidade <= m.estoque_minimo,
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            CONTROLE DE MATERIAIS E ESTOQUE
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe sobras no depósito, cimento, agregados e avise o que está acabando.
          </p>
        </div>

        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger asChild>
            <Button className="font-bold gap-2">
              <Plus className="w-4 h-4" />
              Novo Material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Cadastrar Material</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSalvar} className="space-y-3.5 mt-2">
              <div>
                <Label>Nome do Material *</Label>
                <Input
                  required
                  placeholder="Ex: Cimento CP II 50kg"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade em Estoque</Label>
                  <Input
                    type="number"
                    placeholder="15"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="saco">Saco</option>
                    <option value="un">Unidade</option>
                    <option value="kg">Kg</option>
                    <option value="m2">m² ou m³</option>
                    <option value="L">Litros</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estoque Mínimo (Alerta)</Label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Preço Médio Unitário (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="38.50"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Fornecedor Habitual</Label>
                <Input
                  placeholder="Ex: Depósito Alvorada"
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full font-bold h-11 mt-2">
                Salvar no Estoque
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerta de Produtos Acabando */}
      {acabando.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase">
              Atenção: Materiais com estoque baixo ({acabando.length})
            </span>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              {acabando
                .map((m) => `${m.nome} (restam apenas ${m.quantidade} ${m.unidade})`)
                .join(' • ')}
            </p>
          </div>
        </div>
      )}

      {/* Lista de Materiais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materiais.map((item) => {
          const isBaixo =
            item.estoque_minimo !== undefined && item.quantidade <= item.estoque_minimo

          return (
            <Card key={item.id} className="p-4 space-y-3 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">{item.nome}</h3>
                  {item.fornecedor && (
                    <span className="text-[11px] text-muted-foreground block">
                      {item.fornecedor}
                    </span>
                  )}
                </div>
                {isBaixo ? (
                  <Badge variant="destructive" className="text-[10px] font-bold">
                    Acabando
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Normal
                  </Badge>
                )}
              </div>

              {/* Quantidade e Controles Rápidos (+1 / -1) */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                <div>
                  <span className="text-2xl font-black text-foreground">
                    {item.quantidade}{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      {item.unidade}
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Mínimo: {item.estoque_minimo} {item.unidade}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => handleAlterarQtd(item, -1)}
                    disabled={item.quantidade <= 0}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => handleAlterarQtd(item, 1)}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default Materiais
