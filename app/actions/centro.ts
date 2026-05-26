'use server'

import { revalidatePath } from 'next/cache'
import { isDemoMode } from '@/lib/auth/demo'
import { revalidateCentroPublicPaths } from '@/lib/centro/public-revalidation'
import {
  CENTER_LOGOS_BUCKET,
  normalizePublicImageUrl,
  storagePathFromPublicUrl,
} from '@/lib/images/config'
import {
  centroSchema,
  horariosCentroSchema,
  mercadoPagoSettingsSchema,
  recordatoriosCentroSchema,
  type CentroFormValues,
  type HorariosCentroFormValues,
  type MercadoPagoSettingsFormValues,
  type RecordatoriosCentroFormValues,
} from '@/lib/centro/validation'
import { defaultHorariosCentro } from '@/lib/centro/horarios'
import type {
  CentroActionState,
  CentroConfig,
  HorarioCentro,
  HorariosActionState,
  MercadoPagoSettingsActionState,
  MercadoPagoSettingsStatus,
  RecordatoriosActionState,
  RecordatoriosConfig,
} from '@/lib/centro/types'
import { getAdminCentroId } from '@/lib/supabase/get-centro-id'
import { DEFAULT_EMAIL_REMINDER_HOURS_BEFORE } from '@/lib/reminders/schedule'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMercadoPagoStatusForOrganization } from '@/lib/payments/provider-settings'

const centroSelect =
  'id,nombre,slug,rut,direccion,telefono,email,logo_url,activo,created_at,updated_at'
const defaultEmailSubjectTemplate = 'Recordatorio de tu hora en {{centro_nombre}}'
const defaultEmailBodyTemplate =
  'Hola {{paciente_nombre}}, te recordamos que tienes una hora agendada en {{centro_nombre}}.\n\nServicio: {{servicio_nombre}}\nProfesional: {{profesional_nombre}}\nFecha y hora: {{fecha_hora}}\n\nConfirma tu asistencia desde el boton del correo. Si necesitas cambiar tu hora, contacta directamente al centro.'
const recordatoriosSelect =
  'id,centro_id,email_enabled,whatsapp_enabled,email_hours_before,whatsapp_hours_before,whatsapp_mode,email_subject_template,email_body_template,created_at,updated_at'

const missingMercadoPagoSettings: MercadoPagoSettingsStatus = {
  configured: false,
  source: 'missing',
  public_key: null,
  account_label: null,
  updated_at: null,
}

