import { NextResponse } from 'next/server'
import {
  getMercadoPagoPayment,
  mapMercadoPagoStatus,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/payments/providers/mercado-pago'
import { getMercadoPagoCredentialsForOrganization } from '@/lib/payments/provider-settings'
import { sendProfessionalBookingEmail } from '@/lib/reminders/email'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type MercadoPagoWebhookPayload = {
  type?: string
  action?: string
  data?: {
    id?: string | number
  }
}

type ReservationNotificationRow = {
  id: string
  centro_id: string
  fecha_inicio: string
  fecha_fin: string
  notas: string | null
  centros: {
    nombre: string
    email: string | null
    telefono: string | null
  } | null
  servicios: {
    nombre: string
  } | null
  profiles: {
    nombre: string
    apellido: string | null
    email: string | null
  } | null
  pacientes: {
    nombre: string
    apellido: string | null
    email: string | null
    telefono: string | null
  } | null
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: 'mercado_pago',
    message: 'Webhook activo. Mercado Pago debe enviar notificaciones con POST.',
  })
}

function paymentIdFromRequest(
  request: Request,
  payload: MercadoPagoWebhookPayload
) {
  const url = new URL(request.url)

  return (
    url.searchParams.get('data.id') ??
    url.searchParams.get('id') ??
    url.searchParams.get('payment_id') ??
    (payload.data?.id == null ? null : String(payload.data.id))
  )
}

function patientPaymentIdFromRequest(request: Request) {
  const url = new URL(request.url)

  return (
    url.searchParams.get('patient_payment_id') ??
    url.searchParams.get('external_reference') ??
    url.searchParams.get('payment_id')
  )
}

function reservationPaymentStatus(
  status: ReturnType<typeof mapMercadoPagoStatus>
) {
  if (status === 'approved') return 'paid'
  if (status === 'refunded') return 'refunded'
  if (status === 'pending') return 'pending'

  return 'failed'
}

function legacyPaymentStatus(status: ReturnType<typeof mapMercadoPagoStatus>) {
  if (status === 'approved') return 'pagado'
  if (status === 'refunded') return 'reembolsado'

  return 'pendiente'
}

function fullName(nombre?: string | null, apellido?: string | null) {
  return [nombre, apellido].filter(Boolean).join(' ')
}

async function notifyProfessionalAfterPaidBooking(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  reservationId: string,
  patientPaymentId: string
) {
  const { data: reservation } = await supabase
    .from('reservas')
    .select(
      `
        id,centro_id,fecha_inicio,fecha_fin,notas,
        centros(nombre,email,telefono),
        servicios(nombre),
        profiles!reservas_profesional_id_fkey(nombre,apellido,email),
        pacientes(nombre,apellido,email,telefono)
      `
    )
    .eq('id', reservationId)
    .maybeSingle()

  const row = reservation as unknown as ReservationNotificationRow | null

  if (!row || !row.centros || !row.servicios || !row.profiles || !row.pacientes) {
    console.error('[mercado-pago-webhook] paid booking email data missing', {
      reservationId,
      patientPaymentId,
    })
    return
  }

  const professionalNotification = await sendProfessionalBookingEmail(
    {
      reserva_id: row.id,
      centro_id: row.centro_id,
      centro_nombre: row.centros.nombre,
      centro_email: row.centros.email,
      centro_telefono: row.centros.telefono,
      servicio_nombre: row.servicios.nombre,
      fecha_inicio: row.fecha_inicio,
      fecha_fin: row.fecha_fin,
      profesional_nombre: fullName(row.profiles.nombre, row.profiles.apellido) || 'Profesional',
      profesional_email: row.profiles.email,
      paciente_nombre: row.pacientes.nombre,
      paciente_apellido: row.pacientes.apellido,
      paciente_email: row.pacientes.email,
      paciente_telefono: row.pacientes.telefono,
      motivo: null,
      payment_status: 'paid',
    },
    {
      idempotencyKey: `agendix-professional-booking-paid-${reservationId}-${patientPaymentId}`,
    }
  )

  if (!professionalNotification.ok) {
    console.error('[mercado-pago-webhook] paid booking email failed', {
      reservationId,
      patientPaymentId,
      error: professionalNotification.error,
    })
  }
}

