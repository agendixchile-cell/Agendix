'use server'

import { revalidatePath } from 'next/cache'
import { isDemoMode } from '@/lib/auth/demo'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  EstadoAsistencia,
  EstadoReserva,
} from '@/lib/types/database'
import {
  reservaSchema,
  type ReservaFormValues,
} from '@/lib/reservas/validation'
import type {
  ReservaActionState,
  ReservaListItem,
  ReservaPacienteOption,
  ReservaQueryRow,
} from '@/lib/reservas/types'
import {
  buildReservationReminderRows,
  DEFAULT_EMAIL_REMINDER_HOURS_BEFORE,
  DEFAULT_WHATSAPP_REMINDER_HOURS_BEFORE,
  normalizeReminderHours,
} from '@/lib/reminders/schedule'
import {
  defaultEmailBodyTemplate,
  defaultEmailSubjectTemplate,
  sendEmailReminder,
  type EmailDeliveryResult,
  type EmailReminderPayload,
} from '@/lib/reminders/email'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getCentroId } from '@/lib/supabase/get-centro-id'
import { toMeetingPayload } from '@/lib/meetings'
import { hasFeature } from '@/lib/plans'
import {
  getPlanSnapshotForCentro,
  validateActivePatientCapacity,
} from '@/lib/subscription/server'
import { revalidateCentroPublicPaths } from '@/lib/centro/public-revalidation'
import { zonedDateTime } from '@/lib/timezone'
import { getAppBaseUrl } from '@/lib/urls'

const reservaSelect = `
  id,
  fecha_inicio,
  fecha_fin,
  estado,
  estado_asistencia,
  notas,
  meeting_provider,
  meeting_url,
  auto_generated_meeting,
  created_at,
  updated_at,
  servicios!inner(id,nombre,duracion_minutos,precio),
  salas!inner(id,nombre),
  profiles!reservas_profesional_id_fkey(id,nombre,email,avatar_url),
  pacientes!inner(id,nombre,apellido,email,telefono)
`

function toReservaListItem(row: ReservaQueryRow): ReservaListItem {
  return {
    id: row.id,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    estado: row.estado,
    estado_asistencia: row.estado_asistencia ?? 'sin_marcar',
    notas: row.notas,
    meeting_provider: row.meeting_provider,
    meeting_url: row.meeting_url,
    auto_generated_meeting: row.auto_generated_meeting,
    created_at: row.created_at,
    updated_at: row.updated_at,
    servicio: {
      id: row.servicios?.id ?? '',
      nombre: row.servicios?.nombre ?? 'Servicio sin nombre',
      duracion_minutos: row.servicios?.duracion_minutos ?? 0,
      precio: row.servicios?.precio ?? null,
    },
    sala: {
      id: row.salas?.id ?? '',
      nombre: row.salas?.nombre ?? 'Sala sin nombre',
    },
    profesional: {
      id: row.profiles?.id ?? '',
      nombre: row.profiles?.nombre ?? 'Profesional sin nombre',
      email: row.profiles?.email ?? '',
      avatar_url: row.profiles?.avatar_url ?? null,
    },
    paciente: {
      id: row.pacientes?.id ?? '',
      nombre: row.pacientes?.nombre ?? 'Paciente sin nombre',
      apellido: row.pacientes?.apellido ?? null,
      email: row.pacientes?.email ?? null,
      telefono: row.pacientes?.telefono ?? null,
    },
  }
}

function supabaseError(message?: string): string {
  const error = message?.toLowerCase() ?? ''

  if (error.includes('permission denied') || error.includes('row-level security')) {
    return 'No tienes permisos para administrar reservas en este centro.'
  }

  if (error.includes('duplicate')) {
    return 'Ya existe una reserva con esos datos.'
  }

  if (error.includes('plan_active_patient_limit_exceeded')) {
    return 'Alcanzaste el máximo de 50 pacientes activos de tu plan. Mejora tu plan para seguir creciendo.'
  }

  if (error.includes('foreign key')) {
    return 'No pudimos conectar la reserva con sus datos asociados.'
  }

  return 'No pudimos guardar la reserva. Intenta nuevamente.'
}

