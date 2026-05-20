import type { DiaSemana, HorarioCentro } from './types'

export const horariosCentroStorageKey = 'agendix-centro-horarios'

export const diasSemana: Array<{
  dia: DiaSemana
  label: string
  shortLabel: string
}> = [
  { dia: 1, label: 'Lunes', shortLabel: 'LUN' },
  { dia: 2, label: 'Martes', shortLabel: 'MAR' },
  { dia: 3, label: 'Miércoles', shortLabel: 'MIE' },
  { dia: 4, label: 'Jueves', shortLabel: 'JUE' },
  { dia: 5, label: 'Viernes', shortLabel: 'VIE' },
  { dia: 6, label: 'Sábado', shortLabel: 'SAB' },
  { dia: 7, label: 'Domingo', shortLabel: 'DOM' },
]

export const defaultHorariosCentro: HorarioCentro[] = diasSemana.map(({ dia }) => ({
  dia,
  activo: dia <= 6,
  inicio: '09:00',
  fin: '19:00',
  descanso_activo: false,
  descanso_inicio: '13:00',
  descanso_fin: '14:00',
}))

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return 0
  }

  return hours * 60 + minutes
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function minutesToTime(minutes: number) {
  const safeMinutes = Math.max(0, Math.min(23 * 60 + 59, minutes))

  return `${pad(Math.floor(safeMinutes / 60))}:${pad(safeMinutes % 60)}`
}

export function horarioDurationMinutes(horario: HorarioCentro) {
  if (!horario.activo) return 0

  const openMinutes = Math.max(
    0,
    timeToMinutes(horario.fin) - timeToMinutes(horario.inicio)
  )

  return Math.max(0, openMinutes - horarioDescansoDurationMinutes(horario))
}

export function horarioDescansoDurationMinutes(horario: HorarioCentro) {
  if (!horario.activo || !horario.descanso_activo) return 0

  return Math.max(
    0,
    timeToMinutes(horario.descanso_fin) - timeToMinutes(horario.descanso_inicio)
  )
}

export function normalizeHorarios(horarios: HorarioCentro[]) {
  return diasSemana.map(({ dia }) => {
    const horario = horarios.find((item) => item.dia === dia)
    const fallback = defaultHorariosCentro.find((item) => item.dia === dia)

    return {
      dia,
      activo: horario?.activo ?? fallback?.activo ?? false,
      inicio: horario?.inicio ?? fallback?.inicio ?? '09:00',
      fin: horario?.fin ?? fallback?.fin ?? '19:00',
      descanso_activo:
        horario?.descanso_activo ?? fallback?.descanso_activo ?? false,
      descanso_inicio:
        horario?.descanso_inicio ?? fallback?.descanso_inicio ?? '13:00',
      descanso_fin: horario?.descanso_fin ?? fallback?.descanso_fin ?? '14:00',
    }
  })
}

export function diaFromDate(date: Date): DiaSemana {
  const day = date.getDay()

  return (day === 0 ? 7 : day) as DiaSemana
}

export function getHorarioForDate(date: Date, horarios: HorarioCentro[]) {
  const dia = diaFromDate(date)

  return normalizeHorarios(horarios).find((horario) => horario.dia === dia)
}

export function weeklyAvailabilityMinutes(horarios: HorarioCentro[]) {
  return normalizeHorarios(horarios).reduce(
    (total, horario) => total + horarioDurationMinutes(horario),
    0
  )
}

export function timeRangeOverlapsDescanso(
  horario: HorarioCentro | undefined,
  startMinutes: number,
  endMinutes: number
) {
  if (!horario?.activo || !horario.descanso_activo) return false

  const descansoStart = timeToMinutes(horario.descanso_inicio)
  const descansoEnd = timeToMinutes(horario.descanso_fin)

  return startMinutes < descansoEnd && endMinutes > descansoStart
}

export function firstBookableTime(horario: HorarioCentro | undefined) {
  if (!horario?.activo) return '09:00'

  const startMinutes = timeToMinutes(horario.inicio)
  const nextHourEnd = startMinutes + 60

  if (timeRangeOverlapsDescanso(horario, startMinutes, nextHourEnd)) {
    return horario.descanso_fin
  }

  return minutesToTime(startMinutes)
}
