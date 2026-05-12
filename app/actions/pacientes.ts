'use server'

import { revalidatePath } from 'next/cache'
import { isDemoMode } from '@/lib/auth/demo'
import {
  pacienteSchema,
  type PacienteFormValues,
} from '@/lib/pacientes/validation'
import type { PacienteActionState, PacienteListItem } from '@/lib/pacientes/types'
import { createClient } from '@/lib/supabase/server'
import { getCentroId } from '@/lib/supabase/get-centro-id'

const pacienteSelect =
  'id,nombre,apellido,rut,email,telefono,fecha_nacimiento,notas,created_at,updated_at'

function formatPacientePayload(values: PacienteFormValues) {
  return {
    nombre: values.nombre.trim(),
    apellido: values.apellido?.trim() || null,
    rut: values.rut?.trim() || null,
    email: values.email?.trim().toLowerCase() || null,
    telefono: values.telefono?.trim() || null,
    fecha_nacimiento: values.fecha_nacimiento || null,
    notas: values.notas?.trim() || null,
  }
}

function supabaseError(message?: string): string {
  const error = message?.toLowerCase() ?? ''

  if (error.includes('permission denied') || error.includes('row-level security')) {
    return 'No tienes permisos para administrar pacientes en este centro.'
  }

  if (error.includes('duplicate')) {
    return 'Ya existe un paciente con esos datos.'
  }

  if (error.includes('foreign key')) {
    return 'No pudimos conectar el paciente con tu centro.'
  }

  return 'No pudimos guardar el paciente. Intenta nuevamente.'
}

async function fetchPacienteById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  pacienteId: string
) {
  const { data, error } = await supabase
    .from('pacientes')
    .select(pacienteSelect)
    .eq('id', pacienteId)
    .eq('centro_id', centroId)
    .single()

  if (error || !data) {
    return { error: supabaseError(error?.message) }
  }

  return {
    paciente: data as PacienteListItem,
  }
}

export async function createPacienteAction(
  values: PacienteFormValues
): Promise<PacienteActionState> {
  const parsed = pacienteSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos del paciente.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Paciente creado en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data, error: insertError } = await supabase
    .from('pacientes')
    .insert({
      centro_id: centroId,
      ...formatPacientePayload(parsed.data),
    })
    .select(pacienteSelect)
    .single()

  if (insertError || !data) {
    return { ok: false, message: supabaseError(insertError?.message) }
  }

  revalidatePath('/pacientes')
  revalidatePath('/agenda')
  revalidatePath('/reservas')

  return {
    ok: true,
    message: 'Paciente creado correctamente.',
    paciente: data as PacienteListItem,
  }
}

export async function updatePacienteAction(
  id: string,
  values: PacienteFormValues
): Promise<PacienteActionState> {
  const parsed = pacienteSchema.safeParse(values)

  if (!id || !parsed.success) {
    return { ok: false, message: 'Revisa los datos del paciente.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Paciente actualizado en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data: existingPaciente, error: lookupError } = await supabase
    .from('pacientes')
    .select('id')
    .eq('id', id)
    .eq('centro_id', centroId)
    .maybeSingle()

  if (lookupError) {
    return { ok: false, message: supabaseError(lookupError.message) }
  }

  if (!existingPaciente) {
    return { ok: false, message: 'No encontramos el paciente seleccionado.' }
  }

  const { error: updateError } = await supabase
    .from('pacientes')
    .update(formatPacientePayload(parsed.data))
    .eq('id', id)
    .eq('centro_id', centroId)

  if (updateError) {
    return { ok: false, message: supabaseError(updateError.message) }
  }

  const { paciente, error: fetchError } = await fetchPacienteById(
    supabase,
    centroId,
    id
  )

  if (fetchError || !paciente) {
    return { ok: false, message: fetchError ?? 'No pudimos cargar el paciente.' }
  }

  revalidatePath('/pacientes')
  revalidatePath('/agenda')
  revalidatePath('/reservas')

  return {
    ok: true,
    message: 'Paciente actualizado correctamente.',
    paciente,
  }
}
