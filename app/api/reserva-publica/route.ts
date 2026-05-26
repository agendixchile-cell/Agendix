import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { publicBookingRequestSchema } from '@/lib/booking/validation'
import type { PublicBookingResult } from '@/lib/booking/types'
import { getPaymentProvider } from '@/lib/payments/payment-service'
import { PaymentProviderError } from '@/lib/payments/types'
import { calculateReservationDateRange } from '@/lib/reservas/duration'
import {
  buildReservationReminderRows,
  DEFAULT_EMAIL_REMINDER_HOURS_BEFORE,
  DEFAULT_WHATSAPP_REMINDER_HOURS_BEFORE,
  normalizeReminderHours,
} from '@/lib/reminders/schedule'
import { sendProfessionalBookingEmail } from '@/lib/reminders/email'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import type { EstadoReserva } from '@/lib/types/database'
import { getAppUrl } from '@/lib/urls'

export const runtime = 'nodejs'

function splitNombreCompleto(nombreCompleto: string) {
  const parts = nombreCompleto.trim().split(/\s+/)

  return {
    nombre: parts[0] ?? nombreCompleto.trim(),
    apellido: parts.slice(1).join(' ') || null,
  }
}

function buildDateRange(fecha: string, hora: string, durationMinutes: number) {
  return calculateReservationDateRange({
    fecha,
    hora,
    serviceDurationMinutes: durationMinutes,
  })
}

function buildPublicNotes({
  motivo,
  documento,
  paymentMethod,
}: {
  motivo?: string
  documento?: string
  paymentMethod: 'presencial' | 'online'
}) {
  return [
    'Reserva solicitada desde el portal publico de Agendix.',
    documento?.trim() ? `Documento informado: ${documento.trim()}` : null,
    motivo?.trim() ? `Motivo de consulta: ${motivo.trim()}` : null,
    paymentMethod === 'online'
      ? 'Pago: link online generado con Mercado Pago.'
      : 'Pago: presencial al momento de la atencion.',
  ]
    .filter(Boolean)
    .join('\n')
}

function getPublicBookingInitialStatus(): EstadoReserva {
  return 'pending'
}

function clientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  return forwardedFor?.split(',')[0]?.trim() || realIp?.trim() || 'unknown'
}

function fingerprint(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      message:
        'Recibimos muchas solicitudes seguidas. Espera un momento e intenta nuevamente.',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  )
}

