'use client'

import { CreditCard, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useDemoPlan } from '@/hooks/use-demo-plan'
import { Badge } from '@/components/ui/badge'
import {
  formatPlanPrice,
  planIds,
  subscriptionPlans,
  type PlanId,
} from '@/lib/plans'
import { cn } from '@/lib/utils'

type DemoPlanSwitcherProps = {
  currentPlanId: PlanId
  collapsed?: boolean
  className?: string
  surface?: 'card' | 'sidebar'
}

export function DemoPlanSwitcher({
  currentPlanId,
  collapsed = false,
  className,
  surface = 'card',
}: DemoPlanSwitcherProps) {
  if (collapsed) {
    const initialPlan = subscriptionPlans[currentPlanId]

    return (
      <Link
        href="/configuracion/plan"
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 transition-colors hover:bg-orange-100',
          className
        )}
        aria-label={`Plan demo actual: ${initialPlan.commercialName}`}
        title={`Plan demo: ${initialPlan.shortName}`}
      >
        <CreditCard size={16} aria-hidden="true" />
      </Link>
    )
  }

  return (
    <ExpandedDemoPlanSwitcher
      currentPlanId={currentPlanId}
      className={className}
      surface={surface}
    />
  )
}

function ExpandedDemoPlanSwitcher({
  currentPlanId,
  className,
  surface,
}: {
  currentPlanId: PlanId
  className?: string
  surface: 'card' | 'sidebar'
}) {
  const { planId, plan, isPending, changePlan } = useDemoPlan(currentPlanId)

  return (
    <div
      className={cn(
        'rounded-2xl border shadow-sm shadow-slate-900/[0.03]',
        surface === 'sidebar'
          ? 'border-orange-200/70 bg-orange-50/70 p-3'
          : 'border-slate-200/80 bg-white p-4',
        className
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-3',
          surface === 'card' && 'sm:flex-row sm:items-center sm:justify-between'
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles
              size={15}
              className="shrink-0 text-orange-500"
              aria-hidden="true"
            />
            <p className="truncate text-sm font-semibold text-slate-900">
              Plan actual en demo
            </p>
            <Badge tone="slate">Local</Badge>
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-900">
            {plan.commercialName}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {formatPlanPrice(plan.monthlyPriceClp)} / mes · {plan.audience}
          </p>
        </div>
        <select
          value={planId}
          onChange={(event) => changePlan(event.target.value as PlanId)}
          disabled={isPending}
          className={cn(
            'agendix-select',
            surface === 'card' ? 'min-w-[220px]' : 'w-full'
          )}
          aria-label="Simular plan comercial"
        >
          {planIds.map((planId) => (
            <option key={planId} value={planId}>
              {subscriptionPlans[planId].commercialName}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
