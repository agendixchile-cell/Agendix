import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CalendarCheck2, Clock3, CreditCard, HeartPulse, UserRound } from 'lucide-react'
import { isDemoMode } from '@/lib/auth/demo'
import { demoCentro } from '@/lib/centro/demo'
import { formatBookingDate } from '@/lib/booking/availability'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type ReservaConfirmationRow = {
  id: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  servicios: {
    nombre: string
    duracion_minutos: number
    precio: number | null
  } | null
  profiles: {
    nombre: string
    apellido: string | null
  } | null
}

type PagoRow = {
  monto: number
  estado: string
  metodo_pago: string | null
}

export const metadata: Metadata = {
  title: 'Reserva recibida | Agendix',
}

function searchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

function formatPrice(value: number | null) {
  if (value == null || value <= 0) return 'No informado'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params
  const query = await searchParams

  if (isDemoMode() && slug === demoCentro.slug && searchValue(query.demo)) {
    return (
      <ConfirmationView
        slug={slug}
        centroNombre={demoCentro.nombre}
        serviceName={searchValue(query.servicio) ?? 'Servicio seleccionado'}
        professionalName={searchValue(query.profesional) ?? 'Profesional del centro'}
        date={searchValue(query.fecha) ?? ''}
        hour={searchValue(query.hora) ?? ''}
        price={formatPrice(Number(searchValue(query.precio) || 0))}
        paymentStatus={
          searchValue(query.payment_method) === 'online'
            ? 'Pagado online'
            : 'Pendiente presencial'
        }
        demoMode
      />
    )
  }

  const reservaId = searchValue(query.reserva)

  if (!reservaId) {
    return (
      <ConfirmationView
        slug={slug}
        centroNombre="Agendix"
        serviceName="Reserva solicitada"
        professionalName="Centro de salud"
        date=""
        hour=""
        price="No informado"
        paymentStatus="Pendiente"
      />
    )
  }

  const supabase = createAdminClient() ?? (await createClient())
  const { data: centro } = await supabase
    .from('centros')
    .select('id,nombre')
    .eq('slug', slug)
    .eq('activo', true)
    .maybeSingle()

  if (!centro) notFound()

  const { data: reserva } = await supabase
    .from('reservas')
    .select(
      `
        id,
        fecha_inicio,
        fecha_fin,
        estado,
        servicios!inner(nombre,duracion_minutos,precio),
        profiles!reservas_profesional_id_fkey(nombre,apellido)
      `
    )
    .eq('id', reservaId)
    .eq('centro_id', centro.id)
    .maybeSingle()

  if (!reserva) notFound()

  const { data: pago } = await supabase
    .from('pagos')
    .select('monto,estado,metodo_pago')
    .eq('reserva_id', reservaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const reservaRow = reserva as unknown as ReservaConfirmationRow
  const pagoRow = pago as PagoRow | null
  const professionalName = [
    reservaRow.profiles?.nombre ?? 'Profesional',
    reservaRow.profiles?.apellido ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ConfirmationView
      slug={slug}
      centroNombre={centro.nombre}
      serviceName={reservaRow.servicios?.nombre ?? 'Servicio reservado'}
      professionalName={professionalName}
      date={reservaRow.fecha_inicio.slice(0, 10)}
      hour={formatTime(reservaRow.fecha_inicio)}
      price={formatPrice(pagoRow?.monto ?? reservaRow.servicios?.precio ?? null)}
      paymentStatus={paymentLabel(pagoRow)}
    />
  )
}

function paymentLabel(pago: PagoRow | null) {
  if (!pago) return 'No requerido'
  if (pago.estado === 'pagado') return 'Pagado online'
  if (pago.metodo_pago === 'presencial') return 'Pendiente presencial'
  return 'Pendiente online'
}

function ConfirmationView({
  slug,
  centroNombre,
  serviceName,
  professionalName,
  date,
  hour,
  price,
  paymentStatus,
  demoMode = false,
}: {
  slug: string
  centroNombre: string
  serviceName: string
  professionalName: string
  date: string
  hour: string
  price: string
  paymentStatus: string
  demoMode?: boolean
}) {
  return (
    <main className="min-h-screen bg-[#FAFAF8] px-4 py-8 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-900/[0.06] sm:p-7">
          <div className="flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/80">
              <CalendarCheck2 size={34} aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#F9735B]">
              {centroNombre}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Tu hora fue solicitada correctamente
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              El centro recibió tu solicitud y podrá contactarte si necesita confirmar algún dato.
            </p>
          </div>

          <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50/70 p-4 ring-1 ring-slate-200/70">
            <SummaryRow icon={HeartPulse} label="Servicio" value={serviceName} />
            <SummaryRow icon={UserRound} label="Profesional" value={professionalName} />
            <SummaryRow
              icon={Clock3}
              label="Fecha y hora"
              value={
                date
                  ? `${formatBookingDate(date)} · ${hour}`
                  : 'El centro confirmará el horario.'
              }
            />
            <SummaryRow icon={CreditCard} label="Pago" value={`${paymentStatus} · ${price}`} />
          </div>

          <div className="mt-4 rounded-2xl border border-orange-100 bg-[#FFF4EF] p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">
              {paymentStatus === 'Pagado online'
                ? 'Pago online registrado'
                : 'Pago presencial pendiente'}
            </p>
            <p className="mt-1 leading-6">
              {paymentStatus === 'Pagado online'
                ? 'Por ahora el pago online queda mockeado; el flujo está listo para conectar Stripe, Mercado Pago, Flow o Webpay.'
                : 'Tu hora quedó reservada y el pago se realiza directamente en el centro.'}
            </p>
          </div>

          {demoMode && (
            <p className="mt-4 text-center text-xs text-slate-400">
              Esta confirmación pertenece al modo demo y no creó una reserva real.
            </p>
          )}

          <Link
            href={`/agendar/${slug}`}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-sm shadow-orange-600/20 transition hover:bg-orange-600"
          >
            Volver a la agenda
          </Link>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Reservas gestionadas con <span className="font-semibold text-[#F9735B]">Agendix</span>
        </p>
      </div>
    </main>
  )
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof HeartPulse
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#F9735B] ring-1 ring-slate-200/80">
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 font-medium capitalize text-slate-800">{value}</p>
      </div>
    </div>
  )
}
