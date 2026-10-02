import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { localDB } from '@/lib/localDB'
import { Orcamento } from '@/types/database'
import {
  FileSpreadsheet,
  Plus,
  MessageSquare,
  CheckCircle,
  Clock,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { verificarLimiteOrcamentos } from '@/lib/planLimits'
import PlanUpgradeModal from '@/components/PlanUpgradeModal'

export const Orcamentos: React.FC = () => {
  const { isOperador, planoAtivo, user, isTrial } = useAuth()
  const navigate = useNavigate()
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeMensagem, setUpgradeMensagem] = useState('')

  useEffect(() => {
    localDB.getAll('orcamentos').then((list) => setOrcamentos(list))
  }, [])

  if (isOperador) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-foreground">Acesso Restrito a Orçamentos</h1>
        <p className="text-sm text-muted-foreground">
          Seu perfil está definido como <strong>Operador</strong>. Preços unitários, valores totais
          e margens comerciais são restritos ao Dono da obra.
        </p>
        <div className="pt-2">
          <Link to="/obras">
            <Button className="font-bold">Ver Obras e Etapas</Button>
          </Link>
        </div>
      </div>
    )
  }

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

        <Button
          onClick={() => {
            const mesAtual = new Date().toISOString().slice(0, 7)
            const orcsMes = orcamentos.filter((o) => (o.created || '').startsWith(mesAtual)).length
            const validacao = verificarLimiteOrcamentos(
              planoAtivo,
              orcsMes,
              user?.modulos_liberados,
              isTrial,
            )

            if (!validacao.permitido) {
              setUpgradeMensagem(
                validacao.mensagemBloqueio ||
                  'Você atingiu o limite mensal de orçamentos do seu plano. Faça upgrade para o Plano Profissional para emitir propostas ilimitadas.',
              )
              setUpgradeModalOpen(true)
              return
            }

            navigate('/orcamentos/novo')
          }}
          className="font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Orçamento
        </Button>
      </div>

      {/* Aviso de limites no Plano Essencial */}
      {planoAtivo === 'essencial' && !isTrial && (
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>Plano Essencial:</strong> até 10 orçamentos por mês.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setUpgradeMensagem(
                'O Plano Profissional (R$ 49,90/mês) libera orçamentos ilimitados e envio de PDFs timbrados.',
              )
              setUpgradeModalOpen(true)
            }}
            className="h-7 text-xs font-bold"
          >
            Ilimitados no Profissional
          </Button>
        </div>
      )}

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
      {/* Modal de Upgrade Amigável */}
      <PlanUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        titulo="Limite de Orçamentos Atingido"
        mensagem={upgradeMensagem}
        planoSugerido="profissional"
      />
    </div>
  )
}

export default Orcamentos
