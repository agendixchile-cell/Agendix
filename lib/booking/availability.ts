import type { HorarioCentro } from '@/lib/centro/types'
import { timeRangeOverlapsDescanso } from '@/lib/centro/horarios'
import type {
  PublicBookingProfessional,
  PublicBookingService,
  PublicBusySlot,
  PublicScheduleBlock,
} from '@/lib/booking/types'
import { getServiceReservationDurationMinutes } from '@/lib/reservas/duration'
import { zonedDateKey, zonedDateTime } from '@/lib/timezone'

export const defaultBookingSlotStepMinutes = 60

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function dateInputValue(date = new Date()) {
  return zonedDateKey(date)
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
  return zonedDateTime(fecha, hora)
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

export function normalizeBreakMinutes(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 0

  return Math.max(0, Math.trunc(value ?? 0))
}

function normalizePositiveMinutes(
  value: number | null | undefined,
  fallback: number
) {
  if (!Number.isFinite(value)) return fallback

  return Math.max(5, Math.trunc(value ?? fallback))
}

export function getEffectiveSessionDuration({ servicio }: {
  servicio: PublicBookingService
  profesional: PublicBookingProfessional
}) {
  return getServiceReservationDurationMinutes(servicio.duracionMinutos)
}

export function getProfessionalSlotStep(profesional: PublicBookingProfessional) {
  return normalizePositiveMinutes(
    profesional.intervaloReservasMinutos,
    defaultBookingSlotStepMinutes
  )
}

function overlaps(start: Date, end: Date, busy: PublicBusySlot) {
  const busyStart = new Date(busy.fechaInicio)
  const busyEnd = new Date(busy.fechaFin)

  return start < busyEnd && end > busyStart
}

function overlapsScheduleBlock({
  start,
  end,
  block,
  profesionalId,
}: {
  start: Date
  end: Date
  block: PublicScheduleBlock
  profesionalId: string
}) {
  if (block.profesionalId && block.profesionalId !== profesionalId) {
    return false
  }

  const blockStart = new Date(block.fechaInicio)
  const blockEnd = new Date(block.fechaFin)

  return start < blockEnd && end > blockStart
}

export function overlapsWithProfessionalBreak({
  start,
  end,
  busyStart,
  busyEnd,
  breakMinutes,
}: {
  start: Date
  end: Date
  busyStart: Date
  busyEnd: Date
  breakMinutes: number
}) {
  const breakMs = normalizeBreakMinutes(breakMinutes) * 60_000

  return (
    start.getTime() < busyEnd.getTime() + breakMs &&
    end.getTime() + breakMs > busyStart.getTime()
  )
}

export function getAvailableSlots({
  fecha,
  servicio,
  profesional,
  horarios,
  busySlots,
  scheduleBlocks,
  activeRoomCount,
}: {
  fecha: string
  servicio: PublicBookingService | null
  profesional: PublicBookingProfessional | null
  horarios: HorarioCentro[]
  busySlots: PublicBusySlot[]
  scheduleBlocks: PublicScheduleBlock[]
  activeRoomCount: number
}) {
  if (!fecha || !servicio || !profesional) return []

  const day = isoToLocalDate(fecha)
  const horario = getHorarioForDate(day, horarios)

  if (!horario?.activo) return []

  const startMinutes = timeToMinutes(horario.inicio)
  const endMinutes = timeToMinutes(horario.fin)
  const sessionDurationMinutes = getEffectiveSessionDuration({
    servicio,
    profesional,
  })
  const slotStepMinutes = getProfessionalSlotStep(profesional)
  const slots: string[] = []

  for (
    let minute = startMinutes;
    minute + sessionDurationMinutes <= endMinutes;
    minute += slotStepMinutes
  ) {
    if (
      timeRangeOverlapsDescanso(
        horario,
        minute,
        minute + sessionDurationMinutes
      )
    ) {
      continue
    }

    const hora = minutesToTime(minute)
    const slotStart = localDateTime(fecha, hora)
    const slotEnd = new Date(
      slotStart.getTime() + sessionDurationMinutes * 60_000
    )

    if (slotStart.getTime() <= Date.now()) continue

    const hasScheduleBlock = scheduleBlocks.some((block) =>
      overlapsScheduleBlock({
        start: slotStart,
        end: slotEnd,
        block,
        profesionalId: profesional.id,
      })
    )

    if (hasScheduleBlock) continue

    const overlappingRoomCount = busySlots.filter((busySlot) =>
      overlaps(slotStart, slotEnd, busySlot)
    ).length

    if (overlappingRoomCount >= Math.max(1, activeRoomCount)) continue

    const hasConflict = busySlots.some((busySlot) => {
      const sameProfessional = busySlot.profesionalId === profesional.id

      if (sameProfessional) {
        return overlapsWithProfessionalBreak({
          start: slotStart,
          end: slotEnd,
          busyStart: new Date(busySlot.fechaInicio),
          busyEnd: new Date(busySlot.fechaFin),
          breakMinutes: profesional.descansoEntreReservasMinutos,
        })
      }

      return false
    })

    if (!hasConflict) {
      slots.push(hora)
    }
  }

  return slots
}
