'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setDemoPlanAction } from '@/app/actions/demo-plan'
import {
  broadcastDemoPlanChange,
  demoPlanChangeEventName,
  demoPlanLocalStorageKey,
  readDemoPlanFromStorage,
  writeDemoPlanCookie,
  writeDemoPlanToStorage,
  type DemoPlanChangeDetail,
} from '@/lib/demo-plan'
import { getPlan, normalizePlanId, type PlanId } from '@/lib/plans'

type UseDemoPlanOptions = {
  enabled?: boolean
}

export function useDemoPlan(
  initialPlanId: PlanId,
  options: UseDemoPlanOptions = {}
) {
  const enabled = options.enabled ?? true
  const router = useRouter()
  const [planId, setPlanId] = useState<PlanId>(normalizePlanId(initialPlanId))
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!enabled) return

    const storedPlanId = readDemoPlanFromStorage()
    const nextPlanId = storedPlanId ?? normalizePlanId(initialPlanId)

    window.setTimeout(() => setPlanId(nextPlanId), 0)
    writeDemoPlanToStorage(nextPlanId)
    writeDemoPlanCookie(nextPlanId)

    if (nextPlanId !== normalizePlanId(initialPlanId)) {
      startTransition(async () => {
        await setDemoPlanAction(nextPlanId)
        router.refresh()
      })
    }
  }, [enabled, initialPlanId, router])

  useEffect(() => {
    if (!enabled) return

    const onStorage = (event: StorageEvent) => {
      if (event.key !== demoPlanLocalStorageKey) return

      setPlanId(normalizePlanId(event.newValue))
    }

    const onPlanChange = (event: Event) => {
      const customEvent = event as CustomEvent<DemoPlanChangeDetail>
      setPlanId(normalizePlanId(customEvent.detail?.planId))
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(demoPlanChangeEventName, onPlanChange)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(demoPlanChangeEventName, onPlanChange)
    }
  }, [enabled])

  const changePlan = useCallback(
    (nextPlanId: PlanId) => {
      if (!enabled) return

      const normalizedPlanId = normalizePlanId(nextPlanId)
      setPlanId(normalizedPlanId)
      writeDemoPlanToStorage(normalizedPlanId)
      writeDemoPlanCookie(normalizedPlanId)
      broadcastDemoPlanChange(normalizedPlanId)

      startTransition(async () => {
        await setDemoPlanAction(normalizedPlanId)
        router.refresh()
      })
    },
    [enabled, router]
  )

  return useMemo(
    () => ({
      planId,
      plan: getPlan(planId),
      isPending,
      changePlan,
    }),
    [changePlan, isPending, planId]
  )
}
