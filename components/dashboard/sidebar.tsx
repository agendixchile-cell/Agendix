'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  ClipboardList,
  Settings,
  UsersRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutButton } from './logout-button'

const navGroups = [
  {
    label: 'Trabajo diario',
    items: [
      { href: '/agenda', label: 'Agenda', icon: CalendarDays },
      { href: '/pacientes', label: 'Pacientes', icon: UsersRound },
      { href: '/reservas', label: 'Reservas', icon: ClipboardList, match: ['/reservas'] },
      { href: '/configuracion', label: 'Configuración', icon: Settings },
    ],
  },
]

type SidebarProps = {
  collapsed?: boolean
  onNavigate?: () => void
  userName?: string
  userInitial?: string
  sessionLabel?: string
}

export function Sidebar({
  collapsed = false,
  onNavigate,
  userName = 'Usuario',
  userInitial = 'U',
  sessionLabel = 'Sesión activa',
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <nav
        className={cn(
          'flex flex-1 flex-col gap-5 pb-4 pt-2',
          collapsed ? 'items-center px-3' : 'px-4'
        )}
      >
        {navGroups.map((group) => (
          <div key={group.label} className="w-full">
            <p
              className={cn(
                'px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400',
                collapsed && 'sr-only'
              )}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, match }) => {
                const activePaths = match ?? [href]
                const active = activePaths.some(
                  (path) => pathname === path || pathname.startsWith(`${path}/`)
                )

                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    aria-label={collapsed ? label : undefined}
                    title={collapsed ? label : undefined}
                    className={cn(
                      'group relative flex items-center rounded-xl border text-sm font-medium transition-all duration-150',
                      collapsed
                        ? 'h-10 w-10 justify-center px-0 py-0'
                        : 'w-full gap-2.5 px-2.5 py-2.5',
                      active
                        ? 'border-[#22211F] bg-[#22211F] text-white shadow-md shadow-slate-950/[0.12]'
                        : 'border-transparent text-slate-500 hover:bg-orange-50/70 hover:text-slate-900'
                    )}
                  >
                    {/* active accent indicator */}
                    <span
                      className={cn(
                        'absolute top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-r-full transition-all',
                        collapsed ? '-left-3' : 'left-0',
                        active ? 'bg-orange-500 opacity-100' : 'bg-orange-500 opacity-0'
                      )}
                    />
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                        active
                          ? 'bg-[#FFF4EF] text-orange-600 ring-1 ring-white/20 shadow-sm shadow-slate-950/[0.12]'
                          : 'text-slate-400 group-hover:bg-white group-hover:text-orange-600'
                      )}
                    >
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    {!collapsed && <span>{label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('border-t border-slate-100 pt-3', collapsed ? 'px-3 pb-4' : 'px-3 pb-4')}>
        <div
          className={cn(
            'border border-slate-200/80 bg-[#FAFAF8] shadow-sm shadow-slate-900/[0.03]',
            collapsed
              ? 'flex flex-col items-center gap-2 rounded-2xl p-2'
              : 'rounded-2xl p-3'
          )}
        >
          <div
            className={cn(
              'flex items-center',
              collapsed ? 'justify-center' : 'gap-3'
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF4EF] text-sm font-bold text-[#F9735B] ring-1 ring-orange-200/70">
              {userInitial}
            </div>
            <div className={cn('min-w-0', collapsed && 'sr-only')}>
              <p className="truncate text-sm font-semibold leading-4 text-slate-800">
                {userName}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{sessionLabel}</p>
            </div>
          </div>

          <LogoutButton
            iconOnly={collapsed}
            className={cn(
              collapsed ? 'mt-1' : 'mt-3 w-full justify-center'
            )}
          />
        </div>
      </div>
    </div>
  )
}
