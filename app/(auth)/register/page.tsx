'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { registerAction, resendConfirmationAction } from '@/app/actions/auth'
import { AgendixWordmark } from '@/components/brand/agendix-brand'
import { Button } from '@/components/ui/button'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { registerSchema, type RegisterValues } from '@/lib/auth/validation'
import { getMarketingUrl } from '@/lib/urls'

const marketingHomeUrl = getMarketingUrl('/')

export default function RegisterPage() {
  const [serverFeedback, setServerFeedback] = useState<FeedbackMessage | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombre: '',
      email: '',
      password: '',
      confirmarPassword: '',
      nombreCentro: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerFeedback(null)
    const state = await registerAction(values)

    if (state?.error) {
      setServerFeedback({ type: 'error', message: state.error })
      setRegisteredEmail(null)
      return
    }

    if (state?.success) {
      setServerFeedback({ type: 'success', message: state.success })
      setRegisteredEmail(values.email.trim().toLowerCase())
      reset()
    }
  })

  const onResendConfirmation = async () => {
    if (!registeredEmail) return

    setIsResendingConfirmation(true)
    setServerFeedback(null)

    const state = await resendConfirmationAction(registeredEmail)

    if (state?.error) {
      setServerFeedback({ type: 'error', message: state.error })
    } else if (state?.success) {
      setServerFeedback({ type: 'success', message: state.success })
    }

    setIsResendingConfirmation(false)
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex flex-col items-center text-center">
        <Link
          href={marketingHomeUrl}
          className="inline-flex"
          aria-label="Volver a la landing de Agendix"
        >
          <AgendixWordmark preload className="mx-auto" />
        </Link>
        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          Crea tu espacio para ordenar reservas, pacientes y equipo.
        </p>
      </div>

      <div className="rounded-2xl border border-[#ebe7df] bg-white/85 p-6 shadow-xl shadow-slate-900/[0.06] sm:p-7">
        <h2 className="mb-1 text-xl font-semibold text-slate-900">
          Crear cuenta
        </h2>
        <p className="mb-6 text-sm text-slate-500">
          Deja listo tu centro y empieza a operar en minutos.
        </p>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tu nombre" error={errors.nombre?.message}>
              <input
                id="nombre"
                type="text"
                autoComplete="given-name"
                aria-invalid={errors.nombre ? 'true' : 'false'}
                className="agendix-input"
                placeholder="María González"
                {...register('nombre')}
              />
            </Field>

            <Field label="Nombre del centro" error={errors.nombreCentro?.message}>
              <input
                id="nombreCentro"
                type="text"
                aria-invalid={errors.nombreCentro ? 'true' : 'false'}
                className="agendix-input"
                placeholder="Centro de Salud"
                {...register('nombreCentro')}
              />
            </Field>
          </div>

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

          <Field label="Contraseña" error={errors.password?.message} hint="Mínimo 8 caracteres">
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.password ? 'true' : 'false'}
              className="agendix-input"
              placeholder="••••••••"
              {...register('password')}
            />
          </Field>

          <Field label="Confirmar contraseña" error={errors.confirmarPassword?.message}>
            <input
              id="confirmarPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.confirmarPassword ? 'true' : 'false'}
              className="agendix-input"
              placeholder="Repite tu contraseña"
              {...register('confirmarPassword')}
            />
          </Field>

          {serverFeedback && (
            <FeedbackBanner
              feedback={serverFeedback}
              onClose={() => setServerFeedback(null)}
            />
          )}

          {registeredEmail && (
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
            disabled={isSubmitting || serverFeedback?.type === 'success'}
            className="w-full"
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="font-semibold text-orange-500 hover:text-orange-600 hover:underline"
        >
          Iniciar sesión
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
