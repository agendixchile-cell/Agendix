import { NextResponse } from 'next/server'
import {
  getMercadoPagoPayment,
  mapMercadoPagoStatus,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/payments/providers/mercado-pago'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type MercadoPagoWebhookPayload = {
  type?: string
  action?: string
  data?: {
    id?: string | number
  }
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

  const providerPayment = await getMercadoPagoPayment(providerPaymentId)
  const externalReference = providerPayment.external_reference

  if (!externalReference) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const { data: patientPayment } = await supabase
    .from('patient_payments')
    .select('id,reservation_id,status')
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
  }

  return NextResponse.json({ ok: true })
}
