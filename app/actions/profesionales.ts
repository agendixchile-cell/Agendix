'use server'

import { revalidatePath } from 'next/cache'
import { isDemoMode } from '@/lib/auth/demo'
import { revalidateCentroPublicPaths } from '@/lib/centro/public-revalidation'
import {
  PROFESSIONAL_AVATARS_BUCKET,
  normalizePublicImageUrl,
  storagePathFromPublicUrl,
} from '@/lib/images/config'
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
import { validateProfessionalCapacity } from '@/lib/subscription/server'

const profesionalSelect =
  'id,profile_id,rol,especialidad,avatar_url,descanso_entre_reservas_minutos,duracion_sesion_minutos,intervalo_reservas_minutos,activo,created_at,updated_at,profiles!inner(nombre,apellido,email,telefono,avatar_url)'

type ProfesionalReminderConfig = {
  email_subject_template: string | null
  email_body_template: string | null
}

function toProfesionalListItem(
  miembro: ProfesionalQueryRow,
  reminderConfig: ProfesionalReminderConfig | null = null
): ProfesionalListItem {
  const profile = miembro.profiles

  return {
    id: miembro.id,
    profile_id: miembro.profile_id,
    nombre: profile?.nombre ?? 'Sin nombre',
    apellido: profile?.apellido ?? null,
    email: profile?.email ?? '',
    telefono: profile?.telefono ?? null,
    especialidad: miembro.especialidad ?? null,
    avatar_url: miembro.avatar_url ?? profile?.avatar_url ?? null,
    descanso_entre_reservas_minutos:
      miembro.descanso_entre_reservas_minutos ?? 0,
    duracion_sesion_minutos: miembro.duracion_sesion_minutos ?? 60,
    intervalo_reservas_minutos: miembro.intervalo_reservas_minutos ?? 60,
    recordatorio_email_subject: reminderConfig?.email_subject_template ?? null,
    recordatorio_email_body: reminderConfig?.email_body_template ?? null,
    rol: miembro.rol,
    activo: miembro.activo,
    created_at: miembro.created_at,
    updated_at: miembro.updated_at,
  }
}

function reminderConfigFromValues(
  values: ProfesionalFormValues
): ProfesionalReminderConfig {
  return {
    email_subject_template: values.recordatorio_email_subject?.trim() || null,
    email_body_template: values.recordatorio_email_body?.trim() || null,
  }
}

async function syncProfesionalReminderConfig(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  profesionalId: string,
  values: ProfesionalFormValues
) {
  const reminderConfig = reminderConfigFromValues(values)

  if (
    !reminderConfig.email_subject_template &&
    !reminderConfig.email_body_template
  ) {
    const { error } = await supabase
      .from('configuracion_recordatorios_profesional')
      .delete()
      .eq('centro_id', centroId)
      .eq('profesional_id', profesionalId)

    return { error, reminderConfig }
  }

  const { error } = await supabase
    .from('configuracion_recordatorios_profesional')
    .upsert(
      {
        centro_id: centroId,
        profesional_id: profesionalId,
        ...reminderConfig,
      },
      { onConflict: 'centro_id,profesional_id' }
    )

  return { error, reminderConfig }
}

type ProfilePayload = {
  nombre: string
  email: string
  telefono: string | null
  avatar_url?: string | null
}

type MembershipUpdatePayload = {
  activo: boolean
  especialidad: string | null
  avatar_url?: string | null
  descanso_entre_reservas_minutos: number
  duracion_sesion_minutos: number
  intervalo_reservas_minutos: number
}

function formatProfilePayload(
  values: ProfesionalFormValues,
  avatarUrl?: string | null
) {
  const payload: ProfilePayload = {
    nombre: values.nombre.trim(),
    email: values.email.trim().toLowerCase(),
    telefono: values.telefono?.trim() || null,
  }

  if (avatarUrl !== undefined) {
    payload.avatar_url = avatarUrl
  }

  return payload
}

