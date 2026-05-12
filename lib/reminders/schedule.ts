import type { Database } from '@/lib/types/database'

type ReminderInsert = Database['public']['Tables']['recordatorios_reserva']['Insert']

export function buildReservationReminderRows({
  centroId,
  reservaId,
  pacienteId,
  fechaInicio,
}: {
  centroId: string
  reservaId: string
  pacienteId: string
  fechaInicio: string
}): ReminderInsert[] {
  const start = new Date(fechaInicio).getTime()

  return [
    {
      centro_id: centroId,
      reserva_id: reservaId,
      paciente_id: pacienteId,
      canal: 'email',
      tipo: 'recordatorio_48h',
      estado: 'pendiente',
      scheduled_for: new Date(start - 48 * 60 * 60_000).toISOString(),
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
      scheduled_for: new Date(start - 24 * 60 * 60_000).toISOString(),
      sent_at: null,
      error_message: null,
      provider: null,
      provider_message_id: null,
      processing_started_at: null,
    },
  ]
}
