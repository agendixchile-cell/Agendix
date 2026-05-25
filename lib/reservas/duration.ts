import { zonedDateTime } from '@/lib/timezone'

export function normalizeReservationDurationMinutes(
  value: number | null | undefined,
  fallback = 60
) {
  if (!Number.isFinite(value)) return fallback

  return Math.max(5, Math.trunc(value ?? fallback))
}

export function getServiceReservationDurationMinutes(
  serviceDurationMinutes: number | null | undefined
) {
  return normalizeReservationDurationMinutes(serviceDurationMinutes)
}

export function calculateReservationEndTime(
  startTime: Date,
  serviceDurationMinutes: number
) {
  const reservationDuration = getServiceReservationDurationMinutes(
    serviceDurationMinutes
  )

  return new Date(startTime.getTime() + reservationDuration * 60_000)
}

export function calculateReservationDateRange({
  fecha,
  hora,
  serviceDurationMinutes,
}: {
  fecha: string
  hora: string
  serviceDurationMinutes: number
}) {
  const start = zonedDateTime(fecha, hora)

  if (Number.isNaN(start.getTime())) {
    return { error: 'Selecciona una fecha y hora válidas.' }
  }

  const end = calculateReservationEndTime(start, serviceDurationMinutes)

  return {
    fechaInicio: start.toISOString(),
    fechaFin: end.toISOString(),
    startsAt: start,
  }
}
