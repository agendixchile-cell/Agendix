'use server'

import { revalidatePath } from 'next/cache'
import { isDemoMode } from '@/lib/auth/demo'
import {
  profesionalSchema,
  type ProfesionalFormValues,
} from '@/lib/profesionales/validation'
import type {
  MiembroCentroRow,
  ProfesionalActionState,
  ProfesionalListItem,
  ProfesionalQueryRow,
  ProfileRow,
} from '@/lib/profesionales/types'
import { createClient } from '@/lib/supabase/server'
import { getAdminCentroId } from '@/lib/supabase/get-centro-id'

const profesionalSelect =
  'id,profile_id,rol,activo,created_at,updated_at,profiles!inner(nombre,apellido,email,telefono)'

function toProfesionalListItem(
  miembro: ProfesionalQueryRow,
  especialidad: string | null = null
): ProfesionalListItem {
  const profile = miembro.profiles

  return {
    id: miembro.id,
    profile_id: miembro.profile_id,
    nombre: profile?.nombre ?? 'Sin nombre',
    apellido: profile?.apellido ?? null,
    email: profile?.email ?? '',
    telefono: profile?.telefono ?? null,
    especialidad,
    rol: miembro.rol,
    activo: miembro.activo,
    created_at: miembro.created_at,
    updated_at: miembro.updated_at,
  }
}

function formatProfilePayload(values: ProfesionalFormValues) {
  return {
    nombre: values.nombre.trim(),
    email: values.email.trim().toLowerCase(),
    telefono: values.telefono?.trim() || null,
  }
}

function supabaseError(message?: string): string {
  const error = message?.toLowerCase() ?? ''

  if (error.includes('permission denied') || error.includes('row-level security')) {
    return 'No tienes permisos para administrar profesionales en este centro.'
  }

  if (error.includes('duplicate')) {
    return 'Ya existe un profesional con esos datos.'
  }

  if (error.includes('foreign key')) {
    return 'No pudimos crear el perfil del profesional. Revisa la configuración de perfiles en Supabase.'
  }

  return 'No pudimos guardar el profesional. Intenta nuevamente.'
}

async function fetchProfesionalByMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  membershipId: string,
  centroId: string,
  especialidad: string | null = null
) {
  const { data, error } = await supabase
    .from('miembros_centro')
    .select(profesionalSelect)
    .eq('id', membershipId)
    .eq('centro_id', centroId)
    .single()

  if (error || !data) {
    return { error: supabaseError(error?.message) }
  }

  return {
    profesional: toProfesionalListItem(
      data as unknown as ProfesionalQueryRow,
      especialidad
    ),
  }
}

async function findOrCreateProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: ProfesionalFormValues
) {
  const email = values.email.trim().toLowerCase()
  const profilePayload = formatProfilePayload(values)

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from('profiles')
    .select('id,nombre,apellido,email,telefono,avatar_url,created_at,updated_at')
    .eq('email', email)
    .maybeSingle()

  if (profileLookupError) {
    return { error: supabaseError(profileLookupError.message) }
  }

  if (existingProfile) {
    const { data: updatedProfile, error: updateProfileError } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', existingProfile.id)
      .select('id,nombre,apellido,email,telefono,avatar_url,created_at,updated_at')
      .single()

    if (updateProfileError || !updatedProfile) {
      return { error: supabaseError(updateProfileError?.message) }
    }

    return { profile: updatedProfile as ProfileRow }
  }

  const { data: newProfile, error: createProfileError } = await supabase
    .from('profiles')
    .insert({
      id: crypto.randomUUID(),
      apellido: null,
      avatar_url: null,
      ...profilePayload,
    })
    .select('id,nombre,apellido,email,telefono,avatar_url,created_at,updated_at')
    .single()

  if (createProfileError || !newProfile) {
    return { error: supabaseError(createProfileError?.message) }
  }

  return { profile: newProfile as ProfileRow }
}

