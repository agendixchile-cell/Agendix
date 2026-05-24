import { NextResponse, type NextRequest } from 'next/server'
import { isDemoMode } from '@/lib/auth/demo'
import { updateSession } from '@/lib/supabase/middleware'
import { getAppBaseUrl, getMarketingBaseUrl } from '@/lib/urls'

const AUTH_PATHS = ['/login', '/register']
const PROTECTED_PREFIXES = [
  '/agenda',
  '/admin',
  '/centro',
  '/configuracion',
  '/dashboard',
  '/estadisticas',
  '/fichas-clinicas',
  '/pacientes',
  '/profesionales',
  '/reservas',
  '/salas',
  '/servicios',
]
const APP_DOMAIN = 'app.agendixchile.cl'
const MARKETING_DOMAIN = 'www.agendixchile.cl'
const MARKETING_APEX_DOMAIN = 'agendixchile.cl'
const MARKETING_HOSTS = new Set([MARKETING_DOMAIN, MARKETING_APEX_DOMAIN])

function hostWithoutPort(host: string | null): string {
  return (host ?? '').split(':')[0]?.toLowerCase() ?? ''
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function isAppOnlyPath(pathname: string): boolean {
  return (
    AUTH_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    ) ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/')
  )
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function shouldRunAsApp(hostname: string): boolean {
  if (hostname === APP_DOMAIN) return true
  if (isLocalHost(hostname) || MARKETING_HOSTS.has(hostname)) return false

  return true
}

function redirectToBase(request: NextRequest, baseUrl: string) {
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, baseUrl)
  return NextResponse.redirect(url)
}

function redirectToHome(baseUrl: string) {
  return NextResponse.redirect(new URL('/', baseUrl))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = hostWithoutPort(request.headers.get('host'))

  if (MARKETING_HOSTS.has(hostname)) {
    if (isAppOnlyPath(pathname)) {
      return redirectToBase(request, getAppBaseUrl())
    }

    if (isProtectedPath(pathname)) {
      return redirectToHome(getMarketingBaseUrl())
    }

    if (hostname === MARKETING_APEX_DOMAIN) {
      return redirectToBase(request, getMarketingBaseUrl())
    }

    return NextResponse.next()
  }

  const appHost = shouldRunAsApp(hostname)

  const { supabaseResponse, user } = await updateSession(request)

  if (appHost && pathname === '/') {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = user || isDemoMode() ? '/agenda' : '/login'
    return NextResponse.redirect(dashboardUrl)
  }

  if (isProtectedPath(pathname) && !user && !isDemoMode()) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (AUTH_PATHS.includes(pathname) && user) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/agenda'
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
