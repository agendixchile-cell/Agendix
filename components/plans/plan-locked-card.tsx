import { LockKeyhole } from 'lucide-react'
import { UpgradeCard } from '@/components/plans/upgrade-card'
import type { FeatureKey, PlanId } from '@/lib/plans'

type PlanLockedCardProps = {
  planId: PlanId
  feature: FeatureKey
  title: string
  description: string
  ctaLabel?: string
}

export function PlanLockedCard({
  planId,
  feature,
  title,
  description,
  ctaLabel = 'Ver planes',
}: PlanLockedCardProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-orange-600 ring-1 ring-orange-200/80">
        <LockKeyhole size={15} aria-hidden="true" />
      </span>
      <UpgradeCard
        planId={planId}
        feature={feature}
        title={title}
        description={description}
        ctaLabel={ctaLabel}
        compact
      />
    </div>
  )
}
