import type { Database } from '@/lib/types/database'

export type SalaRow = Database['public']['Tables']['salas']['Row']

export type SalaListItem = Pick<
  SalaRow,
  'id' | 'nombre' | 'descripcion' | 'capacidad' | 'activa' | 'created_at' | 'updated_at'
>

export type SalaActionState =
  | {
      ok: true
      message: string
      sala?: SalaListItem
    }
  | {
      ok: false
      message: string
    }
