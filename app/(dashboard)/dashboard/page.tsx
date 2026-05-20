import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  ShieldCheck,
  Stethoscope,
  UsersRound,
  Video,
} from 'lucide-react'
import { UpgradeCard } from '@/components/plans/upgrade-card'
import { UsageMeter } from '@/components/plans/usage-meter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricStrip } from '@/components/ui/metric-strip'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { isDemoMode } from '@/lib/auth/demo'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import {
  getPatientLimit,
  getProfessionalLimit,
  hasFeature,
  subscriptionStatusLabels,
  type PlanId,
} from '@/lib/plans'
import type { ReservaListItem } from '@/lib/reservas/types'
import {
  getCurrentOrganizationSubscriptionContext,
  getDemoSubscriptionContext,
} from '@/lib/subscription/server'

type DashboardTone = 'personal' | 'center' | 'pro' | 'enterprise'

const dashboardCopy: Record<
  PlanId,
  {
    tone: DashboardTone
    title: string
    description: string
    eyebrow: string
  }
> = {
  individual: {
    tone: 'personal',
    title: 'Dashboard personal',
    description:
      'Una vista simple para controlar tu agenda, pacientes activos y tareas del dia sin ruido de centro.',
    eyebrow: 'Consulta individual',
  },
  center: {
    tone: 'center',
    title: 'Dashboard del centro',
    description:
      'Coordinacion diaria del equipo, reservas compartidas y capacidad operativa para un centro pequeno.',
    eyebrow: 'Operacion colaborativa',
  },
  center_pro: {
    tone: 'pro',
    title: 'Dashboard Center Pro',
    description:
      'Metrica agregada, asistencia, telemedicina y carga por profesional para una operacion en crecimiento.',
    eyebrow: 'Centro en crecimiento',
  },
  enterprise: {
    tone: 'enterprise',
    title: 'Dashboard Enterprise',
    description:
      'Panel ejecutivo de mayor escala para equipos amplios, alto volumen de agenda y operacion multiservicio.',
    eyebrow: 'Operacion enterprise',
  },
}

function dateKey(value: string) {
  return new Date(value).toLocaleDateString('en-CA')
}

function todayReservations(reservas: ReservaListItem[]) {
  const today = dateKey(new Date().toISOString())

  return reservas.filter((reserva) => dateKey(reserva.fecha_inicio) === today)
}

function attendanceRate(reservas: ReservaListItem[]) {
  const closed = reservas.filter((reserva) =>
    ['completed', 'no_show'].includes(reserva.estado)
  )

  if (closed.length === 0) return '0%'

  const attended = closed.filter((reserva) => reserva.estado === 'completed')

  return `${Math.round((attended.length / closed.length) * 100)}%`
}

function telemedicineCount(reservas: ReservaListItem[]) {
  return reservas.filter((reserva) => Boolean(reserva.meeting_url)).length
}

