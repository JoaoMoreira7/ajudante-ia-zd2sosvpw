import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { localDB } from '@/lib/localDB'
import { Cliente } from '@/types/database'
import { Users, Plus, Phone, MessageSquare, MapPin, Search, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { verificarLimiteClientes } from '@/lib/planLimits'
import PlanUpgradeModal from '@/components/PlanUpgradeModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export const Clientes: React.FC = () => {
  const { planoAtivo, user, isTrial } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [dialogAberto, setDialogAberto] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [upgradeMensagem, setUpgradeMensagem] = useState('')

  // Formulário de Novo Cliente
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [endereco, setEndereco] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const carregarClientes = async () => {
    const list = await localDB.getAll('clientes')
    setClientes(list)
  }

  useEffect(() => {
    carregarClientes()
  }, [])

  const handleTentativaNovoCliente = () => {
    const validacao = verificarLimiteClientes(
      planoAtivo,
      clientes.length,
      user?.modulos_liberados,
      isTrial,
    )

    if (!validacao.permitido) {
      setUpgradeMensagem(
        validacao.mensagemBloqueio ||
          'Você atingiu o limite de clientes do seu plano atual. Faça o upgrade para o Plano Profissional para ter clientes ilimitados.',
      )
      setUpgradeModalOpen(true)
      return
    }

    setDialogAberto(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    const validacao = verificarLimiteClientes(
      planoAtivo,
      clientes.length,
      user?.modulos_liberados,
      isTrial,
    )
    if (!validacao.permitido) {
      setDialogAberto(false)
      setUpgradeMensagem(validacao.mensagemBloqueio || 'Limite de clientes atingido.')
      setUpgradeModalOpen(true)
      return
    }

    const novo: Cliente = {
      id: 'cli_' + Date.now(),
      owner_id: 'local_user',
      nome: nome.trim(),
      telefone: telefone.trim(),
      whatsapp: whatsapp.replace(/\D/g, '') || telefone.replace(/\D/g, ''),
      endereco: endereco.trim(),
      observacoes: observacoes.trim(),
      created: new Date().toISOString(),
    }

    await localDB.put('clientes', novo)
    setDialogAberto(false)
    setNome('')
    setTelefone('')
    setWhatsapp('')
    setEndereco('')
    setObservacoes('')
    carregarClientes()
  }

  const filtrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone?.includes(busca) ||
      c.endereco?.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            MEUS CLIENTES
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie contatos, endereços de obras e orçamentos de cada cliente.
          </p>
        </div>

        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <Button onClick={handleTentativaNovoCliente} className="font-bold gap-2">
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Cadastrar Novo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSalvar} className="space-y-3.5 mt-2">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  required
                  placeholder="Ex: Carlos Eduardo Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(35) 98765-4321"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                  />
                </div>
                <div>
                  <Label>WhatsApp (só dígitos)</Label>
                  <Input
                    placeholder="35987654321"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Endereço da Obra/Residência</Label>
                <Input
                  placeholder="Rua, número, bairro e cidade"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Input
                  placeholder="Ex: Prefere contato aos sábados de manhã"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full font-bold h-11 mt-2">
                Salvar Cliente
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
        <Input
          placeholder="Buscar cliente por nome, telefone ou endereço..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10 h-11 bg-card rounded-xl"
        />
      </div>

      {/* Aviso de limite do plano se aplicável */}
      {planoAtivo === 'essencial' && !isTrial && (
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>Plano Essencial:</strong> {clientes.length} de 5 clientes cadastrados.
            </span>
          </div>
          {clientes.length >= 5 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setUpgradeMensagem(
                  'Você atingiu o limite de 5 clientes do Plano Essencial. Faça o upgrade para o Plano Profissional (R$ 49,90/mês) para ter clientes ilimitados.',
                )
                setUpgradeModalOpen(true)
              }}
              className="h-7 text-xs font-bold"
            >
              Liberar Ilimitados
            </Button>
          )}
        </div>
      )}

      {/* Grade de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map((cliente) => (
          <Link key={cliente.id} to={`/clientes/${cliente.id}`} className="block group">
            <Card className="h-full hover:border-primary/60 transition-all hover:shadow-md">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>{cliente.nome}</span>
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {cliente.nome.charAt(0)}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2.5 text-xs text-muted-foreground">
                {cliente.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{cliente.telefone}</span>
                  </div>
                )}
                {cliente.endereco && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{cliente.endereco}</span>
                  </div>
                )}
                {cliente.observacoes && (
                  <p className="line-clamp-2 italic pt-1 border-t border-border/50">
                    "{cliente.observacoes}"
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {/* Modal de Upgrade Amigável */}
      <PlanUpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        titulo="Limite de Clientes Atingido"
        mensagem={upgradeMensagem}
        planoSugerido="profissional"
      />
    </div>
  )
}

export default Clientes
