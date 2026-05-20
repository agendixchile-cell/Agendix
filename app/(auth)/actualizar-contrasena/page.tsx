'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { updatePasswordAction } from '@/app/actions/auth'
import { AgendixWordmark } from '@/components/brand/agendix-brand'
import { Button } from '@/components/ui/button'
import { FeedbackBanner } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'

export default function ActualizarContrasenaPage() {
  const [state, formAction, isPending] = useActionState(
    updatePasswordAction,
    undefined
  )

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-5 flex flex-col items-center text-center">
        <AgendixWordmark priority className="mx-auto" />
        <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
          Crea una contraseña nueva para volver a ingresar a Agendix.
        </p>
      </div>

      <div className="rounded-2xl border border-[#ebe7df] bg-white/85 p-6 shadow-xl shadow-slate-900/[0.06] sm:p-7">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          Nueva contraseña
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          El enlace de recuperación deja tu sesión lista para guardar el cambio.
        </p>

        <form action={formAction} className="space-y-4" noValidate>
          <Field label="Nueva contraseña" error={state?.error}>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className="agendix-input"
              placeholder="Nueva contraseña"
              minLength={8}
              required
            />
          </Field>

          <Field label="Confirmar contraseña">
            <input
              id="confirmarPassword"
              name="confirmarPassword"
              type="password"
              autoComplete="new-password"
              className="agendix-input"
              placeholder="Repite tu contraseña"
              minLength={8}
              required
            />
          </Field>

          {state?.success && (
            <FeedbackBanner
              feedback={{ type: 'success', message: state.success }}
            />
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Actualizando...' : 'Actualizar contraseña'}
          </Button>

          <Button asChild type="button" variant="ghost" className="w-full">
            <Link href="/login">Volver a iniciar sesión</Link>
          </Button>
        </form>
      </div>
    </div>
  )
}
