import { createHmac, timingSafeEqual } from 'crypto'
import type { PlanDefinition, SubscriptionStatus } from '@/lib/plans'

const stripeApiBaseUrl = 'https://api.stripe.com/v1'

export type StripeCheckoutSession = {
  id: string
  url: string
}

export type StripeEvent = {
  id: string
  type: string
  data: {
    object: Record<string, unknown>
  }
}

export type StripeCheckoutInput = {
  organizationId: string
  organizationName: string
  plan: PlanDefinition
  customerEmail?: string | null
  successUrl: string
  cancelUrl: string
}

export function isStripeCheckoutConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim())
}

function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  return secretKey
}

function appendMetadata(
  params: URLSearchParams,
  prefix: string,
  input: StripeCheckoutInput
) {
  params.append(`${prefix}[organization_id]`, input.organizationId)
  params.append(`${prefix}[organization_name]`, input.organizationName)
  params.append(`${prefix}[plan_id]`, input.plan.id)
  params.append(`${prefix}[source]`, 'agendix_subscription')
}

export async function createStripeCheckoutSession(
  input: StripeCheckoutInput
): Promise<StripeCheckoutSession> {
  const params = new URLSearchParams()

  params.append('mode', 'subscription')
  params.append('success_url', input.successUrl)
  params.append('cancel_url', input.cancelUrl)
  params.append('client_reference_id', input.organizationId)
  params.append('billing_address_collection', 'auto')
  params.append('allow_promotion_codes', 'true')
  params.append('payment_method_types[0]', 'card')
  params.append('line_items[0][quantity]', '1')
  params.append('line_items[0][price_data][currency]', 'clp')
  params.append(
    'line_items[0][price_data][unit_amount]',
    String(input.plan.monthlyPriceClp)
  )
  params.append('line_items[0][price_data][recurring][interval]', 'month')
  params.append(
    'line_items[0][price_data][product_data][name]',
    input.plan.commercialName
  )

  if (input.customerEmail) {
    params.append('customer_email', input.customerEmail)
  }

  appendMetadata(params, 'metadata', input)
  appendMetadata(params, 'subscription_data[metadata]', input)

  const response = await fetch(`${stripeApiBaseUrl}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  const payload = (await response.json()) as
    | { id: string; url: string | null }
    | { error?: { message?: string } }

  if (!response.ok) {
    const message =
      'error' in payload && payload.error?.message
        ? payload.error.message
        : 'Stripe rejected the checkout request'

    throw new Error(message)
  }

  if (!('url' in payload) || !payload.url) {
    throw new Error('Stripe did not return a checkout URL')
  }

  return {
    id: payload.id,
    url: payload.url,
  }
}

function parseStripeSignatureHeader(signatureHeader: string) {
  const parts = signatureHeader.split(',')
  const timestamp = parts
    .find((part) => part.startsWith('t='))
    ?.replace('t=', '')
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.replace('v1=', ''))
    .filter(Boolean)

  return {
    timestamp: timestamp ? Number(timestamp) : null,
    signatures,
  }
}

export function verifyStripeWebhookPayload({
  rawBody,
  signatureHeader,
  webhookSecret,
  toleranceSeconds = 300,
}: {
  rawBody: string
  signatureHeader: string | null
  webhookSecret: string
  toleranceSeconds?: number
}): StripeEvent | null {
  if (!signatureHeader || !webhookSecret) return null

  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader)
  if (!timestamp || signatures.length === 0) return null

  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp)
  if (ageSeconds > toleranceSeconds) return null

  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')
  const verified = signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, 'hex')

    return (
      signatureBuffer.length === expectedBuffer.length &&
      timingSafeEqual(signatureBuffer, expectedBuffer)
    )
  })

  if (!verified) return null

  return JSON.parse(rawBody) as StripeEvent
}

export function mapStripeSubscriptionStatus(
  status: string | null | undefined
): SubscriptionStatus {
  if (status === 'trialing') return 'trial'
  if (status === 'active') return 'active'
  if (status === 'canceled') return 'cancelled'
  if (status === 'past_due' || status === 'unpaid') return 'past_due'

  return 'pending'
}
