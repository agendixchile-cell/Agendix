import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  mapMercadoPagoStatus,
  mercadoPagoProvider,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/payments/providers/mercado-pago'

describe('patient payment providers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it('creates Mercado Pago preferences with the organization access token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'preference-1',
        init_point: 'https://mercadopago.cl/checkout/preference-1',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await mercadoPagoProvider.createPaymentLink({
      paymentId: 'payment-1',
      organizationId: 'org-1',
      organizationName: 'Centro Test',
      providerAccessToken: 'ORG_ACCESS_TOKEN',
      patientId: 'patient-1',
      amount: 25000,
      currency: 'CLP',
      description: 'Consulta',
      successUrl: 'https://app.agendixchile.cl/success',
      failureUrl: 'https://app.agendixchile.cl/failure',
      pendingUrl: 'https://app.agendixchile.cl/pending',
      webhookUrl: 'https://app.agendixchile.cl/api/webhooks/mercado-pago',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/checkout/preferences',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer ORG_ACCESS_TOKEN',
        }),
      })
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.notification_url).toBe(
      'https://app.agendixchile.cl/api/webhooks/mercado-pago?patient_payment_id=payment-1'
    )
  })
})
