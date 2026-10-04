import React, { useState, useEffect } from 'react'
import { localDB } from '@/lib/localDB'
import { mutateEntity } from '@/lib/syncService'
import { FinanceiroLancamento } from '@/types/database'
import * as MathEngine from '@/lib/mathEngine'
import {
  DollarSign,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Filter,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { formatarMoedaSegura, formatarDataSegura } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export const Financeiro: React.FC = () => {
  const { isOperador, profile, config } = useAuth()
  const [lancamentos, setLancamentos] = useState<FinanceiroLancamento[]>([])
  const [dialogAberto, setDialogAberto] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos')

  // Formulário de Novo Lançamento
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState<any>('cimento')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])

  const carregarLancamentos = async () => {
    const list = await localDB.getAll('financeiro')
    setLancamentos(list)
  }

  useEffect(() => {
    carregarLancamentos()
  }, [])

  if (isOperador) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-foreground">Acesso Restrito ao Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Seu perfil está configurado como <strong>Operador</strong>. Os valores, despesas e saldos
          da obra são reservados ao perfil <strong>Dono / Engenheiro</strong>.
        </p>
        <div className="pt-2">
          <Link to="/obras">
            <Button className="font-bold">Ir para Minhas Obras</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = parseFloat(valor)
    if (!descricao.trim() || isNaN(v) || v <= 0) return

    const autorNome = profile?.name || config?.nome_profissional || 'Responsável'
    const autorId = profile?.id || 'local_user'

    const novo: FinanceiroLancamento = {
      id: 'fin_' + Date.now(),
      owner_id: autorId,
      tipo,
      descricao: descricao.trim(),
      valor: v,
      categoria,
      data,
      status: 'pago',
      criado_por_nome: autorNome,
      criado_por_id: autorId,
      created: new Date().toISOString(),
    }

    await mutateEntity('financeiro', 'create', novo)
    setDialogAberto(false)
    setDescricao('')
    setValor('')
    carregarLancamentos()
  }

  // Motor determinístico
  const resumoCalc = MathEngine.calcularResumoFinanceiro(
    lancamentos.map((l) => ({ tipo: l.tipo, valor: l.valor })),
  )

  const filtrados = lancamentos.filter((l) => {
    if (filtroTipo === 'todos') return true
    return l.tipo === filtroTipo
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            CONTROLE FINANCEIRO
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Entradas, saídas de material, diárias de equipe e saldo em caixa.
          </p>
        </div>

        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger asChild>
            <Button className="font-bold gap-2">
              <Plus className="w-4 h-4" />
              Novo Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Registrar Entrada ou Saída</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSalvar} className="space-y-3.5 mt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tipo === 'entrada' ? 'default' : 'outline'}
                  className={
                    tipo === 'entrada'
                      ? 'bg-emerald-600 hover:bg-emerald-700 font-bold'
                      : 'font-bold'
                  }
                  onClick={() => {
                    setTipo('entrada')
                    setCategoria('pagamento')
                  }}
                >
                  <ArrowUpCircle className="w-4 h-4 mr-1.5" />
                  Entrada (Receber)
                </Button>
                <Button
                  type="button"
                  variant={tipo === 'saida' ? 'default' : 'outline'}
                  className={
                    tipo === 'saida'
                      ? 'bg-destructive hover:bg-destructive/90 font-bold'
                      : 'font-bold'
                  }
                  onClick={() => {
                    setTipo('saida')
                    setCategoria('cimento')
                  }}
                >
                  <ArrowDownCircle className="w-4 h-4 mr-1.5" />
                  Saída (Despesa)
                </Button>
              </div>

              <div>
                <Label>Descrição *</Label>
                <Input
                  required
                  placeholder={
                    tipo === 'entrada'
                      ? 'Ex: Medição primeira etapa Carlos'
                      : 'Ex: 10 sacos de cimento e areia'
                  }
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    placeholder="350.00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Categoria</Label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {tipo === 'entrada' ? (
                    <>
                      <option value="pagamento">Pagamento de Obra</option>
                      <option value="sinal">Sinal de Entrada</option>
                      <option value="parcela">Parcela</option>
                      <option value="recebimento">Outro Recebimento</option>
                    </>
                  ) : (
                    <>
                      <option value="cimento">Cimento e Agregados</option>
                      <option value="areia">Areia e Brita</option>
                      <option value="bloco">Blocos e Tijolos</option>
                      <option value="ajudante">Diária de Ajudante</option>
                      <option value="combustivel">Combustível</option>
                      <option value="ferramenta">Ferramentas</option>
                      <option value="alimentacao">Alimentação</option>
                      <option value="transporte">Frete / Transporte</option>
                      <option value="outros">Outros</option>
                    </>
                  )}
                </select>
              </div>

              <Button type="submit" className="w-full font-bold h-11 mt-2">
                Salvar Lançamento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Totais Calculados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
          <CardContent className="p-5">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block uppercase mb-1 flex items-center gap-1.5">
              <ArrowUpCircle className="w-4 h-4" />
              Total de Entradas
            </span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              R${' '}
              {resumoCalc.valor.totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20">
          <CardContent className="p-5">
            <span className="text-xs font-bold text-destructive block uppercase mb-1 flex items-center gap-1.5">
              <ArrowDownCircle className="w-4 h-4" />
              Total de Saídas
            </span>
            <div className="text-2xl font-black text-destructive">
              R${' '}
              {resumoCalc.valor.totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <span className="text-xs font-bold text-primary block uppercase mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Saldo Líquido Atual
            </span>
            <div className="text-2xl font-black text-foreground">
              R$ {resumoCalc.valor.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Extrato */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-foreground">
            Extrato de Movimentações ({filtrados.length})
          </h2>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`text-xs px-2.5 py-1 rounded-md font-bold transition-colors ${
                filtroTipo === 'todos'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroTipo('entrada')}
              className={`text-xs px-2.5 py-1 rounded-md font-bold transition-colors ${
                filtroTipo === 'entrada'
                  ? 'bg-card text-emerald-600 shadow-xs'
                  : 'text-muted-foreground'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFiltroTipo('saida')}
              className={`text-xs px-2.5 py-1 rounded-md font-bold transition-colors ${
                filtroTipo === 'saida'
                  ? 'bg-card text-destructive shadow-xs'
                  : 'text-muted-foreground'
              }`}
            >
              Saídas
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {filtrados.map((item) => (
            <Card key={item.id} className="p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      item.tipo === 'entrada'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-100 text-destructive dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    {item.tipo === 'entrada' ? '+' : '-'}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-foreground block">
                      {item.descricao}
                      {item.total_parcelas && item.total_parcelas > 1 && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {item.parcela_atual || 1}/{item.total_parcelas}
                        </span>
                      )}
                      {item.recorrente && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          Recorrente dia {item.dia_vencimento || 'fixo'}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {item.categoria} • {formatarDataSegura(item.data) || item.data}
                      {item.status && (
                        <span
                          className={`ml-2 font-semibold ${item.status === 'pago' ? 'text-emerald-600' : 'text-amber-600'}`}
                        >
                          • {item.status === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                      )}
                      {item.criado_por_nome && (
                        <span className="ml-2 font-medium text-foreground/80">
                          • 👤 Registrado por: {item.criado_por_nome}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-base font-black ${
                    item.tipo === 'entrada' ? 'text-emerald-600' : 'text-destructive'
                  }`}
                >
                  {item.tipo === 'entrada' ? '+' : '-'} R$ {formatarMoedaSegura(item.valor)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Financeiro
