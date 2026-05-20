const PRODUCTION_APP_URL = 'https://app.agendixchile.cl'

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

function getAppBaseUrl(): string {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_APP_URL)
}

export function getAppUrl(path = ''): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return new URL(normalizedPath, `${getAppBaseUrl()}/`).toString()
}

export function getPasswordResetCallbackUrl(): string {
  return getAppUrl('/auth/callback?next=/actualizar-contrasena')
}
