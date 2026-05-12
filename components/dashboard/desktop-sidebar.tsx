'use client'

import { useEffect, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { AgendixBrand, AgendixSymbol } from '@/components/brand/agendix-brand'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'

const sidebarStorageKey = 'agendix-sidebar-collapsed'

type DesktopSidebarProps = {
  userName: string
  userInitial: string
  sessionLabel: string
}

export function DesktopSidebar({
  userName,
  userInitial,
  sessionLabel,
}: DesktopSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCollapsed(window.localStorage.getItem(sidebarStorageKey) === 'true')
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(sidebarStorageKey, String(next))
      return next
    })
  }

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen flex-shrink-0 border-r border-slate-200/80 bg-white/95 transition-[width] duration-200 md:flex md:flex-col',
        collapsed ? 'w-[76px]' : 'w-72'
      )}
    >
      <div className={cn('pb-4 pt-5', collapsed ? 'px-3' : 'px-4')}>
        <div
          className={cn(
              'relative rounded-2xl',
              collapsed
                ? 'flex flex-col items-center gap-3 p-2'
                : 'p-2'
          )}
        >
          {collapsed ? (
            <AgendixSymbol size="sm" />
          ) : (
            <AgendixBrand
              subtitle="Agenda y operación clínica"
            />
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            aria-pressed={collapsed}
            title={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60',
              collapsed ? 'bg-slate-50' : 'absolute right-0 top-1.5'
            )}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Sidebar
          collapsed={collapsed}
          userName={userName}
          userInitial={userInitial}
          sessionLabel={sessionLabel}
        />
      </div>
    </aside>
  )
}
