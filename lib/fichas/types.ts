import type { Database } from '@/lib/types/database'

export type FichaClinicaRow = Database['public']['Tables']['fichas_clinicas']['Row']
export type EvolucionSesionRow =
  Database['public']['Tables']['evoluciones_sesion']['Row']

export type FichaClinicaListItem = Pick<
  FichaClinicaRow,
  | 'id'
  | 'centro_id'
  | 'paciente_id'
  | 'antecedentes_relevantes'
  | 'motivo_consulta'
  | 'diagnostico_hipotesis'
  | 'notas_clinicas'
  | 'documentos'
  | 'created_at'
  | 'updated_at'
>

export type EvolucionSesionListItem = Pick<
  EvolucionSesionRow,
  | 'id'
  | 'paciente_id'
  | 'reserva_id'
  | 'profesional_id'
  | 'centro_id'
  | 'fecha'
  | 'texto_evolucion'
  | 'proximos_pasos'
  | 'observaciones_privadas'
  | 'created_at'
  | 'updated_at'
>

export type FichaActionState =
  | {
      ok: true
      message: string
      ficha?: FichaClinicaListItem
    }
  | {
      ok: false
      message: string
    }

export type EvolucionActionState =
  | {
      ok: true
      message: string
      evolucion?: EvolucionSesionListItem
    }
  | {
      ok: false
      message: string
    }