function rpcStatus(code: string) {
  if (
    [
      'conflicto_profesional',
      'conflicto_sala',
      'horario_bloqueado',
      'sin_sala_disponible',
      'fuera_de_intervalo',
    ].includes(code)
  ) {
    return 409
  }

  return 400
}

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const ipLimit = await checkRateLimit(
    `booking:ip:${clientIp(request)}`,
    {
      limit: 12,
      windowMs: 10 * 60_000,
    },
    Date.now(),
    supabase
  )

  if (!ipLimit.allowed) {
    return rateLimitedResponse(ipLimit.retryAfterSeconds)
  }

  const body = await request.json().catch(() => null)
  const parsed = publicBookingRequestSchema.safeParse(body ?? {})

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Revisa los datos antes de confirmar la reserva.' },
      { status: 400 }
    )
  }

  const values = parsed.data

  if (!supabase) {
    return NextResponse.json(
      { message: 'No pudimos preparar la agenda del centro.' },
      { status: 500 }
    )
  }

  const fingerprintLimit = await checkRateLimit(
    `booking:contact:${values.centro_id}:${fingerprint(values.email)}:${fingerprint(values.telefono)}`,
    {
      limit: 4,
      windowMs: 30 * 60_000,
    },
    Date.now(),
    supabase
  )

  if (!fingerprintLimit.allowed) {
    return rateLimitedResponse(fingerprintLimit.retryAfterSeconds)
  }

  const { data: centro, error: centroError } = await supabase
    .from('centros')
    .select('id,slug,nombre,email,telefono')
    .eq('id', values.centro_id)
    .eq('activo', true)
    .eq('public_booking_enabled', true)
    .maybeSingle()

  if (centroError || !centro) {
    return NextResponse.json(
      { message: 'No encontramos el centro seleccionado.' },
      { status: 404 }
    )
  }

  const { data: servicio, error: servicioError } = await supabase
    .from('servicios')
    .select('id,nombre,duracion_minutos,precio')
    .eq('id', values.servicio_id)
    .eq('centro_id', values.centro_id)
    .eq('activo', true)
    .eq('public_visible', true)
    .maybeSingle()

  if (servicioError || !servicio) {
    return NextResponse.json(
      { message: 'Selecciona un servicio disponible.' },
      { status: 400 }
    )
  }

  const { data: profesional, error: profesionalError } = await supabase
    .from('miembros_centro')
    .select('profile_id')
    .eq('profile_id', values.profesional_id)
    .eq('centro_id', values.centro_id)
    .eq('activo', true)
    .eq('public_visible', true)
    .in('rol', ['owner', 'admin', 'profesional'])
    .maybeSingle()

  if (profesionalError || !profesional) {
    return NextResponse.json(
      { message: 'Selecciona un profesional disponible.' },
      { status: 400 }
    )
  }

  const { data: profesionalProfile } = await supabase
    .from('profiles')
    .select('id,nombre,apellido,email')
    .eq('id', values.profesional_id)
    .maybeSingle()

  const { fechaInicio, startsAt, error: dateError } = buildDateRange(
    values.fecha,
    values.hora,
    servicio.duracion_minutos
  )

  if (dateError || !fechaInicio || !startsAt) {
    return NextResponse.json(
      { message: dateError ?? 'Selecciona una fecha y hora válidas.' },
      { status: 400 }
    )
  }

  if (startsAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { message: 'Selecciona un horario futuro.' },
      { status: 400 }
    )
  }

  const normalizedEmail = values.email.trim().toLowerCase()
  const normalizedPhone = values.telefono.trim()
  const { nombre, apellido } = splitNombreCompleto(values.nombre)

  let { data: paciente } = await supabase
    .from('pacientes')
    .select('id,nombre,apellido,email,telefono')
    .eq('centro_id', values.centro_id)
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (!paciente) {
    const { data: phonePaciente } = await supabase
      .from('pacientes')
      .select('id,nombre,apellido,email,telefono')
      .eq('centro_id', values.centro_id)
      .eq('telefono', normalizedPhone)
      .maybeSingle()

    paciente = phonePaciente
  }

  if (!paciente) {
    const { data: newPaciente, error: pacienteError } = await supabase
      .from('pacientes')
      .insert({
        centro_id: values.centro_id,
        nombre,
        apellido,
        rut: values.documento?.trim() || null,
        email: normalizedEmail,
        telefono: normalizedPhone,
        fecha_nacimiento: null,
        notas: null,
        activo: true,
      })
      .select('id,nombre,apellido,email,telefono')
      .single()

    if (pacienteError || !newPaciente) {
      const message = pacienteError?.message
        ?.toLowerCase()
        .includes('plan_active_patient_limit_exceeded')
        ? 'El centro alcanzó el límite de pacientes activos de su plan.'
        : 'No pudimos registrar tus datos de contacto.'

      return NextResponse.json(
        { message },
        { status: 500 }
      )
    }

    paciente = newPaciente
  }

  const paymentAmount =
    typeof servicio.precio === 'number' && servicio.precio > 0
      ? servicio.precio
      : null

  if (values.payment_method === 'online' && paymentAmount == null) {
    return NextResponse.json(
      {
        message:
          'Este servicio no tiene precio publicado para pago online. Elige pago presencial.',
      },
      { status: 400 }
    )
  }

  const paymentStatus = paymentAmount == null ? 'not_required' : 'pending'
  const { data: reservaResult, error: reservaError } = await supabase
    .rpc('create_reserva_atomic', {
      p_centro_id: values.centro_id,
      p_profesional_id: values.profesional_id,
      p_paciente_id: paciente.id,
      p_servicio_id: values.servicio_id,
      p_fecha_inicio: fechaInicio,
      p_sala_id: null,
      p_estado: getPublicBookingInitialStatus(),
      p_notas: buildPublicNotes({
        motivo: values.motivo,
        documento: values.documento,
        paymentMethod: values.payment_method,
      }),
      p_origen: 'portal_publico',
      p_modalidad: 'presencial',
      p_payment_status: paymentStatus,
      p_amount: paymentAmount,
      p_currency: 'CLP',
    })
    .single()

  if (reservaError || !reservaResult) {
    return NextResponse.json(
      { message: 'No pudimos crear la reserva. Intenta nuevamente.' },
      { status: 500 }
    )
  }

  if (!reservaResult.ok || !reservaResult.reserva_id || !reservaResult.fecha_fin) {
    return NextResponse.json(
      {
        message:
          reservaResult.message ??
          'Ese horario ya no está disponible. Elige otra hora.',
      },
      { status: rpcStatus(reservaResult.code) }
    )
  }

  const reserva = { id: reservaResult.reserva_id }
  const reservaFechaFin = reservaResult.fecha_fin
  let checkoutUrl: string | null = null

  const { data: reminderConfig } = await supabase
    .from('configuracion_recordatorios')
    .select('email_hours_before,whatsapp_hours_before')
    .eq('centro_id', values.centro_id)
    .maybeSingle()

  await supabase.from('recordatorios_reserva').upsert(
    buildReservationReminderRows({
      centroId: values.centro_id,
      reservaId: reserva.id,
      pacienteId: paciente.id,
      fechaInicio,
      emailHoursBefore: normalizeReminderHours(
        reminderConfig?.email_hours_before,
        DEFAULT_EMAIL_REMINDER_HOURS_BEFORE
      ),
      whatsappHoursBefore: normalizeReminderHours(
        reminderConfig?.whatsapp_hours_before,
        DEFAULT_WHATSAPP_REMINDER_HOURS_BEFORE
      ),
    }),
    { onConflict: 'reserva_id,canal,tipo' }
  )

  if (paymentAmount != null) {
    await supabase.from('pagos').insert({
      reserva_id: reserva.id,
      monto: paymentAmount,
      estado: 'pendiente',
      metodo_pago:
        values.payment_method === 'online' ? 'mercado_pago' : 'presencial',
      referencia: null,
      provider: values.payment_method === 'online' ? 'mercado_pago' : null,
      currency: 'CLP',
    })
  }

  if (values.payment_method === 'online') {
    const { data: patientPayment, error: patientPaymentError } = await supabase
      .from('patient_payments')
      .insert({
        organization_id: values.centro_id,
        patient_id: paciente.id,
        reservation_id: reserva.id,
        service_id: values.servicio_id,
        professional_id: values.profesional_id,
        provider: 'mercado_pago',
        amount: paymentAmount ?? 0,
        currency: 'CLP',
        description: servicio.nombre,
        status: 'pending',
        metadata: {
          source: 'public_booking',
        },
      })
      .select('id')
      .single()

    if (patientPaymentError || !patientPayment || paymentAmount == null) {
      await supabase
        .from('reservas')
        .update({ estado: 'cancelled', payment_status: 'failed' })
        .eq('id', reserva.id)

      return NextResponse.json(
        { message: 'No pudimos preparar el cobro online.' },
        { status: 500 }
      )
    }

    try {
      const provider = getPaymentProvider('mercado_pago')
      const paymentLink = await provider.createPaymentLink({
        paymentId: patientPayment.id,
        organizationId: values.centro_id,
        organizationName: centro.nombre,
        patientId: paciente.id,
        patientEmail: paciente.email,
        patientName: [paciente.nombre, paciente.apellido]
          .filter(Boolean)
          .join(' '),
        reservationId: reserva.id,
        serviceId: values.servicio_id,
        amount: paymentAmount,
        currency: 'CLP',
        description: servicio.nombre,
        successUrl: getAppUrl(
          `/agendar/${centro.slug}/confirmacion?reserva=${reserva.id}`
        ),
        failureUrl: getAppUrl(
          `/agendar/${centro.slug}/confirmacion?reserva=${reserva.id}&paymentStatus=rejected`
        ),
        pendingUrl: getAppUrl(
          `/agendar/${centro.slug}/confirmacion?reserva=${reserva.id}&paymentStatus=pending`
        ),
        webhookUrl: getAppUrl('/api/webhooks/mercado-pago'),
      })

      checkoutUrl = paymentLink.checkoutUrl

      await supabase
        .from('patient_payments')
        .update({
          provider_preference_id: paymentLink.providerPreferenceId ?? null,
          provider_external_reference: patientPayment.id,
          checkout_url: paymentLink.checkoutUrl,
        })
        .eq('id', patientPayment.id)

      await supabase
        .from('reservas')
        .update({
          payment_provider: 'mercado_pago',
          payment_reference: paymentLink.providerPreferenceId ?? patientPayment.id,
        })
        .eq('id', reserva.id)
    } catch (error) {
      await supabase
        .from('patient_payments')
        .update({
          status: 'cancelled',
          metadata: {
            provider_error:
              error instanceof Error ? error.message : 'Error desconocido',
          },
        })
        .eq('id', patientPayment.id)
      await supabase
        .from('reservas')
        .update({ estado: 'cancelled', payment_status: 'failed' })
        .eq('id', reserva.id)

      return NextResponse.json(
        {
          message:
            error instanceof PaymentProviderError
              ? error.message
              : 'No pudimos generar el link de Mercado Pago.',
        },
        { status: 502 }
      )
    }
  }

  if (values.payment_method !== 'online') {
    const professionalNotification = await sendProfessionalBookingEmail(
      {
        reserva_id: reserva.id,
        centro_id: values.centro_id,
        centro_nombre: centro.nombre,
        centro_email: centro.email,
        centro_telefono: centro.telefono,
        servicio_nombre: servicio.nombre,
        fecha_inicio: fechaInicio,
        fecha_fin: reservaFechaFin,
        profesional_nombre:
          [profesionalProfile?.nombre, profesionalProfile?.apellido]
            .filter(Boolean)
            .join(' ') || 'Profesional',
        profesional_email: profesionalProfile?.email ?? null,
        paciente_nombre: paciente.nombre,
        paciente_apellido: paciente.apellido,
        paciente_email: paciente.email,
        paciente_telefono: paciente.telefono,
        motivo: values.motivo?.trim() || null,
        payment_status: paymentStatus,
      },
      { idempotencyKey: `agendix-professional-booking-${reserva.id}` }
    )

    if (!professionalNotification.ok) {
      console.error('[reserva-publica] professional email failed', {
        reservaId: reserva.id,
        centroId: values.centro_id,
        error: professionalNotification.error,
      })
    }
  }

  revalidatePath('/agenda')
  revalidatePath('/reservas')
  revalidatePath(`/agendar/${centro.slug}`)

  const response: PublicBookingResult = {
    ok: true,
    reserva_id: reserva.id,
    payment_status: paymentStatus,
    checkout_url: checkoutUrl,
  }

  return NextResponse.json(response)
}
