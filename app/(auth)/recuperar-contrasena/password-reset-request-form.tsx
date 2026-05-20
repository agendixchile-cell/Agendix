'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordResetAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { FeedbackBanner } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'

export function PasswordResetRequestForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    undefined
  )

  return (
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
  )
}
