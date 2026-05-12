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

export function horarioDurationMinutes(horario: HorarioCentro) {
  if (!horario.activo) return 0

  return Math.max(0, timeToMinutes(horario.fin) - timeToMinutes(horario.inicio))
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
