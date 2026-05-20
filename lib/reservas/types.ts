import type { Database, EstadoAsistencia, EstadoReserva } from '@/lib/types/database'

export type ReservaRow = Database['public']['Tables']['reservas']['Row']
export type PacienteRow = Database['public']['Tables']['pacientes']['Row']

export type ReservaServicioOption = {
  id: string
  nombre: string
  duracion_minutos: number
  precio: number | null
}

export type ReservaSalaOption = {
  id: string
  nombre: string
}

export type ReservaProfesionalOption = {
  id: string
  nombre: string
  email: string
  avatar_url?: string | null
  descanso_entre_reservas_minutos?: number
  duracion_sesion_minutos?: number
  intervalo_reservas_minutos?: number
}

export type ReservaPacienteOption = {
  id: string
  nombre: string
  apellido: string | null
  email: string | null
  telefono: string | null
}

export type AgendaBlockScope = 'centro' | 'profesional'

export type ReservaListItem = Pick<
  ReservaRow,
  | 'id'
  | 'fecha_inicio'
  | 'fecha_fin'
  | 'estado'
  | 'estado_asistencia'
  | 'notas'
  | 'meeting_provider'
  | 'meeting_url'
  | 'auto_generated_meeting'
  | 'created_at'
  | 'updated_at'
> & {
  servicio: ReservaServicioOption
  sala: ReservaSalaOption
  profesional: ReservaProfesionalOption
  paciente: ReservaPacienteOption
}

export type ReservaQueryRow = Pick<
  ReservaRow,
  | 'id'
  | 'fecha_inicio'
  | 'fecha_fin'
  | 'estado'
  | 'estado_asistencia'
  | 'notas'
  | 'meeting_provider'
  | 'meeting_url'
  | 'auto_generated_meeting'
  | 'created_at'
  | 'updated_at'
> & {
  servicios:
    | Pick<
        Database['public']['Tables']['servicios']['Row'],
        'id' | 'nombre' | 'duracion_minutos' | 'precio'
      >
    | null
  salas:
    | Pick<Database['public']['Tables']['salas']['Row'], 'id' | 'nombre'>
    | null
  profiles:
    | Pick<
        Database['public']['Tables']['profiles']['Row'],
        'id' | 'nombre' | 'email' | 'avatar_url'
      >
    | null
  pacientes:
    | Pick<
        Database['public']['Tables']['pacientes']['Row'],
        'id' | 'nombre' | 'apellido' | 'email' | 'telefono'
      >
    | null
}

export type AgendaBlockRow = Database['public']['Tables']['bloqueos_agenda']['Row']

export type AgendaBlockListItem = Pick<
  AgendaBlockRow,
  | 'id'
  | 'centro_id'
  | 'profesional_id'
  | 'fecha_inicio'
  | 'fecha_fin'
  | 'motivo'
  | 'created_at'
  | 'updated_at'
> & {
  profesional: ReservaProfesionalOption | null
}

export type AgendaBlockQueryRow = Pick<
  AgendaBlockRow,
  | 'id'
  | 'centro_id'
  | 'profesional_id'
  | 'fecha_inicio'
  | 'fecha_fin'
  | 'motivo'
  | 'created_at'
  | 'updated_at'
> & {
  profiles:
    | Pick<
        Database['public']['Tables']['profiles']['Row'],
        'id' | 'nombre' | 'email' | 'avatar_url'
      >
    | null
}

export type ReservaActionState =
  | {
      ok: true
      message: string
      reserva?: ReservaListItem
      paciente?: ReservaPacienteOption
    }
  | {
      ok: false
      message: string
    }

export type AgendaBlockActionState =
  | {
      ok: true
      message: string
      bloqueo?: AgendaBlockListItem
      deletedId?: string
    }
  | {
      ok: false
      message: string
    }

export const reservaEstadoLabels: Record<EstadoReserva, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

export const reservaEstadoDescriptions: Record<EstadoReserva, string> = {
  pending:
    'Reserva creada, pero aún no confirmada por el paciente. Puede haberse generado desde la agenda del profesional o desde una solicitud de reserva.',
  confirmed:
    'El paciente confirmó su asistencia o la reserva fue aceptada automáticamente según el flujo configurado.',
  completed:
    'La atención ya fue realizada. Úsala para marcar una sesión efectivamente atendida.',
  cancelled: 'La reserva fue anulada por el paciente o por el profesional.',
  no_show: 'El paciente no se presentó a la sesión agendada.',
}

export const reservaEstados: EstadoReserva[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]

export const asistenciaLabels: Record<EstadoAsistencia, string> = {
  sin_marcar: 'Sin marcar',
  asistio: 'Asistió',
  no_asistio: 'No asistió',
}

export const asistenciaEstados: EstadoAsistencia[] = [
  'sin_marcar',
  'asistio',
  'no_asistio',
]
