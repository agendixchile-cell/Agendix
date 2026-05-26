import type { Database, RolCentro } from '@/lib/types/database'

export type CentroRow = Database['public']['Tables']['centros']['Row']

export type CentroConfig = Pick<
  CentroRow,
  | 'id'
  | 'nombre'
  | 'slug'
  | 'rut'
  | 'direccion'
  | 'telefono'
  | 'email'
  | 'logo_url'
  | 'activo'
  | 'created_at'
  | 'updated_at'
>

export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type HorarioCentro = {
  dia: DiaSemana
  activo: boolean
  inicio: string
  fin: string
  descanso_activo: boolean
  descanso_inicio: string
  descanso_fin: string
}

export type RecordatoriosConfig =
  Database['public']['Tables']['configuracion_recordatorios']['Row']

export type MercadoPagoSettingsStatus = {
  configured: boolean
  source: 'organization' | 'environment' | 'missing'
  public_key: string | null
  account_label: string | null
  updated_at: string | null
}

export type CentroActionState =
  | {
      ok: true
      message: string
      centro?: CentroConfig
    }
  | {
      ok: false
      message: string
    }

export type HorariosActionState =
  | { ok: true; message: string }
  | { ok: false; message: string }

export type RecordatoriosActionState =
  | { ok: true; message: string; recordatorios?: RecordatoriosConfig }
  | { ok: false; message: string }

export type MercadoPagoSettingsActionState =
  | { ok: true; message: string; settings: MercadoPagoSettingsStatus }
  | { ok: false; message: string }

export type CentroMembership = {
  centro: CentroConfig
  rol: RolCentro
}
