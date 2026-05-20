import { appTimeZone, normalizeIntlText } from '@/lib/timezone'
import { getAppBaseUrl } from '@/lib/urls'

export type EmailReminderPayload = {
  recordatorio_id: string
  reserva_id: string
  centro_id: string
  paciente_id: string
  fecha_inicio: string
  fecha_fin: string
  paciente_nombre: string
  paciente_apellido: string | null
  paciente_email: string | null
  paciente_telefono: string | null
  centro_nombre: string
  centro_email: string | null
  centro_telefono: string | null
  servicio_nombre: string
  profesional_nombre: string
  email_subject_template: string
  email_body_template: string
  confirmacion_token: string | null
}

export type EmailDeliveryResult = {
  ok: boolean
  provider: string
  providerMessageId?: string
  recipient?: string
  metadata?: Record<string, string | number | boolean | null>
  error?: string
}

export type ProfessionalBookingEmailPayload = {
  reserva_id: string
  centro_id: string
  centro_nombre: string
  centro_email: string | null
  centro_telefono: string | null
  servicio_nombre: string
  fecha_inicio: string
  fecha_fin: string
  profesional_nombre: string
  profesional_email: string | null
  paciente_nombre: string
  paciente_apellido: string | null
  paciente_email: string | null
  paciente_telefono: string | null
  motivo: string | null
  payment_status: 'not_required' | 'paid' | 'pending'
}

export const defaultEmailSubjectTemplate =
  'Recordatorio de tu hora en {{centro_nombre}}'
export const defaultEmailBodyTemplate =
  'Hola {{paciente_nombre}}, te recordamos que tienes una hora agendada en {{centro_nombre}}.\n\nServicio: {{servicio_nombre}}\nProfesional: {{profesional_nombre}}\nFecha y hora: {{fecha_hora}}\n\nConfirma tu asistencia desde el boton del correo. Si necesitas cambiar tu hora, contacta directamente al centro.'

function env(name: string) {
  return process.env[name]?.trim() || ''
}

function isDryRun() {
  return env('REMINDERS_DRY_RUN').toLowerCase() === 'true'
}

function patientFullName(reminder: EmailReminderPayload) {
  return [reminder.paciente_nombre, reminder.paciente_apellido]
    .filter(Boolean)
    .join(' ')
}

function fullName(nombre: string, apellido: string | null) {
  return [nombre, apellido].filter(Boolean).join(' ')
}

function formatDateTime(value: string) {
  return normalizeIntlText(
    new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'full',
      timeStyle: 'short',
      hourCycle: 'h23',
      timeZone: appTimeZone,
    }).format(new Date(value))
  )
}

function formatAppointmentDate(reminder: EmailReminderPayload) {
  return formatDateTime(reminder.fecha_inicio)
}

function normalizedBaseUrl() {
  return (env('APP_BASE_URL') || getAppBaseUrl()).replace(/\/+$/, '')
}

function confirmationUrl(reminder: EmailReminderPayload) {
  const baseUrl = normalizedBaseUrl()
  const token = reminder.confirmacion_token?.trim()

  if (!baseUrl || !token) return ''

  return new URL(
    `/confirmar-asistencia?token=${encodeURIComponent(token)}`,
    `${baseUrl}/`
  ).toString()
}

function reservationsUrl() {
  return new URL('/reservas', `${normalizedBaseUrl()}/`).toString()
}

function templateValues(reminder: EmailReminderPayload, confirmUrl: string) {
  return {
    paciente_nombre: reminder.paciente_nombre,
    paciente_apellido: reminder.paciente_apellido ?? '',
    paciente_nombre_completo: patientFullName(reminder),
    centro_nombre: reminder.centro_nombre,
    centro_email: reminder.centro_email ?? '',
    centro_telefono: reminder.centro_telefono ?? '',
    servicio_nombre: reminder.servicio_nombre,
    profesional_nombre: reminder.profesional_nombre,
    fecha_hora: formatAppointmentDate(reminder),
    confirmacion_url: confirmUrl,
  }
}

