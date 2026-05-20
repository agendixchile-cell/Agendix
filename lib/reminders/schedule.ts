import type { Database } from '@/lib/types/database'

type ReminderInsert = Database['public']['Tables']['recordatorios_reserva']['Insert']

export const DEFAULT_EMAIL_REMINDER_HOURS_BEFORE = 24
export const DEFAULT_WHATSAPP_REMINDER_HOURS_BEFORE = 24
export const MAX_REMINDER_HOURS_BEFORE = 168

export function normalizeReminderHours(
  value: number | null | undefined,
  fallback: number
) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback

  return Math.min(MAX_REMINDER_HOURS_BEFORE, Math.max(1, Math.round(value)))
}

export function buildReservationReminderRows({
  centroId,
  reservaId,
  pacienteId,
  fechaInicio,
  emailHoursBefore = DEFAULT_EMAIL_REMINDER_HOURS_BEFORE,
  whatsappHoursBefore = DEFAULT_WHATSAPP_REMINDER_HOURS_BEFORE,
}: {
  centroId: string
  reservaId: string
  pacienteId: string
  fechaInicio: string
  emailHoursBefore?: number | null
  whatsappHoursBefore?: number | null
}): ReminderInsert[] {
  const start = new Date(fechaInicio).getTime()
  const emailHours = normalizeReminderHours(
    emailHoursBefore,
    DEFAULT_EMAIL_REMINDER_HOURS_BEFORE
  )
  const whatsappHours = normalizeReminderHours(
    whatsappHoursBefore,
    DEFAULT_WHATSAPP_REMINDER_HOURS_BEFORE
  )

  return [
    {
      centro_id: centroId,
      reserva_id: reservaId,
      paciente_id: pacienteId,
      canal: 'email',
      tipo: 'recordatorio_48h',
      estado: 'pendiente',
      scheduled_for: new Date(start - emailHours * 60 * 60_000).toISOString(),
      sent_at: null,
      error_message: null,
      provider: null,
      provider_message_id: null,
      processing_started_at: null,
    },
    {
      centro_id: centroId,
      reserva_id: reservaId,
      paciente_id: pacienteId,
      canal: 'whatsapp',
      tipo: 'recordatorio_24h',
      estado: 'pendiente',
      scheduled_for: new Date(start - whatsappHours * 60 * 60_000).toISOString(),
      sent_at: null,
      error_message: null,
      provider: null,
      provider_message_id: null,
      processing_started_at: null,
    },
  ]
}
