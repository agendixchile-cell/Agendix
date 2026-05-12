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
}

export type ProfesionalQueryRow = Pick<
  MiembroCentroRow,
  'id' | 'profile_id' | 'rol' | 'activo' | 'created_at' | 'updated_at'
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
  admin: 'Admin',
  profesional: 'Profesional',
  recepcion: 'Recepción',
}
