import type { Database } from '@/lib/types/database'

export type PacienteRow = Database['public']['Tables']['pacientes']['Row']

export type PacienteListItem = Pick<
  PacienteRow,
  | 'id'
  | 'nombre'
  | 'apellido'
  | 'rut'
  | 'email'
  | 'telefono'
  | 'fecha_nacimiento'
  | 'notas'
  | 'created_at'
  | 'updated_at'
>

export type PacienteActionState =
  | {
      ok: true
      message: string
      paciente?: PacienteListItem
    }
  | {
      ok: false
      message: string
    }
