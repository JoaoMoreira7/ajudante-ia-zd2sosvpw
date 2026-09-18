import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { HardHat, UserPlus, AlertCircle } from 'lucide-react'
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
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (password.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setCarregando(true)

    const res = await signup(email, password, name)
    setCarregando(false)
    if (res.success) {
      navigate('/')
    } else {
      setErro(res.error || 'Não foi possível cadastrar. Verifique os dados.')
    }
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground mx-auto flex items-center justify-center font-black shadow-md">
            <HardHat className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-black">Criar Conta no Ajudante IA</CardTitle>
          <CardDescription>Tudo o que você precisa na obra em um só assistente.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2 border border-destructive/20 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <div>
              <Label>Seu Nome ou Nome Profissional</Label>
              <Input
                required
                placeholder="Ex: Carlos Mestre"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                required
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Label>Senha (mínimo 6 dígitos)</Label>
              <Input
                type="password"
                required
                placeholder="Crie sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={carregando} className="w-full font-bold h-11 text-base">
              <UserPlus className="w-4 h-4 mr-2" />
              {carregando ? 'Criando conta...' : 'Cadastrar'}
            </Button>

            <div className="text-center text-xs text-muted-foreground pt-2">
              Já tem conta?{' '}
              <Link to="/login" className="font-bold text-primary hover:underline">
                Faça login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Cadastro
