import {
  PaymentProviderError,
  type CreatePaymentLinkOutput,
  type PaymentProviderClient,
} from '@/lib/payments/types'

export const fintocProvider: PaymentProviderClient = {
  provider: 'fintoc',

  async createPaymentLink(): Promise<CreatePaymentLinkOutput> {
    throw new PaymentProviderError(
      'Fintoc queda preparado como proveedor futuro, pero aún no está activo.'
    )
  },
}
