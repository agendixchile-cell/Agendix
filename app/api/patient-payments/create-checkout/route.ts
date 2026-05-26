import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPaymentProvider, normalizePaymentProvider } from '@/lib/payments/payment-service'
import { getMercadoPagoCredentialsForOrganization } from '@/lib/payments/provider-settings'
import { PaymentProviderError } from '@/lib/payments/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/urls'

export const runtime = 'nodejs'

const createCheckoutSchema = z.object({
  patientId: z.string().uuid(),
  reservationId: z.string().uuid().optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().int().positive().max(50_000_000),
  description: z.string().trim().min(3).max(240),
  provider: z.enum(['mercado_pago', 'fintoc', 'manual']).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
})

type MembershipRow = {
  centro_id: string
  rol: string
  centros: {
    id: string
    nombre: string
    slug: string
  } | null
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = createCheckoutSchema.safeParse(body ?? {})

  if (!parsed.success) {
    return jsonError('Revisa los datos del cobro antes de generar el link.')
  }

  const values = parsed.data
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return jsonError('Debes iniciar sesión para crear cobros.', 401)
  }

  const { data: membership, error: membershipError } = await supabase
    .from('miembros_centro')
    .select('centro_id,rol,centros!inner(id,nombre,slug)')
    .eq('profile_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  const activeMembership = membership as unknown as MembershipRow | null

  if (membershipError || !activeMembership?.centro_id || !activeMembership.centros) {
    return jsonError('No encontramos tu organización activa.', 403)
  }

  const organizationId = activeMembership.centro_id

  const { data: patient } = await supabase
    .from('pacientes')
    .select('id,nombre,apellido,email')
    .eq('id', values.patientId)
    .eq('centro_id', organizationId)
    .maybeSingle()

  if (!patient) {
    return jsonError('Selecciona un paciente de tu organización.', 400)
  }

  let professionalId: string | null = null

  if (values.reservationId) {
    const { data: reservation } = await supabase
      .from('reservas')
      .select('id,centro_id,paciente_id,servicio_id,profesional_id')
      .eq('id', values.reservationId)
      .eq('centro_id', organizationId)
      .maybeSingle()

    if (!reservation || reservation.paciente_id !== values.patientId) {
      return jsonError('La reserva no pertenece al paciente seleccionado.', 400)
    }

    professionalId = reservation.profesional_id

    const { data: existingPayment } = await supabase
      .from('patient_payments')
      .select('id,status,checkout_url')
      .eq('reservation_id', values.reservationId)
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingPayment) {
      return NextResponse.json(
        {
          message:
            existingPayment.status === 'approved'
              ? 'Esta reserva ya tiene un cobro pagado.'
              : 'Esta reserva ya tiene un cobro pendiente.',
          payment: existingPayment,
        },
        { status: 409 }
      )
    }
  }

  if (values.serviceId) {
    const { data: service } = await supabase
      .from('servicios')
      .select('id')
      .eq('id', values.serviceId)
      .eq('centro_id', organizationId)
      .maybeSingle()

    if (!service) {
      return jsonError('Selecciona un servicio de tu organización.', 400)
    }
  }

  const provider = normalizePaymentProvider(values.provider)
  if (provider !== 'mercado_pago') {
    return jsonError('Mercado Pago es el proveedor activo para links de pago.', 400)
  }

  const adminSupabase = createAdminClient()

  if (!adminSupabase) {
    return jsonError('No pudimos acceder a la configuración de pagos.', 500)
  }

  const providerCredentials = await getMercadoPagoCredentialsForOrganization(
    adminSupabase,
    organizationId,
    { allowEnvironmentFallback: false }
  )

  if (!providerCredentials.configured) {
    return jsonError(
      'Configura Mercado Pago del centro antes de generar links de pago.',
      400
    )
  }

  const patientName = [patient.nombre, patient.apellido].filter(Boolean).join(' ')

  const { data: payment, error: paymentError } = await supabase
    .from('patient_payments')
    .insert({
      organization_id: organizationId,
      patient_id: values.patientId,
      reservation_id: values.reservationId ?? null,
      service_id: values.serviceId ?? null,
      professional_id: professionalId,
      provider,
      provider_external_reference: null,
      amount: values.amount,
      currency: 'CLP',
      description: values.description,
      status: 'pending',
      expires_at: values.expiresAt ?? null,
      metadata: {
        source: values.reservationId ? 'reservation' : 'manual',
      },
      created_by: user.id,
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    return jsonError('No pudimos crear el cobro.', 500)
  }

  try {
    const providerClient = getPaymentProvider(provider)
    const confirmationPath = values.reservationId
      ? `/agendar/${activeMembership.centros.slug}/confirmacion?reserva=${values.reservationId}`
      : `/pagos?payment=${payment.id}`
    const paymentLink = await providerClient.createPaymentLink({
      paymentId: payment.id,
      organizationId,
      organizationName: activeMembership.centros.nombre,
      providerAccessToken: providerCredentials.accessToken,
      patientId: values.patientId,
      patientEmail: patient.email,
      patientName,
      reservationId: values.reservationId ?? null,
      serviceId: values.serviceId ?? null,
      amount: values.amount,
      currency: 'CLP',
      description: values.description,
      successUrl: getAppUrl(confirmationPath),
      failureUrl: getAppUrl(`/pagos?payment=${payment.id}&paymentStatus=rejected`),
      pendingUrl: getAppUrl(`/pagos?payment=${payment.id}&paymentStatus=pending`),
      webhookUrl: getAppUrl('/api/webhooks/mercado-pago'),
      expiresAt: values.expiresAt ?? null,
    })

    const { data: updatedPayment, error: updateError } = await supabase
      .from('patient_payments')
      .update({
        provider_preference_id: paymentLink.providerPreferenceId ?? null,
        provider_external_reference: payment.id,
        checkout_url: paymentLink.checkoutUrl,
      })
      .eq('id', payment.id)
      .eq('organization_id', organizationId)
      .select('id,status,checkout_url,provider,provider_preference_id')
      .single()

    if (updateError || !updatedPayment) {
      return jsonError('El link se generó, pero no pudimos guardarlo.', 500)
    }

    return NextResponse.json({ ok: true, payment: updatedPayment })
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
      .eq('id', payment.id)
      .eq('organization_id', organizationId)

    if (error instanceof PaymentProviderError) {
      return jsonError(error.message, 502)
    }

    return jsonError('No pudimos generar el link de pago.', 502)
  }
}