function supabaseError(message?: string): string {
  const error = message?.toLowerCase() ?? ''

  if (error.includes('permission denied') || error.includes('row-level security')) {
    return 'No tienes permisos para administrar profesionales en este centro.'
  }

  if (error.includes('duplicate')) {
    return 'Ya existe un profesional con esos datos.'
  }

  if (error.includes('plan_professional_limit_exceeded')) {
    return 'Alcanzaste el límite de profesionales de tu plan. Mejora a Center para coordinar equipo o a Center Pro si necesitas más capacidad operativa.'
  }

  if (error.includes('foreign key')) {
    return 'No pudimos crear el perfil del profesional. Revisa la configuración de perfiles en Supabase.'
  }

  return 'No pudimos guardar el profesional. Intenta nuevamente.'
}

async function revalidateProfesionalPaths(
  supabase: Awaited<ReturnType<typeof getAdminCentroId>>['supabase'],
  centroId: string
) {
  revalidatePath('/profesionales')
  revalidatePath('/agenda')
  await revalidateCentroPublicPaths(supabase, centroId)
}

async function removeStoredProfessionalImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imageUrl: string | null | undefined
) {
  const path = storagePathFromPublicUrl(imageUrl, PROFESSIONAL_AVATARS_BUCKET)

  if (!path) return

  await supabase.storage.from(PROFESSIONAL_AVATARS_BUCKET).remove([path])
}

async function fetchProfesionalByMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  membershipId: string,
  centroId: string
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

  const member = data as unknown as ProfesionalQueryRow
  const { data: reminderConfig, error: reminderConfigError } = await supabase
    .from('configuracion_recordatorios_profesional')
    .select('email_subject_template,email_body_template')
    .eq('centro_id', centroId)
    .eq('profesional_id', member.profile_id)
    .maybeSingle()

  if (reminderConfigError) {
    return { error: supabaseError(reminderConfigError.message) }
  }

  return {
    profesional: toProfesionalListItem(
      member,
      (reminderConfig as ProfesionalReminderConfig | null) ?? null
    ),
  }
}

async function findOrCreateProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: ProfesionalFormValues,
  avatarUrl?: string | null
) {
  const email = values.email.trim().toLowerCase()
  const profilePayload = formatProfilePayload(values, avatarUrl)

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
  values: ProfesionalFormValues,
  avatarUrl?: string | null
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

  const capacity = await validateProfessionalCapacity(supabase, centroId)

  if (!capacity.ok) {
    return { ok: false, message: capacity.message }
  }

  const normalizedAvatarUrl = normalizePublicImageUrl(avatarUrl)
  const { profile, error: profileError } = await findOrCreateProfile(
    supabase,
    parsed.data,
    normalizedAvatarUrl
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

  const effectiveAvatarUrl =
    normalizedAvatarUrl === undefined ? profile.avatar_url : normalizedAvatarUrl

  const { data: membership, error: insertMembershipError } = await supabase
    .from('miembros_centro')
    .insert({
      centro_id: centroId,
      profile_id: profile.id,
      rol: 'profesional',
      especialidad: parsed.data.especialidad?.trim() || null,
      avatar_url: effectiveAvatarUrl,
      descanso_entre_reservas_minutos:
        parsed.data.descanso_entre_reservas_minutos,
      duracion_sesion_minutos: parsed.data.duracion_sesion_minutos,
      intervalo_reservas_minutos: parsed.data.intervalo_reservas_minutos,
      activo: parsed.data.activo,
    })
    .select(
      'id,profile_id,rol,especialidad,descanso_entre_reservas_minutos,duracion_sesion_minutos,intervalo_reservas_minutos,activo,created_at,updated_at'
    )
    .single()

  if (insertMembershipError || !membership) {
    return { ok: false, message: supabaseError(insertMembershipError?.message) }
  }

  const { error: reminderConfigError, reminderConfig } =
    await syncProfesionalReminderConfig(
      supabase,
      centroId,
      profile.id,
      parsed.data
    )

  if (reminderConfigError) {
    return {
      ok: false,
      message: 'El profesional fue creado, pero no pudimos guardar su recordatorio.',
    }
  }

  await revalidateProfesionalPaths(supabase, centroId)

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
      avatar_url: effectiveAvatarUrl,
      descanso_entre_reservas_minutos:
        parsed.data.descanso_entre_reservas_minutos,
      duracion_sesion_minutos: parsed.data.duracion_sesion_minutos,
      intervalo_reservas_minutos: parsed.data.intervalo_reservas_minutos,
      recordatorio_email_subject: reminderConfig.email_subject_template,
      recordatorio_email_body: reminderConfig.email_body_template,
    },
  }
}