export async function POST(request: Request) {
  const supabase = createAdminClient()

  if (!supabase) {
    return NextResponse.json(
      { message: 'Service role no configurado.' },
      { status: 500 }
    )
  }

  const payload = (await request.json().catch(() => null)) as
    | MercadoPagoWebhookPayload
    | null

  if (!payload) {
    return NextResponse.json({ message: 'Payload inválido.' }, { status: 400 })
  }

  const signatureOk = verifyMercadoPagoWebhookSignature({
    requestUrl: request.url,
    xSignature: request.headers.get('x-signature'),
    xRequestId: request.headers.get('x-request-id'),
    webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  })

  if (!signatureOk) {
    return NextResponse.json({ message: 'Firma inválida.' }, { status: 401 })
  }

  const providerPaymentId = paymentIdFromRequest(request, payload)

  if (!providerPaymentId) {
    return NextResponse.json({ message: 'Sin ID de pago.' }, { status: 400 })
  }

  const hintedPatientPaymentId = patientPaymentIdFromRequest(request)
  const hintedPatientPaymentQuery = hintedPatientPaymentId
    ? await supabase
        .from('patient_payments')
        .select('id,organization_id,reservation_id,status')
        .eq('id', hintedPatientPaymentId)
        .maybeSingle()
    : { data: null }

  const hintedPatientPayment = hintedPatientPaymentQuery.data
  const credentials = hintedPatientPayment?.organization_id
    ? await getMercadoPagoCredentialsForOrganization(
        supabase,
        hintedPatientPayment.organization_id
      )
    : null

  const providerPayment = await getMercadoPagoPayment(
    providerPaymentId,
    credentials?.accessToken ?? null
  )
  const externalReference = providerPayment.external_reference

  if (!externalReference) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const { data: patientPayment } = hintedPatientPayment
    ? { data: hintedPatientPayment }
    : await supabase
        .from('patient_payments')
        .select('id,organization_id,reservation_id,status')
        .eq('id', externalReference)
        .maybeSingle()

  if (!patientPayment) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const nextStatus = mapMercadoPagoStatus(providerPayment.status)
  const paidAt =
    nextStatus === 'approved'
      ? providerPayment.date_approved ?? new Date().toISOString()
      : null

  await supabase.from('patient_payment_events').insert({
    patient_payment_id: patientPayment.id,
    provider: 'mercado_pago',
    event_type: payload.action ?? payload.type ?? 'payment',
    raw_payload: {
      webhook: payload,
      provider_payment: providerPayment,
    },
  })

  await supabase
    .from('patient_payments')
    .update({
      status: nextStatus,
      provider_payment_id: String(providerPayment.id ?? providerPaymentId),
      paid_at: paidAt,
    })
    .eq('id', patientPayment.id)

  if (patientPayment.reservation_id) {
    await supabase
      .from('reservas')
      .update({
        payment_status: reservationPaymentStatus(nextStatus),
        payment_provider: 'mercado_pago',
        payment_reference: String(providerPayment.id ?? providerPaymentId),
        paid_at: paidAt,
      })
      .eq('id', patientPayment.reservation_id)

    await supabase
      .from('pagos')
      .update({
        estado: legacyPaymentStatus(nextStatus),
        metodo_pago: 'mercado_pago',
        provider: 'mercado_pago',
        payment_reference: String(providerPayment.id ?? providerPaymentId),
        paid_at: paidAt,
      })
      .eq('reserva_id', patientPayment.reservation_id)

    if (nextStatus === 'approved') {
      await notifyProfessionalAfterPaidBooking(
        supabase,
        patientPayment.reservation_id,
        patientPayment.id
      )
    }
  }

  return NextResponse.json({ ok: true })
}
