import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export type AttendanceConfirmationStatus =
  | 'pendiente_confirmacion'
  | 'confirmada'
  | 'ya_confirmada'
  | 'cancelada'
  | 'vencida'
  | 'invalida'
  | 'error'

export type AttendanceConfirmationDetails = {
  slug?: string
  centro?: string
  servicio?: string
  profesional?: string
  fecha?: string
}

export type AttendanceConfirmationResult = {
  status: AttendanceConfirmationStatus
  details?: AttendanceConfirmationDetails
}

type ConfirmationQueryRow = {
  id: string
  reserva_id: string
  confirmed_at: string | null
  reservas: {
    id: string
    estado: string
    fecha_inicio: string
    centros: {
      slug: string
      nombre: string
    } | null
    servicios: {
      nombre: string
    } | null
    profiles: {
      nombre: string
      apellido: string | null
    } | null
  } | null
}

export function validAttendanceConfirmationToken(token: string) {
  return /^[a-f0-9]{32,128}$/i.test(token)
}

function confirmationDetails(
  row?: ConfirmationQueryRow | null
): AttendanceConfirmationDetails | undefined {
  const reserva = row?.reservas

  if (!reserva) return undefined

  const professionalName = [
    reserva.profiles?.nombre,
    reserva.profiles?.apellido,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    slug: reserva.centros?.slug,
    centro: reserva.centros?.nombre,
    servicio: reserva.servicios?.nombre,
    profesional: professionalName || undefined,
    fecha: reserva.fecha_inicio,
  }
}

function statusForConfirmationRow(
  row: ConfirmationQueryRow
): AttendanceConfirmationResult {
  const reserva = row.reservas
  const details = confirmationDetails(row)

  if (!reserva) return { status: 'invalida' }

  if (reserva.estado === 'cancelled') {
    return { status: 'cancelada', details }
  }

  if (reserva.estado === 'completed' || reserva.estado === 'no_show') {
    return { status: 'vencida', details }
  }

  if (new Date(reserva.fecha_inicio).getTime() <= Date.now()) {
    return { status: 'vencida', details }
  }

  if (row.confirmed_at || reserva.estado === 'confirmed') {
    return { status: 'ya_confirmada', details }
  }

  return { status: 'pendiente_confirmacion', details }
}

async function fetchConfirmationByToken(
  token: string
): Promise<
  | { row: ConfirmationQueryRow; result?: never }
  | { row?: never; result: AttendanceConfirmationResult }
> {
  if (!validAttendanceConfirmationToken(token)) {
    return { result: { status: 'invalida' } }
  }

  const supabase = createAdminClient()

  if (!supabase) {
    return { result: { status: 'error' } }
  }

  const { data, error } = await supabase
    .from('reserva_confirmaciones')
    .select(
      `
        id,
        reserva_id,
        confirmed_at,
        reservas!inner(
          id,
          estado,
          fecha_inicio,
          centros!inner(slug,nombre),
          servicios!inner(nombre),
          profiles!reservas_profesional_id_fkey(nombre,apellido)
        )
      `
    )
    .eq('token', token)
    .maybeSingle()

  if (error) {
    return { result: { status: 'error' } }
  }

  const row = data as unknown as ConfirmationQueryRow | null

  if (!row || !row.reservas) {
    return { result: { status: 'invalida' } }
  }

  return { row }
}

export async function getAttendanceConfirmationPreview(
  token: string
): Promise<AttendanceConfirmationResult> {
  const confirmation = await fetchConfirmationByToken(token)

  if (confirmation.result) return confirmation.result

  return statusForConfirmationRow(confirmation.row)
}

export async function confirmReservationAttendance(
  token: string
): Promise<AttendanceConfirmationResult> {
  const confirmation = await fetchConfirmationByToken(token)

  if (confirmation.result) return confirmation.result

  const current = statusForConfirmationRow(confirmation.row)

  if (current.status !== 'pendiente_confirmacion') {
    return current
  }

  const supabase = createAdminClient()

  if (!supabase) {
    return { status: 'error', details: current.details }
  }

  const confirmedAt = new Date().toISOString()
  const { data: updatedConfirmation, error: confirmationError } = await supabase
    .from('reserva_confirmaciones')
    .update({ confirmed_at: confirmedAt })
    .eq('id', confirmation.row.id)
    .is('confirmed_at', null)
    .select('id')
    .maybeSingle()

  if (confirmationError) {
    return { status: 'error', details: current.details }
  }

  if (!updatedConfirmation) {
    return { status: 'ya_confirmada', details: current.details }
  }

  const { error: reservaError } = await supabase
    .from('reservas')
    .update({ estado: 'confirmed', estado_asistencia: 'sin_marcar' })
    .eq('id', confirmation.row.reserva_id)
    .neq('estado', 'cancelled')
    .neq('estado', 'completed')
    .neq('estado', 'no_show')

  if (reservaError) {
    return { status: 'error', details: current.details }
  }

  revalidatePath('/agenda')
  revalidatePath('/reservas')

  return { status: 'confirmada', details: current.details }
}
