import Link from 'next/link'
import { LockKeyhole, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getFeatureUpgradeText, getMinimumPlanForFeature, type FeatureKey, type PlanId } from '@/lib/plans'

type UpgradeCardProps = {
  planId: PlanId
  feature?: FeatureKey
  title?: string
  description?: string
  ctaLabel?: string
  href?: string
  compact?: boolean
}

export function UpgradeCard({
  planId,
  feature,
  title,
  description,
  ctaLabel = 'Mejorar plan',
  href = '/configuracion/plan',
  compact = false,
}: UpgradeCardProps) {
  const minimumPlan = feature ? getMinimumPlanForFeature(feature) : null
  const resolvedTitle =
    title ?? (minimumPlan ? `Disponible desde ${minimumPlan.shortName}` : 'Función premium')
  const resolvedDescription =
    description ??
    (feature
      ? getFeatureUpgradeText(planId, feature)
      : 'Mejora tu plan para desbloquear esta capacidad en tu organización.')

  return (
    <section className="rounded-2xl border border-orange-200/80 bg-orange-50/70 p-5 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 ring-1 ring-orange-200/70">
          {compact ? <LockKeyhole size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">{resolvedTitle}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{resolvedDescription}</p>
          <Button asChild size="sm" className="mt-4">
            <Link href={href}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
