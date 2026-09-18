import React from 'react'
import { Link } from 'react-router-dom'

export const DesktopFooter: React.FC = () => {
  return (
    <footer className="hidden lg:block border-t border-border bg-card/40 py-4 px-6 text-xs text-muted-foreground mt-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <span className="font-semibold text-foreground">AJUDANTE IA</span> — © 2025. Feito para
          quem constrói.
        </div>
        <div className="flex items-center gap-4">
          <Link to="/configuracoes" className="hover:text-foreground transition-colors">
            Termos de Uso
          </Link>
          <span>•</span>
          <Link to="/configuracoes" className="hover:text-foreground transition-colors">
            Privacidade
          </Link>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            100% Offline-First
          </span>
        </div>
      </div>
    </footer>
  )
}
