import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { localDB } from '@/lib/localDB'
import { Cliente, Obra, Orcamento } from '@/types/database'
import {
  Users,
  Phone,
  MessageSquare,
  MapPin,
  HardHat,
  FileSpreadsheet,
  ArrowLeft,
  Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const ClienteDetalhe: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [obras, setObras] = useState<Obra[]>([])
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])

  useEffect(() => {
    if (!id) return
    const loadData = async () => {
      const cli = await localDB.getById('clientes', id)
      setCliente(cli)
      const allObras = await localDB.getAll('obras')
      setObras(allObras.filter((o) => o.cliente_id === id))
      const allOrcs = await localDB.getAll('orcamentos')
      setOrcamentos(allOrcs.filter((orc) => orc.cliente_id === id))
    }
    loadData()
  }, [id])

  if (!cliente) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Link to="/clientes">
          <Button variant="outline">Voltar para Clientes</Button>
        </Link>
      </div>
    )
  }

  const zapUrl = cliente.whatsapp
    ? `https://wa.me/${cliente.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Olá ${cliente.nome}, tudo bem? Sou o João Carlos da JC Construções.`,
      )}`
    : null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Voltar e Cabeçalho */}
      <div className="flex items-center gap-3">
        <Link to="/clientes">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-foreground tracking-tight">{cliente.nome}</h1>
          <p className="text-xs text-muted-foreground">Ficha completa e histórico de obras</p>
        </div>
        {zapUrl && (
          <a href={zapUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 text-xs">
              <MessageSquare className="w-4 h-4" />
              Chamar no WhatsApp
            </Button>
          </a>
        )}
      </div>

      {/* Cartão de Detalhes do Cliente */}
      <Card>
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground block font-semibold mb-0.5">
              Telefone
            </span>
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Phone className="w-4 h-4 text-primary" />
              <span>{cliente.telefone || 'Não informado'}</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-semibold mb-0.5">
              WhatsApp
            </span>
            <div className="flex items-center gap-2 font-bold text-foreground">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>{cliente.whatsapp || cliente.telefone || 'Não informado'}</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <span className="text-xs text-muted-foreground block font-semibold mb-0.5">
              Endereço Principal
            </span>
            <div className="flex items-center gap-2 text-foreground font-medium">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>{cliente.endereco || 'Sem endereço cadastrado'}</span>
            </div>
          </div>
          {cliente.observacoes && (
            <div className="sm:col-span-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground block font-semibold mb-0.5">
                Observações
              </span>
              <p className="italic text-muted-foreground">"{cliente.observacoes}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Obras deste Cliente */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base flex items-center gap-2 text-foreground">
            <HardHat className="w-5 h-5 text-primary" />
            Obras do Cliente ({obras.length})
          </h2>
        </div>
        {obras.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
            Nenhuma obra vinculada a este cliente ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {obras.map((o) => (
              <Link key={o.id} to={`/obras/${o.id}`}>
                <Card className="hover:border-primary/50 transition-colors p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{o.titulo}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {o.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{o.endereco}</p>
                  <div className="text-xs font-semibold text-emerald-600 pt-1 border-t">
                    Valor: R$ {o.valor_contratado?.toLocaleString('pt-BR')}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Orçamentos deste Cliente */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base flex items-center gap-2 text-foreground">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Orçamentos do Cliente ({orcamentos.length})
          </h2>
        </div>
        {orcamentos.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
            Nenhum orçamento emitido para este cliente.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {orcamentos.map((orc) => (
              <Link key={orc.id} to={`/orcamentos/${orc.id}`}>
                <Card className="hover:border-primary/50 transition-colors p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{orc.titulo}</span>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {orc.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-xs font-black text-primary pt-1">
                    Total: R$ {orc.total.toLocaleString('pt-BR')}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ClienteDetalhe
