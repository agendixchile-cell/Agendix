'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Database,
  Globe2,
  HeartPulse,
  LineChart,
  Lock,
  Menu,
  MonitorPlay,
  PanelLeft,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
  Video,
  WalletCards,
  X,
  Zap,
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

type Tone = 'orange' | 'emerald' | 'sky' | 'violet' | 'slate'

const appRegisterHref = getAppUrl('/register')
const demoHref = 'mailto:contacto@agendixchile.cl?subject=Demo%20Agendix'

const pricingPlans = [
  subscriptionPlans.individual,
  subscriptionPlans.center,
  subscriptionPlans.center_pro,
  subscriptionPlans.enterprise,
]

const toneClasses: Record<Tone, string> = {
  orange: 'bg-orange-50 text-orange-600 ring-orange-200/70',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-200/70',
  sky: 'bg-sky-50 text-sky-600 ring-sky-200/70',
  violet: 'bg-violet-50 text-violet-600 ring-violet-200/70',
  slate: 'bg-slate-50 text-slate-600 ring-slate-200/70',
}

const graphiteSurface = 'bg-[#242627]'
const graphiteInk = 'text-[#242627]'
const interactiveCardClasses =
  'group transition-all duration-200 ease-out hover:-translate-y-1 hover:border-orange-300 hover:bg-orange-500 hover:text-white hover:shadow-xl hover:shadow-orange-900/[0.13] motion-reduce:transition-none motion-reduce:hover:translate-y-0'
const interactiveTitleClasses = 'transition-colors duration-200 group-hover:text-white'
const interactiveTextClasses = 'transition-colors duration-200 group-hover:text-white/80'
const interactiveBadgeClasses =
  'transition-colors duration-200 group-hover:border-white/25 group-hover:bg-white/15 group-hover:text-white'
const interactiveIconClasses =
  'transition-all duration-200 group-hover:bg-white/15 group-hover:text-white group-hover:ring-white/25'

const comparisonRows: Array<{
  label: string
  getValue?: (plan: PlanDefinition) => string
  feature?: FeatureKey
}> = [
  {
    label: 'Profesionales incluidos',
    getValue: (plan) => professionalLimitLabel(plan.id),
  },
  {
    label: 'Pacientes activos',
    getValue: (plan) => patientLimitLabel(plan.id),
  },
  { label: featureLabels.advanced_calendar, feature: 'advanced_calendar' },
  { label: featureLabels.internal_notes, feature: 'internal_notes' },
  { label: featureLabels.shared_calendar, feature: 'shared_calendar' },
  { label: featureLabels.multi_agenda, feature: 'multi_agenda' },
  { label: featureLabels.roles_permissions, feature: 'roles_permissions' },
  { label: featureLabels.admin_panel, feature: 'admin_panel' },
  { label: featureLabels.center_stats, feature: 'center_stats' },
  { label: featureLabels.attendance_control, feature: 'attendance_control' },
  {
    label: featureLabels.advanced_patient_management,
    feature: 'advanced_patient_management',
  },
  { label: 'Enlaces Meet o Zoom', feature: 'meeting_links' },
  { label: featureLabels.clinical_team_meetings, feature: 'clinical_team_meetings' },
]

