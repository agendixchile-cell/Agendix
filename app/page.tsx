'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Database,
  FileText,
  Globe,
  Lock,
  MapPin,
  Menu,
  Shield,
  Tag,
  UserCheck,
  Users,
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

type Tonal = 'orange' | 'emerald' | 'sky' | 'violet' | 'slate'

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
  { label: featureLabels.multi_agenda, feature: 'multi_agenda' },
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

const tonalClasses: Record<Tonal, string> = {
  orange: 'bg-orange-50 text-orange-500 ring-orange-200/60',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-200/60',
  sky: 'bg-sky-50 text-sky-500 ring-sky-200/60',
  violet: 'bg-violet-50 text-violet-500 ring-violet-200/60',
  slate: 'bg-slate-50 text-slate-500 ring-slate-200/60',
}

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
        'text-[11px] font-medium uppercase',
        dark ? 'text-white/55' : 'text-slate-400',
        className
      )}
    >
      {children}
    </span>
  )
}

function IconContainer({
  icon: Icon,
  tonal = 'orange',
  size = 44,
}: {
  icon: LucideIcon
  tonal?: Tonal
  size?: number
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl ring-1',
        tonalClasses[tonal]
      )}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.48)} aria-hidden="true" />
    </div>
  )
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-50 ring-1 ring-orange-200/60">
        <Check size={11} className="text-orange-500" aria-hidden="true" />
      </span>
      <span className="text-sm leading-6 text-slate-600">{children}</span>
    </li>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const navLinks = [
    { label: 'Producto', href: '#producto' },
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Planes', href: '#planes' },
    { label: 'Comparativa', href: '#comparativa' },
    { label: 'FAQ', href: '#faq' },
  ]

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#FAFAF8]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <AgendixWordmark preload className="h-10 w-44" />

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={getAppUrl('/login')}
            className="text-sm font-medium text-slate-700 transition-colors hover:text-orange-600"
          >
            Iniciar sesión
          </Link>
          <Button asChild size="lg">
            <Link href={getAppUrl('/register')}>Crear cuenta</Link>
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
            <X size={20} className="text-slate-600" aria-hidden="true" />
          ) : (
            <Menu size={20} className="text-slate-600" aria-hidden="true" />
          )}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-slate-200/70 bg-[#FAFAF8] p-4 md:hidden">
          <nav className="mb-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-2">
            <Link
              href={getAppUrl('/login')}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Iniciar sesión
            </Link>
            <Button asChild size="lg" className="w-full">
              <Link href={getAppUrl('/register')}>Crear cuenta</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}

