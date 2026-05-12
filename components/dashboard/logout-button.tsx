'use client'

import { useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { logoutAction } from '@/app/actions/auth'
import { cn } from '@/lib/utils'

type LogoutButtonProps = {
  className?: string
  labelClassName?: string
  iconOnly?: boolean
}

export function LogoutButton({
  className,
  labelClassName,
  iconOnly = false,
}: LogoutButtonProps) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => logoutAction())}
      disabled={pending}
      className={cn(
        'flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 shadow-sm shadow-slate-900/[0.04] transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50',
        iconOnly ? 'w-9 px-0' : 'px-3',
        className
      )}
      aria-label={pending ? 'Saliendo' : 'Cerrar sesión'}
      title={iconOnly ? (pending ? 'Saliendo' : 'Cerrar sesión') : undefined}
    >
      <LogOut size={16} aria-hidden="true" />
      {!iconOnly && (
        <span className={cn('inline', labelClassName)}>
          {pending ? 'Saliendo...' : 'Cerrar sesión'}
        </span>
      )}
    </button>
  )
}
