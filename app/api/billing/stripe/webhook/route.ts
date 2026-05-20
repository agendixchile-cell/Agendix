import { NextResponse } from 'next/server'
import {
  mapStripeSubscriptionStatus,
  verifyStripeWebhookPayload,
  type StripeEvent,
} from '@/lib/billing/stripe'
import { normalizePlanId, type PlanId, type SubscriptionStatus } from '@/lib/plans'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/types/database'

export const runtime = 'nodejs'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value

  if (
    value &&
    typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'string'
  ) {
    return value.id
  }

  return null
}

function asMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  )
}

function unixSecondsToIso(value: unknown): string | null {
  if (typeof value !== 'number') return null

  return new Date(value * 1000).toISOString()
}

async function persistSubscription({
  admin,
  organizationId,
  planId,
  status,
  customerId,
  subscriptionId,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  metadata,
}: {
  admin: AdminClient
  organizationId: string
  planId: PlanId
  status: SubscriptionStatus
  customerId: string | null
  subscriptionId: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  metadata: Json
}) {
  const { error: centroError } = await admin
    .from('centros')
    .update(
      status === 'cancelled'
        ? {
            plan_id: 'individual',
            subscription_status: status,
            extra_professionals_count: 0,
          }
        : {
            plan_id: planId,
            subscription_status: status,
          }
    )
    .eq('id', organizationId)

  if (centroError) throw centroError

  const payload = {
    organization_id: organizationId,
    plan_id: status === 'cancelled' ? 'individual' : planId,
    status,
    billing_provider: 'stripe',
    billing_customer_id: customerId,
    billing_subscription_id: subscriptionId,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
    metadata,
  }
  const { data: existing, error: existingError } = await admin
    .from('subscriptions')
    .select('id')
    .eq('billing_provider', 'stripe')
    .eq('billing_subscription_id', subscriptionId)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing?.id) {
    const { error } = await admin
      .from('subscriptions')
      .update(payload)
      .eq('id', existing.id)

    if (error) throw error
    return
  }

  const { error } = await admin.from('subscriptions').insert(payload)

  if (error) throw error
}

async function syncCheckoutSession(
  admin: AdminClient,
  event: StripeEvent
): Promise<void> {
  const session = event.data.object
  const metadata = asMetadata(session.metadata)
  const organizationId =
    metadata.organization_id ?? asString(session.client_reference_id)
  const subscriptionId = asString(session.subscription)

  if (!organizationId || !subscriptionId) return

  await persistSubscription({
    admin,
    organizationId,
    planId: normalizePlanId(metadata.plan_id),
    status: 'active',
    customerId: asString(session.customer),
    subscriptionId,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    metadata: {
      ...metadata,
      stripe_checkout_session_id: asString(session.id),
      stripe_event_id: event.id,
    },
  })
}

async function syncSubscription(
  admin: AdminClient,
  event: StripeEvent
): Promise<void> {
  const subscription = event.data.object
  const metadata = asMetadata(subscription.metadata)
  const organizationId = metadata.organization_id
  const subscriptionId = asString(subscription.id)

  if (!organizationId || !subscriptionId) return

  await persistSubscription({
    admin,
    organizationId,
    planId: normalizePlanId(metadata.plan_id),
    status: mapStripeSubscriptionStatus(asString(subscription.status)),
    customerId: asString(subscription.customer),
    subscriptionId,
    currentPeriodStart: unixSecondsToIso(subscription.current_period_start),
    currentPeriodEnd: unixSecondsToIso(subscription.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    metadata: {
      ...metadata,
      stripe_event_id: event.id,
    },
  })
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not configured' },
      { status: 500 }
    )
  }

  const rawBody = await request.text()
  const event = verifyStripeWebhookPayload({
    rawBody,
    signatureHeader: request.headers.get('stripe-signature'),
    webhookSecret,
  })

  if (!event) {
    return NextResponse.json(
      { error: 'Invalid Stripe signature' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' },
      { status: 500 }
    )
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await syncCheckoutSession(admin, event)
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await syncSubscription(admin, event)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[stripe webhook] sync failed', error)

    return NextResponse.json(
      { error: 'Could not sync Stripe event' },
      { status: 500 }
    )
  }
}
