import type { Database } from '@/lib/types/database'

export type ServicioRow = Database['public']['Tables']['servicios']['Row']

export type ServicioListItem = Pick<
  ServicioRow,
  | 'id'
  | 'nombre'
  | 'descripcion'
  | 'duracion_minutos'
  | 'precio'
  | 'activo'
  | 'created_at'
  | 'updated_at'
>

export type ServicioActionState =
  | {
      ok: true
      message: string
      servicio?: ServicioListItem
    }
  | {
      ok: false
      message: string
    }
