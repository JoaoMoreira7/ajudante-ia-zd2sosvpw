import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { HardHat, LogIn, AlertCircle, Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validarEmail } from '@/components/PasswordRequirementsIndicator'

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login, requestPasswordReset } = useAuth()

  // Estados de login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  // Modo Esqueci Minha Senha
  const [modoRecuperacao, setModoRecuperacao] = useState(false)
  const [emailRecuperacao, setEmailRecuperacao] = useState('')
  const [erroRecuperacao, setErroRecuperacao] = useState('')
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false)
  const [sucessoRecuperacao, setSucessoRecuperacao] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const res = await login(email, password)
    setCarregando(false)
    if (res.success) {
      navigate('/')
    } else {
      setErro(res.error || 'Não foi possível entrar. Verifique os dados.')
    }
  }

  const handleAbrirRecuperacao = () => {
    setModoRecuperacao(true)
    setErroRecuperacao('')
    setSucessoRecuperacao(false)
    // Se o usuário já começou a digitar o e-mail no login, aproveita
    if (email.trim() && !emailRecuperacao) {
      setEmailRecuperacao(email.trim())
    }
  }

  const handleVoltarLogin = () => {
    setModoRecuperacao(false)
    setErroRecuperacao('')
    setSucessoRecuperacao(false)
  }

  const handleSolicitarRecuperacao = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroRecuperacao('')

    const emailLimpo = emailRecuperacao.trim()
    if (!emailLimpo || !validarEmail(emailLimpo)) {
      setErroRecuperacao('Digite um e-mail válido para receber as instruções.')
      return
    }

    setEnviandoRecuperacao(true)
    try {
      await requestPasswordReset(emailLimpo)
      // Boa prática de segurança: sempre exibe mensagem de sucesso amigável
      setSucessoRecuperacao(true)
    } catch {
      // Mesmo com erro de infraestrutura na chamada, orientamos o usuário
      setSucessoRecuperacao(true)
    } finally {
      setEnviandoRecuperacao(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-8 px-2 sm:px-0">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground mx-auto flex items-center justify-center font-black shadow-md">
            {modoRecuperacao ? <KeyRound className="w-8 h-8" /> : <HardHat className="w-8 h-8" />}
          </div>
          <CardTitle className="text-2xl font-black">
            {modoRecuperacao ? 'Recuperar Senha' : 'Entrar no Ajudante IA'}
          </CardTitle>
          <p className="text-xs font-semibold text-primary">
            2 horas de papelada viram 15 minutos de fala.
          </p>
          <CardDescription>
            {modoRecuperacao
              ? 'Digite seu e-mail para receber um link seguro e criar uma nova senha.'
              : 'Acesse seus orçamentos, obras e cálculos com segurança.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!modoRecuperacao ? (
            /* =================== FORMULÁRIO DE LOGIN =================== */
            <form onSubmit={handleSubmit} className="space-y-4">
              {erro && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2 border border-destructive/20 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  required
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 mt-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Senha</Label>
                  <button
                    type="button"
                    onClick={handleAbrirRecuperacao}
                    className="text-xs font-semibold text-primary hover:underline hover:text-primary/90 py-1 px-1 -mr-1 tap-target min-h-[32px] inline-flex items-center"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Input
                  type="password"
                  required
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 mt-1"
                />
              </div>

              <Button
                type="submit"
                disabled={carregando}
                className="w-full font-bold h-12 text-base shadow-sm"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {carregando ? 'Entrando...' : 'Entrar'}
              </Button>

              <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
                <div>
                  Não tem uma conta?{' '}
                  <Link to="/cadastro" className="font-bold text-primary hover:underline">
                    Criar conta gratuitamente
                  </Link>
                </div>
              </div>
            </form>
          ) : (
            /* =================== FLUXO ESQUECI MINHA SENHA =================== */
            <div className="space-y-4">
              {sucessoRecuperacao ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300 text-sm sm:text-base">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                      <span>Link enviado com sucesso!</span>
                    </div>
                    <p className="leading-relaxed">
                      Se esse e-mail estiver cadastrado, você vai receber um link para criar uma
                      nova senha.
                    </p>
                    <p className="text-xs font-medium text-muted-foreground pt-1 border-t border-emerald-500/20">
                      💡 <strong>Dica de obra:</strong> Confira também a pasta de <em>spam</em> ou{' '}
                      <em>lixo eletrônico</em>. O link costuma chegar em menos de 1 minuto.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVoltarLogin}
                    className="w-full h-11 font-bold text-sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para a tela de login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSolicitarRecuperacao} className="space-y-4">
                  {erroRecuperacao && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2 border border-destructive/20 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{erroRecuperacao}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground leading-relaxed">
                    Não se preocupe! Informe abaixo o mesmo e-mail que você usa no Ajudante IA e
                    enviaremos as instruções para você voltar a acessar sua conta rapidamente.
                  </div>

                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider">
                      Seu E-mail Cadastrado
                    </Label>
                    <Input
                      type="email"
                      required
                      autoFocus
                      placeholder="seuemail@exemplo.com"
                      value={emailRecuperacao}
                      onChange={(e) => setEmailRecuperacao(e.target.value)}
                      className="h-11 mt-1"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={enviandoRecuperacao}
                    className="w-full font-bold h-12 text-base shadow-sm"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {enviandoRecuperacao ? 'Enviando link...' : 'Enviar link de recuperação'}
                  </Button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={handleVoltarLogin}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 py-1 px-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Lembrou da senha? Voltar ao login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
