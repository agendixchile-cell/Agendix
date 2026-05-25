import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Settings,
  UsersRound,
} from 'lucide-react'
import { FeatureGate } from '@/components/plans/feature-gate'
import { UpgradeCard } from '@/components/plans/upgrade-card'
import { UsageMeter } from '@/components/plans/usage-meter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { isDemoMode } from '@/lib/auth/demo'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import {
  hasFeature,
  getPatientLimit,
  getProfessionalLimit,
  subscriptionStatusLabels,
} from '@/lib/plans'
import { canViewAdminPanel } from '@/lib/permissions'
import {
  getCurrentOrganizationSubscriptionContext,
  getDemoSubscriptionContext,
} from '@/lib/subscription/server'
import { createClient } from '@/lib/supabase/server'

type ReservationStatusRow = {
  estado: string
  profesional_id: string
}

function attendanceRate(rows: ReservationStatusRow[]) {
  const attended = rows.filter((row) => row.estado === 'completed').length
  const closed = rows.filter((row) =>
    ['completed', 'no_show'].includes(row.estado)
  ).length

  if (closed === 0) return '0%'

  return `${Math.round((attended / closed) * 100)}%`
}

export default async function AdminPage() {
  const demoMode = isDemoMode()
  const context = demoMode
    ? await getDemoSubscriptionContext()
    : (await getCurrentOrganizationSubscriptionContext()).data

  if (!context && !demoMode) redirect('/login')

  if (!context) {
    return (
      <div className="agendix-surface rounded-2xl p-5">
        No pudimos cargar el panel de coordinación del centro.
      </div>
    )
  }

  const demoDataset = demoMode ? getDemoPlanDataset(context.planId) : null
  const rows: ReservationStatusRow[] = demoMode
    ? (demoDataset?.reservas ?? []).map((reserva) => ({
        estado: reserva.estado,
        profesional_id: reserva.profesional.id,
      }))
    : await fetchReservationStatusRows(context.organizationId)

  const totalReservations = rows.length
  const noShowCount = rows.filter((row) => row.estado === 'no_show').length
  const cancelledCount = rows.filter((row) => row.estado === 'cancelled').length
  const professionalLimit = getProfessionalLimit(
    context.planId,
    context.extraProfessionalsCount
  )
  const patientLimit = getPatientLimit(context.planId)
  const canViewAdmin = canViewAdminPanel({
    role: context.role,
    planId: context.planId,
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Panel de coordinación del centro"
        description="Vista operativa del centro: plan, capacidad, equipo, pacientes y actividad reciente."
        eyebrow="Centro"
        icon={Building2}
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
          <Link href="/configuracion/plan">Mi plan</Link>
        </Button>
        <Button asChild>
          <Link href="/profesionales">Gestionar equipo</Link>
        </Button>
      </PageHeader>

      {canViewAdmin ? (
        <>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Profesionales"
            value={context.usage.professionals}
            description="Activos en la organización."
            icon={UsersRound}
          />
          <StatCard
            label="Pacientes activos"
            value={context.usage.activePatients}
            description="Compartidos por el centro."
            icon={ClipboardList}
            tone="green"
          />
          <StatCard
            label="Próximas reservas"
            value={context.usage.upcomingReservations}
            description="Pendientes o confirmadas."
            icon={CalendarDays}
            tone="blue"
          />
          <StatCard
            label="Estado del plan"
            value={context.plan.shortName}
            description={subscriptionStatusLabels[context.status]}
            icon={Activity}
            tone="slate"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <UsageMeter
            label="Uso de profesionales"
            value={context.usage.professionals}
            limit={professionalLimit}
            helper={context.plan.professionalRangeLabel}
          />
          <UsageMeter
            label="Uso de pacientes activos"
            value={context.usage.activePatients}
            limit={patientLimit}
            helper="Base de pacientes compartida para todo el equipo."
            tone="green"
          />
        </section>

        {hasFeature(context.planId, 'center_stats') ? (
          <section className="agendix-surface rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-200/70">
                <BarChart3 size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Métricas de asistencia, ocupación y carga
                </h2>
                <p className="text-sm text-slate-500">
                  Indicadores basados en reservas reales del centro.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <StatCard label="Reservas del período" value={totalReservations} />
              <StatCard label="Asistencia" value={attendanceRate(rows)} tone="green" />
              <StatCard label="No asistió" value={noShowCount} tone="red" />
              <StatCard label="Canceladas" value={cancelledCount} tone="slate" />
            </div>
          </section>
        ) : (
          <UpgradeCard
            planId={context.planId}
            feature="center_stats"
            title="Métricas de asistencia, ocupación y carga"
            description="Desbloquea métricas de asistencia, no-show y carga del equipo con Agendix Center Pro."
          />
        )}

        <section className="grid gap-3 md:grid-cols-3">
          {[
            ['Equipo', 'Profesionales, roles y capacidad del centro.', '/profesionales'],
            ['Configuración', 'Centro, servicios, salas y horarios.', '/configuracion'],
            ['Plan', 'Uso, límites y opciones comerciales.', '/configuracion/plan'],
          ].map(([title, description, href]) => (
            <article key={title} className="agendix-surface rounded-2xl p-5">
              <Settings size={18} aria-hidden="true" className="text-orange-500" />
              <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <Link href={href}>Abrir</Link>
              </Button>
            </article>
          ))}
        </section>
        </>
      ) : (
        <FeatureGate planId={context.planId} feature="admin_panel">
          <UpgradeCard
            planId={context.planId}
            title="Permisos insuficientes"
            description="Solo Owner y Admin pueden abrir el panel de coordinación del centro."
          />
        </FeatureGate>
      )}
    </div>
  )
}

async function fetchReservationStatusRows(centroId: string): Promise<ReservationStatusRow[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data } = await supabase
    .from('reservas')
    .select('estado,profesional_id')
    .eq('centro_id', centroId)
    .gte('fecha_inicio', since.toISOString())

  return (data ?? []) as ReservationStatusRow[]
}
