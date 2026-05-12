import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { publicBookingRequestSchema } from '@/lib/booking/validation'
import {
  getHorarioForDate,
  localDateTime,
  timeToMinutes,
} from '@/lib/booking/availability'
import { defaultHorariosCentro, normalizeHorarios } from '@/lib/centro/horarios'
import type { HorarioCentro } from '@/lib/centro/types'
import type { PublicBookingResult } from '@/lib/booking/types'
import { buildReservationReminderRows } from '@/lib/reminders/schedule'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function splitNombreCompleto(nombreCompleto: string) {
  const parts = nombreCompleto.trim().split(/\s+/)

  return {
    nombre: parts[0] ?? nombreCompleto.trim(),
    apellido: parts.slice(1).join(' ') || null,
  }
}

function buildDateRange(fecha: string, hora: string, durationMinutes: number) {
  const start = localDateTime(fecha, hora)

  if (Number.isNaN(start.getTime())) {
    return { error: 'Selecciona una fecha y hora válidas.' }
  }

  const end = new Date(start.getTime() + durationMinutes * 60_000)

  return {
    fechaInicio: start.toISOString(),
    fechaFin: end.toISOString(),
    startsAt: start,
  }
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
      ? 'Pago online: procesado en modo mock hasta integrar checkout real.'
      : 'Pago: presencial al momento de la atencion.',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = publicBookingRequestSchema.safeParse(body ?? {})

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Revisa los datos antes de confirmar la reserva.' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient() ?? (await createClient())
  const values = parsed.data

  const { data: centro, error: centroError } = await supabase
    .from('centros')
    .select('id,slug')
    .eq('id', values.centro_id)
    .eq('activo', true)
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
    .in('rol', ['admin', 'profesional'])
    .maybeSingle()

  if (profesionalError || !profesional) {
    return NextResponse.json(
      { message: 'Selecciona un profesional disponible.' },
      { status: 400 }
    )
  }

  const { fechaInicio, fechaFin, startsAt, error: dateError } = buildDateRange(
    values.fecha,
    values.hora,
    servicio.duracion_minutos
  )

  if (dateError || !fechaInicio || !fechaFin || !startsAt) {
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

  const { data: horariosData } = await supabase
    .from('horarios_centro')
    .select('dia,activo,inicio,fin')
    .eq('centro_id', values.centro_id)

  const horarios =
    horariosData && horariosData.length > 0
      ? normalizeHorarios(horariosData as HorarioCentro[])
      : normalizeHorarios(defaultHorariosCentro)
  const horario = getHorarioForDate(localDateTime(values.fecha, '00:00'), horarios)
  const startMinutes = timeToMinutes(values.hora)
  const endMinutes = startMinutes + servicio.duracion_minutos

  if (
    !horario?.activo ||
    startMinutes < timeToMinutes(horario.inicio) ||
    endMinutes > timeToMinutes(horario.fin)
  ) {
    return NextResponse.json(
      { message: 'Ese horario está fuera del horario de atención.' },
      { status: 400 }
    )
  }

  let { data: sala } = await supabase
    .from('salas')
    .select('id')
    .eq('centro_id', values.centro_id)
    .eq('activa', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!sala) {
    const { data: newSala, error: salaError } = await supabase
      .from('salas')
      .insert({
        centro_id: values.centro_id,
        nombre: 'Consulta general',
        descripcion: 'Espacio base para reservas online',
        capacidad: 1,
        activa: true,
      })
      .select('id')
      .single()

    if (salaError || !newSala) {
      return NextResponse.json(
        { message: 'No pudimos preparar la agenda del centro.' },
        { status: 500 }
      )
    }

    sala = newSala
  }

  const { data: salaConflict, error: salaConflictError } = await supabase
    .from('reservas')
    .select('id')
    .eq('centro_id', values.centro_id)
    .eq('sala_id', sala.id)
    .neq('estado', 'cancelada')
    .lt('fecha_inicio', fechaFin)
    .gt('fecha_fin', fechaInicio)
    .limit(1)
    .maybeSingle()

  const { data: profesionalConflict, error: profesionalConflictError } =
    await supabase
      .from('reservas')
      .select('id')
      .eq('centro_id', values.centro_id)
      .eq('profesional_id', values.profesional_id)
      .neq('estado', 'cancelada')
      .lt('fecha_inicio', fechaFin)
      .gt('fecha_fin', fechaInicio)
      .limit(1)
      .maybeSingle()

  if (salaConflictError || profesionalConflictError) {
    return NextResponse.json(
      { message: 'No pudimos validar disponibilidad.' },
      { status: 500 }
    )
  }

  if (salaConflict || profesionalConflict) {
    return NextResponse.json(
      { message: 'Ese horario ya no está disponible. Elige otra hora.' },
      { status: 409 }
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
      })
      .select('id,nombre,apellido,email,telefono')
      .single()

    if (pacienteError || !newPaciente) {
      return NextResponse.json(
        { message: 'No pudimos registrar tus datos de contacto.' },
        { status: 500 }
      )
    }

    paciente = newPaciente
  }

  const { data: reserva, error: reservaError } = await supabase
    .from('reservas')
    .insert({
      centro_id: values.centro_id,
      sala_id: sala.id,
      profesional_id: values.profesional_id,
      paciente_id: paciente.id,
      servicio_id: values.servicio_id,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: 'pendiente',
      estado_asistencia: 'sin_marcar',
      notas: buildPublicNotes({
        motivo: values.motivo,
        documento: values.documento,
        paymentMethod: values.payment_method,
      }),
    })
    .select('id')
    .single()

  if (reservaError || !reserva) {
    return NextResponse.json(
      { message: 'No pudimos crear la reserva. Intenta nuevamente.' },
      { status: 500 }
    )
  }

  await supabase.from('recordatorios_reserva').upsert(
    buildReservationReminderRows({
      centroId: values.centro_id,
      reservaId: reserva.id,
      pacienteId: paciente.id,
      fechaInicio,
    }),
    { onConflict: 'reserva_id,canal,tipo' }
  )

  const paymentAmount =
    typeof servicio.precio === 'number' && servicio.precio > 0
      ? servicio.precio
      : null
  const isOnlinePayment = values.payment_method === 'online'

  if (paymentAmount != null) {
    await supabase.from('pagos').insert({
      reserva_id: reserva.id,
      monto: paymentAmount,
      estado: isOnlinePayment ? 'pagado' : 'pendiente',
      metodo_pago: isOnlinePayment ? 'online_mock' : 'presencial',
      referencia: isOnlinePayment ? `mock_${reserva.id}` : null,
    })
  }

  revalidatePath('/agenda')
  revalidatePath('/reservas')
  revalidatePath(`/agendar/${centro.slug}`)

  const response: PublicBookingResult = {
    ok: true,
    reserva_id: reserva.id,
    payment_status:
      paymentAmount == null ? 'not_required' : isOnlinePayment ? 'paid' : 'pending',
  }

  return NextResponse.json(response)
}
