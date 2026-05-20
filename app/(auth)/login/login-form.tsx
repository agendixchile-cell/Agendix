'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { resendConfirmationAction } from '@/app/actions/auth'
import { AgendixWordmark } from '@/components/brand/agendix-brand'
import { Button } from '@/components/ui/button'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { loginSchema, type LoginValues } from '@/lib/auth/validation'
import { createClient } from '@/lib/supabase/client'
import { getMarketingUrl } from '@/lib/urls'

type LoginFormProps = {
  demoMode: boolean
  showCallbackError: boolean
}

const marketingHomeUrl = getMarketingUrl('/')

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

function getInitialFeedback(showCallbackError: boolean): FeedbackMessage | null {
  if (!showCallbackError) return null

  return {
    type: 'error',
    message:
      'No pudimos confirmar la sesión desde el enlace. Solicita un nuevo correo o intenta iniciar sesión nuevamente.',
  }
}

export function LoginForm({ demoMode, showCallbackError }: LoginFormProps) {
  const router = useRouter()
  const [authFeedback, setAuthFeedback] = useState<FeedbackMessage | null>(
    getInitialFeedback(showCallbackError)
  )
  const [canResendConfirmation, setCanResendConfirmation] = useState(false)
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false)
  const {
    register,
    handleSubmit,
    getValues,
    trigger,
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
    setCanResendConfirmation(false)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(values)

    if (error) {
      const emailNotConfirmed = error.message
        .toLowerCase()
        .includes('email not confirmed')

      setCanResendConfirmation(emailNotConfirmed)
      setAuthFeedback({ type: 'error', message: traducirErrorLogin(error.message) })
      return
    }

    router.replace('/agenda')
    router.refresh()
  })

  const onResendConfirmation = async () => {
    const isEmailValid = await trigger('email')

    if (!isEmailValid) return

    setIsResendingConfirmation(true)
    setAuthFeedback(null)

    const state = await resendConfirmationAction(getValues('email'))

    if (state?.error) {
      setAuthFeedback({ type: 'error', message: state.error })
    } else if (state?.success) {
      setAuthFeedback({ type: 'success', message: state.success })
      setCanResendConfirmation(false)
    }

    setIsResendingConfirmation(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-[27rem] flex-col">
      <div className="mb-6 flex flex-col items-center text-center">
        <Link
          href={marketingHomeUrl}
          className="inline-flex"
          aria-label="Volver a la landing de Agendix"
        >
          <AgendixWordmark preload className="mx-auto" />
        </Link>
        <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
          Entra para revisar agenda, pacientes y operación del día.
        </p>
      </div>

      <div className="rounded-2xl border border-[#ebe7df] bg-white/90 p-5 shadow-xl shadow-slate-900/[0.06] sm:p-7">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            Iniciar sesión
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Usa tus credenciales para continuar a Agendix.
          </p>
        </div>

        {demoMode && (
          <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50/70 p-4 text-center">
            <p className="text-sm font-semibold text-slate-900">
              Modo demo local activo
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Puedes entrar sin credenciales para revisar agenda, pacientes y planes.
            </p>
            <Button asChild variant="secondary" className="mt-3 w-full">
              <Link href="/agenda">Entrar al demo</Link>
            </Button>
          </div>
        )}

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

          <div className="-mt-2 flex justify-end">
            <Link
              href="/recuperar-contrasena"
              className="text-sm font-semibold text-orange-500 transition hover:text-orange-600 hover:underline"
            >
              Olvidé mi contraseña
            </Link>
          </div>

          {authFeedback && (
            <FeedbackBanner
              feedback={authFeedback}
              onClose={() => setAuthFeedback(null)}
            />
          )}

          {canResendConfirmation && (
            <button
              type="button"
              onClick={onResendConfirmation}
              disabled={isResendingConfirmation}
              className="text-sm font-semibold text-orange-500 transition hover:text-orange-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResendingConfirmation
                ? 'Reenviando correo...'
                : 'Reenviar correo de confirmación'}
            </button>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full"
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-slate-500">
        ¿No tienes cuenta?{' '}
        <Link
          href="/register"
          className="font-semibold text-orange-500 hover:text-orange-600 hover:underline"
        >
          Registrarse
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-slate-400">
        <Link
          href={marketingHomeUrl}
          className="font-semibold text-slate-500 transition hover:text-orange-600 hover:underline"
        >
          Volver a la landing
        </Link>
      </p>
    </div>
  )
}
