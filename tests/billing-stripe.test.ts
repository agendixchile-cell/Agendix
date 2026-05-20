import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import {
  mapStripeSubscriptionStatus,
  verifyStripeWebhookPayload,
} from '@/lib/billing/stripe'

describe('stripe billing helpers', () => {
  it('verifies webhook payloads with the Stripe signature format', () => {
    const rawBody =
      '{"id":"evt_test","type":"checkout.session.completed","data":{"object":{}}}'
    const webhookSecret = 'whsec_test'
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex')

    const event = verifyStripeWebhookPayload({
      rawBody,
      signatureHeader: `t=${timestamp},v1=${signature}`,
      webhookSecret,
    })

    expect(event?.id).toBe('evt_test')
    expect(event?.type).toBe('checkout.session.completed')
  })

  it('rejects invalid Stripe signatures', () => {
    const rawBody = '{"id":"evt_test","type":"checkout.session.completed"}'
    const event = verifyStripeWebhookPayload({
      rawBody,
      signatureHeader: 't=123,v1=invalid',
      webhookSecret: 'whsec_test',
      toleranceSeconds: Number.MAX_SAFE_INTEGER,
    })

    expect(event).toBeNull()
  })

  it('maps Stripe subscription statuses to Agendix statuses', () => {
    expect(mapStripeSubscriptionStatus('trialing')).toBe('trial')
    expect(mapStripeSubscriptionStatus('active')).toBe('active')
    expect(mapStripeSubscriptionStatus('canceled')).toBe('cancelled')
    expect(mapStripeSubscriptionStatus('past_due')).toBe('past_due')
    expect(mapStripeSubscriptionStatus('incomplete')).toBe('pending')
  })
})
