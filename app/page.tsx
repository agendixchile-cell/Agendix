import Link from 'next/link'
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  Check,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  UsersRound,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react'
import { AgendixWordmark } from '@/components/brand/agendix-brand'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  featureLabels,
  formatPlanPrice,
  patientLimitLabel,
  professionalLimitLabel,
  subscriptionPlans,
  type FeatureKey,
  type PlanDefinition,
} from '@/lib/plans'
import { getAppUrl } from '@/lib/urls'
import { cn } from '@/lib/utils'

const pricingPlans = [
  subscriptionPlans.individual,
  subscriptionPlans.center,
  subscriptionPlans.center_pro,
  subscriptionPlans.enterprise,
]

const comparisonRows: Array<{
  label: string
  getValue?: (plan: PlanDefinition) => string
  feature?: FeatureKey
}> = [
  {
    label: 'Número de profesionales',
    getValue: (plan) => professionalLimitLabel(plan.id),
  },
  {
    label: 'Pacientes activos',
    getValue: (plan) => patientLimitLabel(plan.id),
  },
  { label: featureLabels.shared_calendar, feature: 'shared_calendar' },
  { label: featureLabels.roles_permissions, feature: 'roles_permissions' },
  { label: featureLabels.admin_panel, feature: 'admin_panel' },
  { label: featureLabels.basic_stats, feature: 'basic_stats' },
  { label: featureLabels.center_stats, feature: 'center_stats' },
  { label: featureLabels.attendance_control, feature: 'attendance_control' },
  {
    label: featureLabels.advanced_patient_management,
    feature: 'advanced_patient_management',
  },
  { label: 'Telemedicina / enlaces Meet o Zoom', feature: 'meeting_links' },
  { label: featureLabels.clinical_team_meetings, feature: 'clinical_team_meetings' },
  { label: featureLabels.custom_training, feature: 'custom_training' },
]

const featureCards: Array<{
  title: string
  description: string
  icon: LucideIcon
  tone: string
}> = [
  {
    title: 'Agenda clínica compartida',
    description:
      'Vista diaria, semanal y mensual para ordenar reservas por profesional, sala y estado.',
    icon: CalendarCheck2,
    tone: 'bg-orange-50 text-orange-600 ring-orange-200/70',
  },
  {
    title: 'Pacientes y seguimiento',
    description:
      'Base de pacientes por centro, notas internas y estado activo para mantener control operativo.',
    icon: HeartPulse,
    tone: 'bg-violet-50 text-violet-600 ring-violet-200/70',
  },
  {
    title: 'Operación del centro',
    description:
      'Servicios, salas, equipo, horarios y recordatorios en una sola configuración.',
    icon: Building2,
    tone: 'bg-sky-50 text-sky-600 ring-sky-200/70',
  },
  {
    title: 'Métricas accionables',
    description:
      'Resumen de reservas, pacientes, asistencia y rendimiento para decidir con contexto.',
    icon: BarChart3,
    tone: 'bg-emerald-50 text-emerald-600 ring-emerald-200/70',
  },
]

