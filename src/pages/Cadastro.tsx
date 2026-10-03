import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  HardHat,
  UserPlus,
  AlertCircle,
  WifiOff,
  CheckCircle2,
  Shield,
  Briefcase,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Cadastro: React.FC = () => {
  const navigate = useNavigate()
  const { signup } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [perfil, setPerfil] = useState<'dono' | 'operador'>('dono')
  const [showPassword, setShowPassword] = useState(false)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Validações visuais da senha
  const temOitoCaracteres = password.length >= 8
  const temNumero = /\d/.test(password)
  const senhasConferem = password.length > 0 && password === passwordConfirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!name.trim()) {
      setErro('Digite seu nome completo.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErro('Digite um e-mail válido.')
      return
    }

    if (password.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.')
      return
    }

    if (password !== passwordConfirm) {
      setErro('As senhas não conferem.')
      return
    }

    if (!navigator.onLine) {
      setErro(
        'O cadastro de uma nova conta necessita de conexão com a internet. Verifique sua rede e tente novamente.',
      )
      return
    }

    setCarregando(true)
    try {
      const res = await signup(email.trim(), password, name.trim(), perfil)
      if (res.success) {
        navigate('/')
      } else {
        setErro(res.error || 'Não foi possível cadastrar. Verifique os dados.')
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado ao cadastrar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-10">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground mx-auto flex items-center justify-center font-black shadow-md">
            <HardHat className="w-9 h-9" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black text-foreground">
            Criar Conta no Ajudante IA
          </CardTitle>
          <CardDescription className="text-sm">
            Experimente gratuitamente com <strong>7 dias de teste completo</strong> no canteiro de
            obras.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Banner de status offline */}
          {!isOnline && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/30 flex items-start gap-2.5 text-xs font-semibold">
              <WifiOff className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                O cadastro de uma nova conta necessita de conexão com a internet. Verifique sua rede
                e tente novamente.
              </span>
            </div>
          )}

          {/* Banner de Erro */}
          {erro && (
            <div className="p-3.5 rounded-xl bg-destructive/10 text-destructive text-xs flex items-center gap-2 border border-destructive/20 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome Completo */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider">Nome Completo *</Label>
              <Input
                required
                placeholder="Ex: Carlos Roberto Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-11"
              />
            </div>

            {/* E-mail */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider">
                E-mail Profissional *
              </Label>
              <Input
                type="email"
                required
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-11"
              />
            </div>

            {/* Senha e Confirmação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">
                  Senha (mín. 8 dígitos) *
                </Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 8 dígitos"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">
                  Confirmar Senha *
                </Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repita a senha"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="mt-1 h-11"
                />
              </div>
            </div>

            {/* Requisitos visuais da senha */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1.5">
              <span className="font-bold text-muted-foreground block text-[11px] uppercase">
                Requisitos da Senha:
              </span>
              <div className="flex flex-wrap gap-3">
                <span
                  className={`flex items-center gap-1.5 ${temOitoCaracteres ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mínimo de 8 caracteres
                </span>
                <span
                  className={`flex items-center gap-1.5 ${temNumero ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Contém números
                </span>
                {passwordConfirm.length > 0 && (
                  <span
                    className={`flex items-center gap-1.5 ${senhasConferem ? 'text-emerald-600 font-bold' : 'text-destructive font-bold'}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {senhasConferem ? 'Senhas conferem' : 'As senhas não conferem'}
                  </span>
                )}
              </div>
            </div>

            {/* Seleção de Perfil com Cards Grandes */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold uppercase tracking-wider">
                Selecione seu Perfil de Trabalho *
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPerfil('dono')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    perfil === 'dono'
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <span className="font-black text-sm text-foreground">Dono / Empreiteiro</span>
                    </div>
                    {perfil === 'dono' && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        Selecionado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Acesso Total:</strong> Orçamentos com valores, margens de lucro,
                    contratos, recebimentos, faturamento e relatórios completos.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPerfil('operador')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    perfil === 'operador'
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                        <HardHat className="w-4 h-4" />
                      </div>
                      <span className="font-black text-sm text-foreground">
                        Operador / Encarregado
                      </span>
                    </div>
                    {perfil === 'operador' && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        Selecionado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Foco no Canteiro:</strong> Diário de obra, fotos com localização,
                    controle de etapas e cálculos rápidos (valores financeiros ocultos).
                  </p>
                </button>
              </div>
            </div>

            {/* Botão de Envio */}
            <Button
              type="submit"
              disabled={carregando}
              className="w-full font-black h-12 text-base shadow-md bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {carregando ? 'Criando sua conta...' : 'Começar Avaliação Gratuita (7 dias)'}
            </Button>

            {/* Links Cruzados */}
            <div className="text-center text-xs text-muted-foreground pt-3 border-t">
              Já tem uma conta?{' '}
              <Link to="/login" className="font-bold text-primary hover:underline">
                Entrar
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Cadastro
