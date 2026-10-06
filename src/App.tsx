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
import Equipe from '@/pages/Equipe'
import Login from '@/pages/Login'
import Cadastro from '@/pages/Cadastro'
import RedefinirSenha from '@/pages/RedefinirSenha'
import Termos from '@/pages/Termos'
import Privacidade from '@/pages/Privacidade'
import Admin from '@/pages/Admin'
import NotFound from '@/pages/NotFound'

export default function App() {
  // Garantir a remoção contínua e definitiva de badges de atribuição sem sobrecarregar a CPU
  React.useEffect(() => {
    const removeSkipBadges = () => {
      // 1. Seletores diretos amplos
      const candidates = document.querySelectorAll<HTMLElement>(
        '#skip-badge, .skip-badge, [data-skip-badge], a[href*="goskip.dev"], a[href*="skip.it"], a[href*="goskip"], img[src*="skip.png"], img[alt*="Skip" i], [data-skip-element]',
      )
      candidates.forEach((el) => {
        const parent = el.parentElement
        el.remove()
        // Se o elemento pai continha apenas o badge ou texto "Criado com", remove-o também
        if (
          parent &&
          parent.innerText &&
          (parent.innerText.toLowerCase().includes('criado com o skip') ||
            parent.innerText.toLowerCase().includes('criado com skip') ||
            parent.innerText.toLowerCase().includes('made with skip'))
        ) {
          parent.remove()
        }
      })

      // 2. Busca por texto caso seja injetado em nós de texto ou spans
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const nodesToRemove: Node[] = []
      while (walker.nextNode()) {
        const node = walker.currentNode
        const text = (node.textContent || '').toLowerCase()
        if (
          text.includes('criado com o skip') ||
          text.includes('criado com skip') ||
          text.includes('made with skip')
        ) {
          nodesToRemove.push(node)
        }
      }
      nodesToRemove.forEach((node) => {
        const parent = node.parentElement
        if (parent && parent !== document.body && parent.id !== 'root') {
          parent.remove()
        } else {
          node.textContent = ''
        }
      })
    }

    removeSkipBadges()

    // Observer leve para eliminar injeções assíncronas do skip.js
    const observer = new MutationObserver(() => {
      removeSkipBadges()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
    }
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
                    <Route path="equipe" element={<Equipe />} />
                    <Route path="admin" element={<Admin />} />
                    <Route path="login" element={<Login />} />
                    <Route path="cadastro" element={<Cadastro />} />
                    <Route path="redefinir-senha" element={<RedefinirSenha />} />
                    <Route path="termos" element={<Termos />} />
                    <Route path="privacidade" element={<Privacidade />} />
                    <Route path="*" element={<NotFound />} />{' '}
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
