'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu, X } from 'lucide-react'
import { AgendixWordmark } from '@/components/brand/agendix-brand'
import type { PlanId } from '@/lib/plans'
import { Sidebar } from './sidebar'

type MobileNavProps = {
  userName: string
  userInitial: string
  sessionLabel: string
  demoMode?: boolean
  demoPlanId?: PlanId
  currentPlanId?: PlanId
}

export function MobileNav({
  userName,
  userInitial,
  sessionLabel,
  demoMode,
  demoPlanId,
  currentPlanId,
}: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const portalTarget =
    typeof document === 'undefined' ? null : document.body

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl p-2 text-orange-600 hover:bg-orange-50 hover:text-orange-700 md:hidden"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      {open &&
        portalTarget &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-slate-950/30 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed bottom-0 left-0 top-0 z-[9999] flex w-80 max-w-[86vw] flex-col overflow-hidden border-r border-slate-200 bg-[#FCFBF9] shadow-2xl shadow-slate-950/12 md:hidden"
            >
              <div className="px-4 pb-3 pt-4">
                <div className="flex items-center justify-between rounded-xl p-2">
                  <AgendixWordmark className="h-14 w-56 sm:h-14 sm:w-56" />
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-orange-50 hover:text-orange-600"
                    aria-label="Cerrar menú"
                  >
                    <X size={19} />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <Sidebar
                  onNavigate={() => setOpen(false)}
                  userName={userName}
                  userInitial={userInitial}
                  sessionLabel={sessionLabel}
                  demoMode={demoMode}
                  demoPlanId={demoPlanId}
                  currentPlanId={currentPlanId}
                />
              </div>
            </div>
          </>,
          portalTarget
        )}
    </>
  )
}
