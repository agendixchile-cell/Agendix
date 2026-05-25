import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import { DemoPlanExperience } from '@/components/plans/demo-plan-experience'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { isDemoMode } from '@/lib/auth/demo'
import { subscriptionStatusLabels } from '@/lib/plans'
import {
  getCurrentOrganizationSubscriptionContext,
  getDemoSubscriptionContext,
} from '@/lib/subscription/server'

export default async function PlanPage() {
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
        title="Plan y uso"
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

      <DemoPlanExperience context={context} demoMode={demoMode} />
    </div>
  )
}
