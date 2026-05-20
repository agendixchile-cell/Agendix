'use server'

import { revalidatePath } from 'next/cache'
import { isDemoMode } from '@/lib/auth/demo'
import {
  evolucionSesionSchema,
  fichaClinicaSchema,
  type EvolucionSesionFormValues,
  type FichaClinicaFormValues,
} from '@/lib/fichas/validation'
import type {
  EvolucionActionState,
  EvolucionSesionListItem,
  FichaActionState,
  FichaClinicaListItem,
} from '@/lib/fichas/types'
import { getClinicalCentroId } from '@/lib/supabase/get-centro-id'

const fichaSelect =
  'id,centro_id,paciente_id,antecedentes_relevantes,motivo_consulta,diagnostico_hipotesis,notas_clinicas,documentos,created_at,updated_at'

const evolucionSelect =
  'id,paciente_id,reserva_id,profesional_id,centro_id,fecha,texto_evolucion,proximos_pasos,observaciones_privadas,created_at,updated_at'

function supabaseError(message?: string): string {
  const error = message?.toLowerCase() ?? ''

  if (error.includes('permission denied') || error.includes('row-level security')) {
    return 'No tienes permisos para acceder a información clínica.'
  }

  if (error.includes('duplicate')) {
    return 'Ya existe un registro clínico con esos datos.'
  }

  if (error.includes('foreign key')) {
    return 'No pudimos conectar el registro clínico con la cita o paciente.'
  }

  return 'No pudimos guardar el registro clínico. Intenta nuevamente.'
}

function fichaPayload(values: FichaClinicaFormValues, centroId: string) {
  return {
    centro_id: centroId,
    paciente_id: values.paciente_id,
    antecedentes_relevantes: values.antecedentes_relevantes?.trim() || null,
    motivo_consulta: values.motivo_consulta?.trim() || null,
    diagnostico_hipotesis: values.diagnostico_hipotesis?.trim() || null,
    notas_clinicas: values.notas_clinicas?.trim() || null,
    documentos: null,
  }
}

export async function saveFichaClinicaAction(
  values: FichaClinicaFormValues
): Promise<FichaActionState> {
  const parsed = fichaClinicaSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos de la ficha clínica.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Ficha clínica guardada en modo demo.' }
  }

  const { supabase, centroId, profileId, rol, error } =
    await getClinicalCentroId('fichas clínicas')

  if (error || !centroId || !profileId || !rol) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data: paciente, error: pacienteError } = await supabase
    .from('pacientes')
    .select('id')
    .eq('id', parsed.data.paciente_id)
    .eq('centro_id', centroId)
    .maybeSingle()

  if (pacienteError) {
    return { ok: false, message: supabaseError(pacienteError.message) }
  }

  if (!paciente) {
    return { ok: false, message: 'No encontramos el paciente seleccionado.' }
  }

  if (rol === 'profesional') {
    const { data: linkedReserva, error: linkedReservaError } = await supabase
      .from('reservas')
      .select('id')
      .eq('centro_id', centroId)
      .eq('paciente_id', parsed.data.paciente_id)
      .eq('profesional_id', profileId)
      .neq('estado', 'cancelled')
      .limit(1)
      .maybeSingle()

    if (linkedReservaError) {
      return { ok: false, message: supabaseError(linkedReservaError.message) }
    }

    if (!linkedReserva) {
      return {
        ok: false,
        message: 'Solo puedes editar fichas de pacientes vinculados a tus citas.',
      }
    }
  }

  const { data, error: upsertError } = await supabase
    .from('fichas_clinicas')
    .upsert(fichaPayload(parsed.data, centroId), {
      onConflict: 'centro_id,paciente_id',
    })
    .select(fichaSelect)
    .single()

  if (upsertError || !data) {
    return { ok: false, message: supabaseError(upsertError?.message) }
  }

  revalidatePath('/fichas-clinicas')
  revalidatePath('/pacientes')

  return {
    ok: true,
    message: 'Ficha clínica guardada.',
    ficha: data as FichaClinicaListItem,
  }
}

export async function saveEvolucionSesionAction(
  values: EvolucionSesionFormValues
): Promise<EvolucionActionState> {
  const parsed = evolucionSesionSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: 'Revisa los datos de la ficha clínica.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Ficha clínica guardada en modo demo.' }
  }

  const { supabase, centroId, profileId, rol, error } =
    await getClinicalCentroId('evoluciones clínicas')

  if (error || !centroId || !profileId || !rol) {
    return { ok: false, message: error ?? 'No pudimos encontrar tu centro.' }
  }

  const { data: reserva, error: reservaError } = await supabase
    .from('reservas')
    .select('id,paciente_id,profesional_id,centro_id,fecha_inicio')
    .eq('id', parsed.data.reserva_id)
    .eq('centro_id', centroId)
    .maybeSingle()

  if (reservaError) {
    return { ok: false, message: supabaseError(reservaError.message) }
  }

  if (!reserva) {
    return { ok: false, message: 'No encontramos la cita seleccionada.' }
  }

  if (rol === 'profesional' && reserva.profesional_id !== profileId) {
    return {
      ok: false,
      message: 'Solo puedes registrar evolución en tus propias citas.',
    }
  }

  const { data, error: upsertError } = await supabase
    .from('evoluciones_sesion')
    .upsert(
      {
        paciente_id: reserva.paciente_id,
        reserva_id: reserva.id,
        profesional_id: reserva.profesional_id,
        centro_id: reserva.centro_id,
        fecha: reserva.fecha_inicio,
        texto_evolucion: parsed.data.texto_evolucion.trim(),
        proximos_pasos: parsed.data.proximos_pasos?.trim() || null,
        observaciones_privadas:
          parsed.data.observaciones_privadas?.trim() || null,
      },
      { onConflict: 'reserva_id' }
    )
    .select(evolucionSelect)
    .single()

  if (upsertError || !data) {
    return { ok: false, message: supabaseError(upsertError?.message) }
  }

  await supabase
    .from('reservas')
    .update({ estado: 'completed', estado_asistencia: 'asistio' })
    .eq('id', reserva.id)
    .eq('centro_id', centroId)

  revalidatePath('/agenda')
  revalidatePath('/reservas')
  revalidatePath('/fichas-clinicas')

  return {
    ok: true,
    message: 'Ficha clínica guardada.',
    evolucion: data as EvolucionSesionListItem,
  }
}
