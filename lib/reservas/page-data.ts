import { redirect } from 'next/navigation'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { demoCentro } from '@/lib/centro/demo'
import { defaultHorariosCentro, normalizeHorarios } from '@/lib/centro/horarios'
import type { HorarioCentro } from '@/lib/centro/types'
import { demoEvolucionesSesion } from '@/lib/fichas/demo'
import type { EvolucionSesionListItem } from '@/lib/fichas/types'
import {
  demoReservaPacientes,
  demoReservaProfesionales,
  demoReservaSalas,
  demoReservas,
  demoReservaServicios,
} from '@/lib/reservas/demo'
import {
  getDemoSubscriptionContext,
  getOrganizationUsage,
  getPlanSnapshotForCentro,
} from '@/lib/subscription/server'
import type {
  AgendaBlockListItem,
  AgendaBlockQueryRow,
  ReservaListItem,
  ReservaPacienteOption,
  ReservaProfesionalOption,
  ReservaQueryRow,
  ReservaSalaOption,
  ReservaServicioOption,
} from '@/lib/reservas/types'
import { createClient } from '@/lib/supabase/server'
import type { RolCentro } from '@/lib/types/database'
import type { ReservasManagerProps } from '@/components/reservas/reservas-manager'

type ReservasPageData = Omit<ReservasManagerProps, 'viewMode'>

type MembershipRow = {
  centro_id: string
  rol: RolCentro
  centros: {
    slug: string
  } | null
}

type ProfesionalOptionQueryRow = {
  profile_id: string
  descanso_entre_reservas_minutos: number | null
  duracion_sesion_minutos: number | null
  intervalo_reservas_minutos: number | null
  profiles: {
    nombre: string
    email: string
  } | null
}

