'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { updatePasswordAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { FeedbackBanner } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'

export function PasswordUpdateForm() {
  const [state, formAction, isPending] = useActionState(
    updatePasswordAction,
    undefined
  )

  return (
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
  )
}
