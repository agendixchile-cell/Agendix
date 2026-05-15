'use server'

import { revalidatePath } from 'next/cache'
import { isDemoMode } from '@/lib/auth/demo'
import type { EstadoAsistencia, EstadoReserva } from '@/lib/types/database'
import {
  reservaSchema,
  type ReservaFormValues,
} from '@/lib/reservas/validation'
import type {
  ReservaActionState,
  ReservaListItem,
  ReservaPacienteOption,
  ReservaQueryRow,
} from '@/lib/reservas/types'
import { buildReservationReminderRows } from '@/lib/reminders/schedule'
import {
  defaultHorariosCentro,
  getHorarioForDate,
  normalizeHorarios,
  timeRangeOverlapsDescanso,
  timeToMinutes,
} from '@/lib/centro/horarios'
import type { HorarioCentro } from '@/lib/centro/types'
import { createClient } from '@/lib/supabase/server'
import { getCentroId } from '@/lib/supabase/get-centro-id'

const reservaSelect = `
  id,
  fecha_inicio,
  fecha_fin,
  estado,
  estado_asistencia,
  notas,
  created_at,
  updated_at,
  servicios!inner(id,nombre,duracion_minutos,precio),
  salas!inner(id,nombre),
  profiles!reservas_profesional_id_fkey(id,nombre,email),
  pacientes!inner(id,nombre,apellido,email,telefono)
`

function toReservaListItem(row: ReservaQueryRow): ReservaListItem {
  return {
    id: row.id,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    estado: row.estado,
    estado_asistencia: row.estado_asistencia ?? 'sin_marcar',
    notas: row.notas,
    created_at: row.created_at,
    updated_at: row.updated_at,
    servicio: {
      id: row.servicios?.id ?? '',
      nombre: row.servicios?.nombre ?? 'Servicio sin nombre',
      duracion_minutos: row.servicios?.duracion_minutos ?? 0,
      precio: row.servicios?.precio ?? null,
    },
    sala: {
      id: row.salas?.id ?? '',
      nombre: row.salas?.nombre ?? 'Sala sin nombre',
    },
    profesional: {
      id: row.profiles?.id ?? '',
      nombre: row.profiles?.nombre ?? 'Profesional sin nombre',
      email: row.profiles?.email ?? '',
    },
    paciente: {
      id: row.pacientes?.id ?? '',
      nombre: row.pacientes?.nombre ?? 'Paciente sin nombre',
      apellido: row.pacientes?.apellido ?? null,
      email: row.pacientes?.email ?? null,
      telefono: row.pacientes?.telefono ?? null,
    },
  }
}

function supabaseError(message?: string): string {
  const error = message?.toLowerCase() ?? ''

  if (error.includes('permission denied') || error.includes('row-level security')) {
    return 'No tienes permisos para administrar reservas en este centro.'
  }

  if (error.includes('duplicate')) {
    return 'Ya existe una reserva con esos datos.'
  }

  if (error.includes('foreign key')) {
    return 'No pudimos conectar la reserva con sus datos asociados.'
  }

  return 'No pudimos guardar la reserva. Intenta nuevamente.'
}

function buildDateRange(values: ReservaFormValues, durationMinutes: number) {
  const start = new Date(`${values.fecha}T${values.hora}:00`)

  if (Number.isNaN(start.getTime())) {
    return { error: 'Selecciona una fecha y hora válidas.' }
  }

  const end = new Date(start.getTime() + durationMinutes * 60_000)

  return {
    fechaInicio: start.toISOString(),
    fechaFin: end.toISOString(),
  }
}

async function upsertReminderSkeletons(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  reservaId: string,
  pacienteId: string,
  fechaInicio: string
) {
  await supabase
    .from('recordatorios_reserva')
    .upsert(
      buildReservationReminderRows({
        centroId,
        reservaId,
        pacienteId,
        fechaInicio,
      }),
      {
        onConflict: 'reserva_id,canal,tipo',
      }
    )
}

async function resolvePaciente(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  values: ReservaFormValues
) {
  if (values.paciente_id) {
    const { data, error } = await supabase
      .from('pacientes')
      .select('id,nombre,apellido,email,telefono')
      .eq('id', values.paciente_id)
      .eq('centro_id', centroId)
      .maybeSingle()

    if (error) {
      return { error: supabaseError(error.message) }
    }

    if (!data) {
      return { error: 'No encontramos el paciente seleccionado.' }
    }

    return { paciente: data as ReservaPacienteOption }
  }

  const { data, error } = await supabase
    .from('pacientes')
    .insert({
      centro_id: centroId,
      nombre: values.paciente_nombre?.trim() ?? '',
      apellido: null,
      rut: null,
      email: values.paciente_email?.trim() || null,
      telefono: values.paciente_telefono?.trim() || null,
      fecha_nacimiento: null,
      notas: null,
    })
    .select('id,nombre,apellido,email,telefono')
    .single()

  if (error || !data) {
    return { error: supabaseError(error?.message) }
  }

  return { paciente: data as ReservaPacienteOption }
}