function buildDateRange(values: ReservaFormValues, durationMinutes: number) {
  const start = zonedDateTime(values.fecha, values.hora)

  if (Number.isNaN(start.getTime())) {
    return { error: 'Selecciona una fecha y hora válidas.' }
  }

  const end = new Date(start.getTime() + durationMinutes * 60_000)

  return {
    fechaInicio: start.toISOString(),
    fechaFin: end.toISOString(),
  }
}

function asistenciaForReservaStatus(estado: EstadoReserva): EstadoAsistencia {
  if (estado === 'completed') return 'asistio'
  if (estado === 'no_show') return 'no_asistio'

  return 'sin_marcar'
}

async function upsertReminderSkeletons(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  reservaId: string,
  pacienteId: string,
  fechaInicio: string
) {
  const { data: config } = await supabase
    .from('configuracion_recordatorios')
    .select('email_hours_before,whatsapp_hours_before')
    .eq('centro_id', centroId)
    .maybeSingle()

  await supabase
    .from('recordatorios_reserva')
    .upsert(
      buildReservationReminderRows({
        centroId,
        reservaId,
        pacienteId,
        fechaInicio,
        emailHoursBefore: normalizeReminderHours(
          config?.email_hours_before,
          DEFAULT_EMAIL_REMINDER_HOURS_BEFORE
        ),
        whatsappHoursBefore: normalizeReminderHours(
          config?.whatsapp_hours_before,
          DEFAULT_WHATSAPP_REMINDER_HOURS_BEFORE
        ),
      }),
      {
        onConflict: 'reserva_id,canal,tipo',
      }
    )
}

async function resolvePaciente(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  values: ReservaFormValues
) {
  if (values.paciente_id) {
    const email = values.paciente_email?.trim().toLowerCase() || null
    const telefono = values.paciente_telefono?.trim() || null
    const { data: existing, error: lookupError } = await supabase
      .from('pacientes')
      .select('id,nombre,apellido,email,telefono')
      .eq('id', values.paciente_id)
      .eq('centro_id', centroId)
      .maybeSingle()

    if (lookupError) {
      return { error: supabaseError(lookupError.message) }
    }

    if (!existing) {
      return { error: 'No encontramos el paciente seleccionado.' }
    }

    if (existing.email === email && existing.telefono === telefono) {
      return { paciente: existing as ReservaPacienteOption }
    }

    const { data, error } = await supabase
      .from('pacientes')
      .update({ email, telefono })
      .eq('id', values.paciente_id)
      .eq('centro_id', centroId)
      .select('id,nombre,apellido,email,telefono')
      .single()

    if (error || !data) {
      return { error: supabaseError(error?.message) }
    }

    return { paciente: data as ReservaPacienteOption }
  }

  const capacity = await validateActivePatientCapacity(supabase, centroId)

  if (!capacity.ok) {
    return { error: capacity.message }
  }

  const { data, error } = await supabase
    .from('pacientes')
    .insert({
      centro_id: centroId,
      nombre: values.paciente_nombre?.trim() ?? '',
      apellido: null,
      rut: null,
      email: values.paciente_email?.trim() || null,
      telefono: values.paciente_telefono?.trim() || null,
      fecha_nacimiento: null,
      notas: null,
      activo: true,
    })
    .select('id,nombre,apellido,email,telefono')
    .single()

  if (error || !data) {
    return { error: supabaseError(error?.message) }
  }

  return { paciente: data as ReservaPacienteOption }
}

async function resolveReservaRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  values: ReservaFormValues
) {
  const { data: servicio, error: servicioError } = await supabase
    .from('servicios')
    .select('id,duracion_minutos')
    .eq('id', values.servicio_id)
    .eq('centro_id', centroId)
    .eq('activo', true)
    .maybeSingle()

  if (servicioError) {
    return { error: supabaseError(servicioError.message) }
  }

  if (!servicio) {
    return { error: 'Selecciona un servicio activo de tu centro.' }
  }

  const { data: sala, error: salaError } = await supabase
    .from('salas')
    .select('id')
    .eq('id', values.sala_id)
    .eq('centro_id', centroId)
    .eq('activa', true)
    .maybeSingle()

  if (salaError) {
    return { error: supabaseError(salaError.message) }
  }

  if (!sala) {
    return { error: 'Selecciona una sala activa de tu centro.' }
  }

  const { data: profesional, error: profesionalError } = await supabase
    .from('miembros_centro')
    .select('profile_id,duracion_sesion_minutos')
    .eq('profile_id', values.profesional_id)
    .eq('centro_id', centroId)
    .eq('activo', true)
    .in('rol', ['owner', 'admin', 'profesional'])
    .maybeSingle()

  if (profesionalError) {
    return { error: supabaseError(profesionalError.message) }
  }

  if (!profesional) {
    return { error: 'Selecciona un profesional activo de tu centro.' }
  }

  return {
    durationMinutes:
      profesional.duracion_sesion_minutos ?? servicio.duracion_minutos,
  }
}

async function resolveMeetingPayloadForPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  values: ReservaFormValues
) {
  const payload = toMeetingPayload(values.meeting_url)

  if (!payload.meeting_url) return { payload }

  const snapshot = await getPlanSnapshotForCentro(supabase, centroId)

  if (!hasFeature(snapshot.planId, 'meeting_links')) {
    return {
      error:
        'Los enlaces de Zoom o Google Meet están disponibles desde Agendix Center Pro.',
    }
  }

  return { payload }
}

async function updateReservaMeetingPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  reservaId: string,
  values: ReservaFormValues
) {
  const { payload, error } = await resolveMeetingPayloadForPlan(
    supabase,
    centroId,
    values
  )

  if (error || !payload) {
    return { error }
  }

  const { error: updateError } = await supabase
    .from('reservas')
    .update(payload)
    .eq('id', reservaId)
    .eq('centro_id', centroId)

  if (updateError) {
    return { error: supabaseError(updateError.message) }
  }

  return {}
}

async function fetchReservaById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  reservaId: string
) {
  const { data, error } = await supabase
    .from('reservas')
    .select(reservaSelect)
    .eq('id', reservaId)
    .eq('centro_id', centroId)
    .single()

  if (error || !data) {
    return { error: supabaseError(error?.message) }
  }

  return {
    reserva: toReservaListItem(data as unknown as ReservaQueryRow),
  }
}

async function revalidateReservaPaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string
) {
  revalidatePath('/agenda')
  revalidatePath('/reservas')
  await revalidateCentroPublicPaths(supabase, centroId)
}

type ReminderClient = SupabaseClient<Database>

type ManualEmailReservaRow = {
  id: string
  centro_id: string
  paciente_id: string
  profesional_id: string
  fecha_inicio: string
  fecha_fin: string
  estado: EstadoReserva
  centros:
    | {
        nombre: string
        email: string | null
        telefono: string | null
      }
    | {
        nombre: string
        email: string | null
        telefono: string | null
      }[]
    | null
  pacientes:
    | {
        nombre: string
        apellido: string | null
        email: string | null
        telefono: string | null
      }
    | {
        nombre: string
        apellido: string | null
        email: string | null
        telefono: string | null
      }[]
    | null
  servicios:
    | {
        nombre: string
      }
    | {
        nombre: string
      }[]
    | null
  profiles:
    | {
        nombre: string | null
      }
    | {
        nombre: string | null
      }[]
    | null
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null

  return value ?? null
}

