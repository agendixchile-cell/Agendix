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
  ReceiptText,
  Settings,
  UserRoundCog,
  type LucideIcon,
} from 'lucide-react'
import { getRecordatoriosCentro } from '@/app/actions/centro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { demoCentro, demoRecordatoriosConfig } from '@/lib/centro/demo'
import { defaultHorariosCentro } from '@/lib/centro/horarios'
import { demoProfesionales } from '@/lib/profesionales/demo'
import { demoSalas } from '@/lib/salas/demo'
import { demoServicios } from '@/lib/servicios/demo'
import { subscriptionStatusLabels } from '@/lib/plans'
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
  }
}

async function getDemoConfigData() {
  const subscription = await getDemoSubscriptionContext()

  return {
    centroNombre: demoCentro.nombre,
    slug: demoCentro.slug,
    centroActivo: demoCentro.activo,
    publicBookingEnabled: true,
    serviciosCount: demoServicios.filter((servicio) => servicio.activo).length,
    profesionalesCount: demoProfesionales.filter(
      (profesional) => profesional.activo
    ).length,
    salasCount: demoSalas.filter((sala) => sala.activa).length,
    horariosStatus: activeDaysLabel(defaultHorariosCentro),
    recordatoriosText: recordatoriosStatus({
      emailEnabled: demoRecordatoriosConfig.email_enabled,
      emailHoursBefore: demoRecordatoriosConfig.email_hours_before,
      whatsappEnabled: demoRecordatoriosConfig.whatsapp_enabled,
      whatsappMode: demoRecordatoriosConfig.whatsapp_mode,
    }),
    planText: `${subscription.plan.shortName} · ${subscriptionStatusLabels[subscription.status]}`,
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
      title: 'Plan y facturación',
      description: 'Plan actual, uso contra límites y preparación para suscripciones.',
      status: data.planText,
      actionLabel: 'Ver mi plan',
      href: '/configuracion/plan',
      icon: CreditCard,
      tone: 'orange',
    },
    {
      title: 'Pagos',
      description: 'Base preparada para pago online y pago presencial.',
      status: 'Checkout real pendiente',
      actionLabel: 'Próximamente',
      icon: CreditCard,
      tone: 'slate',
    },
    {
      title: 'Boletas',
      description: 'Futura integración tributaria para emisión de documentos.',
      status: 'Integración futura',
      actionLabel: 'Próximamente',
      icon: ReceiptText,
      tone: 'slate',
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuración"
        description="Administra solo lo necesario para operar: centro, servicios, equipo, horarios, recordatorios, página pública y pagos."
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
