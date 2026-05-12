import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  description: string
  eyebrow?: string
  icon?: LucideIcon
  children?: React.ReactNode
  meta?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  children,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        'relative py-1',
        className
      )}
    >
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            {Icon && (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-200/70 bg-orange-50 text-orange-600 shadow-sm shadow-orange-950/[0.03]">
                <Icon size={18} aria-hidden="true" />
              </div>
            )}
            {eyebrow && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {eyebrow}
              </span>
            )}
            {meta}
          </div>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
        {children && (
          <div className="relative grid max-w-full gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            {children}
          </div>
        )}
      </div>
    </section>
  )
}
