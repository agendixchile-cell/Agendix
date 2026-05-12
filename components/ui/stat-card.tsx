import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatCardProps = {
  label: string
  value: string | number
  description?: string
  icon?: LucideIcon
  tone?: 'orange' | 'green' | 'blue' | 'violet' | 'slate' | 'red'
}

const toneClasses = {
  orange: 'bg-orange-50 text-orange-600 ring-orange-200/60',
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-200/60',
  blue: 'bg-sky-50 text-sky-600 ring-sky-200/60',
  violet: 'bg-violet-50 text-violet-600 ring-violet-200/60',
  slate: 'bg-slate-50 text-slate-600 ring-slate-200/60',
  red: 'bg-red-50 text-red-500 ring-red-200/60',
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'orange',
}: StatCardProps) {
  return (
    <article className="agendix-surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold leading-none tracking-tight text-slate-800">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg ring-1',
              toneClasses[tone]
            )}
          >
            <Icon size={18} aria-hidden="true" />
          </div>
        )}
      </div>
      {description && (
        <p className="mt-3 text-sm leading-5 text-slate-400">{description}</p>
      )}
    </article>
  )
}
