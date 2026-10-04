/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

const CURRENT_APP_VERSION = '0.0.21'

// Invalidação de caches obsoletos, desregistro de service workers legados
// e auto-recuperação contra chunk load error / HTML desatualizado em dispositivos móveis
if (typeof window !== 'undefined') {
  try {
    // 1. Desregistrar qualquer service worker legado
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().catch(() => {})
          }
        })
        .catch(() => {})
    }

    // 2. Limpar caches do CacheStorage da versão antiga se houver
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => {
          for (const key of keys) {
            caches.delete(key).catch(() => {})
          }
        })
        .catch(() => {})
    }

    // 3. Forçar limpeza se versão local guardada no localStorage for diferente
    const storedVersion = localStorage.getItem('ajudante_app_version')
    if (storedVersion && storedVersion !== CURRENT_APP_VERSION) {
      localStorage.setItem('ajudante_app_version', CURRENT_APP_VERSION)
      // Se houver service worker ou cache persistente, tentar atualizar
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k))
        })
      }
    } else if (!storedVersion) {
      localStorage.setItem('ajudante_app_version', CURRENT_APP_VERSION)
    }

    // 4. Auto-recuperação se o navegador falhar ao carregar script de chunk dinâmico
    // (comum quando o HTML aponta para hashes antigos que foram limpos após deploy)
    window.addEventListener('error', (event) => {
      const msg = event.message || ''
      const isChunkFailed =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Loading chunk') ||
        msg.includes('error loading dynamically imported module') ||
        (event.target && (event.target as HTMLElement).tagName === 'SCRIPT')

      if (isChunkFailed) {
        const lastReload = sessionStorage.getItem('ajudante_chunk_reload')
        const now = Date.now()
        // Evitar reload loop infinito: permitir reload no máximo 1x a cada 10 segundos
        if (!lastReload || now - Number(lastReload) > 10000) {
          sessionStorage.setItem('ajudante_chunk_reload', String(now))
          console.warn('Detectada falha de carregamento de chunk/bundle. Forçando reload limpo...')
          window.location.reload()
        }
      }
    })
  } catch (err) {
    console.warn('Erro ao limpar caches legados no bootstrap:', err)
  }
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
