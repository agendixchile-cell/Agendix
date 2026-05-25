import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  mapMercadoPagoStatus,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/payments/providers/mercado-pago'

describe('patient payment providers', () => {
  it('maps Mercado Pago statuses to patient payment statuses', () => {
    expect(mapMercadoPagoStatus('approved')).toBe('approved')
    expect(mapMercadoPagoStatus('pending')).toBe('pending')
    expect(mapMercadoPagoStatus('in_process')).toBe('pending')
    expect(mapMercadoPagoStatus('rejected')).toBe('rejected')
    expect(mapMercadoPagoStatus('cancelled')).toBe('cancelled')
    expect(mapMercadoPagoStatus('refunded')).toBe('refunded')
    expect(mapMercadoPagoStatus('charged_back')).toBe('refunded')
    expect(mapMercadoPagoStatus('unknown')).toBe('pending')
  })

  it('validates Mercado Pago webhook signatures when a secret is configured', () => {
    const secret = 'test-secret'
    const paymentId = '123456789'
    const requestId = 'request-1'
    const ts = '1779726578'
    const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`
    const signature = createHmac('sha256', secret).update(manifest).digest('hex')

    expect(
      verifyMercadoPagoWebhookSignature({
        requestUrl: `https://app.agendixchile.cl/api/webhooks/mercado-pago?data.id=${paymentId}`,
        xSignature: `ts=${ts},v1=${signature}`,
        xRequestId: requestId,
        webhookSecret: secret,
      })
    ).toBe(true)
    expect(
      verifyMercadoPagoWebhookSignature({
        requestUrl: `https://app.agendixchile.cl/api/webhooks/mercado-pago?data.id=${paymentId}`,
        xSignature: `ts=${ts},v1=bad-signature`,
        xRequestId: requestId,
        webhookSecret: secret,
      })
    ).toBe(false)
  })
})
