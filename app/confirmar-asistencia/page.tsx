import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import {
  AlertCircle,
  CalendarCheck2,
  Clock3,
  HeartPulse,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  confirmReservationAttendance,
  getAttendanceConfirmationPreview,
  validAttendanceConfirmationToken,
  type AttendanceConfirmationDetails,
  type AttendanceConfirmationResult,
} from '@/lib/reservas/attendance-confirmation'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type StatusConfig = {
  title: string
  description: string
  tone: 'success' | 'warning'
  confirmable?: boolean
}

const statusContent: Record<string, StatusConfig> = {
  pendiente_confirmacion: {
    title: 'Confirmar asistencia',
    description: 'Confirma que asistirás a esta hora para avisar al centro.',
    tone: 'success',
    confirmable: true,
  },
  confirmada: {
    title: 'Asistencia confirmada',
    description: 'Tu centro ya recibió la confirmación de esta hora.',
    tone: 'success',
  },
  ya_confirmada: {
    title: 'Asistencia ya confirmada',
    description: 'Esta reserva ya estaba marcada como confirmada.',
    tone: 'success',
  },
  cancelada: {
    title: 'Reserva cancelada',
    description: 'Esta hora ya no está disponible para confirmar.',
    tone: 'warning',
  },
  vencida: {
    title: 'Enlace vencido',
    description: 'La hora de esta reserva ya pasó.',
    tone: 'warning',
  },
  invalida: {
    title: 'Enlace no válido',
    description: 'No pudimos encontrar una reserva asociada a este enlace.',
    tone: 'warning',
  },
  error: {
    title: 'No pudimos confirmar',
    description: 'Intenta nuevamente o contacta directamente al centro.',
    tone: 'warning',
  },
}

export const metadata: Metadata = {
  title: 'Confirmar asistencia | Agendix',
}

function confirmationPath(result: AttendanceConfirmationResult) {
  const params = new URLSearchParams({ status: result.status })
  const details: AttendanceConfirmationDetails = result.details ?? {}

  if (details.slug) params.set('slug', details.slug)
  if (details.centro) params.set('centro', details.centro)
  if (details.servicio) params.set('servicio', details.servicio)
  if (details.profesional) params.set('profesional', details.profesional)
  if (details.fecha) params.set('fecha', details.fecha)

  return `/confirmar-asistencia?${params.toString()}`
}

async function confirmAttendanceAction(formData: FormData) {
  'use server'

  const token = String(formData.get('token') ?? '').trim()
  const result = await confirmReservationAttendance(token)

  redirect(confirmationPath(result))
}

function searchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatAppointmentDate(value?: string) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'full',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone: 'America/Santiago',
  }).format(date)
}

export default async function ConfirmarAsistenciaPage({ searchParams }: PageProps) {
  const query = await searchParams
  const token = searchValue(query.token)?.trim() ?? ''
  const preview =
    token && validAttendanceConfirmationToken(token)
      ? await getAttendanceConfirmationPreview(token)
      : null
  const status = preview?.status ?? searchValue(query.status) ?? 'error'
  const content = statusContent[status] ?? statusContent.error
  const centro = preview?.details?.centro ?? searchValue(query.centro)
  const servicio = preview?.details?.servicio ?? searchValue(query.servicio)
  const profesional = preview?.details?.profesional ?? searchValue(query.profesional)
  const slug = preview?.details?.slug ?? searchValue(query.slug)
  const fecha = formatAppointmentDate(preview?.details?.fecha ?? searchValue(query.fecha))
  const Icon = content.tone === 'success' ? CalendarCheck2 : AlertCircle
  const iconClass =
    content.tone === 'success'
      ? 'bg-emerald-50 text-emerald-600 ring-emerald-200/80'
      : 'bg-amber-50 text-amber-600 ring-amber-200/80'

  return (
    <main className="min-h-screen bg-[#FAFAF8] px-4 py-8 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-900/[0.06] sm:p-7">
          <div className="flex justify-center">
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full ring-1 ${iconClass}`}
            >
              <Icon size={34} aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 text-center">
            {centro && (
              <p className="text-sm font-semibold uppercase tracking-wide text-[#F9735B]">
                {centro}
              </p>
            )}
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {content.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {content.description}
            </p>
          </div>

          {(servicio || profesional || fecha) && (
            <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50/70 p-4 ring-1 ring-slate-200/70">
              {servicio && (
                <SummaryRow icon={HeartPulse} label="Servicio" value={servicio} />
              )}
              {profesional && (
                <SummaryRow
                  icon={UserRound}
                  label="Profesional"
                  value={profesional}
                />
              )}
              {fecha && (
                <SummaryRow icon={Clock3} label="Fecha y hora" value={fecha} />
              )}
            </div>
          )}

          {content.confirmable && token ? (
            <form action={confirmAttendanceAction} className="mt-6 grid gap-3">
              <input type="hidden" name="token" value={token} />
              <Button type="submit" className="w-full">
                Confirmar asistencia
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={slug ? `/agendar/${slug}` : '/'}>Volver</Link>
              </Button>
            </form>
          ) : (
            <Button asChild className="mt-6 w-full">
              <Link href={slug ? `/agendar/${slug}` : '/'}>Volver</Link>
            </Button>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Reservas gestionadas con{' '}
          <span className="font-semibold text-[#F9735B]">Agendix</span>
        </p>
      </div>
    </main>
  )
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof HeartPulse
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#F9735B] ring-1 ring-slate-200/80">
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 font-medium text-slate-800">{value}</p>
      </div>
    </div>
  )
}
