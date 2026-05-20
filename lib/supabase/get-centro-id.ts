import { createClient } from './server'

type GetCentroIdResult =
  | { supabase: Awaited<ReturnType<typeof createClient>>; centroId: string; error?: never }
  | { supabase: Awaited<ReturnType<typeof createClient>>; centroId?: never; error: string }

type GetAdminCentroIdResult =
  | { supabase: Awaited<ReturnType<typeof createClient>>; centroId: string; error?: never }
  | { supabase: Awaited<ReturnType<typeof createClient>>; centroId?: never; error: string }

type GetClinicalCentroIdResult =
  | {
      supabase: Awaited<ReturnType<typeof createClient>>
      centroId: string
      profileId: string
      rol: 'owner' | 'admin' | 'profesional'
      error?: never
    }
  | {
      supabase: Awaited<ReturnType<typeof createClient>>
      centroId?: never
      profileId?: never
      rol?: never
      error: string
    }

export async function getCentroId(recurso = 'este recurso'): Promise<GetCentroIdResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, error: `Debes iniciar sesión para administrar ${recurso}.` }
  }

  const { data, error } = await supabase
    .from('miembros_centro')
    .select('centro_id')
    .eq('profile_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  if (error || !data?.centro_id) {
    return { supabase, error: 'No encontramos un centro asociado a tu usuario.' }
  }

  return { supabase, centroId: data.centro_id }
}

export async function getAdminCentroId(recurso = 'este recurso'): Promise<GetAdminCentroIdResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, error: `Debes iniciar sesión para administrar ${recurso}.` }
  }

  const { data, error } = await supabase
    .from('miembros_centro')
    .select('centro_id, rol')
    .eq('profile_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  if (error || !data?.centro_id) {
    return { supabase, error: 'No encontramos un centro asociado a tu usuario.' }
  }

  if (data.rol !== 'owner' && data.rol !== 'admin') {
    return {
      supabase,
      error: `Solo administradores pueden actualizar ${recurso}.`,
    }
  }

  return { supabase, centroId: data.centro_id }
}

export async function getClinicalCentroId(
  recurso = 'este recurso clinico'
): Promise<GetClinicalCentroIdResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, error: `Debes iniciar sesión para administrar ${recurso}.` }
  }

  const { data, error } = await supabase
    .from('miembros_centro')
    .select('centro_id, rol')
    .eq('profile_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  if (error || !data?.centro_id) {
    return { supabase, error: 'No encontramos un centro asociado a tu usuario.' }
  }

  if (
    data.rol !== 'owner' &&
    data.rol !== 'admin' &&
    data.rol !== 'profesional'
  ) {
    return {
      supabase,
      error: `Tu rol no puede acceder a ${recurso}.`,
    }
  }

  return {
    supabase,
    centroId: data.centro_id,
    profileId: user.id,
    rol: data.rol,
  }
}
