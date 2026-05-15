import type { HorarioCentro } from '@/lib/centro/types'
import { timeRangeOverlapsDescanso } from '@/lib/centro/horarios'
import type {
  PublicBookingService,
  PublicBusySlot,
} from '@/lib/booking/types'

export const bookingSlotStepMinutes = 15

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function dateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function isoToLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isoWeekday(date: Date) {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

export function timeToMinutes(value: string) {
  const [hours = 0, minutes = 0] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${pad(hours)}:${pad(minutes)}`
}

export function localDateTime(fecha: string, hora: string) {
  return new Date(`${fecha}T${hora}:00`)
}

export function formatBookingDate(value: string) {
  return isoToLocalDate(value).toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatShortBookingDate(value: string) {
  return isoToLocalDate(value).toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function getHorarioForDate(date: Date, horarios: HorarioCentro[]) {
  return horarios.find((horario) => horario.dia === isoWeekday(date))
}

export function isPastSlot(fecha: string, hora: string) {
  return localDateTime(fecha, hora).getTime() <= Date.now()
}

export function generateBookingDays({
  horarios,
  days = 21,
  startDate = new Date(),
}: {
  horarios: HorarioCentro[]
  days?: number
  startDate?: Date
}) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const value = dateInputValue(date)
    const horario = getHorarioForDate(date, horarios)

    return {
      value,
      label: formatShortBookingDate(value),
      active: Boolean(horario?.activo),
    }
  })
}

function overlaps(start: Date, end: Date, busy: PublicBusySlot) {
  const busyStart = new Date(busy.fechaInicio)
  const busyEnd = new Date(busy.fechaFin)

  return start < busyEnd && end > busyStart
}

export function getAvailableSlots({
  fecha,
  servicio,
  profesionalId,
  horarios,
  busySlots,
  activeRoomCount,
}: {
  fecha: string
  servicio: PublicBookingService | null
  profesionalId: string
  horarios: HorarioCentro[]
  busySlots: PublicBusySlot[]
  activeRoomCount: number
}) {
  if (!fecha || !servicio || !profesionalId) return []

  const day = isoToLocalDate(fecha)
  const horario = getHorarioForDate(day, horarios)

  if (!horario?.activo) return []

  const startMinutes = timeToMinutes(horario.inicio)
  const endMinutes = timeToMinutes(horario.fin)
  const slots: string[] = []

  for (
    let minute = startMinutes;
    minute + servicio.duracionMinutos <= endMinutes;
    minute += bookingSlotStepMinutes
  ) {
    if (
      timeRangeOverlapsDescanso(
        horario,
        minute,
        minute + servicio.duracionMinutos
      )
    ) {
      continue
    }

    const hora = minutesToTime(minute)
    const slotStart = localDateTime(fecha, hora)
    const slotEnd = new Date(
      slotStart.getTime() + servicio.duracionMinutos * 60_000
    )

    if (slotStart.getTime() <= Date.now()) continue

    const hasConflict = busySlots.some((busySlot) => {
      const sameProfessional = busySlot.profesionalId === profesionalId
      const roomLimited = activeRoomCount <= 1

      return (sameProfessional || roomLimited) && overlaps(slotStart, slotEnd, busySlot)
    })

    if (!hasConflict) {
      slots.push(hora)
    }
  }

  return slots
}
