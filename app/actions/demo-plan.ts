'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { demoPlanCookieName } from '@/lib/demo-plan'
import { normalizePlanId, type PlanId } from '@/lib/plans'

export async function setDemoPlanAction(planId: PlanId) {
  const demoEnabled =
    process.env.AGENDIX_DEMO_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_AGENDIX_DEMO_ENABLED === 'true' ||
    (process.env.AGENDIX_DEMO_MODE === 'true' &&
      process.env.NODE_ENV !== 'production')

  if (!demoEnabled) {
    return {
      ok: false,
      message: 'El selector de plan demo no está disponible en producción.',
    }
  }

  const nextPlanId = normalizePlanId(planId)
  const cookieStore = await cookies()

  cookieStore.set(demoPlanCookieName, nextPlanId, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })

  revalidatePath('/agenda')
  revalidatePath('/reservas')
  revalidatePath('/pacientes')
  revalidatePath('/profesionales')
  revalidatePath('/dashboard')
  revalidatePath('/estadisticas')
  revalidatePath('/fichas-clinicas')
  revalidatePath('/configuracion')
  revalidatePath('/configuracion/plan')
  revalidatePath('/admin')
  revalidatePath('/agendar/[slug]', 'page')

  return {
    ok: true,
    message: 'Plan demo actualizado.',
  }
}
