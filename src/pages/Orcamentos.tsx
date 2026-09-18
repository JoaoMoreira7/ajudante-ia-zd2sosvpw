import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { localDB } from '@/lib/localDB'
import { Orcamento } from '@/types/database'
import { FileSpreadsheet, Plus, MessageSquare, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const Orcamentos: React.FC = () => {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])

  useEffect(() => {
    localDB.getAll('orcamentos').then((list) => setOrcamentos(list))
  }, [])

  const totalEmOrcamentos = orcamentos.reduce((acc, orc) => acc + (orc.total || 0), 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-emerald-600 font-bold text-[10px]">Aprovado</Badge>
      case 'em_execucao':
        return <Badge className="bg-blue-600 font-bold text-[10px]">Em Execução</Badge>
      case 'aguardando_resposta':
        return (
          <Badge variant="secondary" className="font-bold text-[10px]">
            Aguardando Resposta
          </Badge>
        )
      case 'concluido':
        return (
          <Badge variant="outline" className="font-bold text-[10px]">
            Concluído
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="font-bold text-[10px] capitalize">
            {status.replace('_', ' ')}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            ORÇAMENTOS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Crie, envie por WhatsApp e acompanhe a aprovação das propostas.
          </p>
        </div>

        <Link to="/orcamentos/novo">
          <Button className="font-bold gap-2">
            <Plus className="w-4 h-4" />
            Novo Orçamento
          </Button>
        </Link>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground block font-semibold mb-1">
              Total de Propostas
            </span>
            <div className="text-2xl font-black text-foreground">
              {orcamentos.length} orçamentos
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground block font-semibold mb-1">
              Volume Total Orçado
            </span>
            <div className="text-2xl font-black text-primary">
              R$ {totalEmOrcamentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Orçamentos */}
      <div className="space-y-3">
        {orcamentos.map((orc) => (
          <Link key={orc.id} to={`/orcamentos/${orc.id}`} className="block group">
            <Card className="hover:border-primary/60 transition-all hover:shadow-sm p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {orc.titulo}
                    </h3>
                    {getStatusBadge(orc.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {orc.itens?.length || 0} itens • Subtotal: R${' '}
                    {orc.subtotal?.toLocaleString('pt-BR')} • Desconto: R$ {orc.desconto || 0}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-muted-foreground block">Valor Final</span>
                  <span className="text-xl font-black text-primary">
                    R$ {orc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Orcamentos
