'use server'

import { revalidatePath } from 'next/cache'
import { isDemoMode } from '@/lib/auth/demo'
import { servicioSchema, type ServicioFormValues } from '@/lib/servicios/validation'
import type {
  ServicioActionState,
  ServicioListItem,
} from '@/lib/servicios/types'
import { getCentroId } from '@/lib/supabase/get-centro-id'

function toServicioListItem(servicio: ServicioListItem): ServicioListItem {
  return {
    id: servicio.id,
    nombre: servicio.nombre,
    descripcion: servicio.descripcion,
    duracion_minutos: servicio.duracion_minutos,
    precio: servicio.precio,
    activo: servicio.activo,
    created_at: servicio.created_at,
    updated_at: servicio.updated_at,
  }
}

function formatServicioPayload(values: ServicioFormValues) {
  return {
    nombre: values.nombre.trim(),
    descripcion: values.descripcion?.trim() || null,
    duracion_minutos: values.duracion_minutos,
    precio: values.precio,
    activo: values.activo,
  }
}

function supabaseError(message?: string): string {
  const error = message?.toLowerCase() ?? ''

  if (error.includes('permission denied') || error.includes('row-level security')) {
    return 'No tienes permisos para administrar servicios en este centro.'
  }

  if (error.includes('duplicate')) {
    return 'Ya existe un servicio con esos datos.'
  }

  return 'No pudimos guardar el servicio. Intenta nuevamente.'
}

export async function createServicioAction(
  values: ServicioFormValues
): Promise<ServicioActionState> {
  const parsed = servicioSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos del servicio.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Servicio creado en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data, error: insertError } = await supabase
    .from('servicios')
    .insert({ ...formatServicioPayload(parsed.data), centro_id: centroId })
    .select('id,nombre,descripcion,duracion_minutos,precio,activo,created_at,updated_at,centro_id')
    .single()

  if (insertError || !data) {
    return { ok: false, message: supabaseError(insertError?.message) }
  }

  revalidatePath('/servicios')
  revalidatePath('/agenda')

  return {
    ok: true,
    message: 'Servicio creado correctamente.',
    servicio: toServicioListItem(data),
  }
}

export async function updateServicioAction(
  id: string,
  values: ServicioFormValues
): Promise<ServicioActionState> {
  const parsed = servicioSchema.safeParse(values)

  if (!id || !parsed.success) {
    return { ok: false, message: 'Revisa los datos del servicio.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Servicio actualizado en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data, error: updateError } = await supabase
    .from('servicios')
    .update(formatServicioPayload(parsed.data))
    .eq('id', id)
    .eq('centro_id', centroId)
    .select('id,nombre,descripcion,duracion_minutos,precio,activo,created_at,updated_at,centro_id')
    .single()

  if (updateError || !data) {
    return { ok: false, message: supabaseError(updateError?.message) }
  }

  revalidatePath('/servicios')
  revalidatePath('/agenda')

  return {
    ok: true,
    message: 'Servicio actualizado correctamente.',
    servicio: toServicioListItem(data),
  }
}

export async function toggleServicioAction(
  id: string,
  activo: boolean
): Promise<ServicioActionState> {
  if (!id) {
    return { ok: false, message: 'No pudimos identificar el servicio.' }
  }

  if (isDemoMode()) {
    return {
      ok: true,
      message: activo
        ? 'Servicio activado en modo demo.'
        : 'Servicio desactivado en modo demo.',
    }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data, error: updateError } = await supabase
    .from('servicios')
    .update({ activo })
    .eq('id', id)
    .eq('centro_id', centroId)
    .select('id,nombre,descripcion,duracion_minutos,precio,activo,created_at,updated_at,centro_id')
    .single()

  if (updateError || !data) {
    return { ok: false, message: supabaseError(updateError?.message) }
  }

  revalidatePath('/servicios')
  revalidatePath('/agenda')

  return {
    ok: true,
    message: activo ? 'Servicio activado correctamente.' : 'Servicio desactivado correctamente.',
    servicio: toServicioListItem(data),
  }
}
