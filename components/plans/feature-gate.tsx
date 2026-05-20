import { UpgradeCard } from '@/components/plans/upgrade-card'
import { hasFeature, type FeatureKey, type PlanId } from '@/lib/plans'

type FeatureGateProps = {
  planId: PlanId
  feature: FeatureKey
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({
  planId,
  feature,
  children,
  fallback,
}: FeatureGateProps) {
  if (hasFeature(planId, feature)) {
    return <>{children}</>
  }

  if (fallback) return <>{fallback}</>

  return <UpgradeCard planId={planId} feature={feature} />
}
