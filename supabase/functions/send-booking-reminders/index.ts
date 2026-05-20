import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type ReminderChannel = 'email' | 'whatsapp'
type ReminderType = 'recordatorio_48h' | 'recordatorio_24h'
type ReminderState = 'enviado' | 'fallido' | 'omitido'

type ClaimedReminder = {
  recordatorio_id: string
  reserva_id: string
  centro_id: string
  paciente_id: string
  canal: ReminderChannel
  tipo: ReminderType
  scheduled_for: string
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

type DeliveryResult = {
  ok: boolean
  provider: string
  providerMessageId?: string
  recipient?: string
  metadata?: Record<string, string | number | boolean | null>
  error?: string
}

type EmailSendOptions = {
  idempotencyKey?: string
  baseUrl?: string | null
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
}
const defaultEmailSubjectTemplate = 'Recordatorio de tu hora en {{centro_nombre}}'
const defaultEmailBodyTemplate =
  'Hola {{paciente_nombre}}, te recordamos que tienes una hora agendada en {{centro_nombre}}.\n\nServicio: {{servicio_nombre}}\nProfesional: {{profesional_nombre}}\nFecha y hora: {{fecha_hora}}\n\nConfirma tu asistencia desde el boton del correo. Si necesitas cambiar tu hora, contacta directamente al centro.'

function env(name: string) {
  return Deno.env.get(name)?.trim() || ''
}

function supabaseServiceRoleKey() {
  const secretKeys = env('SUPABASE_SECRET_KEYS')

  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string | undefined>
      const key = parsed.default ?? Object.values(parsed).find(Boolean)

      if (key?.trim()) return key.trim()
    } catch {
      // Fall back to the legacy key below.
    }
  }

  return env('SUPABASE_SERVICE_ROLE_KEY')
}

function isDryRun() {
  return env('REMINDERS_DRY_RUN').toLowerCase() === 'true'
}

function patientFullName(reminder: ClaimedReminder) {
  return [reminder.paciente_nombre, reminder.paciente_apellido]
    .filter(Boolean)
    .join(' ')
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null

  return value ?? null
}

function formatAppointmentDate(reminder: ClaimedReminder) {
  const timeZone = env('REMINDERS_TIME_ZONE') || 'America/Santiago'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'full',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(reminder.fecha_inicio))
}

function normalizedBaseUrl(override?: string | null) {
  const baseUrl =
    override?.trim() ||
    env('APP_BASE_URL') ||
    env('NEXT_PUBLIC_APP_URL') ||
    env('SITE_URL')

  return baseUrl.replace(/\/+$/, '')
}

function confirmationUrl(reminder: ClaimedReminder, baseUrlOverride?: string | null) {
  const baseUrl = normalizedBaseUrl(baseUrlOverride)
  const token = reminder.confirmacion_token?.trim()

  if (!baseUrl || !token) return ''

  return new URL(
    `/confirmar-asistencia?token=${encodeURIComponent(token)}`,
    `${baseUrl}/`
  ).toString()
}

