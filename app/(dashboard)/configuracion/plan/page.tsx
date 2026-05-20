import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight, Check, CreditCard, Sparkles } from 'lucide-react'
import { createBillingCheckoutAction } from '@/app/actions/billing'
import { DemoPlanSwitcher } from '@/components/plans/demo-plan-switcher'
import { UsageMeter } from '@/components/plans/usage-meter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { PageHeader } from '@/components/ui/page-header'
import { isDemoMode } from '@/lib/auth/demo'
import {
  formatPlanPrice,
  getNextPlan,
  getPatientLimit,
  getProfessionalLimit,
  hasFeature,
  subscriptionPlans,
  subscriptionStatusLabels,
} from '@/lib/plans'
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

  const nextPlan = getNextPlan(context.planId)
  const professionalLimit = getProfessionalLimit(
    context.planId,
    context.extraProfessionalsCount
  )
  const patientLimit = getPatientLimit(context.planId)

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

      {demoMode && <DemoPlanSwitcher currentPlanId={context.planId} />}
      {billingFeedback && <FeedbackBanner feedback={billingFeedback} />}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="agendix-surface rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge tone="orange">{context.plan.audienceTag}</Badge>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                {context.plan.commercialName}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {context.plan.description}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 md:text-right">
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                {formatPlanPrice(context.plan.monthlyPriceClp)}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">/ mes</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <UsageMeter
              label="Profesionales usados"
              value={context.usage.professionals}
              limit={professionalLimit}
              helper={`${context.plan.professionalRangeLabel}${
                context.extraProfessionalsCount > 0
                  ? ` · ${context.extraProfessionalsCount} extra`
                  : ''
              }`}
            />
            <UsageMeter
              label="Pacientes activos"
              value={context.usage.activePatients}
              limit={patientLimit}
              helper="Pacientes con estado activo en la organización."
              tone="green"
            />
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-800">
              Beneficios incluidos
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {context.plan.summaryBenefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex gap-2 rounded-xl bg-slate-50/70 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200/70"
                >
                  <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-orange-500" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-orange-200/80 bg-orange-50 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-600 ring-1 ring-orange-200/70">
                <Sparkles size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Próximo paso sugerido
                </p>
                <p className="text-xs text-slate-500">{nextPlan.commercialName}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Desbloquea más capacidad y funciones de equipo cuando la operación
              supere el plan actual.
            </p>
            <Button asChild className="mt-4 w-full">
              <a href="mailto:contacto@agendixchile.cl?subject=Mejorar%20plan%20Agendix">
                Mejorar plan
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </Button>
          </div>

          <div className="agendix-surface rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-900">
              Checkout real preparado
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Stripe Checkout queda conectado a webhooks para sincronizar plan,
              estado y suscripción cuando estén las claves y la migración en Supabase.
            </p>
          </div>
        </aside>
      </section>

      <section className="agendix-surface rounded-2xl p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Telemedicina integrada y enlaces automáticos
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {hasFeature(context.planId, 'automatic_meeting_links')
                ? 'Tu plan incluye la arquitectura para enlaces automáticos, reuniones clínicas e integraciones avanzadas.'
                : 'Disponible en Enterprise. La app ya guarda enlaces manuales en Center Pro y queda preparada para generación automática con Zoom o Google Meet.'}
            </p>
          </div>
          <Badge tone={hasFeature(context.planId, 'automatic_meeting_links') ? 'green' : 'slate'}>
            {hasFeature(context.planId, 'automatic_meeting_links')
              ? 'Incluido'
              : 'Enterprise'}
          </Badge>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Object.values(subscriptionPlans).map((plan) => (
          <article
            key={plan.id}
            className={`rounded-2xl border bg-white p-4 shadow-sm shadow-slate-900/[0.03] ${
              plan.id === context.planId
                ? 'border-orange-300 ring-1 ring-orange-200'
                : 'border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{plan.shortName}</h3>
              {plan.id === context.planId && <Badge tone="orange">Actual</Badge>}
            </div>
            <p className="mt-2 text-sm text-slate-500">{plan.professionalRangeLabel}</p>
            <p className="mt-4 text-xl font-bold text-slate-900">
              {formatPlanPrice(plan.monthlyPriceClp)}
            </p>
            {plan.id !== context.planId && (
              <div className="mt-4">
                {plan.ctaKind === 'self_service' && !demoMode ? (
                  <form action={createBillingCheckoutAction}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant={plan.highlighted ? 'primary' : 'secondary'}
                      className="w-full"
                    >
                      Cambiar plan
                    </Button>
                  </form>
                ) : (
                  <Button asChild size="sm" variant="secondary" className="w-full">
                    <a href="mailto:contacto@agendixchile.cl?subject=Plan%20Enterprise%20Agendix">
                      Hablar con ventas
                    </a>
                  </Button>
                )}
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  )
}
