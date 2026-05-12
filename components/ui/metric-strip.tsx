import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type MetricStripTone = 'orange' | 'green' | 'blue' | 'violet' | 'slate' | 'red'

type MetricStripItem = {
  label: string
  value: string | number
  description?: string
  icon?: LucideIcon
  tone?: MetricStripTone
}

type MetricStripProps = {
  items: MetricStripItem[]
  className?: string
  variant?: 'strip' | 'cards'
}

const toneClasses: Record<MetricStripTone, string> = {
  orange: 'bg-orange-50 text-orange-600 ring-orange-200/60',
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-200/60',
  blue: 'bg-sky-50 text-sky-600 ring-sky-200/60',
  violet: 'bg-violet-50 text-violet-600 ring-violet-200/60',
  slate: 'bg-slate-50 text-slate-600 ring-slate-200/70',
  red: 'bg-red-50 text-red-500 ring-red-200/60',
}

type MetricStripStyle = CSSProperties & {
  '--metric-columns': number
}

export function MetricStrip({ items, className, variant = 'strip' }: MetricStripProps) {
  const total = items.length
  // Items in the last row of the sm 2-column grid
  const lastRowStartSm = total % 2 === 0 ? total - 2 : total - 1
  const separatedCards = variant === 'cards'

  return (
    <section
      className={cn(
        separatedCards
          ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(var(--metric-columns),minmax(0,1fr))]'
          : 'grid overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/[0.035] sm:grid-cols-2 xl:grid-cols-[repeat(var(--metric-columns),minmax(0,1fr))] xl:divide-x xl:divide-slate-100/80',
        className
      )}
      style={{ '--metric-columns': total } as MetricStripStyle}
    >
      {items.map(({ label, value, description, icon: Icon, tone = 'orange' }, index) => {
        const isLastMobile = index === total - 1
        const isInLastRowSm = index >= lastRowStartSm

        return (
          <article
            key={label}
            className={cn(
              'min-w-0 p-4',
              separatedCards && 'agendix-surface rounded-2xl',
              // Mobile (1-col): divider between items, not after the last
              !separatedCards && !isLastMobile && 'border-b border-slate-100/80',
              // sm (2-col): divider between rows, not on last-row items
              !separatedCards &&
                (isInLastRowSm
                  ? 'sm:border-b-0'
                  : 'sm:border-b sm:border-slate-100/80'),
              // xl (1-row): no border-b needed, divide-x handles it
              !separatedCards && 'xl:border-b-0',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-1.5 truncate text-xl font-semibold tracking-tight text-slate-900">
                  {value}
                </p>
              </div>
              {Icon && (
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1',
                    toneClasses[tone]
                  )}
                >
                  <Icon size={17} aria-hidden="true" />
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1.5 line-clamp-1 text-xs leading-5 text-slate-500">
                {description}
              </p>
            )}
          </article>
        )
      })}
    </section>
  )
}
