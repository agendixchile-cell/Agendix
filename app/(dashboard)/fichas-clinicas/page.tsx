import { redirect } from 'next/navigation'
import { FichasClinicasManager } from '@/components/fichas/fichas-clinicas-manager'
import { EmptyState } from '@/components/ui/empty-state'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import type {
  EvolucionSesionListItem,
  FichaClinicaListItem,
} from '@/lib/fichas/types'
import type { PacienteListItem } from '@/lib/pacientes/types'
import type { ReservaListItem, ReservaQueryRow } from '@/lib/reservas/types'
import { getDemoPlanId } from '@/lib/subscription/server'
import { createClient } from '@/lib/supabase/server'
import type { RolCentro } from '@/lib/types/database'
import { ClipboardX } from 'lucide-react'

type MembershipRow = {
  centro_id: string
  rol: RolCentro
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

type FichasClinicasPageProps = {
  searchParams: Promise<{ paciente?: string }>
}

export default async function FichasClinicasPage({
  searchParams,
}: FichasClinicasPageProps) {
  const { paciente } = await searchParams
  const demoMode = isDemoMode()

  if (demoMode) {
    const planId = await getDemoPlanId()
    const dataset = getDemoPlanDataset(planId)

    return (
      <FichasClinicasManager
        initialPacientes={dataset.pacientes}
        initialFichas={dataset.fichas}
        initialEvoluciones={dataset.evoluciones}
        initialReservas={dataset.reservas}
        initialSelectedPacienteId={paciente}
        demoMode
        demoPlanId={planId}
      />
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership, error: membershipError } = await supabase
    .from('miembros_centro')
    .select('centro_id,rol')
    .eq('profile_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    return (
      <FichasClinicasManager
        initialPacientes={[]}
        initialFichas={[]}
        initialEvoluciones={[]}
        initialReservas={[]}
        demoMode={false}
        loadError="No pudimos cargar el centro asociado a tu usuario."
      />
    )
  }

  const activeMembership = membership as MembershipRow | null

  if (!activeMembership?.centro_id) {
    return (
      <FichasClinicasManager
        initialPacientes={[]}
        initialFichas={[]}
        initialEvoluciones={[]}
        initialReservas={[]}
        demoMode={false}
        loadError={`No encontramos un centro asociado a ${user.email ?? demoUser.nombre}.`}
      />
    )
  }

  if (activeMembership.rol === 'recepcion') {
    return (
      <EmptyState
        title="Acceso clínico restringido"
        description="Recepción puede crear y editar citas, pero no acceder a fichas clínicas ni observaciones sensibles."
        icon={ClipboardX}
      />
    )
  }

  const centroId = activeMembership.centro_id
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
    .order('fecha_inicio', { ascending: false })

  let evolucionesQuery = supabase
    .from('evoluciones_sesion')
    .select(
      'id,paciente_id,reserva_id,profesional_id,centro_id,fecha,texto_evolucion,proximos_pasos,observaciones_privadas,created_at,updated_at'
    )
    .eq('centro_id', centroId)
    .order('fecha', { ascending: false })

  if (isProfessional) {
    reservasQuery = reservasQuery.eq('profesional_id', user.id)
    evolucionesQuery = evolucionesQuery.eq('profesional_id', user.id)
  }

  const [evolucionesResult, reservasResult] = await Promise.all([
    evolucionesQuery,
    reservasQuery,
  ])

  const reservas = ((reservasResult.data ?? []) as unknown as ReservaQueryRow[]).map(
    toReservaListItem
  )
  const professionalPatientIds = new Set(
    reservas.map((reserva) => reserva.paciente.id).filter(Boolean)
  )
  const patientIds = [...professionalPatientIds]
  const [pacientesResult, fichasResult] = isProfessional
    ? patientIds.length > 0
      ? await Promise.all([
          supabase
            .from('pacientes')
            .select(
              'id,nombre,apellido,rut,email,telefono,fecha_nacimiento,notas,activo,created_at,updated_at'
            )
            .eq('centro_id', centroId)
            .in('id', patientIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('fichas_clinicas')
            .select(
              'id,centro_id,paciente_id,antecedentes_relevantes,motivo_consulta,diagnostico_hipotesis,notas_clinicas,documentos,created_at,updated_at'
            )
            .eq('centro_id', centroId)
            .in('paciente_id', patientIds)
            .order('updated_at', { ascending: false }),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ]
    : await Promise.all([
        supabase
          .from('pacientes')
          .select(
            'id,nombre,apellido,rut,email,telefono,fecha_nacimiento,notas,activo,created_at,updated_at'
          )
          .eq('centro_id', centroId)
          .order('created_at', { ascending: false }),
        supabase
          .from('fichas_clinicas')
          .select(
            'id,centro_id,paciente_id,antecedentes_relevantes,motivo_consulta,diagnostico_hipotesis,notas_clinicas,documentos,created_at,updated_at'
          )
          .eq('centro_id', centroId)
          .order('updated_at', { ascending: false }),
      ])
  const pacientes = (pacientesResult.data ?? []) as PacienteListItem[]
  const visiblePacientes = pacientes

  const loadError =
    pacientesResult.error ||
    fichasResult.error ||
    evolucionesResult.error ||
    reservasResult.error

  return (
    <FichasClinicasManager
      initialPacientes={visiblePacientes}
      initialFichas={(fichasResult.data ?? []) as FichaClinicaListItem[]}
      initialEvoluciones={
        (evolucionesResult.data ?? []) as EvolucionSesionListItem[]
      }
      initialReservas={reservas}
      initialSelectedPacienteId={paciente}
      demoMode={false}
      loadError={
        loadError
          ? 'No pudimos cargar fichas clínicas. Revisa permisos de Supabase e intenta nuevamente.'
          : undefined
      }
    />
  )
}
