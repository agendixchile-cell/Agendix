import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import { DemoPlanExperience } from '@/components/plans/demo-plan-experience'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { PageHeader } from '@/components/ui/page-header'
import { isDemoMode } from '@/lib/auth/demo'
import { subscriptionStatusLabels } from '@/lib/plans'
import {
  getCurrentOrganizationSubscriptionContext,
  getDemoSubscriptionContext,
} from '@/lib/subscription/server'

type PlanPageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

function getQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null

  return value ?? null
}

function getBillingFeedback(
  billing: string | null,
  billingError: string | null
): FeedbackMessage | null {
  if (billing === 'success') {
    return {
      type: 'success',
      message:
        'Checkout completado. El plan se actualizará automáticamente cuando Stripe confirme el webhook.',
    }
  }

  if (billing === 'cancelled') {
    return {
      type: 'warning',
      message: 'Checkout cancelado. Tu plan actual se mantiene sin cambios.',
    }
  }

  if (billingError === 'migration') {
    return {
      type: 'warning',
      message:
        'Falta aplicar la migración de planes en Supabase antes de activar cobros reales.',
    }
  }

  if (billingError === 'stripe_config') {
    return {
      type: 'warning',
      message:
        'Falta configurar STRIPE_SECRET_KEY para abrir checkout real.',
    }
  }

  if (billingError === 'role') {
    return {
      type: 'error',
      message: 'Solo el owner de la organización puede cambiar el plan.',
    }
  }

  if (billingError) {
    return {
      type: 'error',
      message:
        'No pudimos iniciar el checkout. Revisa la configuración de facturación.',
    }
  }

  return null
}

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const query = searchParams ? await searchParams : {}
  const billingFeedback = getBillingFeedback(
    getQueryValue(query.billing),
    getQueryValue(query.billingError)
  )
  const demoMode = isDemoMode()
  const context = demoMode
    ? await getDemoSubscriptionContext()
    : (await getCurrentOrganizationSubscriptionContext()).data

  if (!context && !demoMode) redirect('/login')

  if (!context) {
    return (
      <div className="agendix-surface rounded-2xl p-5">
        No pudimos cargar la información del plan.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plan y facturación"
        description="Revisa qué incluye tu plan, cuánto estás usando y qué capacidades puedes desbloquear al crecer."
        eyebrow="Mi plan"
        icon={CreditCard}
        meta={
          <div className="flex flex-wrap gap-2">
            {demoMode && <Badge tone="slate">Modo demo</Badge>}
            <Badge tone={context.status === 'active' ? 'green' : 'orange'}>
              {subscriptionStatusLabels[context.status]}
            </Badge>
          </div>
        }
      >
        <Button asChild variant="secondary">
          <Link href="/configuracion">Volver</Link>
        </Button>
        <Button asChild>
          <a href="mailto:contacto@agendixchile.cl?subject=Plan%20Agendix">
            Hablar con ventas
          </a>
        </Button>
      </PageHeader>

      {billingFeedback && <FeedbackBanner feedback={billingFeedback} />}

      <DemoPlanExperience context={context} demoMode={demoMode} />
    </div>
  )
}