export function renderEmailReminderTemplate(
  template: string | null | undefined,
  reminder: EmailReminderPayload,
  confirmUrl: string,
  fallback = defaultEmailBodyTemplate
) {
  const values = templateValues(reminder, confirmUrl)
  const source = template?.trim() || fallback

  return source.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key: string) => {
    const value = values[key.toLowerCase() as keyof typeof values]

    return value == null ? match : String(value)
  })
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function textToHtml(value: string) {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, '<br>'))
    .map((paragraph) => `<p style="margin: 0 0 12px;">${paragraph}</p>`)
    .join('')
}

function emailHtml(reminder: EmailReminderPayload, confirmUrl: string) {
  const name = escapeHtml(patientFullName(reminder) || 'Hola')
  const center = escapeHtml(reminder.centro_nombre)
  const service = escapeHtml(reminder.servicio_nombre)
  const professional = escapeHtml(reminder.profesional_nombre)
  const date = escapeHtml(formatAppointmentDate(reminder))
  const body = textToHtml(
    renderEmailReminderTemplate(reminder.email_body_template, reminder, confirmUrl)
  )
  const escapedConfirmUrl = escapeHtml(confirmUrl)

  return `
    <div style="font-family: Inter, Arial, sans-serif; color: #1E293B; line-height: 1.6;">
      <h1 style="font-size: 22px; margin: 0 0 12px;">Recordatorio de tu reserva</h1>
      ${body || `<p>${name}, te recordamos que tienes una hora agendada en <strong>${center}</strong>.</p>`}
      <div style="background: #FFF4EF; border: 1px solid #FAD8CF; border-radius: 14px; padding: 16px; margin: 18px 0;">
        <p style="margin: 0;"><strong>Servicio:</strong> ${service}</p>
        <p style="margin: 6px 0 0;"><strong>Profesional:</strong> ${professional}</p>
        <p style="margin: 6px 0 0;"><strong>Fecha y hora:</strong> ${date}</p>
      </div>
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px; margin: 18px 0;">
        <p style="margin: 0 0 12px; font-weight: 700;">Confirma tu asistencia</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 12px;">
          <tr>
            <td bgcolor="#F9735B" style="border-radius: 12px;">
              <a href="${escapedConfirmUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #F9735B; border-radius: 12px; color: #FFFFFF; font-weight: 700; padding: 12px 18px; text-decoration: none;">
                Confirmar asistencia
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 0; color: #475569; font-size: 14px;">
          Si el botón no abre, usa este link:<br>
          <a href="${escapedConfirmUrl}" target="_blank" rel="noopener noreferrer" style="color: #E85D45; text-decoration: underline; word-break: break-all;">${escapedConfirmUrl}</a>
        </p>
      </div>
      <p>Si necesitas cambiar tu hora, contacta directamente al centro.</p>
      <p style="font-size: 13px; color: #64748B;">Enviado automaticamente por Agendix.</p>
    </div>
  `
}

function emailText(reminder: EmailReminderPayload, confirmUrl: string) {
  const body = renderEmailReminderTemplate(
    reminder.email_body_template,
    reminder,
    confirmUrl
  )

  return [
    body,
    '',
    `Servicio: ${reminder.servicio_nombre}`,
    `Profesional: ${reminder.profesional_nombre}`,
    `Fecha y hora: ${formatAppointmentDate(reminder)}`,
    '',
    'Confirma tu asistencia en este link:',
    `Confirmar asistencia: ${confirmUrl}`,
    'Si necesitas cambiar tu hora, contacta directamente al centro.',
  ].join('\n')
}

export function maskEmailRecipient(value: string) {
  const [name, domain] = value.split('@')
  if (!domain) return 'email'

  return `${name.slice(0, 2)}***@${domain}`
}

function paymentStatusLabel(status: ProfessionalBookingEmailPayload['payment_status']) {
  const labels = {
    not_required: 'No requiere pago publicado',
    paid: 'Pago online registrado',
    pending: 'Pago pendiente presencial',
  }

  return labels[status]
}

