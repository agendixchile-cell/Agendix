import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  BellRing,
  Building2,
  Clock3,
  CreditCard,
  DoorOpen,
  Globe2,
  HeartPulse,
  Settings,
  ShieldCheck,
  UserRoundCog,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { getRecordatoriosCentro } from '@/app/actions/centro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { demoCentro } from '@/lib/centro/demo'
import { defaultHorariosCentro } from '@/lib/centro/horarios'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import { hasFeature, subscriptionStatusLabels } from '@/lib/plans'
import {
  getDemoSubscriptionContext,
  getPlanSnapshotForCentro,
} from '@/lib/subscription/server'
import { createClient } from '@/lib/supabase/server'
import type { RolCentro } from '@/lib/types/database'

type MembershipRow = {
  centro_id: string
  rol: RolCentro
  centros: {
    nombre: string
    slug: string
    activo: boolean
    public_booking_enabled: boolean | null
  } | null
}

type SettingsCardProps = {
  title: string
  description: string
  status: string
  actionLabel: string
  href?: string
  icon: LucideIcon
  tone?: 'orange' | 'green' | 'blue' | 'slate'
  external?: boolean
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

function recordatoriosStatus({
  emailEnabled,
  emailHoursBefore,
  whatsappEnabled,
  whatsappMode,
}: {
  emailEnabled: boolean
  emailHoursBefore: number
  whatsappEnabled: boolean
  whatsappMode: string
}) {
  const enabled = [
    emailEnabled ? `email ${emailHoursBefore}h` : '',
    whatsappEnabled ? 'WhatsApp' : '',
  ].filter(Boolean)

  if (enabled.length === 0) return 'Pausados'
  if (whatsappEnabled && whatsappMode !== 'live') return `${enabled.join(' y ')} · WhatsApp mock`

  return `${enabled.join(' y ')} activos`
}

function activeDaysLabel(horarios: Array<{ activo: boolean }> = defaultHorariosCentro) {
  const activeDays = horarios.filter(
    (horario) => horario.activo
  ).length

  return `${activeDays}/7 días activos`
}

async function getRealConfigData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership, error } = await supabase
    .from('miembros_centro')
    .select('centro_id,rol,centros!inner(nombre,slug,activo,public_booking_enabled)')
    .eq('profile_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  const activeMembership = membership as unknown as MembershipRow | null

  if (error || !activeMembership?.centro_id || !activeMembership.centros) {
    return {
      centroNombre: demoUser.centro,
      slug: demoCentro.slug,
      centroActivo: false,
      publicBookingEnabled: false,
      serviciosCount: 0,
      profesionalesCount: 0,
      salasCount: 0,
      horariosStatus: 'Horario pendiente',
      recordatoriosText: 'Pendiente de configurar',
      planText: 'Individual · Trial',
      rolesStatus: 'Disponible desde Center',
      adminStatus: 'No aplica en Individual',
      telemedicineStatus: 'Disponible desde Center Pro',
    }
  }

  const centroId = activeMembership.centro_id
  const [
    servicios,
    profesionales,
    salas,
    horarios,
    recordatorios,
    planSnapshot,
  ] = await Promise.all([
    supabase
      .from('servicios')
      .select('id', { count: 'exact', head: true })
      .eq('centro_id', centroId)
      .eq('activo', true),
    supabase
      .from('miembros_centro')
      .select('id', { count: 'exact', head: true })
      .eq('centro_id', centroId)
      .eq('activo', true)
      .in('rol', ['owner', 'admin', 'profesional']),
    supabase
      .from('salas')
      .select('id', { count: 'exact', head: true })
      .eq('centro_id', centroId)
      .eq('activa', true),
    supabase
      .from('horarios_centro')
      .select('dia,activo,inicio,fin,descanso_activo,descanso_inicio,descanso_fin')
      .eq('centro_id', centroId)
      .order('dia', { ascending: true }),
    getRecordatoriosCentro(centroId),
    getPlanSnapshotForCentro(supabase, centroId),
  ])

  return {
    centroNombre: activeMembership.centros.nombre,
    slug: activeMembership.centros.slug,
    centroActivo: activeMembership.centros.activo,
    publicBookingEnabled: Boolean(activeMembership.centros.public_booking_enabled),
    serviciosCount: servicios.count ?? 0,
    profesionalesCount: profesionales.count ?? 0,
    salasCount: salas.count ?? 0,
    horariosStatus:
      horarios.data && horarios.data.length > 0
        ? activeDaysLabel(horarios.data)
        : 'Horario pendiente',
    recordatoriosText: recordatoriosStatus({
      emailEnabled: recordatorios.email_enabled,
      emailHoursBefore: recordatorios.email_hours_before,
      whatsappEnabled: recordatorios.whatsapp_enabled,
      whatsappMode: recordatorios.whatsapp_mode,
    }),
    planText: `${planSnapshot.plan.shortName} · ${subscriptionStatusLabels[planSnapshot.status]}`,
    rolesStatus: hasFeature(planSnapshot.planId, 'roles_permissions')
      ? 'Roles activos'
      : 'Disponible desde Center',
    adminStatus: hasFeature(planSnapshot.planId, 'admin_panel')
      ? 'Panel de coordinación activo'
      : 'No aplica en Individual',
    telemedicineStatus: hasFeature(planSnapshot.planId, 'meeting_links')
      ? 'Links manuales Meet/Zoom activos'
      : 'Disponible desde Center Pro',
  }
}