async function ensureEmailReminderRow({
  supabase,
  reserva,
  emailHoursBefore,
}: {
  supabase: ReminderClient
  reserva: ManualEmailReservaRow
  emailHoursBefore: number
}) {
  const now = new Date().toISOString()
  const scheduledFor = new Date(
    new Date(reserva.fecha_inicio).getTime() - emailHoursBefore * 60 * 60_000
  ).toISOString()

  const { data: existing, error: lookupError } = await supabase
    .from('recordatorios_reserva')
    .select('id,attempt_count')
    .eq('reserva_id', reserva.id)
    .eq('canal', 'email')
    .eq('tipo', 'recordatorio_48h')
    .maybeSingle()

  if (lookupError) {
    return { error: 'No pudimos preparar el registro del recordatorio.' }
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('recordatorios_reserva')
      .update({
        centro_id: reserva.centro_id,
        paciente_id: reserva.paciente_id,
        estado: 'procesando',
        scheduled_for: scheduledFor,
        sent_at: null,
        error_message: null,
        provider: null,
        provider_message_id: null,
        processing_started_at: now,
        last_attempt_at: now,
        attempt_count: (existing.attempt_count ?? 0) + 1,
      })
      .eq('id', existing.id)

    if (updateError) {
      return { error: 'No pudimos activar el recordatorio para envío manual.' }
    }

    return { recordatorioId: existing.id }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('recordatorios_reserva')
    .insert({
      centro_id: reserva.centro_id,
      reserva_id: reserva.id,
      paciente_id: reserva.paciente_id,
      canal: 'email',
      tipo: 'recordatorio_48h',
      estado: 'procesando',
      scheduled_for: scheduledFor,
      sent_at: null,
      error_message: null,
      provider: null,
      provider_message_id: null,
      processing_started_at: now,
      last_attempt_at: now,
      attempt_count: 1,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return { error: 'No pudimos crear el recordatorio para envío manual.' }
  }

  return { recordatorioId: inserted.id }
}

async function buildManualEmailReminder(
  supabase: ReminderClient,
  centroId: string,
  reservaId: string
) {
  const { data, error } = await supabase
    .from('reservas')
    .select(
      `
        id,
        centro_id,
        paciente_id,
        profesional_id,
        fecha_inicio,
        fecha_fin,
        estado,
        centros!inner(nombre,email,telefono),
        pacientes!inner(nombre,apellido,email,telefono),
        servicios!inner(nombre),
        profiles!reservas_profesional_id_fkey(nombre)
      `
    )
    .eq('id', reservaId)
    .eq('centro_id', centroId)
    .maybeSingle()

  if (error) {
    return { error: 'No pudimos cargar los datos de la reserva.' }
  }

  if (!data) {
    return { error: 'No encontramos la reserva seleccionada.' }
  }

  const reserva = data as unknown as ManualEmailReservaRow

  if (reserva.estado === 'cancelled') {
    return { error: 'No se envían recordatorios de reservas canceladas.' }
  }

  if (new Date(reserva.fecha_inicio).getTime() <= Date.now()) {
    return { error: 'No se envían recordatorios de reservas vencidas.' }
  }

  const paciente = firstRelation(reserva.pacientes)
  const centro = firstRelation(reserva.centros)
  const servicio = firstRelation(reserva.servicios)
  const profesional = firstRelation(reserva.profiles)

  if (!paciente || !centro || !servicio) {
    return { error: 'La reserva no tiene todos los datos necesarios.' }
  }

  const [
    { data: config },
    { data: profesionalConfig },
    { data: confirmation },
  ] = await Promise.all([
    supabase
      .from('configuracion_recordatorios')
      .select('email_hours_before,email_subject_template,email_body_template')
      .eq('centro_id', centroId)
      .maybeSingle(),
    supabase
      .from('configuracion_recordatorios_profesional')
      .select('email_subject_template,email_body_template')
      .eq('centro_id', centroId)
      .eq('profesional_id', reserva.profesional_id)
      .maybeSingle(),
    supabase
      .from('reserva_confirmaciones')
      .select('token')
      .eq('reserva_id', reserva.id)
      .maybeSingle(),
  ])

  let confirmationToken = confirmation?.token ?? null

  if (!confirmationToken) {
    const { data: insertedConfirmation, error: confirmationError } = await supabase
      .from('reserva_confirmaciones')
      .insert({
        reserva_id: reserva.id,
        centro_id: reserva.centro_id,
        paciente_id: reserva.paciente_id,
      })
      .select('token')
      .single()

    if (confirmationError || !insertedConfirmation) {
      return { error: 'No pudimos crear el link de confirmación.' }
    }

    confirmationToken = insertedConfirmation.token
  }

  const emailHoursBefore = normalizeReminderHours(
    config?.email_hours_before,
    DEFAULT_EMAIL_REMINDER_HOURS_BEFORE
  )
  const { recordatorioId, error: reminderError } = await ensureEmailReminderRow({
    supabase,
    reserva,
    emailHoursBefore,
  })

  if (reminderError || !recordatorioId) {
    return { error: reminderError ?? 'No pudimos preparar el recordatorio.' }
  }

  const reminder: EmailReminderPayload = {
    recordatorio_id: recordatorioId,
    reserva_id: reserva.id,
    centro_id: reserva.centro_id,
    paciente_id: reserva.paciente_id,
    fecha_inicio: reserva.fecha_inicio,
    fecha_fin: reserva.fecha_fin,
    paciente_nombre: paciente.nombre,
    paciente_apellido: paciente.apellido,
    paciente_email: paciente.email,
    paciente_telefono: paciente.telefono,
    centro_nombre: centro.nombre,
    centro_email: centro.email,
    centro_telefono: centro.telefono,
    servicio_nombre: servicio.nombre,
    profesional_nombre: profesional?.nombre || 'Profesional',
    email_subject_template:
      profesionalConfig?.email_subject_template?.trim() ||
      config?.email_subject_template ||
      defaultEmailSubjectTemplate,
    email_body_template:
      profesionalConfig?.email_body_template?.trim() ||
      config?.email_body_template ||
      defaultEmailBodyTemplate,
    confirmacion_token: confirmationToken,
  }

  return { reminder }
}

async function persistManualEmailDeliveryResult(
  supabase: ReminderClient,
  reminder: EmailReminderPayload,
  result: EmailDeliveryResult
) {
  const estado = result.ok ? 'enviado' : 'fallido'
  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('recordatorios_reserva')
    .update({
      estado,
      sent_at: result.ok ? now : null,
      error_message: result.ok ? null : result.error ?? 'No se pudo enviar.',
      provider: result.provider,
      provider_message_id: result.providerMessageId ?? null,
      processing_started_at: null,
    })
    .eq('id', reminder.recordatorio_id)

  const metadata = {
    ...(result.metadata ?? {}),
    forced: true,
    confirmation_link: true,
  }

  const { error: insertError } = await supabase.from('recordatorio_envios').insert({
    recordatorio_id: reminder.recordatorio_id,
    reserva_id: reminder.reserva_id,
    centro_id: reminder.centro_id,
    canal: 'email',
    tipo: 'recordatorio_48h',
    estado,
    provider: result.provider,
    provider_message_id: result.providerMessageId ?? null,
    recipient: result.recipient ?? null,
    metadata,
    error_message: result.ok ? null : result.error ?? 'No se pudo enviar.',
  })

  if (updateError || insertError) {
    return 'El correo se procesó, pero no pudimos registrar todo el historial.'
  }

  return null
}

type EdgeManualEmailResponse = {
  ok?: boolean
  persisted?: boolean
  provider?: string | null
  provider_message_id?: string | null
  recipient?: string | null
  metadata?: Record<string, string | number | boolean | null>
  error?: string | null
  message?: string | null
}

function canSendEmailReminderLocally() {
  return (
    Boolean(process.env.RESEND_API_KEY?.trim()) ||
    process.env.REMINDERS_DRY_RUN?.trim().toLowerCase() === 'true'
  )
}

async function sendManualEmailReminderViaEdge(
  reminder: EmailReminderPayload
): Promise<{ result: EmailDeliveryResult; persistedByEdge: boolean }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const manualSecret = process.env.MANUAL_REMINDERS_SECRET?.trim()

  if (!supabaseUrl || (!manualSecret && !serviceRoleKey)) {
    return {
      persistedByEdge: false,
      result: {
        ok: false,
        provider: 'supabase_edge_function',
        error:
          'Faltan NEXT_PUBLIC_SUPABASE_URL y el secreto de envío manual para enviar desde Supabase.',
      },
    }
  }

  try {
    const response = await fetch(
      new URL('/functions/v1/send-booking-reminders', `${supabaseUrl}/`).toString(),
      {
        method: 'POST',
        headers: {
          ...(manualSecret
            ? { 'x-reminders-secret': manualSecret }
            : { authorization: `Bearer ${serviceRoleKey}` }),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'manual_email',
          recordatorio_id: reminder.recordatorio_id,
          centro_id: reminder.centro_id,
          app_base_url: getAppBaseUrl(),
        }),
        cache: 'no-store',
      }
    )
    const payload = (await response.json().catch(() => ({}))) as EdgeManualEmailResponse
    const ok = response.ok && payload.ok === true

    return {
      persistedByEdge: payload.persisted === true,
      result: {
        ok,
        provider: payload.provider || 'supabase_edge_function',
        providerMessageId: payload.provider_message_id ?? undefined,
        recipient: payload.recipient ?? undefined,
        metadata: {
          ...(payload.metadata ?? {}),
          edge_function: true,
          status: response.status,
        },
        error: ok
          ? undefined
          : payload.error ||
            payload.message ||
            'No pudimos enviar el recordatorio desde Supabase.',
      },
    }
  } catch {
    return {
      persistedByEdge: false,
      result: {
        ok: false,
        provider: 'supabase_edge_function',
        error: 'No pudimos conectar con el servicio de envío de Supabase.',
      },
    }
  }
}

