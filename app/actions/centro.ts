'use server'

import { revalidatePath } from 'next/cache'
import { isDemoMode } from '@/lib/auth/demo'
import {
  centroSchema,
  horariosCentroSchema,
  recordatoriosCentroSchema,
  type CentroFormValues,
  type HorariosCentroFormValues,
  type RecordatoriosCentroFormValues,
} from '@/lib/centro/validation'
import { defaultHorariosCentro } from '@/lib/centro/horarios'
import type {
  CentroActionState,
  CentroConfig,
  HorarioCentro,
  HorariosActionState,
  RecordatoriosActionState,
  RecordatoriosConfig,
} from '@/lib/centro/types'
import { getAdminCentroId } from '@/lib/supabase/get-centro-id'

const centroSelect =
  'id,nombre,slug,rut,direccion,telefono,email,logo_url,activo,created_at,updated_at'

function defaultRecordatoriosConfig(centroId: string): RecordatoriosConfig {
  const now = new Date().toISOString()

  return {
    id: 'recordatorios-default',
    centro_id: centroId,
    email_enabled: true,
    whatsapp_enabled: true,
    email_hours_before: 48,
    whatsapp_hours_before: 24,
    whatsapp_mode: 'mock',
    created_at: now,
    updated_at: now,
  }
}

function formatCentroPayload(values: CentroFormValues) {
  return {
    nombre: values.nombre.trim(),
    rut: values.rut?.trim() || null,
    direccion: values.direccion?.trim() || null,
    telefono: values.telefono?.trim() || null,
    email: values.email?.trim().toLowerCase() || null,
  }
}

function supabaseError(message?: string): string {
  const error = message?.toLowerCase() ?? ''

  if (error.includes('permission denied') || error.includes('row-level security')) {
    return 'No tienes permisos para actualizar la configuración del centro.'
  }

  if (error.includes('duplicate')) {
    return 'Ya existe un centro con esos datos.'
  }

  return 'No pudimos guardar la configuración del centro. Intenta nuevamente.'
}

export async function updateCentroAction(
  values: CentroFormValues
): Promise<CentroActionState> {
  const parsed = centroSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos del centro.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Centro actualizado en modo demo.' }
  }

  const { supabase, centroId, error } = await getAdminCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data, error: updateError } = await supabase
    .from('centros')
    .update(formatCentroPayload(parsed.data))
    .eq('id', centroId)
    .select(centroSelect)
    .single()

  if (updateError || !data) {
    return { ok: false, message: supabaseError(updateError?.message) }
  }

  revalidatePath('/centro')
  revalidatePath('/agenda')

  return {
    ok: true,
    message: 'Configuración del centro actualizada.',
    centro: data as CentroConfig,
  }
}

export async function getHorariosCentro(centroId: string): Promise<HorarioCentro[]> {
  const supabase = await (await import('@/lib/supabase/server')).createClient()

  const { data } = await supabase
    .from('horarios_centro')
    .select('dia,activo,inicio,fin,descanso_activo,descanso_inicio,descanso_fin')
    .eq('centro_id', centroId)
    .order('dia')

  if (!data || data.length === 0) return defaultHorariosCentro

  return data as HorarioCentro[]
}

export async function getRecordatoriosCentro(
  centroId: string
): Promise<RecordatoriosConfig> {
  const supabase = await (await import('@/lib/supabase/server')).createClient()

  const { data, error } = await supabase
    .from('configuracion_recordatorios')
    .select(
      'id,centro_id,email_enabled,whatsapp_enabled,email_hours_before,whatsapp_hours_before,whatsapp_mode,created_at,updated_at'
    )
    .eq('centro_id', centroId)
    .maybeSingle()

  if (error || !data) return defaultRecordatoriosConfig(centroId)

  return data as RecordatoriosConfig
}

export async function updateHorariosAction(
  values: HorariosCentroFormValues
): Promise<HorariosActionState> {
  const parsed = horariosCentroSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los horarios ingresados.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Horario operativo actualizado en modo demo.' }
  }

  const { supabase, centroId, error } = await getAdminCentroId('el horario operativo')

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const rows = parsed.data.horarios.map((h) => ({
    centro_id: centroId,
    dia: h.dia,
    activo: h.activo,
    inicio: h.inicio,
    fin: h.fin,
    descanso_activo: h.activo ? h.descanso_activo : false,
    descanso_inicio: h.descanso_inicio,
    descanso_fin: h.descanso_fin,
  }))

  const { error: upsertError } = await supabase
    .from('horarios_centro')
    .upsert(rows, { onConflict: 'centro_id,dia' })

  if (upsertError) {
    return { ok: false, message: 'No pudimos guardar el horario. Intenta nuevamente.' }
  }

  revalidatePath('/centro')
  revalidatePath('/agenda')
  revalidatePath('/reservas')

  return { ok: true, message: 'Horario operativo actualizado.' }
}

export async function updateRecordatoriosAction(
  values: RecordatoriosCentroFormValues
): Promise<RecordatoriosActionState> {
  const parsed = recordatoriosCentroSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa la configuración de recordatorios.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Recordatorios actualizados en modo demo.' }
  }

  const { supabase, centroId, error } = await getAdminCentroId('los recordatorios')

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data, error: upsertError } = await supabase
    .from('configuracion_recordatorios')
    .upsert(
      {
        centro_id: centroId,
        email_enabled: parsed.data.email_enabled,
        whatsapp_enabled: parsed.data.whatsapp_enabled,
        email_hours_before: 48,
        whatsapp_hours_before: 24,
        whatsapp_mode: 'mock',
      },
      { onConflict: 'centro_id' }
    )
    .select(
      'id,centro_id,email_enabled,whatsapp_enabled,email_hours_before,whatsapp_hours_before,whatsapp_mode,created_at,updated_at'
    )
    .single()

  if (upsertError || !data) {
    return {
      ok: false,
      message: 'No pudimos guardar la configuración de recordatorios.',
    }
  }

  revalidatePath('/centro')

  return {
    ok: true,
    message: 'Recordatorios actualizados.',
    recordatorios: data as RecordatoriosConfig,
  }
}
