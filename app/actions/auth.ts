'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  loginSchema,
  passwordResetRequestSchema,
  registerSchema,
  updatePasswordSchema,
  type RegisterValues,
} from '@/lib/auth/validation'
import { getPasswordResetCallbackUrl } from '@/lib/urls'

export type AuthState = {
  error?: string
  success?: string
} | undefined

function generarSlug(nombre: string): string {
  const slug = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'centro'
}

function esEmailExistente(errorMessage: string, errorCode?: string): boolean {
  const message = errorMessage.toLowerCase()

  return (
    errorCode === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('user already exists')
  )
}

function esConflictoUnicoSlug(errorCode?: string): boolean {
  return errorCode === '23505'
}

function errorSupabaseEnEspanol(
  errorMessage: string,
  fallback: string,
  errorCode?: string
): string {
  const message = errorMessage.toLowerCase()

  if (esEmailExistente(message, errorCode)) {
    return 'Este email ya está registrado. Inicia sesión.'
  }

  if (message.includes('invalid login credentials')) {
    return 'Credenciales inválidas. Verifica tu email y contraseña.'
  }

  if (message.includes('email not confirmed')) {
    return 'Debes confirmar tu email antes de continuar.'
  }

  if (message.includes('password')) {
    return 'La contraseña no cumple con los requisitos de seguridad.'
  }

  if (message.includes('permission denied') || message.includes('row-level security')) {
    return 'No tienes permisos para completar esta acción.'
  }

  return fallback
}

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: 'Revisa el email y la contraseña.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return {
      error: errorSupabaseEnEspanol(
        error.message,
        'No pudimos iniciar sesión. Intenta nuevamente.',
        error.code
      ),
    }
  }

  redirect('/agenda')
}

export async function requestPasswordResetAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return { error: 'Ingresa un email válido para recuperar tu contraseña.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email.trim().toLowerCase(),
    {
      redirectTo: getPasswordResetCallbackUrl(),
    }
  )

  if (error) {
    return {
      error: errorSupabaseEnEspanol(
        error.message,
        'No pudimos enviar el correo de recuperación. Intenta nuevamente.',
        error.code
      ),
    }
  }

  return {
    success:
      'Te enviamos un enlace para crear una nueva contraseña. Revisa también spam o promociones.',
  }
}

export async function updatePasswordAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmarPassword: formData.get('confirmarPassword'),
  })

  if (!parsed.success) {
    return { error: 'Revisa la nueva contraseña y su confirmación.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error:
        'El enlace de recuperación expiró o no abrió sesión. Solicita un nuevo correo.',
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return {
      error: errorSupabaseEnEspanol(
        error.message,
        'No pudimos actualizar la contraseña. Solicita un nuevo enlace e intenta otra vez.',
        error.code
      ),
    }
  }

  redirect('/agenda')
}

export async function registerAction(values: RegisterValues): Promise<AuthState> {
  const parsed = registerSchema.safeParse(values)

  if (!parsed.success) {
    return { error: 'Revisa los datos del formulario.' }
  }

  const { nombre, email, password, nombreCentro } = parsed.data

  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const provisioningClient = adminSupabase ?? supabase

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre } },
  })

  if (signUpError) {
    return {
      error: errorSupabaseEnEspanol(
        signUpError.message,
        'No pudimos crear la cuenta. Intenta nuevamente.',
        signUpError.code
      ),
    }
  }

  const userId = signUpData.user?.id
  if (!userId) {
    return { error: 'No pudimos crear la cuenta. Intenta nuevamente.' }
  }

  if (signUpData.user?.identities?.length === 0) {
    return { error: 'Este email ya está registrado. Inicia sesión.' }
  }

  const slugBase = generarSlug(nombreCentro)
  let centroId: string | null = null
  let ultimoErrorCentro: string | null = null

  const { error: profileError } = await provisioningClient
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: email.trim().toLowerCase(),
        nombre: nombre.trim(),
      },
      { onConflict: 'id' }
    )

  if (profileError) {
    return {
      error: errorSupabaseEnEspanol(
        profileError.message,
        'No pudimos preparar tu perfil. Intenta nuevamente.',
        profileError.code
      ),
    }
  }

  for (let intento = 0; intento < 50; intento++) {
    const slug = intento === 0 ? slugBase : `${slugBase}-${intento}`

    const { data: centro, error: centroError } = await provisioningClient
      .from('centros')
      .insert({ nombre: nombreCentro, slug })
      .select('id')
      .single()

    if (!centroError && centro) {
      centroId = centro.id
      break
    }

    if (centroError && esConflictoUnicoSlug(centroError.code)) {
      ultimoErrorCentro = centroError.message
      continue
    }

    return {
      error: errorSupabaseEnEspanol(
        centroError?.message ?? '',
        'No pudimos crear el centro. Intenta nuevamente.',
        centroError?.code
      ),
    }
  }

  if (!centroId) {
    return {
      error: errorSupabaseEnEspanol(
        ultimoErrorCentro ?? '',
        'No pudimos generar un slug disponible para el centro. Intenta con otro nombre.'
      ),
    }
  }

  const { error: miembroError } = await provisioningClient
    .from('miembros_centro')
    .insert({ centro_id: centroId, profile_id: userId, rol: 'admin' })

  if (miembroError) {
    return {
      error: errorSupabaseEnEspanol(
        miembroError.message,
        'No pudimos configurar tu acceso al centro. Contacta soporte.',
        miembroError.code
      ),
    }
  }

  await provisioningClient.from('salas').insert({
    centro_id: centroId,
    nombre: 'Consulta general',
    descripcion: 'Espacio base para agenda clínica',
    capacidad: 1,
    activa: true,
  })

  await provisioningClient.from('servicios').insert({
    centro_id: centroId,
    nombre: 'Consulta',
    descripcion: 'Servicio base para comenzar a agendar',
    duracion_minutos: 50,
    precio: null,
    activo: true,
  })

  if (!signUpData.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      if (signInError.message.toLowerCase().includes('email not confirmed')) {
        return {
          error:
            'Cuenta creada. Revisa tu correo para confirmar el email y luego inicia sesión.',
        }
      }

      return {
        error: errorSupabaseEnEspanol(
          signInError.message,
          'Tu cuenta fue creada, pero no pudimos iniciar sesión automáticamente.',
          signInError.code
        ),
      }
    }
  }

  redirect('/agenda')
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
