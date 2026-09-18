/**
 * CONTEXTO DE AUTENTICAÇÃO E SESSÃO DO AJUDANTE IA
 */
import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { localDB } from '@/lib/localDB'
import { ConfiguracoesApp } from '@/types/database'

export type AppMode = 'simples' | 'profissional' | 'economico'
export type FontSize = 'p' | 'm' | 'g'

interface AuthContextType {
  user: { id: string; email: string; name?: string } | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  config: ConfiguracoesApp
  updateConfig: (newConfig: Partial<ConfiguracoesApp>) => Promise<void>
  setModo: (modo: AppMode) => Promise<void>
  toggleAltoContraste: () => Promise<void>
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>
  signup: (
    email: string,
    pass: string,
    name: string,
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const defaultConfig: ConfiguracoesApp = {
  modo: 'profissional',
  fonte_tamanho: 'm',
  alto_contraste: false,
  voz_respostas: true,
  tema: 'claro',
  nome_profissional: 'João Carlos Mestre de Obras',
  nome_empresa: 'JC Construções',
  telefone: '(35) 99876-5432',
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  config: defaultConfig,
  updateConfig: async () => {},
  setModo: async () => {},
  toggleAltoContraste: async () => {},
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(
    pb.authStore.record
      ? {
          id: pb.authStore.record.id,
          email: (pb.authStore.record as any).email || '',
          name: (pb.authStore.record as any).name,
        }
      : null,
  )
  const [token, setToken] = useState<string | null>(pb.authStore.token)
  const [isLoading, setIsLoading] = useState(true)
  const [config, setConfig] = useState<ConfiguracoesApp>(defaultConfig)

  useEffect(() => {
    // Escuta mudanças de auth
    const unsub = pb.authStore.onChange((newToken, model) => {
      setToken(newToken)
      if (model) {
        setUser({
          id: model.id,
          email: (model as any).email || '',
          name: (model as any).name,
        })
      } else {
        setUser(null)
      }
    })

    // Inicializa banco de dados local e sementes se vazio
    const initApp = async () => {
      try {
        const activeUserId = pb.authStore.record?.id || 'local_user'
        await localDB.seedDefaultIfEmpty(activeUserId)
        const configs = await localDB.getAll('configuracoes')
        if (configs.length > 0) {
          setConfig(configs[0])
        }
      } catch (err) {
        console.warn('Erro ao inicializar DB local:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initApp()
    return () => unsub()
  }, [])

  // Aplica classe de alto contraste e tamanho de fonte no HTML
  useEffect(() => {
    const root = document.documentElement
    if (config.alto_contraste) {
      root.classList.add('alto-contraste')
    } else {
      root.classList.remove('alto-contraste')
    }

    if (config.fonte_tamanho === 'p') {
      root.style.fontSize = '15px'
    } else if (config.fonte_tamanho === 'g') {
      root.style.fontSize = '19px'
    } else {
      root.style.fontSize = '16px'
    }
  }, [config.alto_contraste, config.fonte_tamanho])

  const updateConfig = async (newConfig: Partial<ConfiguracoesApp>) => {
    const updated = { ...config, ...newConfig }
    setConfig(updated)
    await localDB.put('configuracoes', updated)
  }

  const setModo = async (modo: AppMode) => {
    await updateConfig({ modo })
  }

  const toggleAltoContraste = async () => {
    await updateConfig({ alto_contraste: !config.alto_contraste })
  }

  const login = async (email: string, pass: string) => {
    try {
      if (navigator.onLine) {
        const authData = await pb.collection('users').authWithPassword(email.trim(), pass)
        setUser({
          id: authData.record.id,
          email: authData.record.email,
          name: authData.record.name,
        })
        setToken(authData.token)
        return { success: true }
      }
      // Modo offline: login de emergência local
      const localId =
        'usr_' +
        (email.toLowerCase().includes('joao')
          ? 'jaocarlos'
          : Math.random().toString(36).substring(2, 8))
      const fakeUser = { id: localId, email: email.trim(), name: email.split('@')[0] }
      setUser(fakeUser)
      setToken('local_token_' + Date.now())
      return { success: true }
    } catch (err: any) {
      // Se offline ou falha de rede
      if (!navigator.onLine) {
        const localId = 'usr_offline'
        setUser({ id: localId, email: email.trim(), name: email.split('@')[0] })
        setToken('local_token_' + Date.now())
        return { success: true }
      }
      return { success: false, error: err?.message || 'E-mail ou senha incorretos.' }
    }
  }

  const signup = async (email: string, pass: string, name: string) => {
    try {
      if (navigator.onLine) {
        await pb.collection('users').create({
          email: email.trim(),
          password: pass,
          passwordConfirm: pass,
          name: name.trim(),
        })
        return await login(email, pass)
      }
      // Offline fallback
      setUser({ id: 'usr_local_' + Date.now(), email: email.trim(), name: name.trim() })
      setToken('local_token_' + Date.now())
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Não foi possível cadastrar.' }
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user || token),
        isLoading,
        config,
        updateConfig,
        setModo,
        toggleAltoContraste,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