function defaultRecordatoriosConfig(centroId: string): RecordatoriosConfig {
  const now = new Date().toISOString()

  return {
    id: 'recordatorios-default',
    centro_id: centroId,
    email_enabled: true,
    whatsapp_enabled: false,
    email_hours_before: DEFAULT_EMAIL_REMINDER_HOURS_BEFORE,
    whatsapp_hours_before: 24,
    whatsapp_mode: 'mock',
    email_subject_template: defaultEmailSubjectTemplate,
    email_body_template: defaultEmailBodyTemplate,
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

type CentroPayload = ReturnType<typeof formatCentroPayload> & {
  logo_url?: string | null
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
  values: CentroFormValues,
  logoUrl?: string | null
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

  const normalizedLogoUrl = normalizePublicImageUrl(logoUrl)
  let previousLogoUrl: string | null = null

  if (normalizedLogoUrl !== undefined) {
    const { data: currentCentro, error: currentCentroError } = await supabase
      .from('centros')
      .select('logo_url')
      .eq('id', centroId)
      .maybeSingle()

    if (currentCentroError) {
      return { ok: false, message: supabaseError(currentCentroError.message) }
    }

    previousLogoUrl = currentCentro?.logo_url ?? null
  }

  const payload: CentroPayload = formatCentroPayload(parsed.data)

  if (normalizedLogoUrl !== undefined) {
    payload.logo_url = normalizedLogoUrl
  }

  const { data, error: updateError } = await supabase
    .from('centros')
    .update(payload)
    .eq('id', centroId)
    .select(centroSelect)
    .single()

  if (updateError || !data) {
    return { ok: false, message: supabaseError(updateError?.message) }
  }

  if (normalizedLogoUrl !== undefined && previousLogoUrl !== normalizedLogoUrl) {
    const previousPath = storagePathFromPublicUrl(previousLogoUrl, CENTER_LOGOS_BUCKET)

    if (previousPath) {
      await supabase.storage
        .from(CENTER_LOGOS_BUCKET)
        .remove([previousPath])
        .catch(() => null)
    }
  }

  revalidatePath('/centro')
  revalidatePath('/agenda')
  await revalidateCentroPublicPaths(supabase, centroId)

  return {
    ok: true,
    message: 'Configuración del centro actualizada.',
    centro: data as CentroConfig,
  }
}

export async function getMercadoPagoSettings(
  centroId: string
): Promise<MercadoPagoSettingsStatus> {
  const adminSupabase = createAdminClient()

  if (!adminSupabase) return missingMercadoPagoSettings

  const settings = await getMercadoPagoStatusForOrganization(
    adminSupabase,
    centroId
  )

  return {
    configured: settings.configured,
    source: settings.source,
    public_key: settings.publicKey,
    account_label: settings.accountLabel,
    updated_at: settings.updatedAt,
  }
}

export async function updateMercadoPagoSettingsAction(
  values: MercadoPagoSettingsFormValues
): Promise<MercadoPagoSettingsActionState> {
  const parsed = mercadoPagoSettingsSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa las credenciales de Mercado Pago.' }
  }

  if (isDemoMode()) {
    return {
      ok: true,
      message: 'Mercado Pago actualizado en modo demo.',
      settings: {
        configured: true,
        source: 'organization',
        public_key: parsed.data.public_key.trim(),
        account_label: parsed.data.account_label?.trim() || null,
        updated_at: new Date().toISOString(),
      },
    }
  }

  const { supabase, centroId, error } = await getAdminCentroId(
    'Mercado Pago del centro'
  )

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const adminSupabase = createAdminClient()

  if (!adminSupabase || !user) {
    return { ok: false, message: 'No pudimos guardar Mercado Pago del centro.' }
  }

  const payload = {
    organization_id: centroId,
    provider: 'mercado_pago',
    status: 'active',
    public_key: parsed.data.public_key.trim(),
    access_token: parsed.data.access_token.trim(),
    account_label: parsed.data.account_label?.trim() || null,
    updated_by: user.id,
    created_by: user.id,
  }

  const { error: upsertError } = await adminSupabase
    .from('organization_payment_provider_settings')
    .upsert(payload, { onConflict: 'organization_id,provider' })

  if (upsertError) {
    return {
      ok: false,
      message: 'No pudimos guardar las credenciales de Mercado Pago.',
    }
  }

  const settings = await getMercadoPagoSettings(centroId)

  revalidatePath('/centro')
  revalidatePath('/pagos')

  return {
    ok: true,
    message: 'Mercado Pago del centro quedó configurado.',
    settings,
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
    .select(recordatoriosSelect)
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
        email_hours_before: parsed.data.email_hours_before,
        whatsapp_hours_before: 24,
        whatsapp_mode: parsed.data.whatsapp_enabled ? 'live' : 'mock',
        email_subject_template: parsed.data.email_subject_template.trim(),
        email_body_template: parsed.data.email_body_template.trim(),
      },
      { onConflict: 'centro_id' }
    )
    .select(recordatoriosSelect)
    .single()

  if (upsertError || !data) {
    return {
      ok: false,
      message: 'No pudimos guardar la configuración de recordatorios.',
    }
  }

  await supabase.rpc('reschedule_email_reminders_for_centro', {
    target_centro_id: centroId,
  })

  revalidatePath('/centro')
  revalidatePath('/agenda')
  revalidatePath('/reservas')

  return {
    ok: true,
    message: 'Recordatorios actualizados.',
    recordatorios: data as RecordatoriosConfig,
  }
}
