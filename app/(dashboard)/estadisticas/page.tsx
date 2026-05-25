import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  BarChart3,
  CalendarCheck2,
  CalendarX2,
  CheckCircle2,
  ClipboardList,
  LineChart,
  UsersRound,
  Video,
} from 'lucide-react'
import { PlanLockedCard } from '@/components/plans/plan-locked-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricStrip } from '@/components/ui/metric-strip'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { isDemoMode } from '@/lib/auth/demo'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import { hasFeature, subscriptionStatusLabels } from '@/lib/plans'
import type { PlanId } from '@/lib/plans'
import type { ReservaListItem } from '@/lib/reservas/types'
import {
  getCurrentOrganizationSubscriptionContext,
  getDemoSubscriptionContext,
} from '@/lib/subscription/server'

const statCopy: Record<
  PlanId,
  { title: string; description: string; scope: string }
> = {
  individual: {
    title: 'Resumen de mi consulta',
    description:
      'Indicadores básicos de agenda y pacientes para ordenar una consulta individual.',
    scope: 'Vista individual',
  },
  center: {
    title: 'Lectura operativa del equipo',
    description:
      'Vista simple de reservas compartidas y flujo de pacientes del equipo.',
    scope: 'Centro pequeno',
  },
  center_pro: {
    title: 'Métricas de operación del centro',
    description:
      'Asistencia, ocupación, carga por profesional y reservas públicas para operar con más control.',
    scope: 'Center Pro',
  },
  enterprise: {
    title: 'Métricas Enterprise a medida',
    description:
      'Visión ejecutiva para equipos grandes, ajustable según alcance de implementación.',
    scope: 'Enterprise',
  },
}

function weekReservations(reservas: ReservaListItem[]) {
  const now = new Date()
  const end = new Date()
  end.setDate(now.getDate() + 7)

  return reservas.filter((reserva) => {
    const date = new Date(reserva.fecha_inicio)

    return date >= now && date <= end
  })
}

function attendanceRate(reservas: ReservaListItem[]) {
  const closed = reservas.filter((reserva) =>
    ['completed', 'no_show'].includes(reserva.estado)
  )

  if (closed.length === 0) return '0%'

  const attended = closed.filter((reserva) => reserva.estado === 'completed')

  return `${Math.round((attended.length / closed.length) * 100)}%`
}

function byProfessional(reservas: ReservaListItem[]) {
  const stats = new Map<string, { name: string; count: number }>()

  reservas.forEach((reserva) => {
    const current = stats.get(reserva.profesional.id)

    stats.set(reserva.profesional.id, {
      name: reserva.profesional.nombre,
      count: (current?.count ?? 0) + 1,
    })
  })

  return Array.from(stats.values()).sort((a, b) => b.count - a.count)
}