async function resolveReservaRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  values: ReservaFormValues
) {
  const { data: servicio, error: servicioError } = await supabase
    .from('servicios')
    .select('id,duracion_minutos')
    .eq('id', values.servicio_id)
    .eq('centro_id', centroId)
    .eq('activo', true)
    .maybeSingle()

  if (servicioError) {
    return { error: supabaseError(servicioError.message) }
  }

  if (!servicio) {
    return { error: 'Selecciona un servicio activo de tu centro.' }
  }

  const { data: sala, error: salaError } = await supabase
    .from('salas')
    .select('id')
    .eq('id', values.sala_id)
    .eq('centro_id', centroId)
    .eq('activa', true)
    .maybeSingle()

  if (salaError) {
    return { error: supabaseError(salaError.message) }
  }

  if (!sala) {
    return { error: 'Selecciona una sala activa de tu centro.' }
  }

  const { data: profesional, error: profesionalError } = await supabase
    .from('miembros_centro')
    .select('profile_id')
    .eq('profile_id', values.profesional_id)
    .eq('centro_id', centroId)
    .eq('activo', true)
    .in('rol', ['admin', 'profesional'])
    .maybeSingle()

  if (profesionalError) {
    return { error: supabaseError(profesionalError.message) }
  }

  if (!profesional) {
    return { error: 'Selecciona un profesional activo de tu centro.' }
  }

  return { durationMinutes: servicio.duracion_minutos }
}

async function findReservationConflict({
  supabase,
  centroId,
  salaId,
  profesionalId,
  fechaInicio,
  fechaFin,
  excludeReservaId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  centroId: string
  salaId: string
  profesionalId: string
  fechaInicio: string
  fechaFin: string
  excludeReservaId?: string
}) {
  let salaQuery = supabase
    .from('reservas')
    .select('id')
    .eq('centro_id', centroId)
    .eq('sala_id', salaId)
    .neq('estado', 'cancelada')
    .lt('fecha_inicio', fechaFin)
    .gt('fecha_fin', fechaInicio)
    .limit(1)

  if (excludeReservaId) {
    salaQuery = salaQuery.neq('id', excludeReservaId)
  }

  const { data: salaConflict, error: salaConflictError } =
    await salaQuery.maybeSingle()

  if (salaConflictError) {
    return { error: supabaseError(salaConflictError.message) }
  }

  if (salaConflict) {
    return { error: 'La sala ya tiene una reserva en ese horario.' }
  }

  let profesionalQuery = supabase
    .from('reservas')
    .select('id')
    .eq('centro_id', centroId)
    .eq('profesional_id', profesionalId)
    .neq('estado', 'cancelada')
    .lt('fecha_inicio', fechaFin)
    .gt('fecha_fin', fechaInicio)
    .limit(1)

  if (excludeReservaId) {
    profesionalQuery = profesionalQuery.neq('id', excludeReservaId)
  }

  const { data: profesionalConflict, error: profesionalConflictError } =
    await profesionalQuery.maybeSingle()

  if (profesionalConflictError) {
    return { error: supabaseError(profesionalConflictError.message) }
  }

  if (profesionalConflict) {
    return { error: 'El profesional ya tiene una reserva en ese horario.' }
  }

  return {}
}

async function validateReservaHorario({
  supabase,
  centroId,
  values,
  durationMinutes,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  centroId: string
  values: ReservaFormValues
  durationMinutes: number
}) {
  const { data, error } = await supabase
    .from('horarios_centro')
    .select('dia,activo,inicio,fin,descanso_activo,descanso_inicio,descanso_fin')
    .eq('centro_id', centroId)

  if (error) {
    return { error: supabaseError(error.message) }
  }

  const horarios =
    data && data.length > 0
      ? normalizeHorarios(data as HorarioCentro[])
      : defaultHorariosCentro
  const horario = getHorarioForDate(
    new Date(`${values.fecha}T00:00:00`),
    horarios
  )

  if (!horario?.activo) {
    return { error: 'El centro está cerrado en ese día.' }
  }

  const startMinutes = timeToMinutes(values.hora)
  const endMinutes = startMinutes + durationMinutes
  const openStart = timeToMinutes(horario.inicio)
  const openEnd = timeToMinutes(horario.fin)

  if (startMinutes < openStart || endMinutes > openEnd) {
    return { error: 'Ese horario queda fuera del horario operativo.' }
  }

  if (timeRangeOverlapsDescanso(horario, startMinutes, endMinutes)) {
    return { error: 'Ese horario coincide con el descanso del centro.' }
  }

  return {}
}

