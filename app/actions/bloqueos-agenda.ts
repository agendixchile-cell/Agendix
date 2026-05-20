'use server'

import { revalidatePath } from 'next/cache'
import { isDemoMode } from '@/lib/auth/demo'
import { revalidateCentroPublicPaths } from '@/lib/centro/public-revalidation'
import {
  bloqueoAgendaSchema,
  type BloqueoAgendaFormValues,
} from '@/lib/reservas/validation'
import type {
  AgendaBlockActionState,
  AgendaBlockListItem,
  AgendaBlockQueryRow,
} from '@/lib/reservas/types'
import { getCentroId } from '@/lib/supabase/get-centro-id'
import { createClient } from '@/lib/supabase/server'
import { zonedDateTime } from '@/lib/timezone'

const agendaBlockSelect = `
  id,
  centro_id,
  profesional_id,
  fecha_inicio,
  fecha_fin,
  motivo,
  created_at,
  updated_at,
  profiles!bloqueos_agenda_profesional_id_fkey(id,nombre,email,avatar_url)
`

function toAgendaBlockListItem(row: AgendaBlockQueryRow): AgendaBlockListItem {
  return {
    id: row.id,
    centro_id: row.centro_id,
    profesional_id: row.profesional_id,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    motivo: row.motivo,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profesional: row.profiles
      ? {
          id: row.profiles.id,
          nombre: row.profiles.nombre,
          email: row.profiles.email,
          avatar_url: row.profiles.avatar_url,
        }
      : null,
  }
}

function supabaseError(message?: string) {
  const error = message?.toLowerCase() ?? ''

  if (error.includes('permission denied') || error.includes('row-level security')) {
    return 'No tienes permisos para bloquear horarios en este centro.'
  }

  if (error.includes('foreign key')) {
    return 'No pudimos conectar el bloqueo con sus datos asociados.'
  }

  return 'No pudimos guardar el bloqueo. Intenta nuevamente.'
}

function buildBlockRange(values: BloqueoAgendaFormValues) {
  const start = zonedDateTime(values.fecha, values.hora_inicio)
  const end = zonedDateTime(values.fecha, values.hora_fin)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Selecciona fecha y horas válidas.' }
  }

  if (end <= start) {
    return { error: 'La hora de término debe ser posterior al inicio.' }
  }

  return {
    fechaInicio: start.toISOString(),
    fechaFin: end.toISOString(),
  }
}

async function revalidateAgendaBlockPaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string
) {
  revalidatePath('/agenda')
  revalidatePath('/reservas')
  await revalidateCentroPublicPaths(supabase, centroId)
}

async function validateProfessional(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  profesionalId: string | null
) {
  if (!profesionalId) return {}

  const { data, error } = await supabase
    .from('miembros_centro')
    .select('profile_id')
    .eq('centro_id', centroId)
    .eq('profile_id', profesionalId)
    .eq('activo', true)
    .in('rol', ['owner', 'admin', 'profesional'])
    .maybeSingle()

  if (error) {
    return { error: supabaseError(error.message) }
  }

  if (!data) {
    return { error: 'Selecciona un profesional activo de tu centro.' }
  }

  return {}
}

async function validateBlockDoesNotHideReservations({
  supabase,
  centroId,
  profesionalId,
  fechaInicio,
  fechaFin,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  centroId: string
  profesionalId: string | null
  fechaInicio: string
  fechaFin: string
}) {
  let query = supabase
    .from('reservas')
    .select('id')
    .eq('centro_id', centroId)
    .neq('estado', 'cancelled')
    .lt('fecha_inicio', fechaFin)
    .gt('fecha_fin', fechaInicio)
    .limit(1)

  if (profesionalId) {
    query = query.eq('profesional_id', profesionalId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    return { error: supabaseError(error.message) }
  }

  if (data) {
    return {
      error: profesionalId
        ? 'Ese profesional ya tiene una reserva en ese bloque.'
        : 'Ya existe una reserva del centro dentro de ese bloque.',
    }
  }

  return {}
}

async function fetchAgendaBlockById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  blockId: string
) {
  const { data, error } = await supabase
    .from('bloqueos_agenda')
    .select(agendaBlockSelect)
    .eq('id', blockId)
    .eq('centro_id', centroId)
    .single()

  if (error || !data) {
    return { error: supabaseError(error?.message) }
  }

  return {
    bloqueo: toAgendaBlockListItem(data as unknown as AgendaBlockQueryRow),
  }
}

export async function createAgendaBlockAction(
  values: BloqueoAgendaFormValues
): Promise<AgendaBlockActionState> {
  const parsed = bloqueoAgendaSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos del bloqueo.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Bloqueo creado en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId('bloqueos de agenda')

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const profesionalId =
    parsed.data.scope === 'profesional'
      ? parsed.data.profesional_id?.trim() || null
      : null

  const { fechaInicio, fechaFin, error: dateError } = buildBlockRange(parsed.data)

  if (dateError || !fechaInicio || !fechaFin) {
    return { ok: false, message: dateError ?? 'Selecciona fecha y horas válidas.' }
  }

  if (new Date(fechaFin).getTime() <= Date.now()) {
    return { ok: false, message: 'El bloqueo debe terminar en el futuro.' }
  }

  const { error: professionalError } = await validateProfessional(
    supabase,
    centroId,
    profesionalId
  )

  if (professionalError) {
    return { ok: false, message: professionalError }
  }

  const { error: reservationConflict } =
    await validateBlockDoesNotHideReservations({
      supabase,
      centroId,
      profesionalId,
      fechaInicio,
      fechaFin,
    })

  if (reservationConflict) {
    return { ok: false, message: reservationConflict }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error: insertError } = await supabase
    .from('bloqueos_agenda')
    .insert({
      centro_id: centroId,
      profesional_id: profesionalId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      motivo: parsed.data.motivo?.trim() || null,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single()

  if (insertError || !data) {
    return { ok: false, message: supabaseError(insertError?.message) }
  }

  const { bloqueo, error: fetchError } = await fetchAgendaBlockById(
    supabase,
    centroId,
    data.id
  )

  if (fetchError || !bloqueo) {
    return { ok: false, message: fetchError ?? 'No pudimos cargar el bloqueo.' }
  }

  await revalidateAgendaBlockPaths(supabase, centroId)

  return {
    ok: true,
    message: 'Horario bloqueado correctamente.',
    bloqueo,
  }
}

export async function deleteAgendaBlockAction(
  id: string
): Promise<AgendaBlockActionState> {
  if (!id) {
    return { ok: false, message: 'No pudimos identificar el bloqueo.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Bloqueo eliminado en modo demo.', deletedId: id }
  }

  const { supabase, centroId, error } = await getCentroId('bloqueos de agenda')

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data, error: deleteError } = await supabase
    .from('bloqueos_agenda')
    .delete()
    .eq('id', id)
    .eq('centro_id', centroId)
    .select('id')
    .single()

  if (deleteError || !data) {
    return {
      ok: false,
      message: deleteError
        ? supabaseError(deleteError.message)
        : 'No encontramos el bloqueo seleccionado.',
    }
  }

  await revalidateAgendaBlockPaths(supabase, centroId)

  return {
    ok: true,
    message: 'Bloqueo eliminado correctamente.',
    deletedId: id,
  }
}