function templateValues(reminder: ClaimedReminder, confirmUrl: string) {
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

function renderTemplate(
  template: string | null | undefined,
  reminder: ClaimedReminder,
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

function textToHtml(value: string) {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, '<br>'))
    .map((paragraph) => `<p style="margin: 0 0 12px;">${paragraph}</p>`)
    .join('')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function emailHtml(reminder: ClaimedReminder, confirmUrl: string) {
  const name = escapeHtml(patientFullName(reminder) || 'Hola')
  const center = escapeHtml(reminder.centro_nombre)
  const service = escapeHtml(reminder.servicio_nombre)
  const professional = escapeHtml(reminder.profesional_nombre)
  const date = escapeHtml(formatAppointmentDate(reminder))
  const body = textToHtml(renderTemplate(reminder.email_body_template, reminder, confirmUrl))
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

function emailText(reminder: ClaimedReminder, confirmUrl: string) {
  const body = renderTemplate(reminder.email_body_template, reminder, confirmUrl)

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

function maskRecipient(value: string, channel: ReminderChannel) {
  if (channel === 'email') {
    const [name, domain] = value.split('@')
    if (!domain) return 'email'

    return `${name.slice(0, 2)}***@${domain}`
  }

  const digits = value.replace(/\D/g, '')
  return digits ? `***${digits.slice(-4)}` : 'telefono'
}

function whatsappTo(value: string) {
  return value.replace(/\D/g, '')
}

async function sendEmailReminder(
  reminder: ClaimedReminder,
  options: EmailSendOptions = {}
): Promise<DeliveryResult> {
  const to = reminder.paciente_email?.trim()
  const confirmUrl = confirmationUrl(reminder, options.baseUrl)
  const idempotencyKey = options.idempotencyKey ?? `agendix-${reminder.recordatorio_id}`

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
      recipient: maskRecipient(to, 'email'),
      error:
        'Falta configurar APP_BASE_URL/NEXT_PUBLIC_APP_URL o no existe token de confirmacion.',
    }
  }

  if (isDryRun()) {
    return {
      ok: true,
      provider: 'resend_mock',
      providerMessageId: `mock_${idempotencyKey}`,
      recipient: maskRecipient(to, 'email'),
      metadata: { dry_run: true, confirmation_link: true },
    }
  }

  const apiKey = env('RESEND_API_KEY')
  const from = env('RESEND_FROM_EMAIL') || 'Agendix <recordatorios@agendix.cl>'

  if (!apiKey) {
    return {
      ok: false,
      provider: 'resend',
      recipient: maskRecipient(to, 'email'),
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
      subject: renderTemplate(
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
      recipient: maskRecipient(to, 'email'),
      metadata: { status: response.status },
      error: JSON.stringify(payload),
    }
  }

  return {
    ok: true,
    provider: 'resend',
    providerMessageId: typeof payload.id === 'string' ? payload.id : undefined,
    recipient: maskRecipient(to, 'email'),
    metadata: { status: response.status },
  }
}

async function sendWhatsAppReminder(
  reminder: ClaimedReminder
): Promise<DeliveryResult> {
  const phone = reminder.paciente_telefono?.trim()

  if (!phone) {
    return {
      ok: false,
      provider: 'whatsapp_cloud',
      error: 'El paciente no tiene telefono registrado.',
    }
  }

  const to = whatsappTo(phone)
  const mode = env('WHATSAPP_MODE') || 'live'

  if (!['live', 'mock'].includes(mode)) {
    return {
      ok: false,
      provider: 'whatsapp_cloud',
      recipient: maskRecipient(to, 'whatsapp'),
      error: 'WHATSAPP_MODE debe ser live o mock.',
    }
  }

  if (isDryRun() || mode === 'mock') {
    return {
      ok: true,
      provider: 'whatsapp_mock',
      providerMessageId: `mock_${reminder.recordatorio_id}`,
      recipient: maskRecipient(to, 'whatsapp'),
      metadata: { dry_run: isDryRun(), mode, intent: 'confirmacion_cita_24h' },
    }
  }

  const accessToken = env('WHATSAPP_ACCESS_TOKEN')
  const phoneNumberId = env('WHATSAPP_PHONE_NUMBER_ID')

  if (!accessToken || !phoneNumberId) {
    return {
      ok: false,
      provider: 'whatsapp_cloud',
      recipient: maskRecipient(to, 'whatsapp'),
      error: 'Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID.',
    }
  }

  const graphVersion = env('WHATSAPP_GRAPH_VERSION') || 'v25.0'
  const templateName = env('WHATSAPP_TEMPLATE_NAME') || 'agendix_confirmacion_cita_24h'
  const languageCode = env('WHATSAPP_TEMPLATE_LANGUAGE') || 'es_CL'
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: patientFullName(reminder) || 'Paciente' },
                { type: 'text', text: reminder.servicio_nombre },
                { type: 'text', text: formatAppointmentDate(reminder) },
                { type: 'text', text: reminder.profesional_nombre },
                { type: 'text', text: reminder.centro_nombre },
              ],
            },
          ],
        },
      }),
    }
  )
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      ok: false,
      provider: 'whatsapp_cloud',
      recipient: maskRecipient(to, 'whatsapp'),
      metadata: {
        status: response.status,
        template: templateName,
        intent: 'confirmacion_cita_24h',
      },
      error: JSON.stringify(payload),
    }
  }

  const messageId =
    Array.isArray(payload.messages) && typeof payload.messages[0]?.id === 'string'
      ? payload.messages[0].id
      : undefined

  return {
    ok: true,
    provider: 'whatsapp_cloud',
    providerMessageId: messageId,
    recipient: maskRecipient(to, 'whatsapp'),
    metadata: {
      status: response.status,
      template: templateName,
      intent: 'confirmacion_cita_24h',
    },
  }
}