function PricingCard({ plan }: { plan: PlanDefinition }) {
  const ctaHref =
    plan.ctaKind === 'sales'
      ? 'mailto:contacto@agendixchile.cl?subject=Demo%20Agendix%20Enterprise'
      : getAppUrl(`/register?plan=${plan.id}`)

  return (
    <article
      className={cn(
        'relative flex min-h-full flex-col rounded-2xl border bg-white p-5 shadow-sm shadow-slate-900/[0.04] sm:p-6',
        plan.highlighted
          ? 'border-orange-300 ring-1 ring-orange-200/80 shadow-xl shadow-slate-900/[0.06]'
          : 'border-slate-200/80'
      )}
    >
      {plan.highlightLabel && (
        <div className="absolute right-4 top-4">
          <Badge tone={plan.highlighted ? 'orange' : 'blue'}>
            {plan.highlightLabel}
          </Badge>
        </div>
      )}

      <Badge tone="slate" className="w-fit">
        {plan.audienceTag}
      </Badge>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
        {plan.commercialName}
      </h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
        {plan.audience}
      </p>
      <div className="mt-5">
        <p className="text-4xl font-bold tracking-tight text-slate-900">
          {formatPlanPrice(plan.monthlyPriceClp)}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-400">/ mes</p>
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {plan.summaryBenefits.slice(0, 6).map((benefit) => (
          <li key={benefit} className="flex gap-2 text-sm leading-5 text-slate-600">
            <Check
              size={16}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-orange-500"
            />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <Button asChild className="mt-7 w-full" variant={plan.ctaKind === 'sales' ? 'secondary' : 'primary'}>
        <Link href={ctaHref}>{plan.ctaKind === 'sales' ? 'Hablar con ventas' : plan.ctaLabel}</Link>
      </Button>
    </article>
  )
}

function ProductMock() {
  const slots = [
    ['09:00', 'Control psicológico', 'Camila Rojas', 'Confirmada', 'bg-emerald-50 text-emerald-700 border-emerald-100'],
    ['10:30', 'Kinesiología', 'Matías Contreras', 'Pendiente', 'bg-orange-50 text-orange-700 border-orange-100'],
    ['12:00', 'Reunión clínica', 'Equipo centro', 'Meet', 'bg-sky-50 text-sky-700 border-sky-100'],
  ]

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl shadow-slate-900/[0.06]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Agenda de hoy
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            Centro Demo Agendix
          </p>
        </div>
        <Badge tone="green">En vivo</Badge>
      </div>
      <div className="mt-4 grid gap-3">
        {slots.map(([time, title, professional, status, classes]) => (
          <div key={`${time}-${title}`} className="grid grid-cols-[54px_1fr] gap-3">
            <span className="pt-3 text-xs font-semibold text-slate-400">{time}</span>
            <div className={`rounded-xl border px-4 py-3 ${classes}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-xs opacity-75">{professional}</p>
                </div>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">
                  {status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          ['18', 'reservas'],
          ['7', 'profesionales'],
          ['92%', 'asistencia'],
        ].map(([value, label]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
            <p className="text-xl font-semibold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <AgendixWordmark preload className="h-10 w-44" />
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#producto" className="hover:text-slate-900">Producto</a>
            <a href="#planes" className="hover:text-slate-900">Planes</a>
            <a href="#comparativa" className="hover:text-slate-900">Comparativa</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={getAppUrl('/login')}
              className="hidden text-sm font-semibold text-slate-700 transition hover:text-orange-600 sm:inline"
            >
              Iniciar sesión
            </Link>
            <Button asChild size="sm">
              <Link href={getAppUrl('/register')}>Crear cuenta</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1280px] gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <div className="max-w-3xl">
          <Badge tone="orange">SaaS clínico para Chile</Badge>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Tu operación clínica en una sola agenda inteligente
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-500">
            Agendix unifica reservas, pacientes, profesionales, salas,
            recordatorios y métricas para que consultas y centros crezcan con
            control.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={getAppUrl('/register')}>Comenzar</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="#planes">Ver planes</a>
            </Button>
          </div>
          <p className="mt-4 text-xs font-medium text-slate-400">
            Sin tarjeta de crédito · Preparado para profesionales y centros
          </p>
        </div>
        <ProductMock />
      </section>

      <section id="producto" className="bg-[#FCFBF9] py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Producto
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Todo lo necesario para operar atención diaria
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map(({ title, description, icon: Icon, tone }) => (
              <article key={title} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.035]">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${tone}`}>
                  <Icon size={19} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="planes" className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Planes
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Elige el plan ideal para tu consulta o centro
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-500">
              Empieza con una consulta individual y escala hacia operación de
              centro, métricas avanzadas y telemedicina cuando el equipo lo pida.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>

          <p className="mt-5 text-center text-sm font-medium text-slate-500">
            Profesional extra desde $2.990 / mes en planes Center y Center Pro,
            habilitable según configuración comercial.
          </p>
        </div>
      </section>

      <section id="comparativa" className="bg-[#FCFBF9] py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Comparativa
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Diferencias clave por plan
              </h2>
            </div>
            <Badge tone="slate">Agendix Center Pro recomendado</Badge>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Funcionalidad</th>
                    {pricingPlans.map((plan) => (
                      <th key={plan.id} className="px-4 py-4">{plan.shortName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-4 font-medium text-slate-700">
                        {row.label}
                      </td>
                      {pricingPlans.map((plan) => (
                        <td key={plan.id} className="px-4 py-4 text-slate-600">
                          {row.getValue ? (
                            row.getValue(plan)
                          ) : row.feature && plan.comparison[row.feature] ? (
                            <Check size={18} aria-label="Incluido" className="text-emerald-500" />
                          ) : (
                            <X size={18} aria-label="No incluido" className="text-slate-300" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-[#22211F] px-6 py-10 text-white shadow-xl shadow-slate-950/[0.12] sm:px-10 sm:py-14">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-300">
                  Preparado para crecer
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  De consulta individual a centro multidisciplinario
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                  La arquitectura de planes controla límites y permisos hoy, y
                  queda lista para Stripe, Mercado Pago o facturación manual.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [UsersRound, 'Roles y equipo'],
                  [ClipboardList, 'Plan y facturación'],
                  [Video, 'Telemedicina'],
                  [ShieldCheck, 'Permisos reales'],
                ].map(([Icon, label]) => {
                  const TypedIcon = Icon as LucideIcon
                  return (
                    <div key={label as string} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <TypedIcon size={20} aria-hidden="true" className="text-orange-300" />
                      <p className="mt-3 text-sm font-semibold text-white">{label as string}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 bg-[#FAFAF8] py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <AgendixWordmark className="h-10 w-44" />
            <p className="mt-2">Sistema operacional para centros de salud.</p>
          </div>
          <p className="text-xs text-slate-400">© 2026 Agendix · Todos los derechos reservados.</p>
        </div>
      </footer>
    </main>
  )
}