function ProductMock() {
  const appointments = [
    {
      hour: '08:30',
      patient: 'María González',
      service: 'Kinesiología',
      professional: 'Dra. Torres',
      tone: 'orange' as const,
    },
    {
      hour: '09:00',
      patient: 'Carlos Rivas',
      service: 'Consulta médica',
      professional: 'Dr. Molina',
      tone: 'sky' as const,
    },
    {
      hour: '10:00',
      patient: 'Ana Fernández',
      service: 'Psicología',
      professional: 'Ps. Araya',
      tone: 'violet' as const,
    },
    {
      hour: '11:30',
      patient: 'Luis Martínez',
      service: 'Kinesiología',
      professional: 'Dra. Torres',
      tone: 'orange' as const,
    },
    {
      hour: '12:00',
      patient: 'Sofía Vargas',
      service: 'Nutrición',
      professional: 'Nut. Lagos',
      tone: 'emerald' as const,
    },
    {
      hour: '14:30',
      patient: 'Jorge Pinto',
      service: 'Consulta médica',
      professional: 'Dr. Molina',
      tone: 'sky' as const,
    },
  ]
  const toneStyles: Record<
    Tonal,
    { bg: string; border: string; dot: string; name: string; sub: string }
  > = {
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200/60',
      dot: 'bg-orange-400',
      name: 'text-orange-800',
      sub: 'text-orange-500',
    },
    sky: {
      bg: 'bg-sky-50',
      border: 'border-sky-200/60',
      dot: 'bg-sky-400',
      name: 'text-sky-800',
      sub: 'text-sky-500',
    },
    violet: {
      bg: 'bg-violet-50',
      border: 'border-violet-200/60',
      dot: 'bg-violet-400',
      name: 'text-violet-800',
      sub: 'text-violet-500',
    },
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200/60',
      dot: 'bg-emerald-400',
      name: 'text-emerald-800',
      sub: 'text-emerald-500',
    },
    slate: {
      bg: 'bg-slate-50',
      border: 'border-slate-200/60',
      dot: 'bg-slate-400',
      name: 'text-slate-800',
      sub: 'text-slate-500',
    },
  }
  const tabs = ['Todos', 'Dra. Torres', 'Dr. Molina', 'Ps. Araya']
  const [activeTab, setActiveTab] = useState(0)
  const visible =
    activeTab === 0
      ? appointments
      : appointments.filter((appointment) => appointment.professional === tabs[activeTab])

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/[0.09]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-slate-800">Agenda del día</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            Mar 13 mayo
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-emerald-600">En vivo</span>
        </div>
      </div>

      <div className="flex gap-0 overflow-x-auto border-b border-slate-100 bg-white px-1">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(index)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors',
              index === activeTab
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-[280px] space-y-2 bg-[#FAFAF8] px-4 py-3">
        {visible.map((appointment) => {
          const tone = toneStyles[appointment.tone]

          return (
            <div
              key={`${appointment.hour}-${appointment.patient}`}
              className={cn(
                'flex min-w-0 items-center gap-3 rounded-xl border px-3.5 py-2.5',
                tone.border,
                tone.bg
              )}
            >
              <span className="w-10 shrink-0 text-xs font-medium tabular-nums text-slate-400">
                {appointment.hour}
              </span>
              <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.dot)} />
              <div className="min-w-0 flex-1">
                <div className={cn('truncate text-xs font-semibold', tone.name)}>
                  {appointment.patient}
                </div>
                <div className={cn('truncate text-xs', tone.sub)}>
                  {appointment.service} · {appointment.professional}
                </div>
              </div>
              <span className="hidden shrink-0 rounded-full border border-slate-200/70 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 sm:inline-flex">
                Confirmada
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-white px-5 py-3">
        <span className="text-xs text-slate-400">
          6 citas · 2 pendientes de confirmación
        </span>
        <span className="hidden text-xs font-semibold text-orange-500 sm:inline">
          Ver completa
        </span>
      </div>
    </div>
  )
}

function Hero() {
  const segments = [
    'Kinesiólogos',
    'Psicólogos',
    'Nutricionistas',
    'Fonoaudiólogos',
    'Terapeutas',
    'Centros clínicos',
  ]

  return (
    <section className="bg-[#FAFAF8] py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid min-w-0 items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
          <div className="min-w-0">
            <Badge tone="orange" className="mb-7 gap-1.5">
              <CheckCircle size={12} aria-hidden="true" />
              Para profesionales y centros de salud en Chile
            </Badge>
            <h1 className="mb-6 text-[2.15rem] font-bold leading-[1.12] text-slate-900 sm:text-5xl lg:text-[3.5rem]">
              Tu agenda, tus pacientes
              <br />y tus reservas
              <br />en un solo lugar.
            </h1>
            <p className="mb-8 max-w-[460px] text-lg leading-7 text-slate-500 sm:text-xl">
              Agendix reúne reservas online, agenda clínica, pacientes y
              recordatorios en una plataforma simple. Diseñado para
              profesionales independientes y centros de salud que quieren operar
              sin caos.
            </p>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={getAppUrl('/register')}>
                  Probar Agendix gratis
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                <a href="#producto">Ver cómo funciona</a>
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Gratis para comenzar · Sin tarjeta de crédito · Cancela cuando
              quieras
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {segments.map((segment) => (
                <span
                  key={segment}
                  className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500"
                >
                  {segment}
                </span>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <ProductMock />
          </div>
        </div>
      </div>
    </section>
  )
}

function SocialProof() {
  const stats = [
    {
      value: '25+',
      label: 'Profesionales testeando',
      detail: 'Activos en la plataforma hoy',
    },
    {
      value: '6+',
      label: 'Especialidades',
      detail: 'Kinesiología, psicología, nutrición y más',
    },
    {
      value: '100%',
      label: 'Enfocado en Chile',
      detail: 'Diseñado para la operación clínica local',
    },
    {
      value: 'Pronto',
      label: 'Lanzamiento comercial',
      detail: 'Sé parte de los primeros usuarios',
    },
  ]

  return (
    <section className="border-y border-slate-200/60 bg-[#FCFBF9] py-12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-[11px] font-medium uppercase text-slate-400">
          Construido junto a profesionales reales de la salud en Chile
        </p>
        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-100 bg-white px-5 py-4"
            >
              <div className="mb-1 text-2xl font-bold text-orange-500">
                {stat.value}
              </div>
              <div className="mb-0.5 text-sm font-semibold text-slate-700">
                {stat.label}
              </div>
              <div className="text-xs leading-relaxed text-slate-400">
                {stat.detail}
              </div>
            </div>
          ))}
        </div>
        <p className="mx-auto max-w-xl text-center text-sm leading-relaxed text-slate-500">
          Agendix ya está siendo probado por profesionales y centros en Chile.
          Su feedback guía cada decisión de producto antes del lanzamiento
          comercial.
        </p>
      </div>
    </section>
  )
}

function Problem() {
  const items = [
    {
      icon: Zap,
      tonal: 'orange' as const,
      title: 'La agenda vive en WhatsApp',
      desc: 'Cada confirmación, cambio de hora y cancelación pasa por mensajes. Perder el hilo cuesta tiempo y pacientes.',
    },
    {
      icon: Clock,
      tonal: 'orange' as const,
      title: 'Pacientes que no pueden reservar solos',
      desc: 'Fuera de tu horario de atención nadie puede agendar. Pierdes reservas que podrían hacerse solas mientras descansas.',
    },
    {
      icon: Database,
      tonal: 'orange' as const,
      title: 'Información repartida en todos lados',
      desc: 'Entre planillas, cuadernos, chats y carpetas es difícil saber en segundos quién viene, qué le pasa y qué tiene pendiente.',
    },
  ]

  return (
    <section className="bg-[#FAFAF8] py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
            Coordinar tu agenda clínica
            <br className="hidden sm:block" /> no debería tomar todo el día
          </h2>
          <p className="mx-auto max-w-lg text-base leading-7 text-slate-500">
            La mayoría de los profesionales independientes y centros pequeños
            operan con herramientas que no fueron diseñadas para la gestión
            clínica.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/[0.04]"
            >
              <IconContainer icon={item.icon} tonal={item.tonal} size={44} />
              <h3 className="mb-2 mt-4 text-base font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="text-sm leading-6 text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function MockBooking() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.05]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase text-slate-400">
          Nueva reserva
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Confirmada
        </span>
      </div>
      <div className="space-y-2.5">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="mb-0.5 text-[10px] uppercase text-slate-400">
            Paciente
          </div>
          <div className="text-sm font-semibold text-slate-700">
            María González
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="mb-0.5 text-[10px] uppercase text-slate-400">
              Servicio
            </div>
            <div className="text-sm font-semibold text-slate-700">
              Kinesiología
            </div>
          </div>
          <div className="rounded-xl border border-orange-200/60 bg-orange-50 px-3 py-2.5">
            <div className="mb-0.5 text-[10px] uppercase text-orange-400">
              Horario
            </div>
            <div className="text-sm font-semibold text-orange-600">10:30 h</div>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="mb-0.5 text-[10px] uppercase text-slate-400">
            Profesional
          </div>
          <div className="text-sm font-semibold text-slate-700">
            Dra. Torres · Sala A
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Aparece en la agenda del profesional al instante
      </div>
    </div>
  )
}

