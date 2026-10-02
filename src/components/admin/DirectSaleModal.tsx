import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserProfile, CicloTipo, PlanoTipo, FormaPagamentoVenda } from '@/types/database'
import { CATALOGO_PLANOS } from '@/lib/commercialEngine'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, UserPlus, Users } from 'lucide-react'

interface DirectSaleModalProps {
  isOpen: boolean
  onClose: () => void
  clientesExistentes: UserProfile[]
  onSuccess: (dados: {
    userId?: string
    nome?: string
    email?: string
    plano: PlanoTipo
    ciclo: CicloTipo
    valor: number
    formaPagamento: FormaPagamentoVenda
    dataPagamento: string
    observacoes: string
  }) => Promise<void>
}

export const DirectSaleModal: React.FC<DirectSaleModalProps> = ({
  isOpen,
  onClose,
  clientesExistentes,
  onSuccess,
}) => {
  const [modoCliente, setModoCliente] = useState<'existente' | 'novo'>('existente')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [plano, setPlano] = useState<PlanoTipo>('profissional')
  const [ciclo, setCiclo] = useState<CicloTipo>('mensal')

  const planoInfo = CATALOGO_PLANOS.find((p) => p.id === plano) || CATALOGO_PLANOS[1]
  const precoSugerido = ciclo === 'anual' ? planoInfo.precoAnual : planoInfo.precoMensal

  const [valor, setValor] = useState<string>(precoSugerido.toString())
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoVenda>('pix')
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().slice(0, 10))
  const [observacoes, setObservacoes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handlePlanoOuCicloChange = (novoPlano: PlanoTipo, novoCiclo: CicloTipo) => {
    setPlano(novoPlano)
    setCiclo(novoCiclo)
    const p = CATALOGO_PLANOS.find((item) => item.id === novoPlano) || CATALOGO_PLANOS[1]
    const sugerido = novoCiclo === 'anual' ? p.precoAnual : p.precoMensal
    setValor(sugerido.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (modoCliente === 'existente' && !selectedUserId) {
      setErro('Por favor, selecione um cliente existente na lista.')
      return
    }

    if (modoCliente === 'novo') {
      if (!novoNome.trim()) {
        setErro('Informe o nome do novo cliente.')
        return
      }
      if (!novoEmail.trim() || !novoEmail.includes('@')) {
        setErro('Informe um e-mail válido para o novo cliente.')
        return
      }
    }

    const valorNum = parseFloat(valor.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) {
      setErro('Informe um valor negociado válido maior que zero.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSuccess({
        userId: modoCliente === 'existente' ? selectedUserId : undefined,
        nome: modoCliente === 'novo' ? novoNome.trim() : undefined,
        email: modoCliente === 'novo' ? novoEmail.trim() : undefined,
        plano,
        ciclo,
        valor: valorNum,
        formaPagamento,
        dataPagamento,
        observacoes: observacoes.trim(),
      })
      onClose()
    } catch (err: any) {
      setErro(err?.message || 'Não consegui registrar essa venda direta no momento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <DialogTitle className="text-xl font-black">Registrar Venda Direta</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Venda fechada fora do gateway online (Pix direto, dinheiro, boleto ou transferência). A
            fatura será baixada como paga na hora e a assinatura ativada imediatamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {erro && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive">
              {erro}
            </div>
          )}

          {/* Seleção do Cliente (Existente ou Novo) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider">
              Cliente da Assinatura
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={modoCliente === 'existente' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setModoCliente('existente')}
                className="gap-1.5 font-bold text-xs"
              >
                <Users className="w-3.5 h-3.5" />
                Cliente Existente
              </Button>
              <Button
                type="button"
                variant={modoCliente === 'novo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setModoCliente('novo')}
                className="gap-1.5 font-bold text-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Cadastrar Novo
              </Button>
            </div>

            {modoCliente === 'existente' ? (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-10 text-xs font-medium">
                  <SelectValue placeholder="Selecione um cliente cadastrado..." />
                </SelectTrigger>
                <SelectContent>
                  {clientesExistentes.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      Nenhum cliente disponível
                    </div>
                  ) : (
                    clientesExistentes.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name || 'Sem nome'} ({c.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <Label className="text-[11px]">Nome Completo</Label>
                  <Input
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex: Carlos Construtor"
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">E-mail</Label>
                  <Input
                    type="email"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    placeholder="carlos@gmail.com"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Plano e Ciclo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold">Plano Contratado</Label>
              <Select
                value={plano}
                onValueChange={(val: any) => handlePlanoOuCicloChange(val, ciclo)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gratuito" className="text-xs">
                    Gratuito (R$ 0)
                  </SelectItem>
                  <SelectItem value="profissional" className="text-xs">
                    Profissional (Sugerido: R$ 149/mês)
                  </SelectItem>
                  <SelectItem value="empresa" className="text-xs">
                    Empresa (Sugerido: R$ 299/mês)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Ciclo</Label>
              <Select
                value={ciclo}
                onValueChange={(val: any) => handlePlanoOuCicloChange(plano, val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal" className="text-xs">
                    Mensal
                  </SelectItem>
                  <SelectItem value="trimestral" className="text-xs">
                    Trimestral (3 meses)
                  </SelectItem>
                  <SelectItem value="semestral" className="text-xs">
                    Semestral (6 meses)
                  </SelectItem>
                  <SelectItem value="anual" className="text-xs">
                    Anual (12 meses)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valor Negociado Livre */}
          <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                Valor Negociado Livre (R$)
              </Label>
              <Badge variant="outline" className="text-[10px] font-mono">
                Sugerido tabela: R$ {precoSugerido.toFixed(2)}
              </Badge>
            </div>
            <Input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0.00"
              className="text-base font-black text-primary font-mono h-10"
            />
            <p className="text-[10px] text-muted-foreground">
              Você pode alterar livremente o valor conforme a negociação com o cliente (descontos,
              permutas ou parcerias).
            </p>
          </div>

          {/* Forma e Data do Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold">Forma de Recebimento</Label>
              <Select value={formaPagamento} onValueChange={(val: any) => setFormaPagamento(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix" className="text-xs">
                    Pix Direto
                  </SelectItem>
                  <SelectItem value="dinheiro" className="text-xs">
                    Dinheiro em Mãos
                  </SelectItem>
                  <SelectItem value="transferencia" className="text-xs">
                    Transferência Bancária / TED
                  </SelectItem>
                  <SelectItem value="boleto" className="text-xs">
                    Boleto Avulso
                  </SelectItem>
                  <SelectItem value="cartao_credito" className="text-xs">
                    Máquina de Cartão
                  </SelectItem>
                  <SelectItem value="outro" className="text-xs">
                    Outro
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Data do Recebimento</Label>
              <Input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label className="text-xs">Observações da Venda</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Negociado presencialmente no canteiro da obra. Comprovante via WhatsApp."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Registrando...' : 'Confirmar Venda Direta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DirectSaleModal