function professionalBookingEmailHtml(booking: ProfessionalBookingEmailPayload) {
  const patientName = escapeHtml(
    fullName(booking.paciente_nombre, booking.paciente_apellido) || 'Paciente'
  )
  const professionalName = escapeHtml(booking.profesional_nombre)
  const centerName = escapeHtml(booking.centro_nombre)
  const serviceName = escapeHtml(booking.servicio_nombre)
  const date = escapeHtml(formatDateTime(booking.fecha_inicio))
  const patientEmail = booking.paciente_email
    ? escapeHtml(booking.paciente_email)
    : 'No informado'
  const patientPhone = booking.paciente_telefono
    ? escapeHtml(booking.paciente_telefono)
    : 'No informado'
  const payment = escapeHtml(paymentStatusLabel(booking.payment_status))
  const motivo = booking.motivo?.trim()
  const escapedReservationsUrl = escapeHtml(reservationsUrl())

  return `
    <div style="font-family: Inter, Arial, sans-serif; color: #1E293B; line-height: 1.6;">
      <h1 style="font-size: 22px; margin: 0 0 12px;">Nueva reserva online</h1>
      <p style="margin: 0 0 12px;">Hola ${professionalName}, un paciente acaba de agendar una hora en <strong>${centerName}</strong>.</p>
      <div style="background: #FFF4EF; border: 1px solid #FAD8CF; border-radius: 14px; padding: 16px; margin: 18px 0;">
        <p style="margin: 0;"><strong>Paciente:</strong> ${patientName}</p>
        <p style="margin: 6px 0 0;"><strong>Servicio:</strong> ${serviceName}</p>
        <p style="margin: 6px 0 0;"><strong>Fecha y hora:</strong> ${date}</p>
        <p style="margin: 6px 0 0;"><strong>Estado de pago:</strong> ${payment}</p>
      </div>
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px; margin: 18px 0;">
        <p style="margin: 0;"><strong>Email paciente:</strong> ${patientEmail}</p>
        <p style="margin: 6px 0 0;"><strong>Telefono paciente:</strong> ${patientPhone}</p>
        ${
          motivo
            ? `<p style="margin: 6px 0 0;"><strong>Motivo:</strong> ${escapeHtml(motivo)}</p>`
            : ''
        }
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 18px 0;">
        <tr>
          <td bgcolor="#F9735B" style="border-radius: 12px;">
            <a href="${escapedReservationsUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #F9735B; border-radius: 12px; color: #FFFFFF; font-weight: 700; padding: 12px 18px; text-decoration: none;">
              Ver reserva en Agendix
            </a>
          </td>
        </tr>
      </table>
      <p style="font-size: 13px; color: #64748B;">Enviado automaticamente por Agendix.</p>
    </div>
  `
}

