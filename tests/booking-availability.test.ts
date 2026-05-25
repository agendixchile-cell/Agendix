import { describe, expect, it } from 'vitest'
import {
  getAvailableSlots,
  getEffectiveSessionDuration,
  localDateTime,
} from '@/lib/booking/availability'
import { calculateReservationEndTime } from '@/lib/reservas/duration'
import type {
  PublicBookingProfessional,
  PublicBookingService,
} from '@/lib/booking/types'
import type { HorarioCentro } from '@/lib/centro/types'

const service: PublicBookingService = {
  id: 'service-1',
  nombre: 'Consulta',
  descripcion: null,
  duracionMinutos: 60,
  precio: null,
  moneda: 'CLP',
  modalidad: 'presencial',
}

const professional: PublicBookingProfessional = {
  id: 'pro-1',
  nombre: 'Profesional',
  especialidad: null,
  bio: null,
  avatarUrl: null,
  descansoEntreReservasMinutos: 0,
  duracionSesionMinutos: 60,
  intervaloReservasMinutos: 60,
}

const horarios: HorarioCentro[] = [
  {
    dia: 1,
    activo: true,
    inicio: '09:00',
    fin: '15:00',
    descanso_activo: false,
    descanso_inicio: '13:00',
    descanso_fin: '14:00',
  },
]

function localIso(hora: string) {
  return localDateTime('2030-01-07', hora).toISOString()
}

describe('public booking availability', () => {
  it('hides slots when the only room is already occupied', () => {
    const slots = getAvailableSlots({
      fecha: '2030-01-07',
      servicio: service,
      profesional: { ...professional, id: 'pro-2' },
      horarios,
      busySlots: [
        {
          profesionalId: 'pro-1',
          fechaInicio: localIso('10:00'),
          fechaFin: localIso('11:00'),
        },
      ],
      scheduleBlocks: [],
      activeRoomCount: 1,
    })

    expect(slots).not.toContain('10:00')
    expect(slots).toContain('11:00')
  })

  it('uses the professional start interval instead of a fixed 15-minute grid', () => {
    const slots = getAvailableSlots({
      fecha: '2030-01-07',
      servicio: service,
      profesional: professional,
      horarios,
      busySlots: [],
      scheduleBlocks: [],
      activeRoomCount: 2,
    })

    expect(slots.slice(0, 3)).toEqual(['09:00', '10:00', '11:00'])
    expect(slots).not.toContain('09:15')
  })

  it('uses professional interval only as start frequency', () => {
    const slots = getAvailableSlots({
      fecha: '2030-01-07',
      servicio: { ...service, duracionMinutos: 45 },
      profesional: {
        ...professional,
        duracionSesionMinutos: 90,
        intervaloReservasMinutos: 30,
      },
      horarios,
      busySlots: [],
      scheduleBlocks: [],
      activeRoomCount: 2,
    })

    expect(slots.slice(0, 3)).toEqual(['09:00', '09:30', '10:00'])
    expect(slots).not.toContain('14:15')
  })

  it.each([30, 45, 60, 90])(
    'calculates reservation end from a %i-minute service',
    (durationMinutes) => {
      const start = localDateTime('2030-01-07', '09:30')
      const end = calculateReservationEndTime(start, durationMinutes)

      expect((end.getTime() - start.getTime()) / 60_000).toBe(durationMinutes)
    }
  )

  it('does not let professional block duration override service duration', () => {
    expect(
      getEffectiveSessionDuration({
        servicio: { ...service, duracionMinutos: 45 },
        profesional: { ...professional, duracionSesionMinutos: 90 },
      })
    ).toBe(45)
  })

  it('applies professional buffers around existing reservations', () => {
    const slots = getAvailableSlots({
      fecha: '2030-01-07',
      servicio: { ...service, duracionMinutos: 30 },
      profesional: {
        ...professional,
        descansoEntreReservasMinutos: 15,
        duracionSesionMinutos: 30,
        intervaloReservasMinutos: 30,
      },
      horarios,
      busySlots: [
        {
          profesionalId: professional.id,
          fechaInicio: localIso('12:00'),
          fechaFin: localIso('13:00'),
        },
      ],
      scheduleBlocks: [],
      activeRoomCount: 2,
    })

    expect(slots).not.toContain('11:30')
    expect(slots).toContain('11:00')
  })

  it('applies center-wide schedule blocks without exposing block IDs', () => {
    const slots = getAvailableSlots({
      fecha: '2030-01-07',
      servicio: service,
      profesional: professional,
      horarios,
      busySlots: [],
      scheduleBlocks: [
        {
          profesionalId: null,
          fechaInicio: localIso('12:00'),
          fechaFin: localIso('13:00'),
        },
      ],
      activeRoomCount: 2,
    })

    expect(slots).not.toContain('12:00')
    expect(slots).toContain('09:00')
  })

  it('rejects overlaps using the full service duration', () => {
    const slots = getAvailableSlots({
      fecha: '2030-01-07',
      servicio: { ...service, duracionMinutos: 90 },
      profesional: {
        ...professional,
        duracionSesionMinutos: 30,
        intervaloReservasMinutos: 30,
      },
      horarios,
      busySlots: [
        {
          profesionalId: professional.id,
          fechaInicio: localIso('10:30'),
          fechaFin: localIso('11:00'),
        },
      ],
      scheduleBlocks: [],
      activeRoomCount: 2,
    })

    expect(slots).not.toContain('09:30')
    expect(slots).toContain('09:00')
    expect(slots).toContain('11:00')
  })
})
