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
}

type DeliveryResult = {
  ok: boolean
  provider: string
  providerMessageId?: string
  recipient?: string
  metadata?: Record<string, string | number | boolean | null>
  error?: string
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
}

function env(name: string) {
  return Deno.env.get(name)?.trim() || ''
}

function isDryRun() {
  return env('REMINDERS_DRY_RUN').toLowerCase() === 'true'
}

function patientFullName(reminder: ClaimedReminder) {
  return [reminder.paciente_nombre, reminder.paciente_apellido]
    .filter(Boolean)
    .join(' ')
}

function formatAppointmentDate(reminder: ClaimedReminder) {
  const timeZone = env('REMINDERS_TIME_ZONE') || 'America/Santiago'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(reminder.fecha_inicio))
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function emailHtml(reminder: ClaimedReminder) {
  const name = escapeHtml(patientFullName(reminder) || 'Hola')
  const center = escapeHtml(reminder.centro_nombre)
  const service = escapeHtml(reminder.servicio_nombre)
  const professional = escapeHtml(reminder.profesional_nombre)
  const date = escapeHtml(formatAppointmentDate(reminder))

  return `
    <div style="font-family: Inter, Arial, sans-serif; color: #1E293B; line-height: 1.6;">
      <h1 style="font-size: 22px; margin: 0 0 12px;">Recordatorio de tu reserva</h1>
      <p>${name}, te recordamos que tienes una hora agendada en <strong>${center}</strong>.</p>
      <div style="background: #FFF4EF; border: 1px solid #FAD8CF; border-radius: 14px; padding: 16px; margin: 18px 0;">
        <p style="margin: 0;"><strong>Servicio:</strong> ${service}</p>
        <p style="margin: 6px 0 0;"><strong>Profesional:</strong> ${professional}</p>
        <p style="margin: 6px 0 0;"><strong>Fecha y hora:</strong> ${date}</p>
      </div>
      <p>Si necesitas cambiar tu hora, contacta directamente al centro.</p>
      <p style="font-size: 13px; color: #64748B;">Enviado automaticamente por Agendix.</p>
    </div>
  `
}

function emailText(reminder: ClaimedReminder) {
  return [
    `Recordatorio de reserva en ${reminder.centro_nombre}`,
    `Paciente: ${patientFullName(reminder)}`,
    `Servicio: ${reminder.servicio_nombre}`,
    `Profesional: ${reminder.profesional_nombre}`,
    `Fecha y hora: ${formatAppointmentDate(reminder)}`,
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

async function sendEmailReminder(reminder: ClaimedReminder): Promise<DeliveryResult> {
  const to = reminder.paciente_email?.trim()

  if (!to) {
    return {
      ok: false,
      provider: 'resend',
      error: 'El paciente no tiene email registrado.',
    }
  }

  if (isDryRun()) {
    return {
      ok: true,
      provider: 'resend_mock',
      providerMessageId: `mock_${reminder.recordatorio_id}`,
      recipient: maskRecipient(to, 'email'),
      metadata: { dry_run: true },
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
      'idempotency-key': `agendix-${reminder.recordatorio_id}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Recordatorio de hora en ${reminder.centro_nombre}`,
      html: emailHtml(reminder),
      text: emailText(reminder),
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
  const mode = env('WHATSAPP_MODE') || 'mock'

  if (isDryRun() || mode !== 'live') {
    return {
      ok: true,
      provider: 'whatsapp_mock',
      providerMessageId: `mock_${reminder.recordatorio_id}`,
      recipient: maskRecipient(to, 'whatsapp'),
      metadata: { dry_run: isDryRun(), mode },
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
  const templateName = env('WHATSAPP_TEMPLATE_NAME') || 'agendix_reserva_24h'
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
      metadata: { status: response.status, template: templateName },
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
    metadata: { status: response.status, template: templateName },
  }
}

async function persistDeliveryResult(
  supabase: ReturnType<typeof createClient>,
  reminder: ClaimedReminder,
  result: DeliveryResult
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
    metadata: result.metadata ?? {},
    error_message: result.ok ? null : result.error ?? 'No se pudo enviar.',
  })
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

  return data.estado !== 'cancelada' && new Date(data.fecha_inicio).getTime() > Date.now()
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
  const receivedSecret = request.headers.get('x-reminders-secret')?.trim() || ''

  if (expectedSecret && receivedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    })
  }

  const supabaseUrl = env('SUPABASE_URL')
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')

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
