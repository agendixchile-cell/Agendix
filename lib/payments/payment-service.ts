import { fintocProvider } from '@/lib/payments/providers/fintoc'
import { mercadoPagoProvider } from '@/lib/payments/providers/mercado-pago'
import {
  PaymentProviderError,
  type PaymentProvider,
  type PaymentProviderClient,
} from '@/lib/payments/types'

const providers: Record<PaymentProvider, PaymentProviderClient | null> = {
  mercado_pago: mercadoPagoProvider,
  fintoc: fintocProvider,
  manual: null,
}

export function getPaymentProvider(provider: PaymentProvider): PaymentProviderClient {
  const client = providers[provider]

  if (!client) {
    throw new PaymentProviderError(
      'Este proveedor no genera links de pago automáticos.'
    )
  }

  return client
}

export function normalizePaymentProvider(
  value: string | null | undefined
): PaymentProvider {
  if (value === 'fintoc' || value === 'manual') return value

  return 'mercado_pago'
}
