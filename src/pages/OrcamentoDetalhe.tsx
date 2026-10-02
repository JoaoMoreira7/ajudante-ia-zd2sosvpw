import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { localDB } from '@/lib/localDB'
import { Orcamento, Cliente } from '@/types/database'
import {
  FileSpreadsheet,
  ArrowLeft,
  MessageSquare,
  Check,
  X,
  Printer,
  Share2,
  ShieldAlert,
  Receipt,
  FileCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { gerarEImprimirRecibo, gerarEImprimirOrdemServico } from '@/lib/documentGenerator'
import { verificarPermissaoDocumentosPdf } from '@/lib/planLimits'
import PlanUpgradeModal from '@/components/PlanUpgradeModal'

export const OrcamentoDetalhe: React.FC = () => {
  const { isOperador, planoAtivo, user, isTrial } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeMensagem, setUpgradeMensagem] = useState('')

  const carregarDados = async () => {
    if (!id) return
    const orc = await localDB.getById('orcamentos', id)
    setOrcamento(orc)
    if (orc?.cliente_id) {
      const cli = await localDB.getById('clientes', orc.cliente_id)
      setCliente(cli)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [id])

  if (isOperador) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-foreground">Orçamento Restrito</h1>
        <p className="text-sm text-muted-foreground">
          Usuários com perfil de <strong>Operador</strong> não têm permissão para visualizar preços
          e detalhes financeiros de orçamentos.
        </p>
        <Link to="/obras">
          <Button className="font-bold">Voltar para Obras</Button>
        </Link>
      </div>
    )
  }

  if (!orcamento) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Orçamento não encontrado.</p>
        <Link to="/orcamentos">
          <Button variant="outline">Voltar para Orçamentos</Button>
        </Link>
      </div>
    )
  }

  const handleMudarStatus = async (novoStatus: any) => {
    const atualizado = { ...orcamento, status: novoStatus }
    await localDB.put('orcamentos', atualizado)
    setOrcamento(atualizado)
  }

  // Texto formatado para envio no WhatsApp
  const textoWhatsApp =
    `*ORÇAMENTO: ${orcamento.titulo.toUpperCase()}*\n\n` +
    `Olá ${cliente?.nome || 'Cliente'}! Segue o detalhamento da proposta:\n\n` +
    orcamento.itens
      .map(
        (it) =>
          `• ${it.descricao}: ${it.quantidade} ${it.unidade} × R$ ${it.preco_unitario.toFixed(2)} = R$ ${it.total.toFixed(2)}`,
      )
      .join('\n') +
    `\n\n*SUBTOTAL:* R$ ${orcamento.subtotal.toFixed(2)}` +
    (orcamento.desconto > 0 ? `\n*DESCONTO:* R$ ${orcamento.desconto.toFixed(2)}` : '') +
    `\n*TOTAL FINAL:* R$ ${orcamento.total.toFixed(2)}` +
    (orcamento.sinal ? `\n*SINAL:* R$ ${orcamento.sinal.toFixed(2)}` : '') +
    (orcamento.observacoes ? `\n\n_Observações: ${orcamento.observacoes}_` : '') +
    `\n\nJC Construções — Feito para quem constrói.`

  const linkWhatsApp =
    cliente?.whatsapp || cliente?.telefone
      ? `https://wa.me/${(cliente.whatsapp || cliente.telefone || '').replace(/\D/g, '')}?text=${encodeURIComponent(textoWhatsApp)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(textoWhatsApp)}`

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/orcamentos">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {orcamento.titulo}
            </h1>
            <p className="text-xs text-muted-foreground">
              Cliente: {cliente?.nome || 'Não associado'} • Status atual:{' '}
              {orcamento.status.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Ações e Compartilhar */}
        <div className="flex flex-wrap items-center gap-2">
          {orcamento.status === 'aprovado' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-bold text-xs h-10 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={() => {
                  const validacao = verificarPermissaoDocumentosPdf(
                    planoAtivo,
                    user?.modulos_liberados,
                    isTrial,
                  )
                  if (!validacao.permitido) {
                    setUpgradeMensagem(
                      validacao.mensagemBloqueio ||
                        'Disponível no Plano Profissional (R$ 49,90/mês).',
                    )
                    setUpgradeModalOpen(true)
                    return
                  }

                  gerarEImprimirRecibo(
                    {
                      profissionalNome: 'Profissional da Construção',
                      clienteNome: cliente?.nome || 'Cliente',
                      telefone: cliente?.telefone,
                      obraTitulo: orcamento.titulo,
                      valor: orcamento.sinal || orcamento.total,
                      referenteA: `Pagamento ${orcamento.sinal ? 'do sinal' : 'total'} do orçamento aprovado "${orcamento.titulo}"`,
                    },
                    orcamento.obra_id || undefined,
                  )
                }}
              >
                <Receipt className="w-4 h-4" />
                Recibo
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-bold text-xs h-10 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                onClick={() => {
                  const validacao = verificarPermissaoDocumentosPdf(
                    planoAtivo,
                    user?.modulos_liberados,
                    isTrial,
                  )
                  if (!validacao.permitido) {
                    setUpgradeMensagem(
                      validacao.mensagemBloqueio ||
                        'Disponível no Plano Profissional (R$ 49,90/mês).',
                    )
                    setUpgradeModalOpen(true)
                    return
                  }

                  gerarEImprimirOrdemServico(
                    {
                      profissionalNome: 'Profissional da Construção',
                      clienteNome: cliente?.nome || 'Cliente',
                      clienteTelefone: cliente?.telefone,
                      clienteEndereco: cliente?.endereco,
                      obraTitulo: orcamento.titulo,
                      servicosEtapas: (orcamento.itens || []).map((it) => ({
                        descricao: it.descricao,
                        quantidade: `${it.quantidade} ${it.unidade}`,
                        valor: it.total,
                      })),
                      valorTotal: orcamento.total,
                      condicoesPagamento: orcamento.sinal
                        ? `Sinal de R$ ${orcamento.sinal.toFixed(2)} + ${orcamento.parcelas?.length || 1} parcela(s)`
                        : 'Conforme orçamento aprovado',
                      observacoes: orcamento.observacoes || undefined,
                    },
                    orcamento.obra_id,
                  )
                }}
              >
                <FileCheck className="w-4 h-4" />
                Ordem de serviço
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 font-bold text-xs h-10"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>

          <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs h-10 w-full sm:w-auto">
              <MessageSquare className="w-4 h-4" />
              Enviar no WhatsApp
            </Button>
          </a>
        </div>
      </div>

      {/* Ações de Status */}
      <div className="p-3.5 rounded-xl bg-card border border-border flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Alterar Status:</span>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={orcamento.status === 'aguardando_resposta' ? 'default' : 'outline'}
            onClick={() => handleMudarStatus('aguardando_resposta')}
            className="text-xs h-8"
          >
            Aguardando
          </Button>
          <Button
            size="sm"
            variant={orcamento.status === 'aprovado' ? 'default' : 'outline'}
            onClick={() => handleMudarStatus('aprovado')}
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Aprovado
          </Button>
          <Button
            size="sm"
            variant={orcamento.status === 'em_execucao' ? 'default' : 'outline'}
            onClick={() => handleMudarStatus('em_execucao')}
            className="text-xs h-8"
          >
            Em Execução
          </Button>
          <Button
            size="sm"
            variant={orcamento.status === 'recusado' ? 'default' : 'outline'}
            onClick={() => handleMudarStatus('recusado')}
            className="text-xs h-8 text-destructive border-destructive/40"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Recusado
          </Button>
        </div>
      </div>

      {/* Ficha Visual da Proposta / Impressão */}
      <Card className="shadow-sm">
        <CardHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                PROPOSTA COMERCIAL
              </span>
              <CardTitle className="text-xl font-black mt-1">{orcamento.titulo}</CardTitle>
              {cliente && (
                <p className="text-sm font-semibold text-muted-foreground mt-0.5">
                  Para: {cliente.nome} {cliente.telefone ? `• ${cliente.telefone}` : ''}
                </p>
              )}
            </div>
            <Badge variant="outline" className="text-xs font-bold uppercase capitalize">
              {orcamento.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Tabela de Itens */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Itens do Orçamento:
            </span>
            <div className="border rounded-xl divide-y overflow-hidden">
              {orcamento.itens.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3.5 flex items-center justify-between text-sm bg-card hover:bg-muted/20"
                >
                  <div>
                    <span className="font-bold text-foreground block">{it.descricao}</span>
                    <span className="text-xs text-muted-foreground">
                      {it.quantidade} {it.unidade} × R$ {it.preco_unitario.toFixed(2)}
                    </span>
                  </div>
                  <span className="font-extrabold text-foreground">R$ {it.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totais */}
          <div className="p-4 rounded-xl bg-muted/40 border space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-semibold">R$ {orcamento.subtotal.toFixed(2)}</span>
            </div>
            {orcamento.desconto > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Desconto concedido:</span>
                <span className="font-semibold">- R$ {orcamento.desconto.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-foreground pt-2 border-t">
              <span>VALOR TOTAL:</span>
              <span className="text-primary text-xl">R$ {orcamento.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Parcelas se houver */}
          {orcamento.parcelas && orcamento.parcelas.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Condições de Pagamento:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {orcamento.parcelas.map((p) => (
                  <div key={p.numero} className="p-3 rounded-lg border bg-card text-xs space-y-1">
                    <span className="font-bold block">Parcela {p.numero}</span>
                    <span className="text-sm font-black text-primary">R$ {p.valor.toFixed(2)}</span>
                    <span className="text-muted-foreground block text-[11px] font-mono">
                      Venc: {p.vencimento}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {orcamento.observacoes && (
            <div className="p-3.5 rounded-lg bg-muted/30 border text-xs text-muted-foreground">
              <span className="font-bold block mb-0.5 text-foreground">Observações:</span>
              {orcamento.observacoes}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Modal de Upgrade Amigável */}
      <PlanUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        titulo="Emissão de Proposta e PDF"
        mensagem={upgradeMensagem}
        planoSugerido="profissional"
      />
    </div>
  )
}

export default OrcamentoDetalhe