async function persistDeliveryResult(
  supabase: ReturnType<typeof createClient>,
  reminder: ClaimedReminder,
  result: DeliveryResult,
  extraMetadata: Record<string, string | number | boolean | null> = {}
) {
  const estado: ReminderState = result.ok ? 'enviado' : 'fallido'
  const now = new Date().toISOString()

  await supabase
    .from('recordatorios_reserva')
    .update({
      estado,
      sent_at: result.ok ? now : null,
      error_message: result.ok ? null : result.error ?? 'No se pudo enviar.',
      provider: result.provider,
      provider_message_id: result.providerMessageId ?? null,
      processing_started_at: null,
    })
    .eq('id', reminder.recordatorio_id)

  await supabase.from('recordatorio_envios').insert({
    recordatorio_id: reminder.recordatorio_id,
    reserva_id: reminder.reserva_id,
    centro_id: reminder.centro_id,
    canal: reminder.canal,
    tipo: reminder.tipo,
    estado,
    provider: result.provider,
    provider_message_id: result.providerMessageId ?? null,
    recipient: result.recipient ?? null,
    metadata: { ...(result.metadata ?? {}), ...extraMetadata },
    error_message: result.ok ? null : result.error ?? 'No se pudo enviar.',
  })
}

async function loadManualEmailReminder(
  supabase: ReturnType<typeof createClient>,
  recordatorioId: string,
  centroId: string
) {
  const { data: recordatorio, error: recordatorioError } = await supabase
    .from('recordatorios_reserva')
    .select('id,reserva_id,centro_id,paciente_id,canal,tipo,scheduled_for')
    .eq('id', recordatorioId)
    .eq('centro_id', centroId)
    .maybeSingle()

  if (recordatorioError) {
    return { error: 'No pudimos cargar el recordatorio manual.' }
  }

  if (!recordatorio || recordatorio.canal !== 'email') {
    return { error: 'No encontramos un recordatorio de correo para esta reserva.' }
  }

  const { data, error } = await supabase
    .from('reservas')
    .select(
      `
        id,
        centro_id,
        paciente_id,
        profesional_id,
        fecha_inicio,
        fecha_fin,
        estado,
        centros!inner(nombre,email,telefono),
        pacientes!inner(nombre,apellido,email,telefono),
        servicios!inner(nombre),
        profiles!reservas_profesional_id_fkey(nombre)
      `
    )
    .eq('id', recordatorio.reserva_id)
    .eq('centro_id', centroId)
    .maybeSingle()

  if (error) {
    return { error: 'No pudimos cargar los datos de la reserva.' }
  }

  if (!data) {
    return { error: 'No encontramos la reserva seleccionada.' }
  }

  const reserva = data as {
    id: string
    centro_id: string
    paciente_id: string
    profesional_id: string
    fecha_inicio: string
    fecha_fin: string
    estado: string
    centros: { nombre: string; email: string | null; telefono: string | null } | { nombre: string; email: string | null; telefono: string | null }[] | null
    pacientes: { nombre: string; apellido: string | null; email: string | null; telefono: string | null } | { nombre: string; apellido: string | null; email: string | null; telefono: string | null }[] | null
    servicios: { nombre: string } | { nombre: string }[] | null
    profiles: { nombre: string | null } | { nombre: string | null }[] | null
  }

  const paciente = firstRelation(reserva.pacientes)
  const centro = firstRelation(reserva.centros)
  const servicio = firstRelation(reserva.servicios)
  const profesional = firstRelation(reserva.profiles)

  if (!paciente || !centro || !servicio) {
    return { error: 'La reserva no tiene todos los datos necesarios.' }
  }

  const [
    { data: config },
    { data: profesionalConfig },
    { data: confirmation },
  ] = await Promise.all([
    supabase
      .from('configuracion_recordatorios')
      .select('email_subject_template,email_body_template')
      .eq('centro_id', centroId)
      .maybeSingle(),
    supabase
      .from('configuracion_recordatorios_profesional')
      .select('email_subject_template,email_body_template')
      .eq('centro_id', centroId)
      .eq('profesional_id', reserva.profesional_id)
      .maybeSingle(),
    supabase
      .from('reserva_confirmaciones')
      .select('token')
      .eq('reserva_id', reserva.id)
      .maybeSingle(),
  ])

  let confirmationToken = confirmation?.token ?? null

  if (!confirmationToken) {
    const { data: insertedConfirmation, error: confirmationError } = await supabase
      .from('reserva_confirmaciones')
      .insert({
        reserva_id: reserva.id,
        centro_id: reserva.centro_id,
        paciente_id: reserva.paciente_id,
      })
      .select('token')
      .single()

    if (confirmationError || !insertedConfirmation) {
      const { data: existingConfirmation } = await supabase
        .from('reserva_confirmaciones')
        .select('token')
        .eq('reserva_id', reserva.id)
        .maybeSingle()

      confirmationToken = existingConfirmation?.token ?? null

      if (!confirmationToken) {
        return { error: 'No pudimos crear el link de confirmación.' }
      }
    } else {
      confirmationToken = insertedConfirmation.token
    }
  }

  const reminder: ClaimedReminder = {
    recordatorio_id: recordatorio.id,
    reserva_id: reserva.id,
    centro_id: reserva.centro_id,
    paciente_id: reserva.paciente_id,
    canal: 'email',
    tipo: recordatorio.tipo,
    scheduled_for: recordatorio.scheduled_for,
    fecha_inicio: reserva.fecha_inicio,
    fecha_fin: reserva.fecha_fin,
    paciente_nombre: paciente.nombre,
    paciente_apellido: paciente.apellido,
    paciente_email: paciente.email,
    paciente_telefono: paciente.telefono,
    centro_nombre: centro.nombre,
    centro_email: centro.email,
    centro_telefono: centro.telefono,
    servicio_nombre: servicio.nombre,
    profesional_nombre: profesional?.nombre || 'Profesional',
    email_subject_template:
      profesionalConfig?.email_subject_template?.trim() ||
      config?.email_subject_template ||
      defaultEmailSubjectTemplate,
    email_body_template:
      profesionalConfig?.email_body_template?.trim() ||
      config?.email_body_template ||
      defaultEmailBodyTemplate,
    confirmacion_token: confirmationToken,
  }

  return { reminder }
}