async function getDemoConfigData() {
  const subscription = await getDemoSubscriptionContext()
  const dataset = getDemoPlanDataset(subscription.planId)

  return {
    centroNombre: dataset.centro.nombre,
    slug: dataset.centro.slug,
    centroActivo: dataset.centro.activo,
    publicBookingEnabled: true,
    serviciosCount: dataset.servicios.filter((servicio) => servicio.activo).length,
    profesionalesCount: dataset.profesionales.filter(
      (profesional) => profesional.activo
    ).length,
    salasCount: dataset.salas.filter((sala) => sala.activa).length,
    horariosStatus: activeDaysLabel(dataset.horarios),
    recordatoriosText: recordatoriosStatus({
      emailEnabled: dataset.recordatorios.email_enabled,
      emailHoursBefore: dataset.recordatorios.email_hours_before,
      whatsappEnabled: dataset.recordatorios.whatsapp_enabled,
      whatsappMode: dataset.recordatorios.whatsapp_mode,
    }),
    planText: `${subscription.plan.shortName} · ${subscriptionStatusLabels[subscription.status]}`,
    rolesStatus: hasFeature(subscription.planId, 'roles_permissions')
      ? subscription.planId === 'enterprise'
        ? 'Roles avanzados preparados'
        : 'Admin, profesional y recepcion'
      : 'Disponible desde Center',
    adminStatus: hasFeature(subscription.planId, 'admin_panel')
      ? 'Panel de coordinación activo'
      : 'No aplica en Individual',
    telemedicineStatus: hasFeature(subscription.planId, 'meeting_links')
      ? 'Links manuales Meet/Zoom activos'
      : 'Disponible desde Center Pro',
  }
}