export async function createProfesionalAction(
  values: ProfesionalFormValues
): Promise<ProfesionalActionState> {
  const parsed = profesionalSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos del profesional.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Profesional creado en modo demo.' }
  }

  const { supabase, centroId, error } = await getAdminCentroId('profesionales')

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { profile, error: profileError } = await findOrCreateProfile(
    supabase,
    parsed.data
  )

  if (profileError || !profile) {
    return { ok: false, message: profileError ?? 'No pudimos crear el perfil.' }
  }

  const { data: existingMembership, error: membershipLookupError } = await supabase
    .from('miembros_centro')
    .select('id')
    .eq('centro_id', centroId)
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (membershipLookupError) {
    return { ok: false, message: supabaseError(membershipLookupError.message) }
  }

  if (existingMembership) {
    return {
      ok: false,
      message: 'Este profesional ya pertenece a tu centro.',
    }
  }

  const { data: membership, error: insertMembershipError } = await supabase
    .from('miembros_centro')
    .insert({
      centro_id: centroId,
      profile_id: profile.id,
      rol: 'profesional',
      activo: parsed.data.activo,
    })
    .select('id,profile_id,rol,activo,created_at,updated_at')
    .single()

  if (insertMembershipError || !membership) {
    return { ok: false, message: supabaseError(insertMembershipError?.message) }
  }

  revalidatePath('/profesionales')
  revalidatePath('/agenda')
  revalidatePath('/agenda')

  return {
    ok: true,
    message: 'Profesional creado correctamente.',
    profesional: {
      ...(membership as MiembroCentroRow),
      nombre: profile.nombre,
      apellido: profile.apellido,
      email: profile.email,
      telefono: profile.telefono,
      especialidad: parsed.data.especialidad?.trim() || null,
    },
  }
}

export async function updateProfesionalAction(
  id: string,
  values: ProfesionalFormValues
): Promise<ProfesionalActionState> {
  const parsed = profesionalSchema.safeParse(values)

  if (!id || !parsed.success) {
    return { ok: false, message: 'Revisa los datos del profesional.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Profesional actualizado en modo demo.' }
  }

  const { supabase, centroId, error } = await getAdminCentroId('profesionales')

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('miembros_centro')
    .select('id,profile_id')
    .eq('id', id)
    .eq('centro_id', centroId)
    .maybeSingle()

  if (membershipError) {
    return { ok: false, message: supabaseError(membershipError.message) }
  }

  if (!membership?.profile_id) {
    return { ok: false, message: 'No pudimos identificar al profesional.' }
  }

  const { error: duplicateEmailError, data: duplicateEmail } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', parsed.data.email)
    .neq('id', membership.profile_id)
    .maybeSingle()

  if (duplicateEmailError) {
    return { ok: false, message: supabaseError(duplicateEmailError.message) }
  }

  if (duplicateEmail) {
    return {
      ok: false,
      message: 'Ya existe otro profesional con ese email.',
    }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(formatProfilePayload(parsed.data))
    .eq('id', membership.profile_id)

  if (profileError) {
    return { ok: false, message: supabaseError(profileError.message) }
  }

  const { error: membershipUpdateError } = await supabase
    .from('miembros_centro')
    .update({ activo: parsed.data.activo })
    .eq('id', id)
    .eq('centro_id', centroId)

  if (membershipUpdateError) {
    return { ok: false, message: supabaseError(membershipUpdateError.message) }
  }

  const { profesional, error: fetchError } = await fetchProfesionalByMembership(
    supabase,
    id,
    centroId,
    parsed.data.especialidad?.trim() || null
  )

  if (fetchError || !profesional) {
    return { ok: false, message: fetchError ?? 'No pudimos actualizar la vista.' }
  }

  revalidatePath('/profesionales')
  revalidatePath('/agenda')

  return {
    ok: true,
    message: 'Profesional actualizado correctamente.',
    profesional,
  }
}

export async function toggleProfesionalAction(
  id: string,
  activo: boolean
): Promise<ProfesionalActionState> {
  if (!id) {
    return { ok: false, message: 'No pudimos identificar al profesional.' }
  }

  if (isDemoMode()) {
    return {
      ok: true,
      message: activo
        ? 'Profesional activado en modo demo.'
        : 'Profesional desactivado en modo demo.',
    }
  }

  const { supabase, centroId, error } = await getAdminCentroId('profesionales')

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { error: updateError } = await supabase
    .from('miembros_centro')
    .update({ activo })
    .eq('id', id)
    .eq('centro_id', centroId)

  if (updateError) {
    return { ok: false, message: supabaseError(updateError.message) }
  }

  const { profesional, error: fetchError } = await fetchProfesionalByMembership(
    supabase,
    id,
    centroId
  )

  if (fetchError || !profesional) {
    return { ok: false, message: fetchError ?? 'No pudimos actualizar la vista.' }
  }

  revalidatePath('/profesionales')

  return {
    ok: true,
    message: activo
      ? 'Profesional activado correctamente.'
      : 'Profesional desactivado correctamente.',
    profesional,
  }
}
