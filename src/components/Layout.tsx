import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { DesktopSidebar } from './DesktopSidebar'
import { DesktopFooter } from './DesktopFooter'
import { VoiceOverlay } from './VoiceOverlay'
import { BlockedScreen } from './BlockedScreen'
import { GlobalErrorBoundary } from './GlobalErrorBoundary'
import { useAuth } from '@/contexts/AuthContext'

const TITULOS_ROTAS: Record<string, string> = {
  '/': 'Ajudante IA — Assistente Digital para Construção Civil por Voz',
  '/falar': 'Comandos de Voz — Ajudante IA',
  '/calculadora': 'Calculadora de Materiais e Obra — Ajudante IA',
  '/clientes': 'Clientes — Ajudante IA',
  '/obras': 'Obras e Canteiro — Ajudante IA',
  '/orcamentos': 'Orçamentos de Obras — Ajudante IA',
  '/orcamentos/novo': 'Novo Orçamento — Ajudante IA',
  '/financeiro': 'Financeiro e Caixa de Obra — Ajudante IA',
  '/materiais': 'Tabela de Materiais e Preços — Ajudante IA',
  '/ferramentas': 'Ferramentas e Utilidades — Ajudante IA',
  '/configuracoes': 'Configurações do Aplicativo — Ajudante IA',
  '/planos': 'Planos e Preços — Ajudante IA',
  '/admin': 'Painel Administrativo — Ajudante IA',
  '/login': 'Entrar na Conta — Ajudante IA',
  '/cadastro': 'Criar Conta — Ajudante IA',
}

export default function Layout() {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false)
  const { isBloqueado, motivoBloqueio, user } = useAuth()
  const location = useLocation()

  // Atualiza o document.title de acordo com a rota ativa
  useEffect(() => {
    const pathname = location.pathname
    if (TITULOS_ROTAS[pathname]) {
      document.title = TITULOS_ROTAS[pathname]
    } else if (pathname.startsWith('/clientes/')) {
      document.title = 'Detalhes do Cliente — Ajudante IA'
    } else if (pathname.startsWith('/obras/')) {
      document.title = 'Detalhes da Obra — Ajudante IA'
    } else if (pathname.startsWith('/orcamentos/')) {
      document.title = 'Detalhes do Orçamento — Ajudante IA'
    } else {
      document.title = 'Ajudante IA — Assistente Digital para Construção Civil por Voz'
    }
  }, [location.pathname])

  if (isBloqueado) {
    return (
      <BlockedScreen
        motivo={motivoBloqueio}
        bloqueadoPor={user?.bloqueado_por_nome}
        bloqueadoEm={user?.bloqueado_em}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Top Bar Fixa Global */}
      <TopBar />

      <div className="flex-1 flex w-full">
        {/* Sidebar para telas grandes (>=1024px) */}
        <DesktopSidebar onOpenVoice={() => setIsVoiceOpen(true)} />

        {/* Área Central de Conteúdo */}
        <main className="flex-1 pb-20 lg:pb-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
          <GlobalErrorBoundary>
            <Outlet />
          </GlobalErrorBoundary>
        </main>
      </div>

      {/* Footer Desktop */}
      <DesktopFooter />

      {/* Bottom Nav Fixa Mobile */}
      <BottomNav onOpenVoice={() => setIsVoiceOpen(true)} />

      {/* Overlay Global de Voz (abre pelo botão Falar em qualquer tela) */}
      <VoiceOverlay isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
    </div>
  )
}
