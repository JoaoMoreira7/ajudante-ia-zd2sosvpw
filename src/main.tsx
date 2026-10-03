/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

// Invalidação de caches obsoletos e desregistro de service workers legados no bootstrap
// Garante que webviews móveis (iOS Safari / Android Chrome) não fiquem presas em bundles antigos
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
  } catch (err) {
    console.warn('Erro ao limpar caches legados no bootstrap:', err)
  }
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
