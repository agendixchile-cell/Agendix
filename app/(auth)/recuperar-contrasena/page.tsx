'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordResetAction } from '@/app/actions/auth'
import { AgendixWordmark } from '@/components/brand/agendix-brand'
import { Button } from '@/components/ui/button'
import { FeedbackBanner } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'

export default function RecuperarContrasenaPage() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    undefined
  )

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-5 flex flex-col items-center text-center">
        <AgendixWordmark priority className="mx-auto" />
        <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
          Te enviaremos un enlace seguro para crear una nueva contraseña.
        </p>
      </div>

      <div className="rounded-2xl border border-[#ebe7df] bg-white/85 p-6 shadow-xl shadow-slate-900/[0.06] sm:p-7">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          Recuperar contraseña
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Usa el email asociado a tu cuenta de Agendix.
        </p>

        <form action={formAction} className="space-y-4" noValidate>
          <Field label="Email" error={state?.error}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="agendix-input"
              placeholder="tu@email.com"
              required
            />
          </Field>

          {state?.success && (
            <FeedbackBanner
              feedback={{ type: 'success', message: state.success }}
            />
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
          </Button>

          <Button asChild type="button" variant="ghost" className="w-full">
            <Link href="/login">Volver a iniciar sesión</Link>
          </Button>
        </form>
      </div>
    </div>
  )
}