export async function updateProfesionalAction(
  id: string,
  values: ProfesionalFormValues,
  avatarUrl?: string | null
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
    .select('id,profile_id,avatar_url,activo,profiles!inner(avatar_url)')
    .eq('id', id)
    .eq('centro_id', centroId)
    .maybeSingle()

  if (membershipError) {
    return { ok: false, message: supabaseError(membershipError.message) }
  }

  if (!membership?.profile_id) {
    return { ok: false, message: 'No pudimos identificar al profesional.' }
  }

  if (parsed.data.activo && membership.activo === false) {
    const capacity = await validateProfessionalCapacity(supabase, centroId)

    if (!capacity.ok) {
      return { ok: false, message: capacity.message }
    }
  }

  const normalizedAvatarUrl = normalizePublicImageUrl(avatarUrl)

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
    .update(formatProfilePayload(parsed.data, normalizedAvatarUrl))
    .eq('id', membership.profile_id)

  if (profileError) {
    return { ok: false, message: supabaseError(profileError.message) }
  }

  const membershipPayload: MembershipUpdatePayload = {
    activo: parsed.data.activo,
    especialidad: parsed.data.especialidad?.trim() || null,
    descanso_entre_reservas_minutos:
      parsed.data.descanso_entre_reservas_minutos,
    duracion_sesion_minutos: parsed.data.duracion_sesion_minutos,
    intervalo_reservas_minutos: parsed.data.intervalo_reservas_minutos,
  }

  if (normalizedAvatarUrl !== undefined) {
    membershipPayload.avatar_url = normalizedAvatarUrl
  }

  const { error: membershipUpdateError } = await supabase
    .from('miembros_centro')
    .update(membershipPayload)
    .eq('id', id)
    .eq('centro_id', centroId)

  if (membershipUpdateError) {
    return { ok: false, message: supabaseError(membershipUpdateError.message) }
  }

  const { error: reminderConfigError } = await syncProfesionalReminderConfig(
    supabase,
    centroId,
    membership.profile_id,
    parsed.data
  )

  if (reminderConfigError) {
    return {
      ok: false,
      message: 'No pudimos guardar el recordatorio personalizado.',
    }
  }

  const { profesional, error: fetchError } = await fetchProfesionalByMembership(
    supabase,
    id,
    centroId
  )

  if (fetchError || !profesional) {
    return { ok: false, message: fetchError ?? 'No pudimos actualizar la vista.' }
  }

  if (normalizedAvatarUrl !== undefined) {
    const previousUrls = new Set(
      [
        membership.avatar_url,
        Array.isArray(membership.profiles)
          ? membership.profiles[0]?.avatar_url
          : membership.profiles?.avatar_url,
      ].filter((url): url is string => Boolean(url && url !== normalizedAvatarUrl))
    )

    await Promise.all(
      [...previousUrls].map((url) =>
        removeStoredProfessionalImage(supabase, url).catch(() => null)
      )
    )
  }

  await revalidateProfesionalPaths(supabase, centroId)

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

  if (activo) {
    const { data: currentMembership, error: currentError } = await supabase
      .from('miembros_centro')
      .select('activo')
      .eq('id', id)
      .eq('centro_id', centroId)
      .maybeSingle()

    if (currentError) {
      return { ok: false, message: supabaseError(currentError.message) }
    }

    if (currentMembership?.activo === false) {
      const capacity = await validateProfessionalCapacity(supabase, centroId)

      if (!capacity.ok) {
        return { ok: false, message: capacity.message }
      }
    }
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

  await revalidateProfesionalPaths(supabase, centroId)

  return {
    ok: true,
    message: activo
      ? 'Profesional activado correctamente.'
      : 'Profesional desactivado correctamente.',
    profesional,
  }
}
