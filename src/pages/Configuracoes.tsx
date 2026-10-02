import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Settings, Sparkles, Feather, HardHat, Moon, Volume2, Shield, LogOut } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export const Configuracoes: React.FC = () => {
  const { config, updateConfig, setModo, setPerfil, perfil, user, logout } = useAuth()
  const [nome, setNome] = useState(config.nome_profissional || '')
  const [empresa, setEmpresa] = useState(config.empresa || '')
  const [salvo, setSalvo] = useState(false)

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateConfig({
      nome_profissional: nome.trim(),
      empresa: empresa.trim(),
    })
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            CONFIGURAÇÕES DO SISTEMA
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ajustes visuais, modos de operação do Ajudante IA e dados profissionais.
          </p>
        </div>
      </div>

      {/* 0. Perfil de Acesso do Usuário (Dono / Operador) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Perfil de Acesso do Usuário
          </CardTitle>
          <CardDescription>
            Se mestre de obras e engenheiro usam o mesmo app, o perfil de operador oculta custos,
            margens e valores financeiros.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPerfil('dono')}
            className={`p-4 rounded-xl border text-left transition-all ${
              perfil === 'dono'
                ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-black text-sm text-foreground">👑 Dono / Engenheiro</span>
              {perfil === 'dono' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  Ativo
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Acesso total: visualiza orçamentos com preços, margens de lucro, faturamento, valores
              contratados e controle financeiro completo.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setPerfil('operador')}
            className={`p-4 rounded-xl border text-left transition-all ${
              perfil === 'operador'
                ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-black text-sm text-foreground">
                👷 Operador / Mestre de Obras
              </span>
              {perfil === 'operador' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  Ativo
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Foco no canteiro: oculta custos, valores e saldos na interface e por voz. Mostra
              progresso físico, fotos, etapas e materiais.
            </p>
          </button>
        </CardContent>
      </Card>

      {/* 1. Escolha do Modo de Operação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Modo de Operação</CardTitle>
          <CardDescription>
            Escolha como a tela e os botões se comportam para você no canteiro de obras.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setModo('simples')}
            className={`p-4 rounded-xl border text-left transition-all ${
              config.modo === 'simples'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <div className="w-3 h-3 rounded-full bg-emerald-500 mb-2" />
            <h4 className="font-bold text-sm text-foreground">Modo Simples</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Letras e botões gigantes, foco total em falar e poucos botões. Ideal para celulares
              sob sol forte.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setModo('profissional')}
            className={`p-4 rounded-xl border text-left transition-all ${
              config.modo === 'profissional'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-primary mb-2" />
            <h4 className="font-bold text-sm text-foreground">Modo Profissional</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Indicadores completos de faturamento, gráficos, relatórios e controle fino de obras.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setModo('economico')}
            className={`p-4 rounded-xl border text-left transition-all ${
              config.modo === 'economico'
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <Feather className="w-4 h-4 text-blue-500 mb-2" />
            <h4 className="font-bold text-sm text-foreground">Modo Econômico</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Economiza bateria e dados de internet móvel. Carregamento ultra rápido para aparelhos
              antigos.
            </p>
          </button>
        </CardContent>
      </Card>

      {/* 2. Preferências de Voz e Acessibilidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Voz e Acessibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
            <div>
              <span className="text-sm font-semibold text-foreground block">
                Resposta Falada por Áudio
              </span>
              <span className="text-xs text-muted-foreground">
                O assistente lê em voz alta a resposta na obra
              </span>
            </div>
            <Switch
              checked={config.som_ativo}
              onCheckedChange={(checked) => updateConfig({ som_ativo: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
            <div>
              <span className="text-sm font-semibold text-foreground block">Alto Contraste</span>
              <span className="text-xs text-muted-foreground">
                Bordas escuras e maior visibilidade sob a luz do sol
              </span>
            </div>
            <Switch
              checked={config.alto_contraste}
              onCheckedChange={(checked) => updateConfig({ alto_contraste: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Dados do Profissional / Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">
            Dados do Profissional (aparecem nos orçamentos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSalvarPerfil} className="space-y-3.5">
            <div>
              <Label>Seu Nome ou Nome Profissional</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João Carlos Mestre de Obras"
              />
            </div>
            <div>
              <Label>Nome da sua Empresa ou Empreiteira</Label>
              <Input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Ex: JC Construções e Reformas"
              />
            </div>
            <Button type="submit" className="font-bold">
              {salvo ? '✓ Dados Salvos!' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 4. Sessão do Usuário */}
      {user && (
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Conectado como:</span>
              <span className="text-sm font-bold text-foreground">{user.email}</span>
            </div>
            <Button variant="outline" className="text-destructive font-bold gap-2" onClick={logout}>
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Configuracoes
