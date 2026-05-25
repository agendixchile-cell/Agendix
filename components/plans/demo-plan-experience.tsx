'use client'

import {
  ArrowUpRight,
  Check,
  LockKeyhole,
  Sparkles,
} from 'lucide-react'
import { useDemoPlan } from '@/hooks/use-demo-plan'
import { UsageMeter } from '@/components/plans/usage-meter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import {
  formatPlanPrice,
  getFeatureDefinition,
  getNextPlan,
  getPatientLimit,
  getProfessionalLimit,
  hasFeature,
  planIds,
  subscriptionPlans,
  type FeatureKey,
  type PlanId,
  type PlanUsageContext,
} from '@/lib/plans'

type DemoPlanExperienceProps = {
  context: PlanUsageContext
  demoMode: boolean
}

const demoFeatureRows: FeatureKey[] = [
  'advanced_calendar',
  'shared_calendar',
  'admin_panel',
  'center_stats',
  'attendance_control',
  'advanced_patient_management',
  'meeting_links',
  'automatic_meeting_links',
]

export function DemoPlanExperience({
  context,
  demoMode,
}: DemoPlanExperienceProps) {
  const demoPlan = useDemoPlan(context.planId, { enabled: demoMode })
  const activePlanId = demoMode ? demoPlan.planId : context.planId
  const activePlan = demoMode ? demoPlan.plan : context.plan
  const activeDataset = demoMode ? getDemoPlanDataset(activePlanId) : null
  const activeUsage = activeDataset
    ? {
        professionals: activeDataset.profesionales.filter(
          (profesional) => profesional.activo
        ).length,
        activePatients: activeDataset.pacientes.filter(
          (paciente) => paciente.activo !== false
        ).length,
        upcomingReservations: activeDataset.reservas.filter((reserva) =>
          ['pending', 'confirmed'].includes(reserva.estado)
        ).length,
      }
    : context.usage
  const nextPlan = getNextPlan(activePlanId)
  const professionalLimit = getProfessionalLimit(
    activePlanId,
    context.extraProfessionalsCount
  )
  const patientLimit = getPatientLimit(activePlanId)

  return (
    <>
      {demoMode && (
        <PlanSimulationSelector
          activePlanId={activePlanId}
          isPending={demoPlan.isPending}
          onChange={demoPlan.changePlan}
        />
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="agendix-surface rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge tone="orange">{activePlan.audienceTag}</Badge>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                {activePlan.commercialName}
              </h2>
              <p className="mt-2 text-sm font-semibold text-orange-700">
                {activePlan.positioning}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {activePlan.description}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 md:text-right">
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                {activePlan.ctaKind === 'sales'
                  ? 'A medida'
                  : formatPlanPrice(activePlan.monthlyPriceClp)}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {activePlan.ctaKind === 'sales' ? 'según alcance' : '/ mes'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <UsageMeter
              label="Profesionales usados"
              value={activeUsage.professionals}
              limit={professionalLimit}
              helper={`${activePlan.professionalRangeLabel}${
                context.extraProfessionalsCount > 0
                  ? ` · ${context.extraProfessionalsCount} extra`
                  : ''
              }`}
            />
            <UsageMeter
              label="Pacientes activos"
              value={activeUsage.activePatients}
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
              {activePlan.summaryBenefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex gap-2 rounded-xl bg-slate-50/70 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200/70"
                >
                  <Check
                    size={15}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-orange-500"
                  />
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
                Solicitar cambio
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </Button>
          </div>
        </aside>
      </section>

      <section className="agendix-surface rounded-2xl p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Simulación de módulos por plan
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Esta vista traduce el pricing a experiencia real: lo incluido se
              muestra como activo y lo bloqueado apunta al plan mínimo requerido.
            </p>
          </div>
          {demoMode && <Badge tone="orange">Cambia arriba y compara</Badge>}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {demoFeatureRows.map((feature) => {
            const item = getFeatureDefinition(feature)
            const included = hasFeature(activePlanId, feature)
            const isSalesOnly = item.status === 'sales_only'

            return (
              <article
                key={item.key}
                className={`rounded-2xl border p-4 transition-colors ${
                  included
                    ? isSalesOnly
                      ? 'border-sky-200/80 bg-sky-50/70'
                      : 'border-emerald-200/80 bg-emerald-50/70'
                    : 'border-slate-200/80 bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${
                      included && !isSalesOnly
                        ? 'bg-white text-emerald-600 ring-emerald-200/70'
                        : included && isSalesOnly
                          ? 'bg-white text-sky-600 ring-sky-200/70'
                        : 'bg-white text-slate-400 ring-slate-200/80'
                    }`}
                  >
                    {included && !isSalesOnly ? (
                      <Check size={16} aria-hidden="true" />
                    ) : (
                      <LockKeyhole size={16} aria-hidden="true" />
                    )}
                  </span>
                  <Badge tone={included ? (isSalesOnly ? 'blue' : 'green') : 'slate'}>
                    {included
                      ? isSalesOnly
                        ? 'A medida'
                        : item.status === 'preview'
                          ? 'Preview'
                          : 'Incluido'
                      : 'Bloqueado'}
                  </Badge>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">
                  {item.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="agendix-surface rounded-2xl p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Enterprise: automatización e integraciones a medida
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {hasFeature(activePlanId, 'automatic_meeting_links')
                ? 'Enterprise se evalúa con ventas: atención remota, links automáticos e integraciones dependen del alcance de implementación.'
                : 'Center Pro guarda links manuales de Meet/Zoom. Las automatizaciones e integraciones se revisan como implementación Enterprise.'}
            </p>
          </div>
          <Badge
            tone={
              hasFeature(activePlanId, 'automatic_meeting_links')
                ? 'green'
                : 'slate'
            }
          >
            {hasFeature(activePlanId, 'automatic_meeting_links')
              ? 'A medida'
              : 'Enterprise'}
          </Badge>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Object.values(subscriptionPlans).map((plan) => (
          <PlanCard
            key={plan.id}
            activePlanId={activePlanId}
            demoMode={demoMode}
            planId={plan.id}
            onDemoSelect={demoPlan.changePlan}
          />
        ))}
      </section>
    </>
  )
}

function PlanSimulationSelector({
  activePlanId,
  isPending,
  onChange,
}: {
  activePlanId: PlanId
  isPending: boolean
  onChange: (planId: PlanId) => void
}) {
  const activePlan = subscriptionPlans[activePlanId]

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles
              size={15}
              className="shrink-0 text-orange-500"
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-slate-900">
              Plan actual en demo
            </p>
            <Badge tone="slate">Local</Badge>
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-900">
            {activePlan.commercialName}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {activePlan.ctaKind === 'sales'
              ? 'A medida · '
              : `${formatPlanPrice(activePlan.monthlyPriceClp)} / mes · `}
            {activePlan.audience}
          </p>
        </div>
        <select
          value={activePlanId}
          onChange={(event) => onChange(event.target.value as PlanId)}
          disabled={isPending}
          className="agendix-select min-w-[220px]"
          aria-label="Simular plan comercial"
        >
          {planIds.map((planId) => (
            <option key={planId} value={planId}>
              {subscriptionPlans[planId].commercialName}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {planIds.map((planId) => {
          const plan = subscriptionPlans[planId]
          const active = planId === activePlanId

          return (
            <button
              key={planId}
              type="button"
              onClick={() => onChange(planId)}
              disabled={isPending}
              className={`rounded-xl border px-3 py-2 text-left transition-all ${
                active
                  ? 'border-orange-300 bg-orange-50 text-orange-800 ring-1 ring-orange-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50/60 hover:text-slate-900'
              }`}
              aria-pressed={active}
            >
              <span className="block text-sm font-semibold">{plan.shortName}</span>
              <span className="mt-0.5 block text-xs">
                {plan.ctaKind === 'sales'
                  ? 'A medida'
                  : formatPlanPrice(plan.monthlyPriceClp)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PlanCard({
  activePlanId,
  demoMode,
  planId,
  onDemoSelect,
}: {
  activePlanId: PlanId
  demoMode: boolean
  planId: PlanId
  onDemoSelect: (planId: PlanId) => void
}) {
  const plan = subscriptionPlans[planId]
  const active = plan.id === activePlanId

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm shadow-slate-900/[0.03] transition-all ${
        active
          ? 'border-orange-300 ring-1 ring-orange-200'
          : 'border-slate-200/80'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{plan.shortName}</h3>
        {active && <Badge tone="orange">Actual</Badge>}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {plan.professionalRangeLabel}
      </p>
      <p className="mt-4 text-xl font-bold text-slate-900">
        {plan.ctaKind === 'sales'
          ? 'A medida'
          : formatPlanPrice(plan.monthlyPriceClp)}
      </p>
      {plan.extras.professionals && (
        <p className="mt-2 text-xs font-medium text-slate-500">
          {plan.extras.professionals.label}:{' '}
          {formatPlanPrice(plan.extras.professionals.priceMonthlyClp)} / mes
        </p>
      )}
      {!active && (
        <div className="mt-4">
          {demoMode ? (
            <Button
              type="button"
              size="sm"
              variant={plan.highlighted ? 'primary' : 'secondary'}
              className="w-full"
              onClick={() => onDemoSelect(plan.id)}
            >
              Simular este plan
            </Button>
          ) : plan.ctaKind === 'self_service' ? (
            <Button asChild size="sm" variant={plan.highlighted ? 'primary' : 'secondary'} className="w-full">
              <a href={`mailto:contacto@agendixchile.cl?subject=${encodeURIComponent(`Cambiar a ${plan.commercialName}`)}`}>
                Solicitar cambio
              </a>
            </Button>
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
  )
}
