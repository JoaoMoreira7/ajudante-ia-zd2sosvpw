import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  HardHat,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  PasswordRequirementsIndicator,
  validarRegrasSenha,
} from '@/components/PasswordRequirementsIndicator'

export const RedefinirSenha: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { confirmPasswordReset } = useAuth()

  // O token pode vir como ?token=... ou na hash/param do link enviado pelo PB
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    if (!token) {
      setErro(
        'Link de redefinição incompleto ou não encontrado. Verifique se copiou todo o endereço recebido no e-mail.',
      )
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!token) {
      setErro('Token de recuperação não identificado. Peça um novo link na tela de login.')
      return
    }

    const { temOitoCaracteres, temNumero, senhasConferem } = validarRegrasSenha(
      password,
      passwordConfirm,
    )

    if (!temOitoCaracteres) {
      setErro('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }

    if (!temNumero) {
      setErro('A nova senha precisa conter pelo menos um número.')
      return
    }

    if (!senhasConferem) {
      setErro('A confirmação da senha não confere com a nova senha digitada.')
      return
    }

    setCarregando(true)
    try {
      const res = await confirmPasswordReset(token, password, passwordConfirm)
      if (res.success) {
        setSucesso(true)
      } else {
        setErro(
          res.error ||
            'Não foi possível redefinir sua senha. O link pode ter expirado ou já ter sido utilizado.',
        )
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado ao redefinir sua senha. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-8 px-2 sm:px-0">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground mx-auto flex items-center justify-center font-black shadow-md">
            {sucesso ? <ShieldCheck className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
          </div>
          <CardTitle className="text-2xl font-black">
            {sucesso ? 'Senha Redefinida!' : 'Criar Nova Senha'}
          </CardTitle>
          <p className="text-xs font-semibold text-primary">Ajudante IA • Canteiro de Obras</p>
          <CardDescription>
            {sucesso
              ? 'Sua nova senha foi gravada com sucesso e sua conta está protegida.'
              : 'Escolha uma nova senha forte para acessar seus orçamentos e obras.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {sucesso ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300 text-base">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  <span>Tudo pronto para entrar!</span>
                </div>
                <p className="leading-relaxed">
                  Sua senha antiga não vale mais. Agora você já pode entrar no sistema com o seu
                  e-mail e a nova senha que acabou de cadastrar.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full h-12 font-bold text-base shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Ir para o Login
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {erro && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2 border border-destructive/20 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              {!token && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                  <p className="font-semibold">
                    Atenção: Nenhum código de validação foi recebido neste link.
                  </p>
                  <p>
                    Se você clicou no link pelo e-mail e não funcionou, peça um novo envio na tela
                    de login.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/login"
                      className="font-bold text-primary underline inline-flex items-center gap-1"
                    >
                      Voltar e solicitar novo link
                    </Link>
                  </div>
                </div>
              )}

              {/* Nova Senha */}
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">
                  Nova Senha (mín. 8 dígitos) *
                </Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 8 dígitos com número"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    disabled={!token || carregando}
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

              {/* Confirmação da Senha */}
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider">
                  Confirmar Nova Senha *
                </Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repita a nova senha"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="mt-1 h-11"
                  disabled={!token || carregando}
                />
              </div>

              {/* Indicador visual idêntico ao do cadastro */}
              <PasswordRequirementsIndicator
                password={password}
                passwordConfirm={passwordConfirm}
              />

              <Button
                type="submit"
                disabled={!token || carregando}
                className="w-full font-black h-12 text-base shadow-md bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
              >
                <HardHat className="w-5 h-5 mr-2" />
                {carregando ? 'Salvando nova senha...' : 'Salvar Nova Senha e Entrar'}
              </Button>

              <div className="text-center text-xs text-muted-foreground pt-2 border-t">
                Lembrou da senha ou quer cancelar?{' '}
                <Link to="/login" className="font-bold text-primary hover:underline">
                  Voltar ao login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default RedefinirSenha