function toReservaListItem(row: ReservaQueryRow): ReservaListItem {
  return {
    id: row.id,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    estado: row.estado,
    estado_asistencia: row.estado_asistencia ?? 'sin_marcar',
    notas: row.notas,
    meeting_provider: row.meeting_provider,
    meeting_url: row.meeting_url,
    auto_generated_meeting: row.auto_generated_meeting,
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
      nombre: row.salas?.nombre ?? 'Consulta',
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

function toAgendaBlockListItem(row: AgendaBlockQueryRow): AgendaBlockListItem {
  return {
    id: row.id,
    centro_id: row.centro_id,
    profesional_id: row.profesional_id,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    motivo: row.motivo,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profesional: row.profiles
      ? {
          id: row.profiles.id,
          nombre: row.profiles.nombre,
          email: row.profiles.email,
        }
      : null,
  }
}

function emptyReservasData(loadError: string): ReservasPageData {
  return {
    initialReservas: [],
    initialBloqueos: [],
    initialServicios: [],
    initialSalas: [],
    initialProfesionales: [],
    initialPacientes: [],
    initialHorarios: defaultHorariosCentro,
    demoMode: false,
    loadError,
  }
}

export async function getReservasPageData(): Promise<ReservasPageData> {
  if (isDemoMode()) {
    const subscription = await getDemoSubscriptionContext()

    return {
      initialReservas: demoReservas,
      initialBloqueos: [],
      initialServicios: demoReservaServicios,
      initialSalas: demoReservaSalas,
      initialProfesionales: demoReservaProfesionales,
      initialPacientes: demoReservaPacientes,
      initialEvoluciones: demoEvolucionesSesion,
      initialHorarios: defaultHorariosCentro,
      publicBookingPath: `/agendar/${demoCentro.slug}`,
      demoMode: true,
      planContext: subscription,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership, error: membershipError } = await supabase
    .from('miembros_centro')
    .select('centro_id,rol,centros!inner(slug)')
    .eq('profile_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    return emptyReservasData('No pudimos cargar el centro asociado a tu usuario.')
  }

  const activeMembership = membership as MembershipRow | null

  if (!activeMembership?.centro_id) {
    return emptyReservasData(
      `No encontramos un centro asociado a ${user.email ?? demoUser.nombre}.`
    )
  }

  const centroId = activeMembership.centro_id
  const publicBookingPath = activeMembership.centros?.slug
    ? `/agendar/${activeMembership.centros.slug}`
    : undefined
  const isProfessional = activeMembership.rol === 'profesional'

  let reservasQuery = supabase
    .from('reservas')
    .select(
      `
        id,
        fecha_inicio,
        fecha_fin,
        estado,
        estado_asistencia,
        notas,
        meeting_provider,
        meeting_url,
        auto_generated_meeting,
        created_at,
        updated_at,
        servicios!inner(id,nombre,duracion_minutos,precio),
        salas!inner(id,nombre),
        profiles!reservas_profesional_id_fkey(id,nombre,email),
        pacientes!inner(id,nombre,apellido,email,telefono)
      `
    )
    .eq('centro_id', centroId)
    .order('fecha_inicio', { ascending: true })

  let profesionalesQuery = supabase
    .from('miembros_centro')
    .select(
      'profile_id,descanso_entre_reservas_minutos,duracion_sesion_minutos,intervalo_reservas_minutos,profiles!inner(nombre,email)'
    )
    .eq('centro_id', centroId)
    .eq('activo', true)
    .in('rol', ['owner', 'admin', 'profesional'])
    .order('created_at', { ascending: false })

  let evolucionesQuery = supabase
    .from('evoluciones_sesion')
    .select(
      'id,paciente_id,reserva_id,profesional_id,centro_id,fecha,texto_evolucion,proximos_pasos,observaciones_privadas,created_at,updated_at'
    )
    .eq('centro_id', centroId)
    .order('fecha', { ascending: false })

  let bloqueosQuery = supabase
    .from('bloqueos_agenda')
    .select(
      `
        id,
        centro_id,
        profesional_id,
        fecha_inicio,
        fecha_fin,
        motivo,
        created_at,
        updated_at,
        profiles!bloqueos_agenda_profesional_id_fkey(id,nombre,email)
      `
    )
    .eq('centro_id', centroId)
    .order('fecha_inicio', { ascending: true })

  if (isProfessional) {
    reservasQuery = reservasQuery.eq('profesional_id', user.id)
    profesionalesQuery = profesionalesQuery.eq('profile_id', user.id)
    evolucionesQuery = evolucionesQuery.eq('profesional_id', user.id)
    bloqueosQuery = bloqueosQuery.or(
      `profesional_id.is.null,profesional_id.eq.${user.id}`
    )
  }

  const [
    reservasResult,
    serviciosResult,
    salasResult,
    profesionalesResult,
    pacientesResult,
    evolucionesResult,
    horariosResult,
    bloqueosResult,
    planSnapshot,
    usage,
  ] = await Promise.all([
    reservasQuery,
    supabase
      .from('servicios')
      .select('id,nombre,duracion_minutos,precio')
      .eq('centro_id', centroId)
      .eq('activo', true)
      .order('nombre', { ascending: true }),
    supabase
      .from('salas')
      .select('id,nombre')
      .eq('centro_id', centroId)
      .eq('activa', true)
      .order('nombre', { ascending: true }),
    profesionalesQuery,
    supabase
      .from('pacientes')
      .select('id,nombre,apellido,email,telefono')
      .eq('centro_id', centroId)
      .order('created_at', { ascending: false }),
    evolucionesQuery,
    supabase
      .from('horarios_centro')
      .select('dia,activo,inicio,fin,descanso_activo,descanso_inicio,descanso_fin')
      .eq('centro_id', centroId)
      .order('dia', { ascending: true }),
    bloqueosQuery,
    getPlanSnapshotForCentro(supabase, centroId),
    getOrganizationUsage(supabase, centroId),
  ])

  const reservas = ((reservasResult.data ?? []) as unknown as ReservaQueryRow[]).map(
    toReservaListItem
  )
  const professionalPatientIds = new Set(
    reservas.map((reserva) => reserva.paciente.id).filter(Boolean)
  )
  const pacientes = (pacientesResult.data ?? []) as ReservaPacienteOption[]
  const visiblePacientes = isProfessional
    ? pacientes.filter((paciente) => professionalPatientIds.has(paciente.id))
    : pacientes

  const loadError =
    reservasResult.error ||
    serviciosResult.error ||
    salasResult.error ||
    profesionalesResult.error ||
    pacientesResult.error ||
    evolucionesResult.error ||
    horariosResult.error ||
    bloqueosResult.error

  const profesionales = (
    (profesionalesResult.data ?? []) as unknown as ProfesionalOptionQueryRow[]
  ).map<ReservaProfesionalOption>((item) => ({
    id: item.profile_id,
    nombre: item.profiles?.nombre ?? 'Profesional sin nombre',
    email: item.profiles?.email ?? '',
    descanso_entre_reservas_minutos:
      item.descanso_entre_reservas_minutos ?? 0,
    duracion_sesion_minutos: item.duracion_sesion_minutos ?? 60,
    intervalo_reservas_minutos: item.intervalo_reservas_minutos ?? 60,
  }))

  return {
    initialReservas: reservas,
    initialBloqueos: (
      (bloqueosResult.data ?? []) as unknown as AgendaBlockQueryRow[]
    ).map(toAgendaBlockListItem),
    initialServicios: (serviciosResult.data ?? []) as ReservaServicioOption[],
    initialSalas: (salasResult.data ?? []) as ReservaSalaOption[],
    initialProfesionales: profesionales,
    initialPacientes: visiblePacientes,
    initialEvoluciones:
      (evolucionesResult.data ?? []) as EvolucionSesionListItem[],
    initialHorarios:
      horariosResult.data && horariosResult.data.length > 0
        ? normalizeHorarios(horariosResult.data as HorarioCentro[])
        : defaultHorariosCentro,
    publicBookingPath,
    demoMode: false,
    planContext: { ...planSnapshot, usage },
    loadError: loadError
      ? 'No pudimos cargar las reservas. Revisa permisos de Supabase e intenta nuevamente.'
      : undefined,
  }
}