export default async function EstadisticasPage() {
  const demoMode = isDemoMode()
  const context = demoMode
    ? await getDemoSubscriptionContext()
    : (await getCurrentOrganizationSubscriptionContext()).data

  if (!context && !demoMode) redirect('/login')

  if (!context) {
    return (
      <div className="agendix-surface rounded-2xl p-5">
        No pudimos cargar estadisticas.
      </div>
    )
  }

  const dataset = demoMode ? getDemoPlanDataset(context.planId) : null
  const reservas = dataset?.reservas ?? []
  const copy = statCopy[context.planId]
  const week = weekReservations(reservas)
  const activePatients =
    dataset?.pacientes.filter((paciente) => paciente.activo !== false).length ??
    context.usage.activePatients
  const cancellations = reservas.filter(
    (reserva) => reserva.estado === 'cancelled'
  ).length
  const noShows = reservas.filter((reserva) => reserva.estado === 'no_show').length
  const remote = reservas.filter((reserva) => reserva.meeting_url).length
  const professionalStats = byProfessional(reservas)

  return (
    <div className="space-y-5">
      <PageHeader
        title={copy.title}
        description={copy.description}
        eyebrow={copy.scope}
        icon={BarChart3}
        meta={
          <div className="flex flex-wrap gap-2">
            {demoMode && <Badge tone="slate">Modo demo</Badge>}
            <Badge tone="orange">{context.plan.shortName}</Badge>
            <Badge tone={context.status === 'active' ? 'green' : 'slate'}>
              {subscriptionStatusLabels[context.status]}
            </Badge>
          </div>
        }
      >
        <Button asChild variant="secondary">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button asChild>
          <Link href="/configuracion/plan">Ver opciones</Link>
        </Button>
      </PageHeader>

      <MetricStrip
        variant="cards"
        items={[
          {
            label: 'Citas de la semana',
            value: week.length || context.usage.upcomingReservations,
            description: 'Reservas proximas dentro del periodo.',
            icon: CalendarCheck2,
          },
          {
            label: 'Pacientes activos',
            value: activePatients,
            description:
              context.planId === 'individual'
                ? 'Base individual con limite comercial.'
                : 'Base compartida del centro.',
            icon: UsersRound,
            tone: 'green',
          },
          {
            label: 'Cancelaciones',
            value: cancellations,
            description: 'Reservas canceladas en datos demo.',
            icon: CalendarX2,
            tone: cancellations > 0 ? 'red' : 'slate',
          },
          {
            label: 'Evolucion simple',
            value:
              context.planId === 'individual'
                ? 'Basica'
                : hasFeature(context.planId, 'center_stats')
                  ? 'Avanzada'
                  : 'Equipo',
            description: 'Nivel de profundidad estadistica segun plan.',
            icon: LineChart,
            tone: 'blue',
          },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="agendix-surface rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Reservas por profesional
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {hasFeature(context.planId, 'shared_calendar')
                  ? 'Distribucion visible por agenda compartida.'
                  : 'En Individual solo se muestra tu propia agenda.'}
              </p>
            </div>
            <Badge tone={hasFeature(context.planId, 'shared_calendar') ? 'green' : 'slate'}>
              {hasFeature(context.planId, 'shared_calendar') ? 'Compartido' : 'Personal'}
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            {(professionalStats.length > 0
              ? professionalStats.slice(0, context.planId === 'individual' ? 1 : 8)
              : [{ name: 'Sin reservas cargadas', count: 0 }]
            ).map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-3"
              >
                <span className="min-w-0 truncate text-sm font-medium text-slate-700">
                  {item.name}
                </span>
                <Badge tone={item.count > 0 ? 'orange' : 'slate'}>
                  {item.count} citas
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {hasFeature(context.planId, 'center_stats') ? (
          <div className="agendix-surface rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Métricas de operación
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Center Pro activa asistencia, ocupación, carga del equipo y
                  links manuales de Meet/Zoom.
                </p>
              </div>
              <Badge tone="green">Activo</Badge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Asistencia"
                value={attendanceRate(reservas)}
                icon={CheckCircle2}
                tone="green"
              />
              <StatCard
                label="No asistio"
                value={noShows}
                icon={CalendarX2}
                tone={noShows > 0 ? 'red' : 'slate'}
              />
              <StatCard
                label="Telemedicina"
                value={remote}
                icon={Video}
                tone="blue"
              />
              <StatCard
                label="Reservas demo"
                value={reservas.length || context.usage.upcomingReservations}
                icon={ClipboardList}
              />
            </div>
          </div>
        ) : (
          <PlanLockedCard
            planId={context.planId}
            feature="center_stats"
            title={
              context.planId === 'individual'
                ? 'Resumen básico en Individual'
                : 'Métricas operativas disponibles desde Center Pro'
            }
            description={
              context.planId === 'individual'
                ? 'Individual mantiene una lectura simple de agenda, pacientes activos y cancelaciones.'
                : 'Center coordina al equipo. Center Pro suma asistencia, ocupación y carga por profesional para tomar mejores decisiones.'
            }
          />
        )}
      </section>
    </div>
  )
}
