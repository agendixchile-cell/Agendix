'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { demoPlanCookieName } from '@/lib/demo-plan'
import { normalizePlanId, type PlanId } from '@/lib/plans'

export async function setDemoPlanAction(planId: PlanId) {
  if (process.env.NODE_ENV === 'production') {
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
