import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

type AdminClient = SupabaseClient<Database>

export type MercadoPagoProviderCredentials = {
  configured: boolean
  source: 'organization' | 'environment' | 'missing'
  accessToken: string | null
  publicKey: string | null
}

export type MercadoPagoProviderStatus = {
  configured: boolean
  source: 'organization' | 'environment' | 'missing'
  publicKey: string | null
  accountLabel: string | null
  updatedAt: string | null
}

type CredentialOptions = {
  allowEnvironmentFallback?: boolean
}

type ProviderSettingsRow = {
  public_key: string | null
  access_token: string | null
  account_label: string | null
  updated_at: string
}

function envCredentials(): MercadoPagoProviderCredentials {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? null
  const publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY ?? null

  return {
    configured: Boolean(accessToken),
    source: accessToken ? 'environment' : 'missing',
    accessToken,
    publicKey,
  }
}

export async function getMercadoPagoCredentialsForOrganization(
  supabase: AdminClient,
  organizationId: string,
  options: CredentialOptions = {}
): Promise<MercadoPagoProviderCredentials> {
  const { data } = await supabase
    .from('organization_payment_provider_settings')
    .select('public_key,access_token,account_label,updated_at')
    .eq('organization_id', organizationId)
    .eq('provider', 'mercado_pago')
    .eq('status', 'active')
    .maybeSingle()

  const row = data as ProviderSettingsRow | null

  if (row?.access_token) {
    return {
      configured: true,
      source: 'organization',
      accessToken: row.access_token,
      publicKey: row.public_key,
    }
  }

  if (options.allowEnvironmentFallback === false) {
    return {
      configured: false,
      source: 'missing',
      accessToken: null,
      publicKey: null,
    }
  }

  return envCredentials()
}

export async function getMercadoPagoStatusForOrganization(
  supabase: AdminClient,
  organizationId: string,
  options: CredentialOptions = {}
): Promise<MercadoPagoProviderStatus> {
  const credentials = await getMercadoPagoCredentialsForOrganization(
    supabase,
    organizationId,
    options
  )

  if (credentials.source === 'organization') {
    const { data } = await supabase
      .from('organization_payment_provider_settings')
      .select('public_key,access_token,account_label,updated_at')
      .eq('organization_id', organizationId)
      .eq('provider', 'mercado_pago')
      .eq('status', 'active')
      .maybeSingle()

    const row = data as ProviderSettingsRow | null

    return {
      configured: true,
      source: 'organization',
      publicKey: row?.public_key ?? credentials.publicKey,
      accountLabel: row?.account_label ?? null,
      updatedAt: row?.updated_at ?? null,
    }
  }

  return {
    configured: credentials.configured,
    source: credentials.source,
    publicKey: credentials.publicKey,
    accountLabel: null,
    updatedAt: null,
  }
}
