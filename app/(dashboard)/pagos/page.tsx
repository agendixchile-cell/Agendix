import { redirect } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  PatientPaymentsManager,
  type PatientPaymentListItem,
  type PaymentPatientOption,
  type PaymentReservationOption,
  type PaymentServiceOption,
} from '@/components/payments/patient-payments-manager'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import { getDemoPlanId } from '@/lib/subscription/server'
import { createClient } from '@/lib/supabase/server'
import type { PatientPaymentStatus, PaymentProvider } from '@/lib/payments/types'

type MembershipRow = {
  centro_id: string
  centros: {
    id: string
    nombre: string
    slug: string
  } | null
}

type PaymentRow = {
  id: string
  patient_id: string
  provider: string
  amount: number
  currency: string
  description: string | null
  status: string
  checkout_url: string | null
  created_at: string
  paid_at: string | null
  pacientes: {
    nombre: string
    apellido: string | null
  } | null
  servicios: {
    nombre: string
  } | null
  reservas: {
    fecha_inicio: string
  } | null
}

type PatientRow = {
  id: string
  nombre: string
  apellido: string | null
  email: string | null
}

type ServiceRow = {
  id: string
  nombre: string
  precio: number | null
}

type ReservationRow = {
  id: string
  paciente_id: string
  servicio_id: string
  profesional_id: string
  fecha_inicio: string
  pacientes: {
    nombre: string
    apellido: string | null
  } | null
  servicios: {
    nombre: string
    precio: number | null
  } | null
}

