import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type EmptyStateProps = {
  title: string
  description: string
  icon: LucideIcon
  actionLabel?: string
  onAction?: () => void
  note?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  note,
}: EmptyStateProps) {
  return (
    <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-orange-200/70 bg-orange-50/25 px-5 py-8 text-center sm:px-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm ring-1 ring-orange-200/70">
        <Icon size={22} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {note && (
        <p className="mt-2 text-xs text-slate-400">{note}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </section>
  )
}
