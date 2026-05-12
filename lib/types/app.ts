import type { Database, RolCentro } from './database'

export type { RolCentro }

export type Centro = Database['public']['Tables']['centros']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type MiembroCentro = Database['public']['Tables']['miembros_centro']['Row']
export type Sala = Database['public']['Tables']['salas']['Row']
export type Servicio = Database['public']['Tables']['servicios']['Row']
export type Paciente = Database['public']['Tables']['pacientes']['Row']
export type Reserva = Database['public']['Tables']['reservas']['Row']
export type Pago = Database['public']['Tables']['pagos']['Row']
export type HorarioCentroRow = Database['public']['Tables']['horarios_centro']['Row']
export type ConfiguracionRecordatorios =
  Database['public']['Tables']['configuracion_recordatorios']['Row']
export type RecordatorioEnvio =
  Database['public']['Tables']['recordatorio_envios']['Row']

export type MiembroConProfile = MiembroCentro & {
  profile: Profile
}

export type ReservaCompleta = Reserva & {
  sala: Sala
  profesional: Profile
  paciente: Paciente
  servicio: Servicio
  pago: Pago | null
}
