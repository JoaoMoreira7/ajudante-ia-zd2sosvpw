import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  UserPlus,
  Shield,
  EyeOff,
  Building2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { localDB } from '@/lib/localDB'
import { mutateEntity } from '@/lib/syncService'
import { useAuth } from '@/contexts/AuthContext'
import { verificarPermissaoEquipes } from '@/lib/planLimits'
import { PlanUpgradeModal } from '@/components/PlanUpgradeModal'
import { EquipeMembro, Obra } from '@/types/database'
import pb from '@/lib/pocketbase/client'

export function EquipePage() {
  const { user, plano, isTrial } = useAuth()
  const [membros, setMembros] = useState<EquipeMembro[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modais
  const [modalNovoMembroOpen, setModalNovoMembroOpen] = useState(false)
  const [modalUpgradeOpen, setModalUpgradeOpen] = useState(false)

  // Formulário de novo membro
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cargo, setCargo] = useState<'operador' | 'encarregado' | 'pedreiro' | 'ajudante'>(
    'operador',
  )
  const [obrasSelecionadas, setObrasSelecionadas] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)

  const permissao = verificarPermissaoEquipes(plano, user?.modulos_liberados, isTrial)
  const isLiberado = permissao.permitido

  const carregarDados = async () => {
    setIsLoading(true)
    try {
      const todosMembros = await localDB.getAll('equipe_membros')
      const todasObras = await localDB.getAll('obras')
      setMembros(todosMembros)
      setObras(todasObras)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleAbrirNovoMembro = () => {
    if (!isLiberado) {
      setModalUpgradeOpen(true)
      return
    }
    setNome('')
    setEmail('')
    setTelefone('')
    setCargo('operador')
    setObrasSelecionadas([])
    setModalNovoMembroOpen(true)
  }

  const handleToggleObra = (obraId: string) => {
    setObrasSelecionadas((prev) =>
      prev.includes(obraId) ? prev.filter((id) => id !== obraId) : [...prev, obraId],
    )
  }

  const handleSalvarMembro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    setSalvando(true)
    try {
      const novoMembro: EquipeMembro = {
        id: 'eq_' + Date.now(),
        owner_id: user?.id || pb.authStore.model?.id || 'local_user',
        nome: nome.trim(),
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        cargo,
        status: 'ativo',
        obras_permitidas: obrasSelecionadas,
        created: new Date().toISOString(),
      }

      await mutateEntity('equipe_membros', 'create', novoMembro)
      setModalNovoMembroOpen(false)
      await carregarDados()
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluirMembro = async (id: string, nomeMembro: string) => {
    const confirmou = window.confirm(`Remover "${nomeMembro}" da sua equipe?`)
    if (!confirmou) return
    await mutateEntity('equipe_membros', 'delete', { id })
    await carregarDados()
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Equipes e Operadores
            </h1>
            <Badge
              variant="outline"
              className="border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/20 font-bold text-xs"
            >
              Plano Empresa (R$ 79,90)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione operadores e encarregados à sua conta. Eles lançam diário e materiais por voz,
            mas nunca veem valores financeiros.
          </p>
        </div>

        <Button
          onClick={handleAbrirNovoMembro}
          className="font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-xl"
        >
          <UserPlus className="w-4 h-4" />
          Adicionar Operador
        </Button>
      </div>

      {/* Banner se o plano não for Empresa */}
      {!isLiberado && (
        <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                Múltiplos operadores e obras compartilhadas
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                Opa, mestre! Para colocar sua equipe inteira para lançar diário e fotos nas obras
                sem ver nada do financeiro, conheça o Plano Empresa.
              </p>
            </div>
            <Link to="/planos">
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shrink-0"
              >
                Conhecer Plano Empresa
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Regra de Ouro: Blindagem Financeira para o Operador */}
      <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <span className="font-bold text-foreground text-sm flex items-center gap-2">
              Blindagem Financeira Ativa
              <Badge
                variant="secondary"
                className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
              >
                100% Seguro
              </Badge>
            </span>
            <p className="text-muted-foreground leading-relaxed">
              O perfil <strong>Operador / Encarregado</strong> tem acesso para registrar diário de
              obra, fotos com legenda e baixas de materiais pelo WhatsApp do Ajudante IA. Ele{' '}
              <strong>NUNCA</strong> visualiza custos, orçamentos, margens de lucro ou saldo
              pendente do cliente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Membros */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide text-muted-foreground">
            Membros da Equipe ({membros.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Carregando equipe...</div>
        ) : membros.length === 0 ? (
          <Card className="border-dashed border-border text-center p-8">
            <CardContent className="p-0 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground">
                  Nenhum operador adicionado ainda
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Adicione seus encarregados ou pedreiros para que eles registrem fotos e produção
                  direto pelo celular.
                </p>
              </div>
              <Button
                onClick={handleAbrirNovoMembro}
                variant="outline"
                size="sm"
                className="font-bold gap-1.5 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                Convidar Primeiro Operador
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {membros.map((m) => {
              const obrasPermitidasNomes = obras
                .filter((o) => m.obras_permitidas?.includes(o.id))
                .map((o) => o.titulo)

              return (
                <Card
                  key={m.id}
                  className="border-border shadow-xs hover:border-primary/40 transition-colors"
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        {m.nome}
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {m.cargo || 'Operador'}
                        </Badge>
                      </CardTitle>
                      {m.telefone && (
                        <CardDescription className="text-xs text-muted-foreground font-mono">
                          📱 {m.telefone}
                        </CardDescription>
                      )}
                      {m.email && (
                        <CardDescription className="text-xs text-muted-foreground">
                          ✉️ {m.email}
                        </CardDescription>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleExcluirMembro(m.id, m.nome)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      title="Remover membro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="text-xs space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Obras com Acesso:
                      </span>
                      {obrasPermitidasNomes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {obrasPermitidasNomes.map((nomeObra, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px]">
                              {nomeObra}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">
                          Todas as obras ativas
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t text-[11px] text-muted-foreground">
                      <EyeOff className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Financeiro oculto (Modo Operador)</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* DIÁLOGO: NOVO MEMBRO DA EQUIPE */}
      <Dialog open={modalNovoMembroOpen} onOpenChange={setModalNovoMembroOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Adicionar Operador à Equipe
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarMembro} className="space-y-3 mt-2">
            <div>
              <Label>Nome Completo ou Apelido da Obra *</Label>
              <Input
                required
                placeholder="Ex: Zé Encarregado, Beto Pedreiro..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>WhatsApp / Telefone</Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
              <div>
                <Label>Função / Cargo</Label>
                <select
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="operador">Operador de Obra</option>
                  <option value="encarregado">Encarregado Geral</option>
                  <option value="pedreiro">Pedreiro</option>
                  <option value="ajudante">Ajudante</option>
                </select>
              </div>
            </div>

            <div>
              <Label>E-mail (opcional para login)</Label>
              <Input
                type="email"
                placeholder="operador@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Obras Permitidas */}
            <div className="space-y-1.5 pt-1">
              <Label>Obras que ele pode acompanhar</Label>
              <p className="text-[11px] text-muted-foreground">
                Se não marcar nenhuma, ele terá acesso a todas as obras ativas.
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-lg border bg-muted/20">
                {obras.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Nenhuma obra cadastrada</span>
                ) : (
                  obras.map((o) => (
                    <label
                      key={o.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={obrasSelecionadas.includes(o.id)}
                        onChange={() => handleToggleObra(o.id)}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{o.titulo}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900">
              ✓ Blindagem financeira automática: este membro nunca verá custos, orçamentos ou saldos
              a receber.
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNovoMembroOpen(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando || !nome.trim()}
                className="font-bold bg-primary text-primary-foreground"
              >
                {salvando ? 'Salvando...' : 'Salvar Operador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Upgrade Plano Empresa */}
      <PlanUpgradeModal
        isOpen={modalUpgradeOpen}
        onClose={() => setModalUpgradeOpen(false)}
        titulo="Membros de Equipe e Múltiplas Obras"
        mensagem="O cadastro de operadores e encarregados na mesma conta faz parte do Plano Empresa (R$ 79,90/mês). No Plano Essencial e Profissional o acesso é individual."
        planoSugerido="empresa"
      />
    </div>
  )
}

export default EquipePage
