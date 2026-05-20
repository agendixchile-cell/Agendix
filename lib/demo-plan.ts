import {
  getPlan,
  isPlanId,
  normalizePlanId,
  type PlanDefinition,
  type PlanId,
} from '@/lib/plans'

export const demoPlanLocalStorageKey = 'agendix_demo_plan'
export const demoPlanCookieName = 'agendix-demo-plan'
export const demoPlanChangeEventName = 'agendix-demo-plan-change'

export type DemoPlanChangeDetail = {
  planId: PlanId
}

export function readDemoPlanFromStorage(): PlanId | null {
  if (typeof window === 'undefined') return null

  return normalizeStoredPlan(window.localStorage.getItem(demoPlanLocalStorageKey))
}

export function writeDemoPlanToStorage(planId: PlanId) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(demoPlanLocalStorageKey, normalizePlanId(planId))
}

export function writeDemoPlanCookie(planId: PlanId) {
  if (typeof document === 'undefined') return

  const maxAge = 60 * 60 * 24 * 30
  document.cookie = `${demoPlanCookieName}=${normalizePlanId(
    planId
  )}; path=/; max-age=${maxAge}; samesite=lax`
}

export function broadcastDemoPlanChange(planId: PlanId) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent<DemoPlanChangeDetail>(demoPlanChangeEventName, {
      detail: { planId: normalizePlanId(planId) },
    })
  )
}

export function getDemoPlanSummary(planId: string | null | undefined): {
  planId: PlanId
  plan: PlanDefinition
} {
  const normalizedPlanId = normalizePlanId(planId)

  return {
    planId: normalizedPlanId,
    plan: getPlan(normalizedPlanId),
  }
}

function normalizeStoredPlan(value: string | null): PlanId | null {
  return isPlanId(value) ? value : null
}
