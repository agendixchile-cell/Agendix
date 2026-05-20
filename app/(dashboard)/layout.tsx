import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AgendixWordmark } from '@/components/brand/agendix-brand'
import { DesktopSidebar } from '@/components/dashboard/desktop-sidebar'
import { MobileNav } from '@/components/dashboard/mobile-nav'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { getDemoPlanId } from '@/lib/subscription/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isDemoMode()) redirect('/login')
  const demoMode = isDemoMode()
  const demoPlanId = demoMode ? await getDemoPlanId() : undefined

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('nombre')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  const nombreUsuario = profile?.nombre ?? user?.email ?? demoUser.nombre
  const inicialUsuario = nombreUsuario.charAt(0).toUpperCase()
  const sessionLabel = demoMode ? 'Demo activo' : 'Sesión activa'

  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">
      <DesktopSidebar
        userName={nombreUsuario}
        userInitial={inicialUsuario}
        sessionLabel={sessionLabel}
        demoMode={demoMode}
        demoPlanId={demoPlanId}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/70 bg-[#FCFBF9]/95 px-4 backdrop-blur-xl md:hidden">
          <MobileNav
            userName={nombreUsuario}
            userInitial={inicialUsuario}
            sessionLabel={sessionLabel}
            demoMode={demoMode}
            demoPlanId={demoPlanId}
          />
          <div className="absolute left-1/2 -translate-x-1/2">
            <AgendixWordmark preload className="h-10 w-44 sm:h-11 sm:w-48" />
          </div>
          {/* Spacer para balancear el botón de menú a la izquierda */}
          <div className="h-9 w-9" aria-hidden="true" />
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 md:py-7 lg:px-8 xl:px-9">
          {children}
        </main>
      </div>
    </div>
  )
}
