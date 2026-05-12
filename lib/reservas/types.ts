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
}

export type ReservaPacienteOption = {
  id: string
  nombre: string
  apellido: string | null
  email: string | null
  telefono: string | null
}

export type ReservaListItem = Pick<
  ReservaRow,
  | 'id'
  | 'fecha_inicio'
  | 'fecha_fin'
  | 'estado'
  | 'estado_asistencia'
  | 'notas'
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
    | Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'nombre' | 'email'>
    | null
  pacientes:
    | Pick<
        Database['public']['Tables']['pacientes']['Row'],
        'id' | 'nombre' | 'apellido' | 'email' | 'telefono'
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

export const reservaEstadoLabels: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  completada: 'Completada',
  reagendada: 'Reagendada',
}

export const reservaEstados: EstadoReserva[] = [
  'pendiente',
  'confirmada',
  'cancelada',
  'completada',
  'reagendada',
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
