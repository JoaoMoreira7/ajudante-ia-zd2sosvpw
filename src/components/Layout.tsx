import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { DesktopSidebar } from './DesktopSidebar'
import { DesktopFooter } from './DesktopFooter'
import { VoiceOverlay } from './VoiceOverlay'

export default function Layout() {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Top Bar Fixa Global */}
      <TopBar />

      <div className="flex-1 flex w-full">
        {/* Sidebar para telas grandes (>=1024px) */}
        <DesktopSidebar onOpenVoice={() => setIsVoiceOpen(true)} />

        {/* Área Central de Conteúdo */}
        <main className="flex-1 pb-20 lg:pb-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
          <Outlet />
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