async function fetchReservaById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  centroId: string,
  reservaId: string
) {
  const { data, error } = await supabase
    .from('reservas')
    .select(reservaSelect)
    .eq('id', reservaId)
    .eq('centro_id', centroId)
    .single()

  if (error || !data) {
    return { error: supabaseError(error?.message) }
  }

  return {
    reserva: toReservaListItem(data as unknown as ReservaQueryRow),
  }
}

export async function createReservaAction(
  values: ReservaFormValues
): Promise<ReservaActionState> {
  const parsed = reservaSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos de la reserva.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Reserva creada en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { durationMinutes, error: relationError } = await resolveReservaRelations(
    supabase,
    centroId,
    parsed.data
  )

  if (relationError || !durationMinutes) {
    return { ok: false, message: relationError ?? 'No pudimos validar la reserva.' }
  }

  const { fechaInicio, fechaFin, error: dateError } = buildDateRange(
    parsed.data,
    durationMinutes
  )

  if (dateError || !fechaInicio || !fechaFin) {
    return { ok: false, message: dateError ?? 'Selecciona fecha y hora válidas.' }
  }

  if (parsed.data.estado !== 'cancelada') {
    const { error: horarioError } = await validateReservaHorario({
      supabase,
      centroId,
      values: parsed.data,
      durationMinutes,
    })

    if (horarioError) {
      return { ok: false, message: horarioError }
    }

    const { error: conflictError } = await findReservationConflict({
      supabase,
      centroId,
      salaId: parsed.data.sala_id,
      profesionalId: parsed.data.profesional_id,
      fechaInicio,
      fechaFin,
    })

    if (conflictError) {
      return { ok: false, message: conflictError }
    }
  }

  const { paciente, error: pacienteError } = await resolvePaciente(
    supabase,
    centroId,
    parsed.data
  )

  if (pacienteError || !paciente) {
    return { ok: false, message: pacienteError ?? 'No pudimos guardar el paciente.' }
  }

  const { data, error: insertError } = await supabase
    .from('reservas')
    .insert({
      centro_id: centroId,
      sala_id: parsed.data.sala_id,
      profesional_id: parsed.data.profesional_id,
      paciente_id: paciente.id,
      servicio_id: parsed.data.servicio_id,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: parsed.data.estado,
      estado_asistencia: parsed.data.estado_asistencia,
      notas: parsed.data.notas?.trim() || null,
    })
    .select('id')
    .single()

  if (insertError || !data) {
    return { ok: false, message: supabaseError(insertError?.message) }
  }

  if (parsed.data.estado !== 'cancelada') {
    await upsertReminderSkeletons(supabase, centroId, data.id, paciente.id, fechaInicio)
  }

  const { reserva, error: fetchError } = await fetchReservaById(
    supabase,
    centroId,
    data.id
  )

  if (fetchError || !reserva) {
    return { ok: false, message: fetchError ?? 'No pudimos cargar la reserva.' }
  }

  revalidatePath('/agenda')
  revalidatePath('/reservas')

  return {
    ok: true,
    message: 'Reserva creada correctamente.',
    reserva,
    paciente,
  }
}

