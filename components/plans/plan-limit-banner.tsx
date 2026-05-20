import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PlanLimitBannerProps = {
  title: string
  description: string
  ctaLabel?: string
  href?: string
}

export function PlanLimitBanner({
  title,
  description,
  ctaLabel = 'Mejorar plan',
  href = '/configuracion/plan',
}: PlanLimitBannerProps) {
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-amber-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 ring-1 ring-amber-200/80">
            <AlertTriangle size={17} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-900">{title}</p>
            <p className="mt-1 text-sm leading-6 text-amber-800/80">{description}</p>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm" className="shrink-0 bg-white">
          <Link href={href}>{ctaLabel}</Link>
        </Button>
      </div>
    </div>
  )
}
