'use server'

import { revalidatePath } from 'next/cache'
import { getCentroId } from '@/lib/supabase/get-centro-id'
import { isDemoMode } from '@/lib/auth/demo'
import { salaSchema, type SalaFormValues } from '@/lib/salas/validation'
import type { SalaActionState, SalaListItem, SalaRow } from '@/lib/salas/types'

function toSalaListItem(sala: SalaRow): SalaListItem {
  return {
    id: sala.id,
    nombre: sala.nombre,
    descripcion: sala.descripcion,
    capacidad: sala.capacidad,
    activa: sala.activa,
    created_at: sala.created_at,
    updated_at: sala.updated_at,
  }
}

function formatSalaPayload(values: SalaFormValues) {
  return {
    nombre: values.nombre.trim(),
    descripcion: values.descripcion?.trim() || null,
    capacidad: values.capacidad,
    activa: values.activa,
  }
}

function supabaseError(message?: string): string {
  const error = message?.toLowerCase() ?? ''

  if (error.includes('permission denied') || error.includes('row-level security')) {
    return 'No tienes permisos para administrar salas en este centro.'
  }

  if (error.includes('duplicate')) {
    return 'Ya existe una sala con esos datos.'
  }

  return 'No pudimos guardar la sala. Intenta nuevamente.'
}

export async function createSalaAction(values: SalaFormValues): Promise<SalaActionState> {
  const parsed = salaSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos de la sala.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Sala creada en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data, error: insertError } = await supabase
    .from('salas')
    .insert({ ...formatSalaPayload(parsed.data), centro_id: centroId })
    .select('id,nombre,descripcion,capacidad,activa,created_at,updated_at,centro_id')
    .single()

  if (insertError || !data) {
    return { ok: false, message: supabaseError(insertError?.message) }
  }

  revalidatePath('/salas')
  revalidatePath('/agenda')

  return {
    ok: true,
    message: 'Sala creada correctamente.',
    sala: toSalaListItem(data),
  }
}

export async function updateSalaAction(
  id: string,
  values: SalaFormValues
): Promise<SalaActionState> {
  const parsed = salaSchema.safeParse(values)

  if (!id || !parsed.success) {
    return { ok: false, message: 'Revisa los datos de la sala.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Sala actualizada en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data, error: updateError } = await supabase
    .from('salas')
    .update(formatSalaPayload(parsed.data))
    .eq('id', id)
    .eq('centro_id', centroId)
    .select('id,nombre,descripcion,capacidad,activa,created_at,updated_at,centro_id')
    .single()

  if (updateError || !data) {
    return { ok: false, message: supabaseError(updateError?.message) }
  }

  revalidatePath('/salas')
  revalidatePath('/agenda')

  return {
    ok: true,
    message: 'Sala actualizada correctamente.',
    sala: toSalaListItem(data),
  }
}

export async function toggleSalaAction(
  id: string,
  activa: boolean
): Promise<SalaActionState> {
  if (!id) {
    return { ok: false, message: 'No pudimos identificar la sala.' }
  }

  if (isDemoMode()) {
    return {
      ok: true,
      message: activa ? 'Sala activada en modo demo.' : 'Sala desactivada en modo demo.',
    }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data, error: updateError } = await supabase
    .from('salas')
    .update({ activa })
    .eq('id', id)
    .eq('centro_id', centroId)
    .select('id,nombre,descripcion,capacidad,activa,created_at,updated_at,centro_id')
    .single()

  if (updateError || !data) {
    return { ok: false, message: supabaseError(updateError?.message) }
  }

  revalidatePath('/salas')
  revalidatePath('/agenda')

  return {
    ok: true,
    message: activa ? 'Sala activada correctamente.' : 'Sala desactivada correctamente.',
    sala: toSalaListItem(data),
  }
}