function busiestProfessionals(reservas: ReservaListItem[]) {
  const countByProfessional = new Map<string, { name: string; count: number }>()

  reservas.forEach((reserva) => {
    const current = countByProfessional.get(reserva.profesional.id)

    countByProfessional.set(reserva.profesional.id, {
      name: reserva.profesional.nombre,
      count: (current?.count ?? 0) + 1,
    })
  })

  return Array.from(countByProfessional.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
}

export default async function DashboardPage() {
  const demoMode = isDemoMode()
  const context = demoMode
    ? await getDemoSubscriptionContext()
    : (await getCurrentOrganizationSubscriptionContext()).data

  if (!context && !demoMode) redirect('/login')

  if (!context) {
    return (
      <div className="agendix-surface rounded-2xl p-5">
        No pudimos cargar el dashboard.
      </div>
    )
  }

  const dataset = demoMode ? getDemoPlanDataset(context.planId) : null
  const reservas = dataset?.reservas ?? []
  const today = todayReservations(reservas)
  const copy = dashboardCopy[context.planId]
  const professionalLimit = getProfessionalLimit(
    context.planId,
    context.extraProfessionalsCount
  )
  const patientLimit = getPatientLimit(context.planId)
  const activeProfessionals =
    dataset?.profesionales.filter((profesional) => profesional.activo).length ??
    context.usage.professionals
  const activePatients =
    dataset?.pacientes.filter((paciente) => paciente.activo !== false).length ??
    context.usage.activePatients
  const upcomingReservations =
    dataset?.reservas.filter((reserva) =>
      ['pending', 'confirmed'].includes(reserva.estado)
    ).length ?? context.usage.upcomingReservations
  const completedReservations = reservas.filter(
    (reserva) => reserva.estado === 'completed'
  ).length

  return (
    <div className="space-y-5">
      <PageHeader
        title={copy.title}
        description={copy.description}
        eyebrow={copy.eyebrow}
        icon={Activity}
        meta={
          <div className="flex flex-wrap gap-2">
            {demoMode && <Badge tone="slate">Modo demo</Badge>}
            <Badge tone="orange">{context.plan.commercialName}</Badge>
            <Badge tone={context.status === 'active' ? 'green' : 'slate'}>
              {subscriptionStatusLabels[context.status]}
            </Badge>
          </div>
        }
      >
        <Button asChild variant="secondary">
          <Link href="/configuracion/plan">Comparar planes</Link>
        </Button>
        <Button asChild>
          <Link href="/agenda">Abrir agenda</Link>
        </Button>
      </PageHeader>

      <MetricStrip
        variant="cards"
        items={[
          {
            label:
              context.planId === 'individual'
                ? 'Citas personales hoy'
                : 'Reservas del equipo hoy',
            value: today.length,
            description:
              context.planId === 'individual'
                ? 'Agenda de una sola profesional.'
                : 'Vista consolidada de la operacion.',
            icon: CalendarDays,
          },
          {
            label: 'Pacientes activos',
            value: activePatients,
            description:
              patientLimit === null
                ? 'Base compartida sin limite demo.'
                : `Uso contra limite ${patientLimit}.`,
            icon: HeartHandshake,
            tone: 'green',
          },
          {
            label: 'Profesionales activos',
            value: activeProfessionals,
            description: context.plan.professionalRangeLabel,
            icon: UsersRound,
            tone: 'blue',
          },
          {
            label: 'Proximas reservas',
            value: upcomingReservations,
            description: 'Pendientes o confirmadas.',
            icon: ClipboardList,
            tone: 'slate',
          },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <UsageMeter
          label="Uso de profesionales"
          value={activeProfessionals}
          limit={professionalLimit}
          helper={context.plan.professionalRangeLabel}
        />
        <UsageMeter
          label="Uso de pacientes activos"
          value={activePatients}
          limit={patientLimit}
          helper={
            context.planId === 'individual'
              ? 'Individual opera con limite de 50 pacientes activos.'
              : 'Pacientes activos compartidos en el centro.'
          }
          tone="green"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="agendix-surface rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Operacion visible para este plan
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                La demo usa datos distintos para que cada modalidad se sienta
                operativamente diferente.
              </p>
            </div>
            <Badge tone="orange">{context.plan.shortName}</Badge>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <CapabilityRow
              icon={Stethoscope}
              title="Tipo de operacion"
              description={
                context.planId === 'individual'
                  ? 'Consulta personal con una sola agenda.'
                  : context.planId === 'center'
                    ? 'Centro pequeno con agenda compartida.'
                    : context.planId === 'center_pro'
                      ? 'Centro mediano con asistencia y telemedicina.'
                      : 'Clinica demo con mayor volumen y menos restricciones.'
              }
              enabled
            />
            <CapabilityRow
              icon={ShieldCheck}
              title="Roles y permisos"
              description={
                hasFeature(context.planId, 'roles_permissions')
                  ? 'Admin, profesional y recepcion disponibles en la simulacion.'
                  : 'Disponible desde Agendix Center.'
              }
              enabled={hasFeature(context.planId, 'roles_permissions')}
            />
            <CapabilityRow
              icon={BarChart3}
              title="Estadisticas del centro"
              description={
                hasFeature(context.planId, 'center_stats')
                  ? 'Metricas agregadas y productividad por profesional.'
                  : 'Individual muestra solo estadisticas basicas.'
              }
              enabled={hasFeature(context.planId, 'center_stats')}
            />
            <CapabilityRow
              icon={Video}
              title="Telemedicina"
              description={
                hasFeature(context.planId, 'meeting_links')
                  ? 'Reservas con enlaces Meet o Zoom visibles.'
                  : 'Disponible desde Agendix Center Pro.'
              }
              enabled={hasFeature(context.planId, 'meeting_links')}
            />
          </div>
        </div>

        <div className="space-y-4">
          {hasFeature(context.planId, 'center_stats') ? (
            <div className="agendix-surface rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Estadisticas operativas
                </h2>
                <Badge tone="green">Activo</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <StatCard
                  label="Asistencia"
                  value={attendanceRate(reservas)}
                  icon={CheckCircle2}
                  tone="green"
                />
                <StatCard
                  label="Telemedicina"
                  value={telemedicineCount(reservas)}
                  icon={Video}
                  tone="blue"
                />
                <StatCard
                  label="Atendidas"
                  value={completedReservations}
                  icon={ClipboardList}
                  tone="slate"
                />
                <StatCard
                  label="Reservas demo"
                  value={reservas.length || context.usage.upcomingReservations}
                  icon={CalendarDays}
                />
              </div>
            </div>
          ) : (
            <UpgradeCard
              planId={context.planId}
              feature="center_stats"
              title="Estadisticas de centro bloqueadas"
              description="Individual y Center muestran operacion simple. Las metricas agregadas aparecen desde Agendix Center Pro."
              compact
            />
          )}

          <div className="agendix-surface rounded-2xl p-5">
            <h2 className="text-base font-semibold text-slate-900">
              Profesionales con mayor carga
            </h2>
            <div className="mt-4 space-y-3">
              {(busiestProfessionals(reservas).length > 0
                ? busiestProfessionals(reservas)
                : [{ name: 'Sin datos reales aun', count: 0 }]
              ).map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-slate-700">
                    {item.name}
                  </span>
                  <Badge tone={item.count > 0 ? 'orange' : 'slate'}>
                    {item.count} reservas
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function CapabilityRow({
  icon: Icon,
  title,
  description,
  enabled,
}: {
  icon: typeof Activity
  title: string
  description: string
  enabled: boolean
}) {
  return (
    <article className="rounded-2xl border border-slate-200/70 bg-white p-4">
      <div className="flex items-start gap-3">
        <span
          className={
            enabled
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-200/70'
              : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-200/80'
          }
        >
          <Icon size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <Badge tone={enabled ? 'green' : 'slate'}>
              {enabled ? 'Activo' : 'Bloqueado'}
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
    </article>
  )
}
