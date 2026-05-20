import { normalizePlanId, type PlanId } from '@/lib/plans'

export type DemoStorageResource =
  | 'bloqueos-agenda'
  | 'centro'
  | 'fichas-clinicas'
  | 'horarios-centro'
  | 'pacientes'
  | 'profesionales'
  | 'recordatorios'
  | 'reservas'
  | 'salas'
  | 'servicios'

const demoStoragePrefix = 'agendix-demo'

const legacyBaseKeys: Record<DemoStorageResource, string> = {
  'bloqueos-agenda': 'agendix-demo-bloqueos-agenda',
  centro: 'agendix-demo-centro',
  'fichas-clinicas': 'agendix-demo-fichas-clinicas',
  'horarios-centro': 'agendix-centro-horarios',
  pacientes: 'agendix-demo-pacientes',
  profesionales: 'agendix-demo-profesionales',
  recordatorios: 'agendix-demo-recordatorios',
  reservas: 'agendix-demo-reservas',
  salas: 'agendix-demo-salas',
  servicios: 'agendix-demo-servicios',
}

export function getDemoStorageKey(
  planId: PlanId | string | null | undefined,
  resource: DemoStorageResource
) {
  return `${demoStoragePrefix}-${normalizePlanId(planId)}-${resource}`
}

export function getLegacyDemoStorageKeys(
  planId: PlanId | string | null | undefined,
  resource: DemoStorageResource
) {
  const normalizedPlanId = normalizePlanId(planId)
  const legacyBaseKey = legacyBaseKeys[resource]

  return Array.from(new Set([`${legacyBaseKey}:${normalizedPlanId}`, legacyBaseKey]))
}

export function getDemoStorageVersionKey(
  planId: PlanId | string | null | undefined,
  resource: DemoStorageResource
) {
  return `${getDemoStorageKey(planId, resource)}-version`
}

export function readDemoStorageItem(
  planId: PlanId | string | null | undefined,
  resource: DemoStorageResource
) {
  if (typeof window === 'undefined') return null

  const scopedKey = getDemoStorageKey(planId, resource)
  const scopedValue = window.localStorage.getItem(scopedKey)

  if (scopedValue !== null) return scopedValue

  for (const legacyKey of getLegacyDemoStorageKeys(planId, resource)) {
    const legacyValue = window.localStorage.getItem(legacyKey)

    if (legacyValue !== null) {
      window.localStorage.setItem(scopedKey, legacyValue)
      return legacyValue
    }
  }

  return null
}

export function writeDemoStorageItem(
  planId: PlanId | string | null | undefined,
  resource: DemoStorageResource,
  value: string
) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(getDemoStorageKey(planId, resource), value)
}

export function removeDemoStorageItem(
  planId: PlanId | string | null | undefined,
  resource: DemoStorageResource
) {
  if (typeof window === 'undefined') return

  window.localStorage.removeItem(getDemoStorageKey(planId, resource))

  getLegacyDemoStorageKeys(planId, resource).forEach((legacyKey) => {
    window.localStorage.removeItem(legacyKey)
  })
}

export function getPlanScopedDemoStorageKey(
  baseKey: string,
  planId: string | null | undefined
) {
  const resource = Object.entries(legacyBaseKeys).find(
    ([, legacyBaseKey]) => legacyBaseKey === baseKey
  )?.[0] as DemoStorageResource | undefined

  if (!resource) return planId ? `${baseKey}:${normalizePlanId(planId)}` : baseKey

  return getDemoStorageKey(planId, resource)
}
