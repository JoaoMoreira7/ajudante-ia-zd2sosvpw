import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { VoiceProvider } from '@/contexts/VoiceContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from '@/components/Layout'
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary'

// Páginas
import Dashboard from '@/pages/Dashboard'
import Falar from '@/pages/Falar'
import Calculadora from '@/pages/Calculadora'
import Clientes from '@/pages/Clientes'
import ClienteDetalhe from '@/pages/ClienteDetalhe'
import Obras from '@/pages/Obras'
import ObraDetalhe from '@/pages/ObraDetalhe'
import Orcamentos from '@/pages/Orcamentos'
import OrcamentoNovo from '@/pages/OrcamentoNovo'
import OrcamentoDetalhe from '@/pages/OrcamentoDetalhe'
import Financeiro from '@/pages/Financeiro'
import Materiais from '@/pages/Materiais'
import Ferramentas from '@/pages/Ferramentas'
import Configuracoes from '@/pages/Configuracoes'
import Planos from '@/pages/Planos'
import Login from '@/pages/Login'
import Cadastro from '@/pages/Cadastro'
import Admin from '@/pages/Admin'
import NotFound from '@/pages/NotFound'

export default function App() {
  // Garantir a remoção pontual de badges de atribuição sem loops pesados de DOM
  React.useEffect(() => {
    const removeSkipBadge = () => {
      const candidates = document.querySelectorAll<HTMLElement>(
        '#skip-badge, .skip-badge, [data-skip-badge], a[href*="goskip.dev"], a[href*="skip.it"]',
      )
      candidates.forEach((el) => {
        el.remove()
      })
    }

    removeSkipBadge()
  }, [])

  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <VoiceProvider>
          <TooltipProvider>
            <Router>
              <GlobalErrorBoundary>
                <Routes>
                  {/* Rotas principais com Layout comum (TopBar, BottomNav, Sidebar, VoiceOverlay) */}
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="falar" element={<Falar />} />
                    <Route path="calculadora" element={<Calculadora />} />
                    <Route path="clientes" element={<Clientes />} />
                    <Route path="clientes/:id" element={<ClienteDetalhe />} />
                    <Route path="obras" element={<Obras />} />
                    <Route path="obras/:id" element={<ObraDetalhe />} />
                    <Route path="orcamentos" element={<Orcamentos />} />
                    <Route path="orcamentos/novo" element={<OrcamentoNovo />} />
                    <Route path="orcamentos/:id" element={<OrcamentoDetalhe />} />
                    <Route path="financeiro" element={<Financeiro />} />
                    <Route path="materiais" element={<Materiais />} />
                    <Route path="ferramentas" element={<Ferramentas />} />
                    <Route path="configuracoes" element={<Configuracoes />} />
                    <Route path="planos" element={<Planos />} />
                    <Route path="admin" element={<Admin />} />
                    <Route path="login" element={<Login />} />
                    <Route path="cadastro" element={<Cadastro />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </GlobalErrorBoundary>
            </Router>
          </TooltipProvider>
        </VoiceProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  )
}
