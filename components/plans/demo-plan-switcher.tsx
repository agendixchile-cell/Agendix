'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setDemoPlanAction } from '@/app/actions/demo-plan'
import { Badge } from '@/components/ui/badge'
import { planIds, subscriptionPlans, type PlanId } from '@/lib/plans'

type DemoPlanSwitcherProps = {
  currentPlanId: PlanId
}

export function DemoPlanSwitcher({ currentPlanId }: DemoPlanSwitcherProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (process.env.NODE_ENV === 'production') return null

  const onChange = (planId: PlanId) => {
    startTransition(async () => {
      await setDemoPlanAction(planId)
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-800">Simular plan</p>
            <Badge tone="slate">Dev</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Cambia el plan demo para validar límites, bloqueos y métricas.
          </p>
        </div>
        <select
          value={currentPlanId}
          onChange={(event) => onChange(event.target.value as PlanId)}
          disabled={isPending}
          className="agendix-select min-w-[220px]"
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
