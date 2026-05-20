import type { Database, RolCentro } from '@/lib/types/database'

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type MiembroCentroRow = Database['public']['Tables']['miembros_centro']['Row']

export type ProfesionalListItem = Pick<
  MiembroCentroRow,
  'id' | 'profile_id' | 'rol' | 'activo' | 'created_at' | 'updated_at'
> & {
  nombre: string
  apellido: string | null
  email: string
  telefono: string | null
  especialidad: string | null
  recordatorio_email_subject: string | null
  recordatorio_email_body: string | null
  descanso_entre_reservas_minutos: number
  duracion_sesion_minutos: number
  intervalo_reservas_minutos: number
}

export type ProfesionalQueryRow = Pick<
  MiembroCentroRow,
  | 'id'
  | 'profile_id'
  | 'rol'
  | 'especialidad'
  | 'descanso_entre_reservas_minutos'
  | 'duracion_sesion_minutos'
  | 'intervalo_reservas_minutos'
  | 'activo'
  | 'created_at'
  | 'updated_at'
> & {
  profiles:
    | Pick<ProfileRow, 'nombre' | 'apellido' | 'email' | 'telefono'>
    | null
}

export type ProfesionalActionState =
  | {
      ok: true
      message: string
      profesional?: ProfesionalListItem
    }
  | {
      ok: false
      message: string
    }

export const profesionalRoleLabels: Record<RolCentro, string> = {
  owner: 'Owner',
  admin: 'Admin',
  profesional: 'Profesional',
  recepcion: 'Recepción',
}