function MockDashboard() {
  const stats = [
    { value: '18', label: 'Citas hoy', className: 'text-slate-800' },
    { value: '4', label: 'Profesionales', className: 'text-sky-600' },
    { value: '92%', label: 'Ocupación', className: 'text-emerald-600' },
  ]
  const rooms = [
    { name: 'Sala A', pct: 87 },
    { name: 'Sala B', pct: 63 },
    { name: 'Sala C', pct: 42 },
  ]

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.05]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase text-slate-400">
          Resumen del centro
        </span>
        <span className="text-[10px] text-slate-400">Hoy</span>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2.5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-slate-50 p-3 text-center">
            <div className={cn('text-xl font-bold', stat.className)}>
              {stat.value}
            </div>
            <div className="mt-0.5 text-[10px] leading-tight text-slate-400">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-slate-50 p-3">
        <div className="mb-2.5 text-[10px] font-medium uppercase text-slate-400">
          Ocupación por sala
        </div>
        {rooms.map((room) => (
          <div
            key={room.name}
            className="mb-1.5 flex items-center gap-2 last:mb-0"
          >
            <span className="w-12 shrink-0 text-xs text-slate-500">{room.name}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-1.5 rounded-full bg-orange-400"
                style={{ width: `${room.pct}%` }}
              />
            </div>
            <span className="w-7 text-right text-[10px] text-slate-400">
              {room.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockReminder() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.05]">
      <div className="mb-4 text-[11px] font-semibold uppercase text-slate-400">
        Recordatorio automático
      </div>
      <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
        <div className="mb-3 flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
            A
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-700">Agendix</div>
            <div className="text-[10px] text-slate-400">
              recordatorio@agendixchile.cl → m.gonzalez@mail.com
            </div>
          </div>
        </div>
        <div className="mb-1.5 text-sm font-semibold text-slate-800">
          Recordatorio: cita mañana a las 10:30 h
        </div>
        <div className="text-xs leading-5 text-slate-500">
          Tu cita de <strong>Kinesiología</strong> con Dra. Torres está
          confirmada para mañana. Centro Kinésico Andes, Av. Providencia 1234.
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-1.5 text-xs text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Enviado automáticamente 24h antes de la cita
      </div>
    </div>
  )
}

function Solution() {
  const steps = [
    {
      num: '01',
      mock: <MockBooking />,
      title: 'Agenda y reservas en un mismo flujo',
      desc: 'El paciente reserva online en tu portal público y aparece confirmado en la agenda del profesional, sin doble entrada ni coordinación adicional.',
      features: [
        'Portal de reservas con tu identidad de marca',
        'Confirmación automática al paciente y al profesional',
        'Bloqueos y disponibilidad configurables por profesional',
      ],
    },
    {
      num: '02',
      mock: <MockDashboard />,
      title: 'Centro de operación clínica',
      desc: 'Pacientes, profesionales, salas y servicios gestionados con permisos por rol, con visión consolidada de ocupación y desempeño.',
      features: [
        'Gestión de roles: recepción, profesional, administrador',
        'Vista de ocupación diaria y semanal por sala',
        'Registro y consulta de pacientes centralizado',
      ],
    },
    {
      num: '03',
      mock: <MockReminder />,
      title: 'Recordatorios y seguimiento sin fricción',
      desc: 'Confirmaciones automáticas por email, fichas clínicas estructuradas y respaldo continuo de toda la información del centro.',
      features: [
        'Recordatorios automáticos por email antes de la cita',
        'Fichas clínicas estructuradas por especialidad',
        'Respaldo continuo sin intervención del equipo',
      ],
    },
  ]

  return (
    <section id="producto" className="bg-[#FCFBF9] py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <Eyebrow className="mb-3 block">Cómo funciona</Eyebrow>
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Una plataforma que conecta cada parte de tu práctica clínica
          </h2>
        </div>
        <div className="space-y-24">
          {steps.map((step, index) => (
            <div key={step.num} className="grid items-center gap-12 lg:grid-cols-2">
              <div className={index % 2 === 1 ? 'lg:order-2' : 'lg:order-1'}>
                <Eyebrow className="mb-4 block">{step.num}</Eyebrow>
                <h3 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl">
                  {step.title}
                </h3>
                <p className="mb-7 text-base leading-7 text-slate-500">
                  {step.desc}
                </p>
                <ul className="space-y-3.5">
                  {step.features.map((feature) => (
                    <CheckItem key={feature}>{feature}</CheckItem>
                  ))}
                </ul>
              </div>
              <div className={index % 2 === 1 ? 'lg:order-1' : 'lg:order-2'}>
                {step.mock}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const cards = [
    {
      icon: Calendar,
      tonal: 'orange' as const,
      title: 'Agenda clínica',
      desc: 'Ve toda tu semana de un vistazo: reservas, estados y profesionales organizados con claridad. Sin confusión.',
    },
    {
      icon: Globe,
      tonal: 'sky' as const,
      title: 'Reservas online 24/7',
      desc: 'Tus pacientes reservan hora desde cualquier dispositivo, en cualquier momento. Sin llamadas ni WhatsApp.',
    },
    {
      icon: Users,
      tonal: 'violet' as const,
      title: 'Gestión de pacientes',
      desc: 'Historial, datos de contacto y atenciones de cada paciente en un solo perfil. Acceso rápido cuando más lo necesitas.',
    },
    {
      icon: UserCheck,
      tonal: 'emerald' as const,
      title: 'Profesionales y equipos',
      desc: 'Configura horarios, especialidades y disponibilidad de cada profesional. Agendix coordina sin que tú calcules.',
    },
    {
      icon: MapPin,
      tonal: 'orange' as const,
      title: 'Salas y recursos',
      desc: 'Asigna salas a cada cita y evita cruces de espacio. Sin coordinación manual adicional.',
    },
    {
      icon: Tag,
      tonal: 'sky' as const,
      title: 'Servicios y precios',
      desc: 'Catálogo de servicios con duración y valor, visible en tu portal público y vinculado a la agenda.',
    },
    {
      icon: Bell,
      tonal: 'emerald' as const,
      title: 'Recordatorios automáticos',
      desc: 'Agendix avisa a tus pacientes antes de cada cita. Menos inasistencias, sin que tú tengas que recordarlo.',
    },
    {
      icon: FileText,
      tonal: 'violet' as const,
      title: 'Fichas clínicas',
      desc: 'Registra evoluciones y notas clínicas por paciente. Organizado, accesible y siempre al día.',
    },
  ]

  return (
    <section id="funcionalidades" className="bg-[#FAFAF8] py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <Eyebrow className="mb-3 block">Funcionalidades</Eyebrow>
          <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
            Todo lo que necesitas,
            <br className="hidden sm:block" /> sin lo que no
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/[0.04] transition-shadow hover:shadow-md"
            >
              <IconContainer icon={card.icon} tonal={card.tonal} size={44} />
              <h3 className="mb-2 mt-4 text-[15px] font-semibold text-slate-900">
                {card.title}
              </h3>
              <p className="text-sm leading-[1.65] text-slate-500">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stats() {
  const benefits = [
    {
      icon: Zap,
      title: 'Menos coordinación manual',
      desc: 'Las reservas, confirmaciones y recordatorios ocurren solos. Sin mensajes de ida y vuelta.',
    },
    {
      icon: Globe,
      title: 'Reservas disponibles 24/7',
      desc: 'Tu agenda está abierta aunque tú no estés. Los pacientes reservan cuando pueden.',
    },
    {
      icon: Database,
      title: 'Información clínica organizada',
      desc: 'Datos de pacientes, historial y fichas accesibles en segundos desde cualquier dispositivo.',
    },
    {
      icon: Calendar,
      title: 'Agenda clara por profesional',
      desc: 'Sin cruces de horario, sin sorpresas. Cada profesional ve solo lo que le corresponde.',
    },
  ]

  return (
    <section className="bg-[#FCFBF9] py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-[#22211F] px-6 py-14 shadow-2xl shadow-slate-900/[0.14] sm:px-10 sm:py-16">
          <div className="mb-12 text-center">
            <Eyebrow dark className="mb-4 block">
              Impacto real
            </Eyebrow>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Más tiempo para atender,
              <br className="hidden sm:block" /> menos para coordinar
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-white/55">
              Agendix toma lo que hoy haces manualmente y lo automatiza. El
              resultado es una operación más ordenada y pacientes mejor
              atendidos.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
              >
                <Icon size={22} className="mb-3 text-orange-400" aria-hidden="true" />
                <div className="mb-2 text-sm font-semibold leading-snug text-white">
                  {title}
                </div>
                <div className="text-sm leading-5 text-white/50">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ForWho() {
  const profiles = [
    {
      initials: 'PI',
      title: 'Profesionales independientes',
      desc: 'Levanta tu agenda online en minutos y recibe reservas sin intermediarios. El portal público hace el trabajo de recepción mientras tú te concentras en atender.',
    },
    {
      initials: 'CE',
      title: 'Centros y equipos pequeños',
      desc: 'Coordina profesionales, salas y servicios desde un solo lugar, con visión clara de la ocupación y sin coordinación manual entre el equipo.',
    },
    {
      initials: 'CM',
      title: 'Centros multidisciplinarios',
      desc: 'Gestiona múltiples especialidades, salas y profesionales con permisos por rol. Operación consolidada, sin perder claridad por profesional.',
    },
  ]

  return (
    <section className="bg-[#FAFAF8] py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <Eyebrow className="mb-3 block">Para quién es Agendix</Eyebrow>
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Diseñado para profesionales y centros de salud en Chile
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {profiles.map((profile) => (
            <div
              key={profile.title}
              className="rounded-2xl border border-slate-200/80 bg-[#FFF4EF] p-6"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white ring-2 ring-orange-300/40">
                {profile.initials}
              </div>
              <h3 className="mb-2 text-[15px] font-semibold text-slate-900">
                {profile.title}
              </h3>
              <p className="text-sm leading-6 text-slate-500">{profile.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingCard({ plan }: { plan: PlanDefinition }) {
  const ctaHref =
    plan.ctaKind === 'sales'
      ? 'mailto:contacto@agendixchile.cl?subject=Demo%20Agendix%20Enterprise'
      : getAppUrl(`/register?plan=${plan.id}`)

  return (
    <article
      className={cn(
        'relative flex min-h-full flex-col rounded-2xl bg-white p-7',
        plan.highlighted
          ? 'border-2 border-orange-300 shadow-xl shadow-orange-900/[0.08]'
          : 'border border-slate-200/80 shadow-sm shadow-slate-900/[0.04]'
      )}
    >
      {plan.highlightLabel && (
        <div className="mb-4">
          <Badge tone={plan.highlighted ? 'orange' : 'slate'}>
            {plan.highlightLabel}
          </Badge>
        </div>
      )}

      <Badge tone="slate" className="mb-4 w-fit">
        {plan.audienceTag}
      </Badge>
      <div className="mb-5">
        <h3 className="mb-1 text-lg font-bold text-slate-900">
          {plan.commercialName}
        </h3>
        <p className="text-sm leading-5 text-slate-500">{plan.audience}</p>
      </div>
      <div className="mb-6 border-b border-slate-100 pb-6">
        <span className="text-4xl font-bold text-slate-900">
          {formatPlanPrice(plan.monthlyPriceClp)}
        </span>
        <span className="ml-1.5 text-sm text-slate-400">CLP / mes</span>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {plan.summaryBenefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2.5 text-sm text-slate-600">
            <Check size={15} className="mt-0.5 shrink-0 text-orange-500" />
            {benefit}
          </li>
        ))}
      </ul>

      <Button
        asChild
        className="w-full"
        variant={plan.highlighted ? 'primary' : 'secondary'}
      >
        <Link href={ctaHref}>
          {plan.ctaKind === 'sales' ? 'Hablar con nosotros' : plan.ctaLabel}
        </Link>
      </Button>
    </article>
  )
}

function Pricing() {
  return (
    <section id="planes" className="bg-[#FCFBF9] py-20 sm:py-24">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <Eyebrow className="mb-3 block">Planes</Eyebrow>
          <h2 className="mb-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Un plan para cada etapa del centro
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-7 text-slate-500">
            Empieza simple y escala hacia operación de centro, métricas avanzadas
            y telemedicina cuando tu equipo lo pida.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
  )
}

function PlanComparison() {
  return (
    <section id="comparativa" className="bg-[#FAFAF8] py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Eyebrow className="mb-3 block">Comparativa</Eyebrow>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Diferencias clave por plan
            </h2>
          </div>
          <Badge tone="slate">Agendix Center Pro recomendado</Badge>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04]">
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
                  <tr key={row.label}>
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

function Trust() {
  const items = [
    {
      icon: Shield,
      tonal: 'orange' as const,
      title: 'Conexión cifrada',
      desc: 'Toda la comunicación con la plataforma ocurre por conexiones seguras HTTPS.',
    },
    {
      icon: CheckCircle,
      tonal: 'emerald' as const,
      title: 'Diseñado para Chile',
      desc: 'Desarrollado considerando la operación clínica y las necesidades del mercado local.',
    },
    {
      icon: Database,
      tonal: 'sky' as const,
      title: 'Respaldos frecuentes',
      desc: 'Tu información se respalda automáticamente. Sin dependencia de dispositivos físicos.',
    },
    {
      icon: Lock,
      tonal: 'violet' as const,
      title: 'Acceso por roles',
      desc: 'Recepción, profesionales y administración con sus propios permisos y vistas.',
    },
  ]

  return (
    <section className="border-y border-slate-200/60 bg-[#FCFBF9] py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <IconContainer icon={item.icon} tonal={item.tonal} size={44} />
              <div>
                <h4 className="mb-1 text-sm font-semibold text-slate-900">
                  {item.title}
                </h4>
                <p className="text-xs leading-5 text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
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
        <span className="text-[15px] font-semibold leading-snug text-slate-900">
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
      {open && <p className="mt-3 text-sm leading-6 text-slate-500">{answer}</p>}
    </div>
  )
}

function FAQ() {
  const faqs = [
    {
      q: '¿Cómo migro los pacientes y la agenda actual a Agendix?',
      a: 'Puedes importar tu listado de pacientes desde un archivo Excel o CSV. La agenda se configura desde cero, con un proceso guiado paso a paso. La mayoría de los centros queda operativa el mismo día.',
    },
    {
      q: '¿Mis pacientes pueden reservar sin crear una cuenta?',
      a: 'Sí. El portal de reservas es público y no requiere que el paciente se registre. Solo ingresa su nombre y datos de contacto básicos para confirmar la cita.',
    },
    {
      q: '¿Cómo manejan los datos clínicos y la privacidad?',
      a: 'Los datos se almacenan con cifrado en reposo y en tránsito. El acceso está segmentado por rol, y ningún dato sale del sistema sin autorización del administrador del centro.',
    },
    {
      q: '¿Funciona para centros con varios profesionales y salas?',
      a: 'Sí. Puedes agregar tantos profesionales y salas como necesites, cada uno con su propia disponibilidad y servicios. La vista de agenda consolida todo en un solo panel.',
    },
    {
      q: '¿Qué pasa con los recordatorios y las confirmaciones?',
      a: 'El sistema envía confirmación automática cuando el paciente reserva, y un recordatorio por email antes de la cita. No requiere ninguna acción de tu parte.',
    },
    {
      q: '¿Tienen un periodo de prueba?',
      a: 'Agendix Individual permite comenzar sin fricción. Los planes de centro se pueden contratar cuando tu operación crece y necesitas más equipo, métricas y permisos.',
    },
  ]

  return (
    <section id="faq" className="bg-[#FAFAF8] py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[2fr_3fr] lg:gap-20">
          <div>
            <Eyebrow className="mb-4 block">Preguntas frecuentes</Eyebrow>
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              Resuelve tus dudas antes de empezar
            </h2>
            <p className="text-base leading-7 text-slate-500">
              Si no encuentras la respuesta que buscas, escríbenos a{' '}
              <a
                href="mailto:contacto@agendixchile.cl"
                className="font-medium text-orange-500 transition-colors hover:text-orange-600"
              >
                contacto@agendixchile.cl
              </a>
              .
            </p>
          </div>
          <div>
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
    <section className="bg-[#FAFAF8] py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-[#22211F] px-8 py-16 text-center shadow-2xl shadow-slate-900/[0.16]">
          <Eyebrow dark className="mb-5 block text-orange-300/85">
            Comienza hoy
          </Eyebrow>
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Empieza a ordenar tu agenda
            <br className="hidden sm:block" /> y atender mejor desde hoy.
          </h2>
          <p className="mx-auto mb-8 max-w-md text-base leading-7 text-white/65">
            Únete a los profesionales que ya están probando Agendix. Sin
            complicaciones, sin costo inicial, listo para operar en minutos.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href={getAppUrl('/register')}>Crear cuenta gratis</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href="mailto:contacto@agendixchile.cl">
                Agendar demo
                <ArrowRight size={14} aria-hidden="true" />
              </a>
            </Button>
          </div>
          <p className="mt-5 text-xs text-white/35">
            Sin tarjeta de crédito · Cancela cuando quieras · Soporte en español
          </p>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const cols = [
    {
      heading: 'Producto',
      links: [
        { label: 'Funcionalidades', href: '#funcionalidades' },
        { label: 'Planes', href: '#planes' },
        { label: 'Comparativa', href: '#comparativa' },
        { label: 'Demo', href: getAppUrl('/login') },
        { label: 'Login', href: getAppUrl('/login') },
      ],
    },
    {
      heading: 'Empresa',
      links: [
        { label: 'Sobre Agendix', href: '#' },
        { label: 'Contacto', href: 'mailto:contacto@agendixchile.cl' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacidad', href: '/privacidad' },
        { label: 'Términos', href: '/terminos' },
      ],
    },
  ]

  return (
    <footer className="border-t border-slate-200/80 bg-[#FAFAF8] pb-8 pt-14">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <AgendixWordmark className="mb-4 h-8 w-36" />
            <p className="mb-2 text-sm leading-6 text-slate-500">
              Agenda clínica, reservas online y gestión de pacientes para
              profesionales y centros de salud en Chile.
            </p>
            <p className="text-xs text-slate-400">Santiago, Chile</p>
          </div>
          {cols.map((col) => (
            <div key={col.heading}>
              <h4 className="mb-4 text-[11px] font-semibold uppercase text-slate-400">
                {col.heading}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-slate-900"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200/60 pt-6">
          <p className="text-xs text-slate-400">
            © 2026 Agendix · Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAFAF8]">
      <Header />
      <Hero />
      <SocialProof />
      <Problem />
      <Solution />
      <Features />
      <Stats />
      <ForWho />
      <Pricing />
      <PlanComparison />
      <Trust />
      <FAQ />
      <CTAFinal />
      <Footer />
    </main>
  )
}