function professionalBookingEmailText(booking: ProfessionalBookingEmailPayload) {
  return [
    `Hola ${booking.profesional_nombre}, un paciente acaba de agendar una hora en ${booking.centro_nombre}.`,
    '',
    `Paciente: ${fullName(booking.paciente_nombre, booking.paciente_apellido)}`,
    `Servicio: ${booking.servicio_nombre}`,
    `Fecha y hora: ${formatDateTime(booking.fecha_inicio)}`,
    `Estado de pago: ${paymentStatusLabel(booking.payment_status)}`,
    `Email paciente: ${booking.paciente_email ?? 'No informado'}`,
    `Telefono paciente: ${booking.paciente_telefono ?? 'No informado'}`,
    booking.motivo?.trim() ? `Motivo: ${booking.motivo.trim()}` : null,
    '',
    `Ver reservas: ${reservationsUrl()}`,
    '',
    'Enviado automaticamente por Agendix.',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function sendProfessionalBookingEmail(
  booking: ProfessionalBookingEmailPayload,
  options: { idempotencyKey?: string } = {}
): Promise<EmailDeliveryResult> {
  const to = booking.profesional_email?.trim()
  const idempotencyKey =
    options.idempotencyKey ?? `agendix-professional-booking-${booking.reserva_id}`

  if (!to) {
    return {
      ok: false,
      provider: 'resend',
      error: 'El profesional no tiene email registrado.',
    }
  }

  if (isDryRun()) {
    return {
      ok: true,
      provider: 'resend_mock',
      providerMessageId: `mock_${idempotencyKey}`,
      recipient: maskEmailRecipient(to),
      metadata: { dry_run: true, professional_booking: true },
    }
  }

  const apiKey = env('RESEND_API_KEY')
  const from = env('RESEND_FROM_EMAIL') || 'Agendix <recordatorios@agendix.cl>'

  if (!apiKey) {
    return {
      ok: false,
      provider: 'resend',
      recipient: maskEmailRecipient(to),
      error: 'Falta configurar RESEND_API_KEY.',
    }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Nueva reserva online: ${booking.servicio_nombre}`,
      html: professionalBookingEmailHtml(booking),
      text: professionalBookingEmailText(booking),
      tags: [
        { name: 'reserva_id', value: booking.reserva_id },
        { name: 'centro_id', value: booking.centro_id },
        { name: 'tipo', value: 'profesional_reserva_online' },
      ],
    }),
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    json: async () => ({
      error: error instanceof Error ? error.message : 'No pudimos contactar Resend.',
    }),
  }))
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      ok: false,
      provider: 'resend',
      recipient: maskEmailRecipient(to),
      metadata: { status: response.status },
      error: JSON.stringify(payload),
    }
  }

  return {
    ok: true,
    provider: 'resend',
    providerMessageId:
      typeof payload.id === 'string' ? payload.id : undefined,
    recipient: maskEmailRecipient(to),
    metadata: { status: response.status, professional_booking: true },
  }
}

export async function sendEmailReminder(
  reminder: EmailReminderPayload,
  options: { idempotencyKey?: string } = {}
): Promise<EmailDeliveryResult> {
  const to = reminder.paciente_email?.trim()
  const confirmUrl = confirmationUrl(reminder)

  if (!to) {
    return {
      ok: false,
      provider: 'resend',
      error: 'El paciente no tiene email registrado.',
    }
  }

  if (!confirmUrl) {
    return {
      ok: false,
      provider: 'resend',
      recipient: maskEmailRecipient(to),
      error:
        'Falta configurar APP_BASE_URL/NEXT_PUBLIC_APP_URL o no existe token de confirmacion.',
    }
  }

  const idempotencyKey =
    options.idempotencyKey ?? `agendix-${reminder.recordatorio_id}`

  if (isDryRun()) {
    return {
      ok: true,
      provider: 'resend_mock',
      providerMessageId: `mock_${idempotencyKey}`,
      recipient: maskEmailRecipient(to),
      metadata: { dry_run: true, confirmation_link: true },
    }
  }

  const apiKey = env('RESEND_API_KEY')
  const from = env('RESEND_FROM_EMAIL') || 'Agendix <recordatorios@agendix.cl>'

  if (!apiKey) {
    return {
      ok: false,
      provider: 'resend',
      recipient: maskEmailRecipient(to),
      error: 'Falta configurar RESEND_API_KEY.',
    }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: renderEmailReminderTemplate(
        reminder.email_subject_template,
        reminder,
        confirmUrl,
        defaultEmailSubjectTemplate
      ),
      html: emailHtml(reminder, confirmUrl),
      text: emailText(reminder, confirmUrl),
      tags: [
        { name: 'recordatorio_id', value: reminder.recordatorio_id },
        { name: 'reserva_id', value: reminder.reserva_id },
      ],
    }),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      ok: false,
      provider: 'resend',
      recipient: maskEmailRecipient(to),
      metadata: { status: response.status },
      error: JSON.stringify(payload),
    }
  }

  return {
    ok: true,
    provider: 'resend',
    providerMessageId:
      typeof payload.id === 'string' ? payload.id : undefined,
    recipient: maskEmailRecipient(to),
    metadata: { status: response.status, confirmation_link: true },
  }
}