export async function updateReservaAction(
  id: string,
  values: ReservaFormValues
): Promise<ReservaActionState> {
  const parsed = reservaSchema.safeParse(values)

  if (!id || !parsed.success) {
    return { ok: false, message: 'Revisa los datos de la reserva.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Reserva actualizada en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { durationMinutes, error: relationError } = await resolveReservaRelations(
    supabase,
    centroId,
    parsed.data
  )

  if (relationError || !durationMinutes) {
    return { ok: false, message: relationError ?? 'No pudimos validar la reserva.' }
  }

  const { fechaInicio, fechaFin, error: dateError } = buildDateRange(
    parsed.data,
    durationMinutes
  )

  if (dateError || !fechaInicio || !fechaFin) {
    return { ok: false, message: dateError ?? 'Selecciona fecha y hora válidas.' }
  }

  if (parsed.data.estado !== 'cancelada') {
    const { error: horarioError } = await validateReservaHorario({
      supabase,
      centroId,
      values: parsed.data,
      durationMinutes,
    })

    if (horarioError) {
      return { ok: false, message: horarioError }
    }
  }

  const { data: existingReserva, error: lookupError } = await supabase
    .from('reservas')
    .select('id')
    .eq('id', id)
    .eq('centro_id', centroId)
    .maybeSingle()

  if (lookupError) {
    return { ok: false, message: supabaseError(lookupError.message) }
  }

  if (!existingReserva) {
    return { ok: false, message: 'No encontramos la reserva seleccionada.' }
  }

  if (parsed.data.estado !== 'cancelada') {
    const { error: conflictError } = await findReservationConflict({
      supabase,
      centroId,
      salaId: parsed.data.sala_id,
      profesionalId: parsed.data.profesional_id,
      fechaInicio,
      fechaFin,
      excludeReservaId: id,
    })

    if (conflictError) {
      return { ok: false, message: conflictError }
    }
  }

  const { paciente, error: pacienteError } = await resolvePaciente(
    supabase,
    centroId,
    parsed.data
  )

  if (pacienteError || !paciente) {
    return { ok: false, message: pacienteError ?? 'No pudimos guardar el paciente.' }
  }

  const { error: updateError } = await supabase
    .from('reservas')
    .update({
      sala_id: parsed.data.sala_id,
      profesional_id: parsed.data.profesional_id,
      paciente_id: paciente.id,
      servicio_id: parsed.data.servicio_id,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: parsed.data.estado,
      estado_asistencia: parsed.data.estado_asistencia,
      notas: parsed.data.notas?.trim() || null,
    })
    .eq('id', id)
    .eq('centro_id', centroId)

  if (updateError) {
    return { ok: false, message: supabaseError(updateError.message) }
  }

  if (parsed.data.estado !== 'cancelada') {
    await upsertReminderSkeletons(supabase, centroId, id, paciente.id, fechaInicio)
  } else {
    await supabase
      .from('recordatorios_reserva')
      .update({
        estado: 'omitido',
        error_message: 'Reserva cancelada antes del envio.',
        processing_started_at: null,
      })
      .eq('reserva_id', id)
      .in('estado', ['pendiente', 'fallido', 'procesando'])
  }

  const { reserva, error: fetchError } = await fetchReservaById(supabase, centroId, id)

  if (fetchError || !reserva) {
    return { ok: false, message: fetchError ?? 'No pudimos cargar la reserva.' }
  }

  revalidatePath('/agenda')
  revalidatePath('/reservas')

  return {
    ok: true,
    message: 'Reserva actualizada correctamente.',
    reserva,
    paciente,
  }
}

export async function updateReservaEstadoAction(
  id: string,
  estado: EstadoReserva
): Promise<ReservaActionState> {
  if (!id) {
    return { ok: false, message: 'No pudimos identificar la reserva.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Estado actualizado en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { error: updateError } = await supabase
    .from('reservas')
    .update({ estado })
    .eq('id', id)
    .eq('centro_id', centroId)

  if (updateError) {
    return { ok: false, message: supabaseError(updateError.message) }
  }

  if (estado === 'cancelada') {
    await supabase
      .from('recordatorios_reserva')
      .update({
        estado: 'omitido',
        error_message: 'Reserva cancelada antes del envio.',
        processing_started_at: null,
      })
      .eq('reserva_id', id)
      .in('estado', ['pendiente', 'fallido', 'procesando'])
  }

  const { reserva, error: fetchError } = await fetchReservaById(supabase, centroId, id)

  if (fetchError || !reserva) {
    return { ok: false, message: fetchError ?? 'No pudimos cargar la reserva.' }
  }

  revalidatePath('/agenda')
  revalidatePath('/reservas')

  return {
    ok: true,
    message: 'Estado de reserva actualizado.',
    reserva,
  }
}

export async function updateReservaAsistenciaAction(
  id: string,
  estadoAsistencia: EstadoAsistencia
): Promise<ReservaActionState> {
  if (!id) {
    return { ok: false, message: 'No pudimos identificar la reserva.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Asistencia actualizada en modo demo.' }
  }

  const { supabase, centroId, error } = await getCentroId()

  if (error || !centroId) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { error: updateError } = await supabase
    .from('reservas')
    .update({ estado_asistencia: estadoAsistencia })
    .eq('id', id)
    .eq('centro_id', centroId)

  if (updateError) {
    return { ok: false, message: supabaseError(updateError.message) }
  }

  const { reserva, error: fetchError } = await fetchReservaById(supabase, centroId, id)

  if (fetchError || !reserva) {
    return { ok: false, message: fetchError ?? 'No pudimos cargar la reserva.' }
  }

  revalidatePath('/agenda')
  revalidatePath('/reservas')

  return {
    ok: true,
    message: 'Asistencia de la cita actualizada.',
    reserva,
  }
}
