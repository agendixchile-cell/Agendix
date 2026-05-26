export type PaymentProvider = 'mercado_pago' | 'fintoc' | 'manual'

export type PatientPaymentStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'refunded'

export type PaymentCurrency = 'CLP'

export type CreatePaymentLinkInput = {
  paymentId: string
  organizationId: string
  organizationName: string
  providerAccessToken?: string | null
  patientId: string
  patientEmail?: string | null
  patientName?: string | null
  reservationId?: string | null
  serviceId?: string | null
  amount: number
  currency: PaymentCurrency
  description: string
  successUrl: string
  failureUrl: string
  pendingUrl: string
  webhookUrl: string
  expiresAt?: string | null
}

export type CreatePaymentLinkOutput = {
  provider: PaymentProvider
  providerPaymentId?: string
  providerPreferenceId?: string
  checkoutUrl: string
}

export type PaymentProviderClient = {
  provider: PaymentProvider
  createPaymentLink(input: CreatePaymentLinkInput): Promise<CreatePaymentLinkOutput>
}

export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentProviderError'
  }
}
