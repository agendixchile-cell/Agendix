import { NextResponse, type NextRequest } from 'next/server'
import { isDemoMode } from '@/lib/auth/demo'
import { updateSession } from '@/lib/supabase/middleware'

const AUTH_PATHS = ['/login', '/register']
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/agenda',
  '/centro',
  '/salas',
  '/profesionales',
  '/servicios',
  '/reservas',
  '/pacientes',
  '/fichas-clinicas',
]

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const { supabaseResponse, user } = await updateSession(request)

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
