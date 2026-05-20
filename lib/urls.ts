const PRODUCTION_APP_URL = 'https://app.agendixchile.cl'
const PRODUCTION_MARKETING_URL = 'https://www.agendixchile.cl'
const LOCAL_APP_URL = 'http://localhost:3000'

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

function getConfiguredBaseUrl(
  envValue: string | undefined,
  fallback: string
): string {
  return normalizeBaseUrl(envValue || fallback)
}

function canonicalizeMarketingBaseUrl(url: string): string {
  const baseUrl = normalizeBaseUrl(url)

  if (baseUrl === 'https://agendixchile.cl') {
    return PRODUCTION_MARKETING_URL
  }

  return baseUrl
}

function joinUrl(baseUrl: string, path = ''): string {
  if (!path) return baseUrl

  return new URL(path.startsWith('/') ? path : `/${path}`, `${baseUrl}/`).toString()
}

export function getAppBaseUrl(): string {
  return getConfiguredBaseUrl(
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NODE_ENV === 'development' ? LOCAL_APP_URL : PRODUCTION_APP_URL
  )
}

export function getMarketingBaseUrl(): string {
  return canonicalizeMarketingBaseUrl(
    getConfiguredBaseUrl(
      process.env.NEXT_PUBLIC_MARKETING_URL,
      PRODUCTION_MARKETING_URL
    )
  )
}

export function getAppUrl(path = ''): string {
  return joinUrl(getAppBaseUrl(), path)
}

export function getMarketingUrl(path = ''): string {
  return joinUrl(getMarketingBaseUrl(), path)
}

export function getAuthCallbackUrl(): string {
  return getAppUrl('/auth/callback')
}

export function getPasswordResetCallbackUrl(): string {
  return getAppUrl('/auth/callback?next=/actualizar-contrasena')
}
