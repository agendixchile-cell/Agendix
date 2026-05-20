import { defaultHorariosCentro, horariosCentroStorageKey, normalizeHorarios } from '@/lib/centro/horarios'
import type { HorarioCentro } from '@/lib/centro/types'

const horariosCentroStorageVersionKey = 'agendix-centro-horarios-version'
const currentHorariosCentroVersion = '2026-05-horarios-09-19-sabado'
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

function migrateDefaultHorariosCentro() {
  const storedVersion = window.localStorage.getItem(horariosCentroStorageVersionKey)

  if (storedVersion === currentHorariosCentroVersion) return

  const storedValue = window.localStorage.getItem(horariosCentroStorageKey)

  if (!storedValue) {
    window.localStorage.setItem(horariosCentroStorageVersionKey, currentHorariosCentroVersion)
    return
  }

  const storedHorarios = normalizeHorarios(JSON.parse(storedValue) as HorarioCentro[])

  if (horariosMatch(storedHorarios, legacyDefaultHorariosCentro)) {
    window.localStorage.setItem(horariosCentroStorageKey, JSON.stringify(defaultHorariosCentro))
  }

  window.localStorage.setItem(horariosCentroStorageVersionKey, currentHorariosCentroVersion)
}

export function migrateLegacyAgendixStorage() {
  if (typeof window === 'undefined') return

  try {
    migrateDefaultHorariosCentro()
  } catch {
    // If browser storage is unavailable, the page can continue with server data.
  }
}