async function reservationStillSendable(
  supabase: ReturnType<typeof createClient>,
  reminder: ClaimedReminder
) {
  const { data, error } = await supabase
    .from('reservas')
    .select('estado,fecha_inicio')
    .eq('id', reminder.reserva_id)
    .maybeSingle()

  if (error || !data) return false

  return data.estado !== 'cancelled' && new Date(data.fecha_inicio).getTime() > Date.now()
}

async function persistSkippedReminder(
  supabase: ReturnType<typeof createClient>,
  reminder: ClaimedReminder,
  reason: string
) {
  await supabase
    .from('recordatorios_reserva')
    .update({
      estado: 'omitido',
      sent_at: null,
      error_message: reason,
      provider: 'agendix_scheduler',
      provider_message_id: null,
      processing_started_at: null,
    })
    .eq('id', reminder.recordatorio_id)

  await supabase.from('recordatorio_envios').insert({
    recordatorio_id: reminder.recordatorio_id,
    reserva_id: reminder.reserva_id,
    centro_id: reminder.centro_id,
    canal: reminder.canal,
    tipo: reminder.tipo,
    estado: 'omitido',
    provider: 'agendix_scheduler',
    provider_message_id: null,
    recipient: null,
    metadata: { skipped: true },
    error_message: reason,
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: jsonHeaders })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: jsonHeaders,
    })
  }

  const expectedSecret = env('REMINDERS_CRON_SECRET')
  const expectedManualSecret = env('MANUAL_REMINDERS_SECRET')
  const receivedSecret = request.headers.get('x-reminders-secret')?.trim() || ''
  const authorization =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''
  const supabaseUrl = env('SUPABASE_URL')
  const serviceRoleKey = supabaseServiceRoleKey()
  const hasCronAuth = Boolean(expectedSecret && receivedSecret === expectedSecret)
  const hasManualAuth = Boolean(
    expectedManualSecret && receivedSecret === expectedManualSecret
  )
  const hasServiceRoleAuth = Boolean(serviceRoleKey && authorization === serviceRoleKey)

  if (!expectedSecret && !expectedManualSecret && !hasServiceRoleAuth) {
    return new Response(
      JSON.stringify({ message: 'Falta configurar REMINDERS_CRON_SECRET.' }),
      { status: 500, headers: jsonHeaders }
    )
  }

  if (!hasCronAuth && !hasManualAuth && !hasServiceRoleAuth) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ message: 'Faltan secretos de Supabase en la funcion.' }),
      { status: 500, headers: jsonHeaders }
    )
  }

  const body = await request.json().catch(() => ({}))
  const batchSize =
    typeof body.batch_size === 'number' && Number.isFinite(body.batch_size)
      ? body.batch_size
      : 25
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  if (body.mode === 'manual_email') {
    const recordatorioId =
      typeof body.recordatorio_id === 'string' ? body.recordatorio_id.trim() : ''
    const centroId =
      typeof body.centro_id === 'string' ? body.centro_id.trim() : ''

    if (!recordatorioId || !centroId) {
      return new Response(
        JSON.stringify({
          ok: false,
          persisted: false,
          message: 'Faltan recordatorio_id o centro_id.',
        }),
        { status: 400, headers: jsonHeaders }
      )
    }

    const { reminder, error: reminderError } = await loadManualEmailReminder(
      supabase,
      recordatorioId,
      centroId
    )

    if (reminderError || !reminder) {
      return new Response(
        JSON.stringify({
          ok: false,
          persisted: false,
          message: reminderError ?? 'No pudimos preparar el recordatorio manual.',
        }),
        { status: 422, headers: jsonHeaders }
      )
    }

    const canSend = await reservationStillSendable(supabase, reminder)

    if (!canSend) {
      const error = 'Reserva cancelada, vencida o no disponible antes del envio.'
      await persistSkippedReminder(supabase, reminder, error)

      return new Response(
        JSON.stringify({
          ok: false,
          persisted: true,
          estado: 'omitido',
          provider: 'agendix_manual_sender',
          error,
        }),
        { headers: jsonHeaders }
      )
    }

    const result = await sendEmailReminder(reminder, {
      idempotencyKey: `agendix-manual-${reminder.recordatorio_id}-${Date.now()}`,
      baseUrl:
        typeof body.app_base_url === 'string' ? body.app_base_url.trim() : null,
    })

    await persistDeliveryResult(supabase, reminder, result, {
      forced: true,
      confirmation_link: true,
    })

    return new Response(
      JSON.stringify({
        ok: result.ok,
        persisted: true,
        estado: result.ok ? 'enviado' : 'fallido',
        provider: result.provider,
        provider_message_id: result.providerMessageId ?? null,
        recipient: result.recipient ?? null,
        metadata: result.metadata ?? {},
        error: result.ok ? null : result.error ?? 'No se pudo enviar.',
      }),
      { headers: jsonHeaders }
    )
  }

  const { data, error } = await supabase.rpc('claim_due_reservation_reminders', {
    batch_size: batchSize,
  })

  if (error) {
    return new Response(
      JSON.stringify({ message: 'No se pudieron reclamar recordatorios.', error }),
      { status: 500, headers: jsonHeaders }
    )
  }

  const reminders = (data ?? []) as ClaimedReminder[]
  const results = []

  for (const reminder of reminders) {
    const canSend = await reservationStillSendable(supabase, reminder)

    if (!canSend) {
      await persistSkippedReminder(
        supabase,
        reminder,
        'Reserva cancelada, vencida o no disponible antes del envio.'
      )
      results.push({
        recordatorio_id: reminder.recordatorio_id,
        canal: reminder.canal,
        estado: 'omitido',
        provider: 'agendix_scheduler',
      })
      continue
    }

    const result =
      reminder.canal === 'email'
        ? await sendEmailReminder(reminder)
        : await sendWhatsAppReminder(reminder)

    await persistDeliveryResult(supabase, reminder, result)

    results.push({
      recordatorio_id: reminder.recordatorio_id,
      canal: reminder.canal,
      estado: result.ok ? 'enviado' : 'fallido',
      provider: result.provider,
    })
  }

  return new Response(
    JSON.stringify({
      claimed: reminders.length,
      sent: results.filter((result) => result.estado === 'enviado').length,
      failed: results.filter((result) => result.estado === 'fallido').length,
      skipped: results.filter((result) => result.estado === 'omitido').length,
      results,
    }),
    { headers: jsonHeaders }
  )
})
