import { createHmac, timingSafeEqual } from 'crypto'
import {
  PaymentProviderError,
  type CreatePaymentLinkInput,
  type CreatePaymentLinkOutput,
  type PatientPaymentStatus,
  type PaymentProviderClient,
} from '@/lib/payments/types'

const mercadoPagoApiBaseUrl = 'https://api.mercadopago.com'

type MercadoPagoPreferenceResponse = {
  id?: string
  init_point?: string
  sandbox_init_point?: string
  message?: string
}

type MercadoPagoPaymentResponse = {
  id?: number | string
  status?: string
  external_reference?: string | null
  order?: {
    id?: number | string
  } | null
  date_approved?: string | null
}

function accessToken(override?: string | null) {
  return override ?? process.env.MERCADO_PAGO_ACCESS_TOKEN
}

export function isMercadoPagoConfigured() {
  return Boolean(accessToken())
}

function assertMercadoPagoConfigured(token?: string | null) {
  if (!accessToken(token)) {
    throw new PaymentProviderError(
      'Falta configurar MERCADO_PAGO_ACCESS_TOKEN para generar links de pago.'
    )
  }
}

export function mapMercadoPagoStatus(
  status: string | null | undefined
): PatientPaymentStatus {
  if (status === 'approved' || status === 'accredited') return 'approved'
  if (status === 'pending' || status === 'in_process' || status === 'authorized') {
    return 'pending'
  }
  if (status === 'rejected') return 'rejected'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'refunded' || status === 'charged_back') return 'refunded'

  return 'pending'
}

export function verifyMercadoPagoWebhookSignature({
  requestUrl,
  xSignature,
  xRequestId,
  webhookSecret,
}: {
  requestUrl: string
  xSignature: string | null
  xRequestId: string | null
  webhookSecret: string | undefined
}) {
  if (!webhookSecret) return true
  if (!xSignature || !xRequestId) return false

  const parts = new Map(
    xSignature.split(',').map((part) => {
      const [key, value] = part.split('=')

      return [key?.trim(), value?.trim()]
    })
  )
  const ts = parts.get('ts')
  const v1 = parts.get('v1')

  if (!ts || !v1) return false

  const url = new URL(requestUrl)
  const dataId =
    url.searchParams.get('data.id') ??
    url.searchParams.get('id') ??
    url.searchParams.get('payment_id') ??
    ''
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const expected = createHmac('sha256', webhookSecret)
    .update(manifest)
    .digest('hex')

  const expectedBuffer = Buffer.from(expected, 'hex')
  const receivedBuffer = Buffer.from(v1, 'hex')

  if (expectedBuffer.length !== receivedBuffer.length) return false

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

export async function getMercadoPagoPayment(
  paymentId: string,
  providerAccessToken?: string | null
) {
  const token = accessToken(providerAccessToken)

  assertMercadoPagoConfigured(token)

  const response = await fetch(`${mercadoPagoApiBaseUrl}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new PaymentProviderError(
      `Mercado Pago no pudo confirmar el pago (${response.status}).`
    )
  }

  return (await response.json()) as MercadoPagoPaymentResponse
}

export const mercadoPagoProvider: PaymentProviderClient = {
  provider: 'mercado_pago',

  async createPaymentLink(
    input: CreatePaymentLinkInput
  ): Promise<CreatePaymentLinkOutput> {
    const token = accessToken(input.providerAccessToken)

    assertMercadoPagoConfigured(token)

    const notificationUrl = new URL(input.webhookUrl)
    notificationUrl.searchParams.set('patient_payment_id', input.paymentId)

    const body = {
      items: [
        {
          id: input.paymentId,
          title: input.description,
          description: input.organizationName,
          quantity: 1,
          currency_id: input.currency,
          unit_price: input.amount,
        },
      ],
      payer: {
        name: input.patientName ?? undefined,
        email: input.patientEmail ?? undefined,
      },
      back_urls: {
        success: input.successUrl,
        failure: input.failureUrl,
        pending: input.pendingUrl,
      },
      auto_return: 'approved',
      notification_url: notificationUrl.toString(),
      external_reference: input.paymentId,
      expires: Boolean(input.expiresAt),
      expiration_date_to: input.expiresAt ?? undefined,
      metadata: {
        patient_payment_id: input.paymentId,
        organization_id: input.organizationId,
        patient_id: input.patientId,
        reservation_id: input.reservationId ?? null,
        service_id: input.serviceId ?? null,
      },
    }

    const response = await fetch(`${mercadoPagoApiBaseUrl}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => null)) as
      | MercadoPagoPreferenceResponse
      | null

    if (!response.ok || !data?.id) {
      throw new PaymentProviderError(
        data?.message ?? 'Mercado Pago no pudo crear el link de pago.'
      )
    }

    const checkoutUrl = data.init_point ?? data.sandbox_init_point

    if (!checkoutUrl) {
      throw new PaymentProviderError('Mercado Pago no devolvió un link de pago.')
    }

    return {
      provider: 'mercado_pago',
      providerPreferenceId: data.id,
      checkoutUrl,
    }
  },
}
