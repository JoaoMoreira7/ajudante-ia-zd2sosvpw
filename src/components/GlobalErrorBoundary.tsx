import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GlobalErrorBoundary interceptou um erro não tratado:', error, errorInfo)
  }

  private handleReload = () => {
    try {
      window.location.reload()
    } catch {
      window.location.href = '/'
    }
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset()
    }
    this.setState({ hasError: false, error: null })
  }

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    if (window.location.pathname === '/') {
      window.location.reload()
    } else {
      window.location.href = '/'
    }
  }

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || ''

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-card border-2 border-primary/30 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-primary flex items-center justify-center mx-auto">
              <AlertCircle className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {this.props.fallbackTitle || 'Não foi possível carregar este conteúdo'}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {this.props.fallbackMessage ||
                  'Houve uma instabilidade temporária ao exibir esta tela no seu dispositivo. Você pode recarregar ou voltar ao início.'}
              </p>
              {errorMsg && (
                <div className="text-[11px] font-mono text-muted-foreground/75 bg-muted/60 p-2 rounded-lg text-left truncate">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="flex-1 font-bold gap-2 h-11 border-border active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Recarregar
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="flex-1 font-bold gap-2 h-11 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-md"
              >
                <Home className="w-4 h-4" />
                Voltar ao Início
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default GlobalErrorBoundary
