import type { HorarioCentro } from '@/lib/centro/types'

export type BookingModality = 'presencial' | 'online' | 'ambas'
export type PublicPaymentMethod = 'presencial' | 'online'
export type PublicPaymentStatus =
  | 'not_required'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'

export type PublicBookingCenter = {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  logoUrl: string | null
}

export type PublicBookingService = {
  id: string
  nombre: string
  descripcion: string | null
  duracionMinutos: number
  precio: number | null
  moneda: string
  modalidad: BookingModality
}

export type PublicBookingProfessional = {
  id: string
  nombre: string
  especialidad: string | null
  bio: string | null
  avatarUrl: string | null
  descansoEntreReservasMinutos: number
  duracionSesionMinutos: number
  intervaloReservasMinutos: number
}

export type PublicBusySlot = {
  profesionalId: string
  fechaInicio: string
  fechaFin: string
}

export type PublicScheduleBlock = {
  profesionalId: string | null
  fechaInicio: string
  fechaFin: string
}

export type PublicBookingData = {
  centro: PublicBookingCenter
  servicios: PublicBookingService[]
  profesionales: PublicBookingProfessional[]
  horarios: HorarioCentro[]
  busySlots: PublicBusySlot[]
  scheduleBlocks: PublicScheduleBlock[]
  activeRoomCount: number
  demoMode: boolean
  demoPlanId?: string
}

export type PublicBookingResult = {
  ok: true
  reserva_id: string
  payment_status: PublicPaymentStatus
}