export async function sendReservaEmailReminderAction(
  id: string
): Promise<ReservaActionState> {
  if (!id) {
    return { ok: false, message: 'No pudimos identificar la reserva.' }
  }

  if (isDemoMode()) {
    return {
      ok: true,
      message: 'Recordatorio de correo simulado en modo demo.',
    }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const senderSupabase = createAdminClient()

  if (!senderSupabase) {
    return {
      ok: false,
      message:
        'Falta configurar SUPABASE_SERVICE_ROLE_KEY para enviar recordatorios manuales.',
    }
  }

  const { reminder, error: reminderError } = await buildManualEmailReminder(
    senderSupabase,
    centroId,
    id
  )

  if (reminderError || !reminder) {
    return {
      ok: false,
      message: reminderError ?? 'No pudimos preparar el recordatorio.',
    }
  }

  const delivery = canSendEmailReminderLocally()
    ? {
        persistedByEdge: false,
        result: await sendEmailReminder(reminder, {
          idempotencyKey: `agendix-manual-${reminder.recordatorio_id}-${Date.now()}`,
        }),
      }
    : await sendManualEmailReminderViaEdge(reminder)

  const persistWarning = delivery.persistedByEdge
    ? null
    : await persistManualEmailDeliveryResult(
        senderSupabase,
        reminder,
        delivery.result
      )

  if (!delivery.result.ok) {
    return {
      ok: false,
      message:
        delivery.result.error ?? 'No pudimos enviar el recordatorio por correo.',
    }
  }

  await revalidateReservaPaths(supabase, centroId)

  return {
    ok: true,
    message:
      persistWarning ??
      'Recordatorio enviado por correo con link de confirmación.',
  }
}

async function sendPendingReservaConfirmationEmail(
  centroId: string,
  reservaId: string
) {
  const senderSupabase = createAdminClient()

  if (!senderSupabase) {
    return 'No pudimos enviar el correo de confirmación porque falta SUPABASE_SERVICE_ROLE_KEY.'
  }

  const { reminder, error: reminderError } = await buildManualEmailReminder(
    senderSupabase,
    centroId,
    reservaId
  )

  if (reminderError || !reminder) {
    return reminderError ?? 'No pudimos preparar el correo de confirmación.'
  }

  const delivery = canSendEmailReminderLocally()
    ? {
        persistedByEdge: false,
        result: await sendEmailReminder(reminder, {
          idempotencyKey: `agendix-confirmation-${reminder.reserva_id}`,
        }),
      }
    : await sendManualEmailReminderViaEdge(reminder)

  const persistWarning = delivery.persistedByEdge
    ? null
    : await persistManualEmailDeliveryResult(
        senderSupabase,
        reminder,
        delivery.result
      )

  if (!delivery.result.ok) {
    console.error('[reservas] confirmation email failed', {
      reservaId,
      centroId,
      error: delivery.result.error,
    })

    return delivery.result.error
      ? `No pudimos enviar el correo de confirmación: ${delivery.result.error}`
      : 'No pudimos enviar el correo de confirmación.'
  }

  if (persistWarning) {
    return persistWarning
  }

  return null
}

export async function createReservaAction(
  values: ReservaFormValues
): Promise<ReservaActionState> {
  const parsed = reservaSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos de la reserva.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Reserva creada en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const {
    durationMinutes,
    error: relationError,
  } = await resolveReservaRelations(supabase, centroId, parsed.data)

  if (relationError || !durationMinutes) {
    return { ok: false, message: relationError ?? 'No pudimos validar la reserva.' }
  }

  const { fechaInicio, error: dateError } = buildDateRange(
    parsed.data,
    durationMinutes
  )

  if (dateError || !fechaInicio) {
    return { ok: false, message: dateError ?? 'Selecciona fecha y hora válidas.' }
  }

  const { error: meetingError } = await resolveMeetingPayloadForPlan(
    supabase,
    centroId,
    parsed.data
  )

  if (meetingError) {
    return { ok: false, message: meetingError }
  }

  const { paciente, error: pacienteError } = await resolvePaciente(
    supabase,
    centroId,
    parsed.data
  )

  if (pacienteError || !paciente) {
    return { ok: false, message: pacienteError ?? 'No pudimos guardar el paciente.' }
  }

  const { data, error: insertError } = await supabase
    .rpc('create_reserva_atomic', {
      p_centro_id: centroId,
      p_profesional_id: parsed.data.profesional_id,
      p_paciente_id: paciente.id,
      p_servicio_id: parsed.data.servicio_id,
      p_fecha_inicio: fechaInicio,
      p_sala_id: parsed.data.sala_id,
      p_estado: 'pending',
      p_notas: parsed.data.notas?.trim() || null,
      p_origen: 'dashboard',
      p_modalidad: 'presencial',
      p_payment_status: 'pending',
      p_amount: null,
      p_currency: 'CLP',
    })
    .single()

  if (insertError || !data) {
    return { ok: false, message: supabaseError(insertError?.message) }
  }

  if (!data.ok || !data.reserva_id) {
    return {
      ok: false,
      message: data.message ?? 'No pudimos guardar la reserva. Intenta nuevamente.',
    }
  }

  const { error: meetingUpdateError } = await updateReservaMeetingPayload(
    supabase,
    centroId,
    data.reserva_id,
    parsed.data
  )

  if (meetingUpdateError) {
    return { ok: false, message: meetingUpdateError }
  }

  await upsertReminderSkeletons(
    supabase,
    centroId,
    data.reserva_id,
    paciente.id,
    fechaInicio
  )

  const confirmationEmailWarning = await sendPendingReservaConfirmationEmail(
    centroId,
    data.reserva_id
  )

  const { reserva, error: fetchError } = await fetchReservaById(
    supabase,
    centroId,
    data.reserva_id
  )

  if (fetchError || !reserva) {
    return { ok: false, message: fetchError ?? 'No pudimos cargar la reserva.' }
  }

  await revalidateReservaPaths(supabase, centroId)

  return {
    ok: true,
    message: confirmationEmailWarning
      ? `Reserva creada correctamente. ${confirmationEmailWarning}`
      : 'Reserva creada correctamente. Enviamos el correo de confirmación al paciente.',
    reserva,
    paciente,
  }
}

export async function updateReservaAction(
  id: string,
  values: ReservaFormValues
): Promise<ReservaActionState> {
  const parsed = reservaSchema.safeParse(values)

  if (!id || !parsed.success) {
    return { ok: false, message: 'Revisa los datos de la reserva.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Reserva actualizada en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const {
    durationMinutes,
    error: relationError,
  } = await resolveReservaRelations(supabase, centroId, parsed.data)

  if (relationError || !durationMinutes) {
    return { ok: false, message: relationError ?? 'No pudimos validar la reserva.' }
  }

  const { fechaInicio, error: dateError } = buildDateRange(
    parsed.data,
    durationMinutes
  )

  if (dateError || !fechaInicio) {
    return { ok: false, message: dateError ?? 'Selecciona fecha y hora válidas.' }
  }

  const { error: meetingError } = await resolveMeetingPayloadForPlan(
    supabase,
    centroId,
    parsed.data
  )

  if (meetingError) {
    return { ok: false, message: meetingError }
  }

  const { paciente, error: pacienteError } = await resolvePaciente(
    supabase,
    centroId,
    parsed.data
  )

  if (pacienteError || !paciente) {
    return { ok: false, message: pacienteError ?? 'No pudimos guardar el paciente.' }
  }

  const { data: updateResult, error: updateError } = await supabase
    .rpc('update_reserva_atomic', {
      p_reserva_id: id,
      p_centro_id: centroId,
      p_profesional_id: parsed.data.profesional_id,
      p_paciente_id: paciente.id,
      p_servicio_id: parsed.data.servicio_id,
      p_fecha_inicio: fechaInicio,
      p_sala_id: parsed.data.sala_id,
      p_estado: parsed.data.estado,
      p_estado_asistencia: asistenciaForReservaStatus(parsed.data.estado),
      p_notas: parsed.data.notas?.trim() || null,
    })
    .single()

  if (updateError || !updateResult) {
    return { ok: false, message: supabaseError(updateError?.message) }
  }

  if (!updateResult.ok || !updateResult.fecha_inicio) {
    return {
      ok: false,
      message:
        updateResult.message ??
        'No pudimos actualizar la reserva. Intenta nuevamente.',
    }
  }

  const { error: meetingUpdateError } = await updateReservaMeetingPayload(
    supabase,
    centroId,
    id,
    parsed.data
  )

  if (meetingUpdateError) {
    return { ok: false, message: meetingUpdateError }
  }

  if (parsed.data.estado !== 'cancelled') {
    await upsertReminderSkeletons(
      supabase,
      centroId,
      id,
      paciente.id,
      updateResult.fecha_inicio
    )
  } else {
    await supabase
      .from('recordatorios_reserva')
      .update({
        estado: 'omitido',
        error_message: 'Reserva cancelada antes del envio.',
        processing_started_at: null,
      })
      .eq('reserva_id', id)
      .in('estado', ['pendiente', 'fallido', 'procesando'])
  }

  const { reserva, error: fetchError } = await fetchReservaById(supabase, centroId, id)

  if (fetchError || !reserva) {
    return { ok: false, message: fetchError ?? 'No pudimos cargar la reserva.' }
  }

  await revalidateReservaPaths(supabase, centroId)

  return {
    ok: true,
    message: 'Reserva actualizada correctamente.',
    reserva,
    paciente,
  }
}

export async function updateReservaEstadoAction(
  id: string,
  estado: EstadoReserva
): Promise<ReservaActionState> {
  if (!id) {
    return { ok: false, message: 'No pudimos identificar la reserva.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Estado actualizado en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { error: updateError } = await supabase
    .from('reservas')
    .update({
      estado,
      estado_asistencia: asistenciaForReservaStatus(estado),
    })
    .eq('id', id)
    .eq('centro_id', centroId)

  if (updateError) {
    return { ok: false, message: supabaseError(updateError.message) }
  }

  if (estado === 'cancelled') {
    await supabase
      .from('recordatorios_reserva')
      .update({
        estado: 'omitido',
        error_message: 'Reserva cancelada antes del envio.',
        processing_started_at: null,
      })
      .eq('reserva_id', id)
      .in('estado', ['pendiente', 'fallido', 'procesando'])
  }

  const { reserva, error: fetchError } = await fetchReservaById(supabase, centroId, id)

  if (fetchError || !reserva) {
    return { ok: false, message: fetchError ?? 'No pudimos cargar la reserva.' }
  }

  await revalidateReservaPaths(supabase, centroId)

  return {
    ok: true,
    message: 'Estado de reserva actualizado.',
    reserva,
  }
}

export async function updateReservaAsistenciaAction(
  id: string,
  estadoAsistencia: EstadoAsistencia
): Promise<ReservaActionState> {
  if (!id) {
    return { ok: false, message: 'No pudimos identificar la reserva.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Asistencia actualizada en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { error: updateError } = await supabase
    .from('reservas')
    .update({
      estado:
        estadoAsistencia === 'no_asistio'
          ? 'no_show'
          : estadoAsistencia === 'asistio'
            ? 'completed'
            : 'confirmed',
      estado_asistencia: estadoAsistencia,
    })
    .eq('id', id)
    .eq('centro_id', centroId)

  if (updateError) {
    return { ok: false, message: supabaseError(updateError.message) }
  }

  const { reserva, error: fetchError } = await fetchReservaById(supabase, centroId, id)

  if (fetchError || !reserva) {
    return { ok: false, message: fetchError ?? 'No pudimos cargar la reserva.' }
  }

  await revalidateReservaPaths(supabase, centroId)

  return {
    ok: true,
    message: 'Asistencia de la cita actualizada.',
    reserva,
  }
}
