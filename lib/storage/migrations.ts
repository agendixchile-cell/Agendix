import { defaultHorariosCentro, normalizeHorarios } from '@/lib/centro/horarios'
import type { HorarioCentro } from '@/lib/centro/types'
import {
  getDemoStorageKey,
  getDemoStorageVersionKey,
  getLegacyDemoStorageKeys,
  type DemoStorageResource,
} from '@/lib/demo-storage'
import { normalizePlanId, type PlanId } from '@/lib/plans'

const legacyHorariosCentroStorageVersionKey = 'agendix-centro-horarios-version'
const currentHorariosCentroVersion = '2026-05-horarios-09-19-sabado'
const migratableDemoResources: DemoStorageResource[] = [
  'bloqueos-agenda',
  'centro',
  'fichas-clinicas',
  'horarios-centro',
  'pacientes',
  'profesionales',
  'recordatorios',
  'reservas',
  'salas',
  'servicios',
]
const legacyDefaultHorariosCentro: HorarioCentro[] = [
  {
    dia: 1,
    activo: true,
    inicio: '09:00',
    fin: '18:00',
    descanso_activo: false,
    descanso_inicio: '13:00',
    descanso_fin: '14:00',
  },
  {
    dia: 2,
    activo: true,
    inicio: '09:00',
    fin: '18:00',
    descanso_activo: false,
    descanso_inicio: '13:00',
    descanso_fin: '14:00',
  },
  {
    dia: 3,
    activo: true,
    inicio: '09:00',
    fin: '18:00',
    descanso_activo: false,
    descanso_inicio: '13:00',
    descanso_fin: '14:00',
  },
  {
    dia: 4,
    activo: true,
    inicio: '09:00',
    fin: '18:00',
    descanso_activo: false,
    descanso_inicio: '13:00',
    descanso_fin: '14:00',
  },
  {
    dia: 5,
    activo: true,
    inicio: '09:00',
    fin: '18:00',
    descanso_activo: false,
    descanso_inicio: '13:00',
    descanso_fin: '14:00',
  },
  {
    dia: 6,
    activo: false,
    inicio: '09:00',
    fin: '18:00',
    descanso_activo: false,
    descanso_inicio: '13:00',
    descanso_fin: '14:00',
  },
  {
    dia: 7,
    activo: false,
    inicio: '09:00',
    fin: '18:00',
    descanso_activo: false,
    descanso_inicio: '13:00',
    descanso_fin: '14:00',
  },
]

function horariosMatch(a: HorarioCentro[], b: HorarioCentro[]) {
  return normalizeHorarios(a).every((horario, index) => {
    const expected = b[index]

    return (
      horario.dia === expected.dia &&
      horario.activo === expected.activo &&
      horario.inicio === expected.inicio &&
      horario.fin === expected.fin
    )
  })
}

function migratePlanScopedDemoStorage(planId: PlanId) {
  migratableDemoResources.forEach((resource) => {
    const nextKey = getDemoStorageKey(planId, resource)

    getLegacyDemoStorageKeys(planId, resource).forEach((legacyKey) => {
      if (legacyKey === nextKey) return

      const legacyValue = window.localStorage.getItem(legacyKey)

      if (!legacyValue) return
      if (!window.localStorage.getItem(nextKey)) {
        window.localStorage.setItem(nextKey, legacyValue)
      }
      window.localStorage.removeItem(legacyKey)
    })
  })

  const legacyVersion = window.localStorage.getItem(
    legacyHorariosCentroStorageVersionKey
  )

  if (legacyVersion) {
    const nextVersionKey = getDemoStorageVersionKey(planId, 'horarios-centro')

    if (!window.localStorage.getItem(nextVersionKey)) {
      window.localStorage.setItem(nextVersionKey, legacyVersion)
    }
    window.localStorage.removeItem(legacyHorariosCentroStorageVersionKey)
  }
}

function migrateDefaultHorariosCentro(planId: PlanId) {
  const storageKey = getDemoStorageKey(planId, 'horarios-centro')
  const versionKey = getDemoStorageVersionKey(planId, 'horarios-centro')
  const storedVersion = window.localStorage.getItem(versionKey)

  if (storedVersion === currentHorariosCentroVersion) return

  const storedValue = window.localStorage.getItem(storageKey)

  if (!storedValue) {
    window.localStorage.setItem(versionKey, currentHorariosCentroVersion)
    return
  }

  const storedHorarios = normalizeHorarios(JSON.parse(storedValue) as HorarioCentro[])

  if (horariosMatch(storedHorarios, legacyDefaultHorariosCentro)) {
    window.localStorage.setItem(storageKey, JSON.stringify(defaultHorariosCentro))
  }

  window.localStorage.setItem(versionKey, currentHorariosCentroVersion)
}

export function migrateLegacyAgendixStorage(planId?: PlanId | string | null) {
  if (typeof window === 'undefined') return

  try {
    const normalizedPlanId = normalizePlanId(planId)

    migratePlanScopedDemoStorage(normalizedPlanId)
    migrateDefaultHorariosCentro(normalizedPlanId)
  } catch {
    // If browser storage is unavailable, the page can continue with server data.
  }
}