export default async function ConfiguracionPage() {
  const demoMode = isDemoMode()
  const data = demoMode ? await getDemoConfigData() : await getRealConfigData()
  const publicBookingPath = `/agendar/${data.slug}`

  const cards: SettingsCardProps[] = [
    {
      title: 'Centro',
      description: 'Nombre, contacto, dirección y datos visibles del centro.',
      status: data.centroActivo ? 'Centro activo' : 'Revisar estado',
      actionLabel: 'Configurar',
      href: '/centro',
      icon: Building2,
      tone: data.centroActivo ? 'green' : 'orange',
    },
    {
      title: 'Servicios',
      description: 'Prestaciones, duración, precio y modalidad de atención.',
      status: countLabel(data.serviciosCount, 'servicio activo', 'servicios activos'),
      actionLabel: 'Ver servicios',
      href: '/servicios',
      icon: HeartPulse,
    },
    {
      title: 'Profesionales',
      description: 'Equipo clínico, especialidades y visibilidad pública.',
      status: countLabel(
        data.profesionalesCount,
        'profesional activo',
        'profesionales activos'
      ),
      actionLabel: 'Ver equipo',
      href: '/profesionales',
      icon: UserRoundCog,
    },
    {
      title: 'Roles y permisos',
      description: 'Simula permisos de administrador, profesional y recepción.',
      status: data.rolesStatus,
      actionLabel: data.rolesStatus.includes('Disponible') ? 'Ver plan' : 'Gestionar',
      href: data.rolesStatus.includes('Disponible') ? '/configuracion/plan' : '/admin',
      icon: ShieldCheck,
      tone: data.rolesStatus.includes('Disponible') ? 'slate' : 'green',
    },
    {
      title: 'Panel de coordinación',
      description: 'Vista de operación del centro, equipo, capacidad y actividad.',
      status: data.adminStatus,
      actionLabel: data.adminStatus.includes('No aplica') ? 'Ver plan' : 'Abrir panel',
      href: data.adminStatus.includes('No aplica') ? '/configuracion/plan' : '/admin',
      icon: Building2,
      tone: data.adminStatus.includes('No aplica') ? 'slate' : 'orange',
    },
    {
      title: 'Links de videollamada',
      description: 'Links manuales de Meet/Zoom dentro de las reservas.',
      status: data.telemedicineStatus,
      actionLabel: data.telemedicineStatus.includes('Disponible')
        ? 'Ver plan'
        : 'Abrir agenda',
      href: data.telemedicineStatus.includes('Disponible')
        ? '/configuracion/plan'
        : '/agenda',
      icon: Video,
      tone: data.telemedicineStatus.includes('Disponible') ? 'slate' : 'blue',
    },
    {
      title: 'Salas',
      description: 'Boxes, consultas y espacios disponibles para reservar.',
      status: countLabel(data.salasCount, 'sala activa', 'salas activas'),
      actionLabel: 'Ver salas',
      href: '/salas',
      icon: DoorOpen,
    },
    {
      title: 'Horarios',
      description: 'Días operativos y rango horario de atención del centro.',
      status: data.horariosStatus,
      actionLabel: 'Editar horario',
      href: '/centro#horarios',
      icon: Clock3,
      tone: 'blue',
    },
    {
      title: 'Recordatorios',
      description: 'Email configurable con confirmación de asistencia.',
      status: data.recordatoriosText,
      actionLabel: 'Configurar',
      href: '/centro#recordatorios',
      icon: BellRing,
      tone: data.recordatoriosText.includes('mock') ? 'orange' : 'green',
    },
    {
      title: 'Página pública',
      description: 'Link para que tus pacientes reserven sin escribirte por WhatsApp.',
      status: data.publicBookingEnabled ? 'Link público activo' : 'Página pausada',
      actionLabel: 'Abrir página',
      href: publicBookingPath,
      icon: Globe2,
      tone: 'green',
      external: true,
    },
    {
      title: 'Plan y uso',
      description: 'Plan actual, uso contra límites y opciones comerciales.',
      status: data.planText,
      actionLabel: 'Ver mi plan',
      href: '/configuracion/plan',
      icon: CreditCard,
      tone: 'orange',
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuración"
        description="Administra solo lo necesario para operar: centro, servicios, equipo, horarios, recordatorios, página pública y plan."
        eyebrow="Ajustes"
        icon={Settings}
        meta={
          <div className="flex flex-wrap gap-2">
            {demoMode && <Badge tone="slate">Modo demo</Badge>}
            <Badge tone={data.publicBookingEnabled ? 'green' : 'orange'}>
              {data.publicBookingEnabled ? 'Página pública activa' : 'Página pública pausada'}
            </Badge>
          </div>
        }
      >
        <Button asChild variant="secondary">
          <Link href={publicBookingPath}>Ver página pública</Link>
        </Button>
        <Button asChild>
          <Link href="/centro">Editar centro</Link>
        </Button>
      </PageHeader>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <SettingsCard key={card.title} {...card} />
        ))}
      </section>
    </div>
  )
}

const toneToIconClasses: Record<NonNullable<SettingsCardProps['tone']>, string> = {
  orange: 'bg-orange-50 text-orange-600 ring-orange-200/70',
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-200/70',
  blue: 'bg-sky-50 text-sky-600 ring-sky-200/70',
  slate: 'bg-slate-50 text-slate-600 ring-slate-200/80',
}

const toneToBadge: Record<NonNullable<SettingsCardProps['tone']>, 'orange' | 'green' | 'blue' | 'slate'> = {
  orange: 'orange',
  green: 'green',
  blue: 'blue',
  slate: 'slate',
}

function SettingsCard({
  title,
  description,
  status,
  actionLabel,
  href,
  icon: Icon,
  tone = 'orange',
  external = false,
}: SettingsCardProps) {
  const isComingSoon = !href

  return (
    <article className={`agendix-surface flex flex-col rounded-2xl p-4 transition-all duration-200 ${isComingSoon ? 'opacity-75' : 'hover:border-orange-200/80 hover:shadow-md hover:shadow-slate-900/[0.045]'}`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${toneToIconClasses[tone]}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <Badge tone={toneToBadge[tone]}>{status}</Badge>
      </div>

      <div className="mt-4 min-w-0 flex-1">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <div className="mt-5">
        {href ? (
          <Button asChild variant={external ? 'secondary' : 'primary'} className="w-full">
            <Link href={href}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="w-full cursor-default text-slate-400"
            disabled
            aria-label={`${title} — próximamente disponible`}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </article>
  )
}