function Eyebrow({
  children,
  dark = false,
  className,
}: {
  children: ReactNode
  dark?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[11px] font-semibold uppercase text-slate-400',
        dark && 'text-white/55',
        className
      )}
    >
      {children}
    </span>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  dark = false,
}: {
  eyebrow: string
  title: string
  description?: string
  align?: 'left' | 'center'
  dark?: boolean
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
      <Eyebrow dark={dark} className="mb-3">
        {eyebrow}
      </Eyebrow>
      <h2
        className={cn(
          'text-3xl font-bold leading-tight text-[#171615] sm:text-4xl',
          dark && 'text-white'
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-4 text-base leading-7 text-slate-600 sm:text-lg',
            dark && 'text-white/65'
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}

function IconBadge({
  icon: Icon,
  tone = 'orange',
  className,
}: {
  icon: LucideIcon
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1',
        toneClasses[tone],
        className
      )}
    >
      <Icon size={19} aria-hidden="true" />
    </span>
  )
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-6 text-slate-600 transition-colors duration-200 group-hover:text-white/80">
      <Check
        size={16}
        className="mt-1 shrink-0 text-orange-500 transition-colors duration-200 group-hover:text-white"
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const navLinks = [
    { label: 'Producto', href: '#producto' },
    { label: 'Cómo funciona', href: '#como-funciona' },
    { label: 'Planes', href: '#planes' },
    { label: 'FAQ', href: '#faq' },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <AgendixWordmark preload className="h-10 w-44 sm:h-10 sm:w-44" />

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-[#171615]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={getAppUrl('/login')}
            className="text-sm font-semibold text-slate-700 transition-colors hover:text-orange-600"
          >
            Iniciar sesión
          </Link>
          <Button asChild size="lg">
            <Link href={appRegisterHref}>Comenzar ahora</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 md:hidden"
          aria-label="Menú"
          aria-expanded={open}
        >
          {open ? (
            <X size={20} className="text-slate-700" aria-hidden="true" />
          ) : (
            <Menu size={20} className="text-slate-700" aria-hidden="true" />
          )}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-slate-200/70 bg-white p-4 shadow-lg shadow-black/[0.05] md:hidden">
          <nav className="mb-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="grid gap-2 border-t border-slate-100 pt-3">
            <Link
              href={getAppUrl('/login')}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700"
            >
              Iniciar sesión
            </Link>
            <Button asChild size="lg" className="w-full">
              <Link href={appRegisterHref}>Comenzar ahora</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}

function HeroWorkspace() {
  const appointments = [
    ['09:00', 'Control kinésico', 'Dra. Torres', 'Confirmada', 'orange'],
    ['10:30', 'Evaluación psicológica', 'Ps. Araya', 'Pendiente', 'violet'],
    ['12:00', 'Nutrición online', 'Nut. Lagos', 'Meet listo', 'emerald'],
    ['15:30', 'Consulta médica', 'Dr. Molina', 'Confirmada', 'sky'],
  ] as const

  const toneMap: Record<
    Tone,
    { bg: string; border: string; text: string; dot: string }
  > = {
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200/80',
      text: 'text-orange-700',
      dot: 'bg-orange-400',
    },
    violet: {
      bg: 'bg-violet-50',
      border: 'border-violet-200/80',
      text: 'text-violet-700',
      dot: 'bg-violet-400',
    },
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200/80',
      text: 'text-emerald-700',
      dot: 'bg-emerald-400',
    },
    sky: {
      bg: 'bg-sky-50',
      border: 'border-sky-200/80',
      text: 'text-sky-700',
      dot: 'bg-sky-400',
    },
    slate: {
      bg: 'bg-slate-50',
      border: 'border-slate-200/80',
      text: 'text-slate-700',
      dot: 'bg-slate-400',
    },
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-black/[0.10]">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
        </div>
        <Badge tone="green">Operación en vivo</Badge>
      </div>

      <div className="grid lg:grid-cols-[210px_1fr_280px]">
        <aside className={cn('hidden border-r border-slate-100 p-4 text-white lg:block', graphiteSurface)}>
          <div className="mb-6 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-xs font-bold">
              A
            </span>
            <div>
              <p className="text-sm font-semibold">Centro Salud Norte</p>
              <p className="text-[11px] text-white/45">Panel administrador</p>
            </div>
          </div>
          {[
            [Calendar, 'Agenda'],
            [Users, 'Pacientes'],
            [UserCheck, 'Profesionales'],
            [LineChart, 'Estadísticas'],
          ].map(([Icon, label]) => {
            const TypedIcon = Icon as LucideIcon
            return (
              <div
                key={label as string}
                className={cn(
                  'mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
                  label === 'Agenda'
                    ? cn('bg-white', graphiteInk)
                    : 'text-white/60'
                )}
              >
                <TypedIcon size={15} aria-hidden="true" />
                {label as string}
              </div>
            )
          })}
        </aside>

        <div className="min-w-0 bg-[#FAFAF8] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Agenda del día
              </p>
              <h3 className="text-lg font-bold text-[#171615]">Martes 13 de mayo</h3>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {['Todos', 'Dra. Torres', 'Dr. Molina'].map((tab, index) => (
                <span
                  key={tab}
                  className={cn(
                    'whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold',
                    index === 0
                      ? 'border-orange-200 bg-orange-50 text-orange-700'
                      : 'border-slate-200 bg-white text-slate-500'
                  )}
                >
                  {tab}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {appointments.map(([time, service, professional, status, tone]) => {
              const styles = toneMap[tone]

              return (
                <div
                  key={`${time}-${service}`}
                  className={cn(
                    'grid grid-cols-[52px_1fr] gap-3 rounded-lg border px-3 py-3',
                    styles.bg,
                    styles.border
                  )}
                >
                  <span className="pt-1 text-xs font-semibold text-slate-400">
                    {time}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={cn('truncate text-sm font-semibold', styles.text)}>
                          {service}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {professional}
                        </p>
                      </div>
                      <span className="hidden shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-slate-500 sm:inline-flex">
                        {status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="border-t border-slate-100 bg-white p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            {[
              ['18', 'Reservas hoy', 'text-[#171615]'],
              ['4', 'Profesionales', 'text-sky-600'],
              ['92%', 'Asistencia', 'text-emerald-600'],
            ].map(([value, label, color]) => (
              <div
                key={label}
                className="group rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200/70 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-orange-500 hover:shadow-lg hover:shadow-orange-900/[0.12] hover:ring-orange-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <p className={cn('text-xl font-bold transition-colors duration-200 group-hover:text-white', color)}>
                  {value}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500 transition-colors duration-200 group-hover:text-white/70">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className={cn('group mt-4 rounded-lg border border-slate-200 bg-white p-4', interactiveCardClasses)}>
            <div className="mb-3 flex items-center gap-2">
              <MonitorPlay
                size={16}
                className="text-orange-500 transition-colors duration-200 group-hover:text-white"
              />
              <p className={cn('text-sm font-semibold text-[#171615]', interactiveTitleClasses)}>
                Atención online
              </p>
            </div>
            <p className={cn('text-xs leading-5 text-slate-500', interactiveTextClasses)}>
              Enlaces Meet o Zoom listos para telemedicina y reuniones de equipo
              en planes avanzados.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#F7FAF8]">
      <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-16 sm:px-6 sm:pb-12 sm:pt-20 lg:px-8">
        <div className="max-w-4xl">
          <Badge tone="orange" className="mb-6 gap-1.5">
            <Sparkles size={13} aria-hidden="true" />
            SaaS HealthTech para operar con más orden
          </Badge>
          <h1 className="max-w-4xl text-4xl font-bold leading-[1.06] text-[#171615] sm:text-5xl lg:text-6xl">
            Gestiona tu agenda, pacientes y reservas sin complicarte.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Agendix centraliza agenda clínica, reservas online, pacientes,
            equipo, asistencia y control en un solo panel.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={appRegisterHref}>
                Comenzar ahora
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <a href="#como-funciona">Ver cómo funciona</a>
            </Button>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
            Diseñado para profesionales independientes, centros en crecimiento y
            equipos que necesitan ordenar la atención sin sumar complejidad.
          </p>
        </div>

        <div className="mt-12">
          <HeroWorkspace />
        </div>
      </div>
    </section>
  )
}

function Problem() {
  const pains = [
    {
      icon: Zap,
      tone: 'orange' as const,
      title: 'La agenda se reparte entre WhatsApp, llamadas y memoria',
      desc: 'Cambios de hora, cancelaciones y confirmaciones quedan en conversaciones difíciles de rastrear.',
    },
    {
      icon: Database,
      tone: 'sky' as const,
      title: 'Los datos del paciente viven en planillas distintas',
      desc: 'Cuando necesitas contexto, pierdes tiempo buscando datos básicos, historial, notas o estado de atención.',
    },
    {
      icon: Users,
      tone: 'violet' as const,
      title: 'Coordinar equipos vuelve lenta la operación',
      desc: 'Profesionales, salas y servicios requieren reglas claras para evitar cruces y sobrecarga administrativa.',
    },
    {
      icon: LineChart,
      tone: 'emerald' as const,
      title: 'Falta visibilidad para decidir con calma',
      desc: 'Sin métricas de asistencia, reservas y carga diaria, el centro opera reactivo y con poca trazabilidad.',
    },
  ]

  return (
    <section className="bg-[#FAFAF8] py-18 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Dolor operativo"
          title="El problema no es solo agendar. Es mantener la operación bajo control."
          description="Agendix habla el idioma del día a día: pacientes que preguntan por WhatsApp, profesionales con horarios distintos, reservas que cambian y equipos que necesitan información confiable."
          align="center"
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {pains.map((pain) => (
            <article
              key={pain.title}
              className={cn(
                'rounded-lg border border-slate-200/80 bg-white p-6 shadow-sm shadow-black/[0.035]',
                interactiveCardClasses
              )}
            >
              <IconBadge icon={pain.icon} tone={pain.tone} className={interactiveIconClasses} />
              <h3
                className={cn(
                  'mt-5 text-lg font-bold leading-6 text-[#171615]',
                  interactiveTitleClasses
                )}
              >
                {pain.title}
              </h3>
              <p className={cn('mt-3 text-sm leading-6 text-slate-600', interactiveTextClasses)}>
                {pain.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Solution() {
  const capabilities = [
    {
      icon: Calendar,
      tone: 'orange' as const,
      title: 'Agenda centralizada',
      desc: 'Vista clara por profesional, estado, servicio y disponibilidad.',
    },
    {
      icon: HeartPulse,
      tone: 'violet' as const,
      title: 'Pacientes ordenados',
      desc: 'Datos, notas internas e historial operativo en el mismo lugar.',
    },
    {
      icon: Globe2,
      tone: 'sky' as const,
      title: 'Reservas online',
      desc: 'Tus pacientes reservan sin depender de llamadas o mensajes manuales.',
    },
    {
      icon: PanelLeft,
      tone: 'slate' as const,
      title: 'Panel administrativo',
      desc: 'Servicios, salas, permisos y equipo configurados desde un centro de mando.',
    },
    {
      icon: Activity,
      tone: 'emerald' as const,
      title: 'Asistencia y métricas',
      desc: 'Mayor visibilidad sobre ocupación, asistencia y actividad del centro.',
    },
    {
      icon: Video,
      tone: 'sky' as const,
      title: 'Telemedicina avanzada',
      desc: 'Enlaces Meet o Zoom para atención online y reuniones de equipo.',
    },
  ]

  return (
    <section id="producto" className="bg-white py-18 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Solución"
              title="Una plataforma simple para ordenar la operación clínica completa."
              description="Agendix reúne lo que normalmente vive separado: agenda, pacientes, reservas, equipo, salas, permisos, estadísticas y atención online."
            />
            <div className={cn('mt-8 rounded-lg p-6 text-white shadow-xl shadow-black/[0.12]', graphiteSurface)}>
              <p className="text-sm font-semibold text-orange-200">
                Resultado esperado
              </p>
              <p className="mt-2 text-2xl font-bold leading-tight">
                Menos coordinación manual, más control diario y una experiencia
                más profesional para tus pacientes.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((item) => (
              <article
                key={item.title}
                className={cn(
                  'rounded-lg border border-slate-200/80 bg-[#FAFAF8] p-5 shadow-sm shadow-black/[0.025]',
                  interactiveCardClasses
                )}
              >
                <IconBadge icon={item.icon} tone={item.tone} className={interactiveIconClasses} />
                <h3
                  className={cn(
                    'mt-4 text-base font-bold text-[#171615]',
                    interactiveTitleClasses
                  )}
                >
                  {item.title}
                </h3>
                <p className={cn('mt-2 text-sm leading-6 text-slate-600', interactiveTextClasses)}>
                  {item.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      icon: Building2,
      title: 'Configura tu consulta o centro',
      desc: 'Define horarios, servicios, salas y reglas de atención sin depender de configuración técnica compleja.',
    },
    {
      icon: Users,
      title: 'Organiza profesionales y pacientes',
      desc: 'Centraliza equipo, roles, pacientes activos y notas internas en una estructura clara.',
    },
    {
      icon: Calendar,
      title: 'Recibe y gestiona reservas',
      desc: 'Administra solicitudes, estados, cambios y confirmaciones desde la agenda clínica.',
    },
    {
      icon: LineChart,
      title: 'Controla la operación',
      desc: 'Revisa asistencia, carga diaria y métricas para tomar decisiones con más contexto.',
    },
  ]

  return (
    <section id="como-funciona" className="bg-[#F7FAF8] py-18 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Cómo funciona"
          title="De la reserva al control operativo, en cuatro pasos."
          description="El flujo está pensado para ser fácil de adoptar: primero ordenas la agenda, luego escalas hacia coordinación de equipo y métricas."
          align="center"
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className={cn(
                'rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-black/[0.035]',
                interactiveCardClasses
              )}
            >
              <div className="flex items-center justify-between">
                <IconBadge
                  icon={step.icon}
                  tone={index === 3 ? 'emerald' : 'orange'}
                  className={interactiveIconClasses}
                />
                <span className="text-xs font-bold text-slate-300 transition-colors duration-200 group-hover:text-white/45">
                  0{index + 1}
                </span>
              </div>
              <h3 className={cn('mt-5 text-base font-bold text-[#171615]', interactiveTitleClasses)}>
                {step.title}
              </h3>
              <p className={cn('mt-2 text-sm leading-6 text-slate-600', interactiveTextClasses)}>
                {step.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CustomerTypes() {
  const types = [
    {
      label: 'Individual',
      title: 'Profesionales independientes',
      desc: 'Agenda, pacientes y notas internas sin armar un sistema propio.',
      tone: 'orange' as const,
    },
    {
      label: 'Center',
      title: 'Centros pequeños',
      desc: 'Coordina 2 a 5 profesionales con agenda compartida y permisos.',
      tone: 'sky' as const,
    },
    {
      label: 'Center Pro',
      title: 'Centros medianos',
      desc: 'Suma métricas, asistencia y enlaces online para operar con más visibilidad.',
      tone: 'emerald' as const,
    },
    {
      label: 'Enterprise',
      title: 'Clínicas y equipos grandes',
      desc: 'Base flexible para profesionales ilimitados y operación multidisciplinaria.',
      tone: 'violet' as const,
    },
  ]

  return (
    <section className="bg-white py-18 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Para quién"
          title="Agendix escala desde una consulta individual hasta equipos grandes."
          description="La misma experiencia operativa se adapta a la etapa del negocio: empezar ordenado, coordinar equipos y crecer con control."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {types.map((type) => (
            <article
              key={type.label}
              className={cn(
                'rounded-lg border border-slate-200 bg-[#FAFAF8] p-6 shadow-sm shadow-black/[0.025]',
                interactiveCardClasses
              )}
            >
              <Badge
                tone={type.tone === 'emerald' ? 'green' : type.tone === 'sky' ? 'blue' : type.tone}
                className={interactiveBadgeClasses}
              >
                {type.label}
              </Badge>
              <h3 className={cn('mt-5 text-lg font-bold text-[#171615]', interactiveTitleClasses)}>
                {type.title}
              </h3>
              <p className={cn('mt-3 text-sm leading-6 text-slate-600', interactiveTextClasses)}>
                {type.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features = [
    [Calendar, 'Agenda profesional', 'Visualiza reservas, disponibilidad y estados sin perder contexto.', 'orange'],
    [HeartPulse, 'Gestión de pacientes', 'Mantén datos y notas internas accesibles para cada atención.', 'violet'],
    [Globe2, 'Reservas públicas', 'Permite que pacientes pidan hora sin coordinación manual constante.', 'sky'],
    [Users, 'Múltiples profesionales', 'Ordena agendas, servicios y disponibilidad por cada integrante.', 'emerald'],
    [ShieldCheck, 'Roles y permisos', 'Define quién administra, atiende o consulta información del centro.', 'slate'],
    [LineChart, 'Estadísticas', 'Observa actividad, ocupación y comportamiento operativo del centro.', 'emerald'],
    [CheckCircle, 'Control de asistencia', 'Distingue reservas confirmadas, pendientes, asistidas o ausentes.', 'orange'],
    [MonitorPlay, 'Telemedicina', 'Guarda enlaces Meet o Zoom en planes preparados para atención online.', 'sky'],
    [PanelLeft, 'Panel administrativo', 'Administra salas, servicios, equipo y configuración desde un solo lugar.', 'slate'],
    [Bell, 'Recordatorios', 'Reduce olvidos con comunicaciones y confirmaciones más ordenadas.', 'violet'],
  ] as const

  return (
    <section id="funcionalidades" className="bg-[#FAFAF8] py-18 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Funcionalidades"
          title="Todo lo importante para operar atención diaria, sin sobrecargar al equipo."
          description="La landing ahora prioriza beneficios concretos: ordenar, coordinar, controlar y atender mejor."
          align="center"
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {features.map(([Icon, title, desc, tone]) => (
            <article
              key={title}
              className={cn(
                'rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm shadow-black/[0.025]',
                interactiveCardClasses
              )}
            >
              <IconBadge icon={Icon} tone={tone as Tone} className={interactiveIconClasses} />
              <h3 className={cn('mt-4 text-sm font-bold text-[#171615]', interactiveTitleClasses)}>
                {title}
              </h3>
              <p className={cn('mt-2 text-sm leading-6 text-slate-600', interactiveTextClasses)}>
                {desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingCard({ plan }: { plan: PlanDefinition }) {
  const isRecommended = plan.id === 'center_pro'
  const isPopular = plan.id === 'center'
  const ctaHref =
    plan.ctaKind === 'sales'
      ? 'mailto:contacto@agendixchile.cl?subject=Demo%20Agendix%20Enterprise'
      : getAppUrl(`/register?plan=${plan.id}`)
  const extraProfessional = plan.extras.professionals?.priceMonthlyClp

  return (
    <article
      className={cn(
        'group relative flex min-h-full flex-col rounded-lg border bg-white p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1.5 hover:bg-orange-500 hover:text-white hover:shadow-2xl hover:shadow-orange-900/[0.14] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        isRecommended
          ? 'border-orange-300 shadow-xl shadow-orange-900/[0.08] ring-1 ring-orange-200 hover:border-orange-400'
          : 'border-slate-200/80 shadow-black/[0.03] hover:border-orange-300'
      )}
    >
      <div className="mb-5 flex min-h-7 items-start justify-between gap-3">
        <Badge
          tone={isRecommended ? 'orange' : isPopular ? 'blue' : 'slate'}
          className={interactiveBadgeClasses}
        >
          {isRecommended ? 'Recomendado' : isPopular ? 'Más elegido' : plan.audienceTag}
        </Badge>
      </div>

      <div>
        <h3 className={cn('text-xl font-bold text-[#171615]', interactiveTitleClasses)}>
          {plan.commercialName}
        </h3>
        <p className={cn('mt-2 min-h-12 text-sm leading-6 text-slate-600', interactiveTextClasses)}>
          {plan.audience}
        </p>
      </div>

      <div className="mt-6 border-y border-slate-100 py-5 transition-colors duration-200 group-hover:border-white/15">
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className={cn('text-4xl font-bold tracking-tight text-[#171615]', interactiveTitleClasses)}>
            {formatPlanPrice(plan.monthlyPriceClp)}
          </span>
          <span className="pb-1 text-sm font-medium text-slate-500 transition-colors duration-200 group-hover:text-white/70">
            CLP / mes
          </span>
        </div>
        <p className="mt-2 text-xs font-medium text-slate-400 transition-colors duration-200 group-hover:text-white/60">
          {plan.professionalRangeLabel}
        </p>
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {plan.summaryBenefits.map((benefit) => (
          <CheckItem key={benefit}>{benefit}</CheckItem>
        ))}
      </ul>

      {extraProfessional && (
        <div className="mt-6 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70 transition-colors duration-200 group-hover:bg-white/10 group-hover:text-white/80 group-hover:ring-white/20">
          Profesional extra: {formatPlanPrice(extraProfessional)} / mes
        </div>
      )}

      <Button
        asChild
        className="mt-6 w-full group-hover:!border-white group-hover:!bg-white group-hover:!text-orange-700"
        variant={isRecommended ? 'primary' : 'secondary'}
      >
        <Link href={ctaHref}>
          {plan.ctaKind === 'sales' ? 'Solicitar demo' : plan.ctaLabel}
        </Link>
      </Button>
    </article>
  )
}

function Pricing() {
  return (
    <section id="planes" className="bg-white py-18 sm:py-24">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <SectionHeading
            eyebrow="Planes y precios"
            title="Elige por etapa operativa, no por una lista interminable de módulos."
            description="Planes claros para partir solo, coordinar un centro pequeño o crecer hacia equipos con métricas, asistencia y telemedicina."
          />
          <div className="rounded-lg bg-[#F7FAF8] p-5 ring-1 ring-slate-200/80">
            <p className="text-sm font-semibold text-[#171615]">Recomendación comercial</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Si ya coordinas varios profesionales o quieres visibilidad del
              centro, <strong>Agendix Center Pro</strong> concentra mejor valor:
              asistencia, estadísticas y enlaces para atención online.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PlanComparison() {
  return (
    <section id="comparativa" className="bg-[#FAFAF8] py-18 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Comparativa"
            title="Compara rápido lo que cambia al crecer."
          />
          <Badge tone="orange">Center Pro recomendado</Badge>
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm shadow-black/[0.04]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-4">Funcionalidad</th>
                  {pricingPlans.map((plan) => (
                    <th key={plan.id} className="px-4 py-4">
                      {plan.shortName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="transition-colors duration-150 hover:bg-orange-50/70">
                    <td className="px-4 py-4 font-medium text-slate-700">
                      {row.label}
                    </td>
                    {pricingPlans.map((plan) => (
                      <td key={plan.id} className="px-4 py-4 text-slate-600">
                        {row.getValue ? (
                          row.getValue(plan)
                        ) : row.feature && plan.comparison[row.feature] ? (
                          <Check
                            size={18}
                            aria-label="Incluido"
                            className="text-emerald-500"
                          />
                        ) : (
                          <X
                            size={18}
                            aria-label="No incluido"
                            className="text-slate-300"
                          />
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
  )
}

function Differentiators() {
  const reasons = [
    {
      icon: Clock,
      title: 'Implementación más simple',
      desc: 'Pensado para empezar ordenando agenda y pacientes, sin proyectos largos ni configuración pesada.',
    },
    {
      icon: Stethoscope,
      title: 'Diseñado para operación clínica',
      desc: 'No es una agenda genérica: contempla pacientes, profesionales, salas, asistencia y permisos.',
    },
    {
      icon: WalletCards,
      title: 'Precios claros',
      desc: 'Planes por etapa de crecimiento, con profesional extra definido para Center y Center Pro.',
    },
    {
      icon: Building2,
      title: 'Escala con tu equipo',
      desc: 'Parte con una consulta individual y crece hacia centros y clínicas con profesionales ilimitados.',
    },
  ]

  return (
    <section className={cn('py-16 text-white sm:py-20', graphiteSurface)}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Por qué Agendix"
          title="Más operativo que una agenda simple. Más liviano que un software clínico complejo."
          description="Ordena lo que bloquea el día a día sin sumar un sistema pesado al equipo."
          dark
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason) => (
            <article
              key={reason.title}
              className="group rounded-lg border border-white/10 bg-white/[0.04] p-5 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-orange-300/70 hover:bg-orange-500 hover:shadow-xl hover:shadow-orange-900/[0.18] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <reason.icon
                size={20}
                className="text-orange-300 transition-colors duration-200 group-hover:text-white"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-sm font-bold text-white">{reason.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/58 transition-colors duration-200 group-hover:text-white/80">
                {reason.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Trust() {
  const trustItems = [
    [ShieldCheck, 'Conexión cifrada', 'La comunicación ocurre por HTTPS y con una arquitectura moderna.'],
    [Lock, 'Acceso por roles', 'Administrador, recepción y profesionales pueden tener permisos diferenciados.'],
    [Database, 'Datos centralizados', 'La información operativa deja de vivir repartida entre planillas y chats.'],
  ] as const

  return (
    <section className="bg-white py-18 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            eyebrow="Confianza"
            title="Una base seria para una operación que no puede depender del desorden."
            description="Seguridad, roles y datos centralizados para que la operación no dependa de planillas o chats."
          />

          <div className="grid gap-4">
            {trustItems.map(([Icon, title, desc]) => (
              <div
                key={title}
                className={cn(
                  'flex items-start gap-4 rounded-lg border border-slate-200 bg-[#FAFAF8] p-5 shadow-sm shadow-black/[0.025]',
                  interactiveCardClasses
                )}
              >
                <IconBadge icon={Icon} tone="emerald" className={interactiveIconClasses} />
                <div>
                  <h3 className={cn('text-base font-bold text-[#171615]', interactiveTitleClasses)}>
                    {title}
                  </h3>
                  <p className={cn('mt-1 text-sm leading-6 text-slate-600', interactiveTextClasses)}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}

function FAQItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string
  answer: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-slate-200/80 py-5">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-5 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="text-base font-bold leading-snug text-[#171615]">
          {question}
        </span>
        <ChevronDown
          size={18}
          className={cn(
            'mt-0.5 shrink-0 text-slate-400 transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>
      {open && <p className="mt-3 text-sm leading-6 text-slate-600">{answer}</p>}
    </div>
  )
}

function FAQ() {
  const faqs = [
    {
      q: '¿Para quién está pensado Agendix?',
      a: 'Para profesionales independientes, centros pequeños, centros medianos y clínicas o equipos grandes que necesitan ordenar agenda, pacientes, reservas y coordinación operativa.',
    },
    {
      q: '¿Puedo usarlo si trabajo solo?',
      a: 'Sí. Agendix Individual está pensado para un profesional que necesita agenda avanzada, hasta 50 pacientes activos, estadísticas básicas y notas internas.',
    },
    {
      q: '¿Qué pasa si tengo varios profesionales?',
      a: 'Agendix Center permite coordinar entre 2 y 5 profesionales con agenda compartida, múltiples agendas, roles y panel administrativo. Center Pro escala de 6 a 15 profesionales.',
    },
    {
      q: '¿Puedo gestionar pacientes y reservas desde la misma plataforma?',
      a: 'Sí. La propuesta central es que agenda, reservas y pacientes convivan en un mismo flujo para reducir doble entrada de datos y coordinación manual.',
    },
    {
      q: '¿Los planes se pueden escalar?',
      a: 'Sí. Puedes partir con Agendix Individual y avanzar a Center, Center Pro o Enterprise según cantidad de profesionales, necesidad de métricas y complejidad operacional.',
    },
    {
      q: '¿Qué incluye Agendix Center Pro?',
      a: 'Incluye todo lo anterior, 6 a 15 profesionales, estadísticas del centro, control de asistencia, gestión avanzada de pacientes y enlaces integrados de Zoom o Google Meet.',
    },
    {
      q: '¿Puedo integrar videollamadas?',
      a: 'Los enlaces de Zoom o Google Meet están disponibles desde Agendix Center Pro para telemedicina y reuniones de equipo.',
    },
  ]

  return (
    <section id="faq" className="bg-[#FAFAF8] py-18 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeading
              eyebrow="Preguntas frecuentes"
              title="Dudas clave antes de ordenar tu operación."
              description="Respuestas simples para decidir si Agendix calza con tu consulta, centro o equipo."
            />
            <Button asChild variant="secondary" className="mt-8">
              <a href="mailto:contacto@agendixchile.cl">Escribir a Agendix</a>
            </Button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-5 shadow-sm shadow-black/[0.035]">
            {faqs.map((faq, index) => (
              <FAQItem
                key={faq.q}
                question={faq.q}
                answer={faq.a}
                defaultOpen={index === 0}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CTAFinal() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className={cn('overflow-hidden rounded-lg px-6 py-12 text-center text-white shadow-2xl shadow-black/[0.16] sm:px-10 sm:py-16', graphiteSurface)}>
          <Eyebrow dark className="mb-4 text-orange-300">
            Siguiente paso
          </Eyebrow>
          <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
            Ordena tu operación. Atiende mejor. Crece con Agendix.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/65">
            Parte con una cuenta y evalúa si tu agenda, pacientes y reservas
            pueden vivir en un flujo más simple y profesional.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={appRegisterHref}>
                Comenzar ahora
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="w-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <a href={demoHref}>Solicitar demo</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const columns = [
    {
      heading: 'Producto',
      links: [
        { label: 'Cómo funciona', href: '#como-funciona' },
        { label: 'Funcionalidades', href: '#funcionalidades' },
        { label: 'Planes', href: '#planes' },
        { label: 'Comparativa', href: '#comparativa' },
      ],
    },
    {
      heading: 'Cuenta',
      links: [
        { label: 'Crear cuenta', href: appRegisterHref },
        { label: 'Iniciar sesión', href: getAppUrl('/login') },
        { label: 'Solicitar demo', href: demoHref },
      ],
    },
    {
      heading: 'Contacto',
      links: [
        { label: 'contacto@agendixchile.cl', href: 'mailto:contacto@agendixchile.cl' },
        { label: 'Santiago, Chile', href: '#' },
      ],
    },
  ]

  return (
    <footer className="border-t border-slate-200 bg-[#FAFAF8] py-12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <AgendixWordmark className="h-9 w-40 sm:h-9 sm:w-40" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
              Software de agenda, reservas y gestión de pacientes para
              profesionales y centros de salud en Chile.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.heading}>
                <h3 className="text-xs font-bold uppercase text-slate-400">
                  {column.heading}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-[#171615]"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-400">
          © 2026 Agendix · Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      <Header />
      <Hero />
      <Problem />
      <Solution />
      <HowItWorks />
      <CustomerTypes />
      <Features />
      <Pricing />
      <PlanComparison />
      <Differentiators />
      <Trust />
      <FAQ />
      <CTAFinal />
      <Footer />
    </main>
  )
}
