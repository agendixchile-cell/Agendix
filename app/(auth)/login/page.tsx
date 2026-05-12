'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { AgendixWordmark } from '@/components/brand/agendix-brand'
import { Button } from '@/components/ui/button'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginValues } from '@/lib/auth/validation'

function traducirErrorLogin(message: string): string {
  const error = message.toLowerCase()

  if (error.includes('invalid') || error.includes('credentials')) {
    return 'Credenciales inválidas. Verifica tu email y contraseña.'
  }

  if (error.includes('email not confirmed')) {
    return 'Debes confirmar tu email antes de continuar.'
  }

  return 'No pudimos iniciar sesión. Intenta nuevamente.'
}

export default function LoginPage() {
  const router = useRouter()
  const [authFeedback, setAuthFeedback] = useState<FeedbackMessage | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setAuthFeedback(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(values)

    if (error) {
      setAuthFeedback({ type: 'error', message: traducirErrorLogin(error.message) })
      return
    }

    router.replace('/agenda')
    router.refresh()
  })

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-5 flex flex-col items-center text-center">
        <AgendixWordmark priority className="mx-auto" />
        <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
          Entra para revisar agenda, pacientes y operación del día.
        </p>
      </div>

      <div className="rounded-2xl border border-[#ebe7df] bg-white/85 p-6 shadow-xl shadow-slate-900/[0.06] sm:p-7">
        <h2 className="mb-1 text-xl font-semibold text-slate-900">
          Iniciar sesión
        </h2>
        <p className="mb-6 text-sm text-slate-500">
          Usa tus credenciales para continuar a Agendix.
        </p>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Email" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? 'true' : 'false'}
              className="agendix-input"
              placeholder="tu@email.com"
              {...register('email')}
            />
          </Field>

          <Field label="Contraseña" error={errors.password?.message}>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.password ? 'true' : 'false'}
              className="agendix-input"
              placeholder="Tu contraseña"
              {...register('password')}
            />
          </Field>

          {authFeedback && (
            <FeedbackBanner
              feedback={authFeedback}
              onClose={() => setAuthFeedback(null)}
            />
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿No tienes cuenta?{' '}
        <Link
          href="/register"
          className="font-semibold text-orange-500 hover:text-orange-600 hover:underline"
        >
          Registrarse
        </Link>
      </p>
    </div>
  )
}