function name(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function normalizeStatus(value: string): PatientPaymentStatus {
  if (
    value === 'draft' ||
    value === 'pending' ||
    value === 'approved' ||
    value === 'rejected' ||
    value === 'cancelled' ||
    value === 'expired' ||
    value === 'refunded'
  ) {
    return value
  }

  return 'pending'
}

function normalizeProvider(value: string): PaymentProvider {
  if (value === 'fintoc' || value === 'manual') return value

  return 'mercado_pago'
}

type PagosPageProps = {
  searchParams: Promise<{
    new?: string
    patientId?: string
    reservationId?: string
  }>
}

function demoPaymentData(planId: Awaited<ReturnType<typeof getDemoPlanId>>): {
  initialPayments: PatientPaymentListItem[]
  patients: PaymentPatientOption[]
  services: PaymentServiceOption[]
  reservations: PaymentReservationOption[]
} {
  const dataset = getDemoPlanDataset(planId)
  const patients = dataset.pacientes.slice(0, 8).map((patient) => ({
    id: patient.id,
    nombre: patient.nombre,
    apellido: patient.apellido,
    email: patient.email,
  }))
  const services = dataset.servicios.slice(0, 8).map((service) => ({
    id: service.id,
    nombre: service.nombre,
    precio: service.precio,
  }))
  const reservations = dataset.reservas.slice(0, 8).map((reservation) => ({
    id: reservation.id,
    patientId: reservation.paciente.id,
    serviceId: reservation.servicio.id,
    professionalId: reservation.profesional.id,
    label: `${reservation.servicio.nombre} · ${dateTimeLabel(reservation.fecha_inicio)}`,
    amount: reservation.servicio.precio,
  }))

  return {
    patients,
    services,
    reservations,
    initialPayments: [
      {
        id: 'demo-payment-approved',
        patientId: patients[0]?.id ?? 'demo',
        patientName: patients[0] ? name([patients[0].nombre, patients[0].apellido]) : 'Paciente demo',
        serviceName: services[0]?.nombre ?? 'Sesión',
        reservationLabel: reservations[0]?.label ?? null,
        provider: 'mercado_pago',
        amount: 25000,
        currency: 'CLP',
        description: 'Sesión pagada',
        status: 'approved',
        checkoutUrl: null,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      },
      {
        id: 'demo-payment-pending',
        patientId: patients[1]?.id ?? 'demo',
        patientName: patients[1] ? name([patients[1].nombre, patients[1].apellido]) : 'Paciente demo',
        serviceName: services[1]?.nombre ?? 'Control',
        reservationLabel: reservations[1]?.label ?? null,
        provider: 'mercado_pago',
        amount: 32000,
        currency: 'CLP',
        description: 'Cobro pendiente',
        status: 'pending',
        checkoutUrl: 'https://www.mercadopago.cl/checkout/v1/redirect/demo',
        createdAt: new Date().toISOString(),
        paidAt: null,
      },
      {
        id: 'demo-payment-rejected',
        patientId: patients[2]?.id ?? 'demo',
        patientName: patients[2] ? name([patients[2].nombre, patients[2].apellido]) : 'Paciente demo',
        serviceName: services[2]?.nombre ?? 'Evaluación',
        reservationLabel: reservations[2]?.label ?? null,
        provider: 'mercado_pago',
        amount: 28000,
        currency: 'CLP',
        description: 'Cobro rechazado',
        status: 'rejected',
        checkoutUrl: null,
        createdAt: new Date().toISOString(),
        paidAt: null,
      },
    ],
  }
}

export default async function PagosPage({ searchParams }: PagosPageProps) {
  const params = await searchParams
  const demoMode = isDemoMode()

  if (demoMode) {
    const demoPlanId = await getDemoPlanId()
    const demoData = demoPaymentData(demoPlanId)

    return (
      <PageShell demoMode organizationName={demoUser.centro}>
        <PatientPaymentsManager
          demoMode
          defaultPatientId={params.patientId}
          defaultReservationId={params.reservationId}
          defaultOpen={params.new === '1' || Boolean(params.patientId || params.reservationId)}
          {...demoData}
        />
      </PageShell>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('miembros_centro')
    .select('centro_id,centros!inner(id,nombre,slug)')
    .eq('profile_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  const activeMembership = membership as unknown as MembershipRow | null

  if (!activeMembership?.centro_id || !activeMembership.centros) {
    redirect('/dashboard')
  }

  const organizationId = activeMembership.centro_id
  const [paymentsResult, patientsResult, servicesResult, reservationsResult] =
    await Promise.all([
      supabase
        .from('patient_payments')
        .select(
          `
            id,patient_id,provider,amount,currency,description,status,checkout_url,created_at,paid_at,
            pacientes(nombre,apellido),
            servicios(nombre),
            reservas(fecha_inicio)
          `
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(80),
      supabase
        .from('pacientes')
        .select('id,nombre,apellido,email')
        .eq('centro_id', organizationId)
        .eq('activo', true)
        .order('nombre', { ascending: true })
        .limit(200),
      supabase
        .from('servicios')
        .select('id,nombre,precio')
        .eq('centro_id', organizationId)
        .eq('activo', true)
        .order('nombre', { ascending: true }),
      supabase
        .from('reservas')
        .select(
          `
            id,paciente_id,servicio_id,profesional_id,fecha_inicio,
            pacientes(nombre,apellido),
            servicios(nombre,precio)
          `
        )
        .eq('centro_id', organizationId)
        .in('estado', ['pending', 'confirmed'])
        .order('fecha_inicio', { ascending: false })
        .limit(120),
    ])

  const payments = ((paymentsResult.data ?? []) as unknown as PaymentRow[]).map(
    (payment) => ({
      id: payment.id,
      patientId: payment.patient_id,
      patientName: name([
        payment.pacientes?.nombre ?? 'Paciente',
        payment.pacientes?.apellido,
      ]),
      serviceName: payment.servicios?.nombre ?? null,
      reservationLabel: payment.reservas
        ? dateTimeLabel(payment.reservas.fecha_inicio)
        : null,
      provider: normalizeProvider(payment.provider),
      amount: Number(payment.amount),
      currency: 'CLP' as const,
      description: payment.description,
      status: normalizeStatus(payment.status),
      checkoutUrl: payment.checkout_url,
      createdAt: payment.created_at,
      paidAt: payment.paid_at,
    })
  )
  const patients = ((patientsResult.data ?? []) as unknown as PatientRow[]).map(
    (patient) => ({
      id: patient.id,
      nombre: patient.nombre,
      apellido: patient.apellido,
      email: patient.email,
    })
  )
  const services = ((servicesResult.data ?? []) as unknown as ServiceRow[]).map(
    (service) => ({
      id: service.id,
      nombre: service.nombre,
      precio: service.precio == null ? null : Number(service.precio),
    })
  )
  const reservations = (
    (reservationsResult.data ?? []) as unknown as ReservationRow[]
  ).map((reservation) => ({
    id: reservation.id,
    patientId: reservation.paciente_id,
    serviceId: reservation.servicio_id,
    professionalId: reservation.profesional_id,
    label: `${reservation.servicios?.nombre ?? 'Reserva'} · ${name([
      reservation.pacientes?.nombre,
      reservation.pacientes?.apellido,
    ])} · ${dateTimeLabel(reservation.fecha_inicio)}`,
    amount:
      reservation.servicios?.precio == null
        ? null
        : Number(reservation.servicios.precio),
  }))

  return (
    <PageShell organizationName={activeMembership.centros.nombre}>
      <PatientPaymentsManager
        demoMode={false}
        initialPayments={payments}
        patients={patients}
        services={services}
        reservations={reservations}
        defaultPatientId={params.patientId}
        defaultReservationId={params.reservationId}
        defaultOpen={params.new === '1' || Boolean(params.patientId || params.reservationId)}
      />
    </PageShell>
  )
}

function PageShell({
  children,
  organizationName,
  demoMode = false,
}: {
  children: ReactNode
  organizationName: string
  demoMode?: boolean
}) {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Pagos de pacientes"
        description="Crea links de pago, revisa pagos pendientes y confirma atenciones pagadas."
        eyebrow={organizationName}
        icon={CreditCard}
        meta={demoMode ? <Badge tone="slate">Modo demo</Badge> : undefined}
      />

      {children}
    </div>
  )
}
