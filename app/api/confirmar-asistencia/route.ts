import { type NextRequest, NextResponse } from 'next/server'
import {
  confirmReservationAttendance,
  validAttendanceConfirmationToken,
  type AttendanceConfirmationDetails,
  type AttendanceConfirmationStatus,
} from '@/lib/reservas/attendance-confirmation'

function redirectWithStatus(
  request: NextRequest,
  status: AttendanceConfirmationStatus,
  details?: AttendanceConfirmationDetails
) {
  const url = new URL('/confirmar-asistencia', request.url)
  url.searchParams.set('status', status)

  if (details?.slug) url.searchParams.set('slug', details.slug)
  if (details?.centro) url.searchParams.set('centro', details.centro)
  if (details?.servicio) url.searchParams.set('servicio', details.servicio)
  if (details?.profesional) {
    url.searchParams.set('profesional', details.profesional)
  }
  if (details?.fecha) url.searchParams.set('fecha', details.fecha)

  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim() ?? ''

  if (!validAttendanceConfirmationToken(token)) {
    return redirectWithStatus(request, 'invalida')
  }

  const url = new URL('/confirmar-asistencia', request.url)
  url.searchParams.set('token', token)

  return NextResponse.redirect(url)
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''
  const token = contentType.includes('application/json')
    ? await request
        .json()
        .then((body) => (typeof body.token === 'string' ? body.token.trim() : ''))
        .catch(() => '')
    : await request
        .formData()
        .then((body) => String(body.get('token') ?? '').trim())
        .catch(() => '')
  const result = await confirmReservationAttendance(token)

  if (request.headers.get('accept')?.includes('text/html')) {
    return redirectWithStatus(request, result.status, result.details)
  }

  return NextResponse.json(result)
}
