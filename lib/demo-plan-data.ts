import { demoCentro, demoRecordatoriosConfig } from '@/lib/centro/demo'
import { defaultHorariosCentro } from '@/lib/centro/horarios'
import type {
  CentroConfig,
  HorarioCentro,
  RecordatoriosConfig,
} from '@/lib/centro/types'
import { demoSalas } from '@/lib/salas/demo'
import { demoServicios } from '@/lib/servicios/demo'
import { hasFeature, type PlanId } from '@/lib/plans'
import { getServiceReservationDurationMinutes } from '@/lib/reservas/duration'
import type {
  EvolucionSesionListItem,
  FichaClinicaListItem,
} from '@/lib/fichas/types'
import type { PacienteListItem } from '@/lib/pacientes/types'
import type { ProfesionalListItem } from '@/lib/profesionales/types'
import type { SalaListItem } from '@/lib/salas/types'
import type { ServicioListItem } from '@/lib/servicios/types'
import type {
  ReservaListItem,
  ReservaPacienteOption,
  ReservaProfesionalOption,
  ReservaSalaOption,
  ReservaServicioOption,
} from '@/lib/reservas/types'
import type { EstadoAsistencia, EstadoReserva, RolCentro } from '@/lib/types/database'

export type DemoPlanDataset = {
  centro: CentroConfig
  horarios: HorarioCentro[]
  recordatorios: RecordatoriosConfig
  profesionales: ProfesionalListItem[]
  pacientes: PacienteListItem[]
  servicios: ServicioListItem[]
  salas: SalaListItem[]
  reservaProfesionales: ReservaProfesionalOption[]
  reservaPacientes: ReservaPacienteOption[]
  reservaServicios: ReservaServicioOption[]
  reservaSalas: ReservaSalaOption[]
  reservas: ReservaListItem[]
  fichas: FichaClinicaListItem[]
  evoluciones: EvolucionSesionListItem[]
}

type ProfessionalSeed = {
  nombre: string
  apellido?: string | null
  especialidad: string
  rol: RolCentro
  duracion: number
  intervalo: number
  descanso: number
}

const professionalSeeds: ProfessionalSeed[] = [
  {
    nombre: 'Camila',
    apellido: 'Rojas',
    especialidad: 'Psicologia clinica',
    rol: 'owner',
    duracion: 60,
    intervalo: 60,
    descanso: 15,
  },
  {
    nombre: 'Matias',
    apellido: 'Contreras',
    especialidad: 'Kinesiologia',
    rol: 'admin',
    duracion: 45,
    intervalo: 60,
    descanso: 10,
  },
  {
    nombre: 'Sofia',
    apellido: 'Araya',
    especialidad: 'Fonoaudiologia',
    rol: 'profesional',
    duracion: 60,
    intervalo: 60,
    descanso: 0,
  },
  {
    nombre: 'Ignacio',
    apellido: 'Mella',
    especialidad: 'Medicina general',
    rol: 'profesional',
    duracion: 30,
    intervalo: 30,
    descanso: 10,
  },
  {
    nombre: 'Paula',
    apellido: 'Vargas',
    especialidad: 'Terapia ocupacional',
    rol: 'profesional',
    duracion: 50,
    intervalo: 60,
    descanso: 10,
  },
  {
    nombre: 'Daniela',
    apellido: 'Fuentes',
    especialidad: 'Nutricion',
    rol: 'profesional',
    duracion: 45,
    intervalo: 45,
    descanso: 5,
  },
  {
    nombre: 'Felipe',
    apellido: 'Soto',
    especialidad: 'Psiquiatria',
    rol: 'profesional',
    duracion: 45,
    intervalo: 60,
    descanso: 15,
  },
  {
    nombre: 'Javiera',
    apellido: 'Pino',
    especialidad: 'Psicopedagogia',
    rol: 'profesional',
    duracion: 60,
    intervalo: 60,
    descanso: 10,
  },
  {
    nombre: 'Rodrigo',
    apellido: 'Silva',
    especialidad: 'Traumatologia',
    rol: 'profesional',
    duracion: 30,
    intervalo: 30,
    descanso: 5,
  },
  {
    nombre: 'Fernanda',
    apellido: 'Lagos',
    especialidad: 'Enfermeria',
    rol: 'profesional',
    duracion: 30,
    intervalo: 30,
    descanso: 0,
  },
  {
    nombre: 'Andres',
    apellido: 'Navarro',
    especialidad: 'Neurologia',
    rol: 'profesional',
    duracion: 40,
    intervalo: 45,
    descanso: 10,
  },
  {
    nombre: 'Valentina',
    apellido: 'Munoz',
    especialidad: 'Dermatologia',
    rol: 'profesional',
    duracion: 30,
    intervalo: 30,
    descanso: 5,
  },
  {
    nombre: 'Cristobal',
    apellido: 'Herrera',
    especialidad: 'Pediatria',
    rol: 'profesional',
    duracion: 30,
    intervalo: 30,
    descanso: 5,
  },
  {
    nombre: 'Maria Jose',
    apellido: 'Campos',
    especialidad: 'Geriatria',
    rol: 'profesional',
    duracion: 45,
    intervalo: 45,
    descanso: 10,
  },
  {
    nombre: 'Sebastian',
    apellido: 'Reyes',
    especialidad: 'Medicina familiar',
    rol: 'profesional',
    duracion: 30,
    intervalo: 30,
    descanso: 5,
  },
  {
    nombre: 'Constanza',
    apellido: 'Leiva',
    especialidad: 'Coordinacion clinica',
    rol: 'admin',
    duracion: 30,
    intervalo: 30,
    descanso: 0,
  },
  {
    nombre: 'Tomas',
    apellido: 'Aguilera',
    especialidad: 'Cardiologia',
    rol: 'profesional',
    duracion: 30,
    intervalo: 30,
    descanso: 5,
  },
  {
    nombre: 'Francisca',
    apellido: 'Tapia',
    especialidad: 'Matroneria',
    rol: 'profesional',
    duracion: 40,
    intervalo: 45,
    descanso: 5,
  },
]

const patientFirstNames = [
  'Antonia',
  'Rodrigo',
  'Javiera',
  'Benjamin',
  'Isidora',
  'Vicente',
  'Martina',
  'Diego',
  'Josefa',
  'Lucas',
  'Trinidad',
  'Agustin',
  'Florencia',
  'Emilia',
  'Gabriel',
  'Catalina',
]

const patientLastNames = [
  'Fuentes',
  'Mella',
  'Pino',
  'Gonzalez',
  'Vera',
  'Sanhueza',
  'Riquelme',
  'Morales',
  'Castillo',
  'Bravo',
  'Sepulveda',
  'Cortes',
]

const planSizes: Record<
  PlanId,
  { professionals: number; patients: number; reservations: number }
> = {
  individual: { professionals: 1, patients: 36, reservations: 6 },
  center: { professionals: 5, patients: 74, reservations: 13 },
  center_pro: { professionals: 11, patients: 132, reservations: 24 },
  enterprise: { professionals: 18, patients: 220, reservations: 42 },
}

const clinicalRecordCounts: Record<PlanId, number> = {
  individual: 2,
  center: 5,
  center_pro: 8,
  enterprise: 12,
}

const centerNames: Record<PlanId, string> = {
  individual: 'Consulta Agendix Demo',
  center: 'Centro Agendix Demo',
  center_pro: 'Centro Pro Agendix Demo',
  enterprise: 'Red Agendix Enterprise Demo',
}

function timestampFor(index: number) {
  const date = new Date('2026-01-08T10:00:00.000Z')
  date.setDate(date.getDate() - index)
  return date.toISOString()
}

function makeCentro(planId: PlanId): CentroConfig {
  return {
    ...demoCentro,
    id: `demo-${planId}-centro`,
    nombre: centerNames[planId],
    email: `${planId.replace('_', '-')}@agendix.demo`,
    updated_at: timestampFor(0),
  }
}

function makeHorarios(planId: PlanId): HorarioCentro[] {
  if (planId === 'individual') {
    return defaultHorariosCentro.map((horario) => ({
      ...horario,
      activo: horario.dia <= 5,
      inicio: '09:00',
      fin: '18:00',
      descanso_activo: false,
    }))
  }

  if (planId === 'center_pro') {
    return defaultHorariosCentro.map((horario) => ({
      ...horario,
      activo: horario.dia <= 6,
      inicio: '08:30',
      fin: '20:00',
      descanso_activo: horario.dia <= 5,
      descanso_inicio: '13:00',
      descanso_fin: '14:00',
    }))
  }

  if (planId === 'enterprise') {
    return defaultHorariosCentro.map((horario) => ({
      ...horario,
      activo: true,
      inicio: horario.dia === 7 ? '10:00' : '08:00',
      fin: horario.dia === 7 ? '15:00' : '21:00',
      descanso_activo: horario.dia <= 6,
      descanso_inicio: '13:30',
      descanso_fin: '14:30',
    }))
  }

  return defaultHorariosCentro
}

function makeRecordatorios(
  planId: PlanId,
  centro: CentroConfig
): RecordatoriosConfig {
  const hasOperationalTeam = hasFeature(planId, 'roles_permissions')
  const hasAdvancedOperations = hasFeature(planId, 'center_stats')

  return {
    ...demoRecordatoriosConfig,
    id: `demo-${planId}-recordatorios`,
    centro_id: centro.id,
    email_hours_before: hasAdvancedOperations ? 12 : 24,
    whatsapp_enabled: hasOperationalTeam,
    whatsapp_hours_before: hasAdvancedOperations ? 4 : 24,
    whatsapp_mode: planId === 'enterprise' ? 'live' : 'mock',
    email_subject_template: `Recordatorio de tu hora en ${centro.nombre}`,
    updated_at: timestampFor(0),
  }
}

function makeProfesionales(planId: PlanId): ProfesionalListItem[] {
  const count = planSizes[planId].professionals

  return professionalSeeds.slice(0, count).map((seed, index) => ({
    id: `demo-${planId}-miembro-${index + 1}`,
    profile_id: `demo-${planId}-profile-${index + 1}`,
    nombre: seed.nombre,
    apellido: seed.apellido ?? null,
    email: `${seed.nombre.toLowerCase().replaceAll(' ', '.')}.${
      seed.apellido?.toLowerCase() ?? 'demo'
    }@agendix.demo`,
    telefono: `+56 9 ${6100 + index} ${String(4500 + index).padStart(4, '0')}`,
    especialidad: seed.especialidad,
    avatar_url: null,
    descanso_entre_reservas_minutos: seed.descanso,
    duracion_sesion_minutos: seed.duracion,
    intervalo_reservas_minutos: seed.intervalo,
    recordatorio_email_subject: null,
    recordatorio_email_body: null,
    rol: seed.rol,
    activo: true,
    created_at: timestampFor(index),
    updated_at: timestampFor(index),
  }))
}

function birthDateFor(index: number) {
  const year = 1978 + (index % 28)
  const month = String((index % 12) + 1).padStart(2, '0')
  const day = String((index % 27) + 1).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function makePacientes(planId: PlanId): PacienteListItem[] {
  const count = planSizes[planId].patients
  const sharedContext = hasFeature(planId, 'shared_active_patients')
  const advancedContext = hasFeature(planId, 'advanced_patient_management')

  return Array.from({ length: count }, (_, index) => {
    const firstName = patientFirstNames[index % patientFirstNames.length]
    const lastName = patientLastNames[index % patientLastNames.length]
    const timestamp = timestampFor(index % 40)

    return {
      id: `demo-${planId}-paciente-${index + 1}`,
      nombre: firstName,
      apellido: lastName,
      rut:
        index % 4 === 0
          ? `${12 + (index % 9)}.${String(230000 + index).slice(0, 3)}.${String(
              540 + index
            ).padStart(3, '0')}-${index % 10}`
          : null,
      email: index % 5 === 0 ? null : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.cl`,
      telefono: `+56 9 ${5000 + (index % 500)} ${String(1000 + index).padStart(4, '0')}`,
      fecha_nacimiento: index % 6 === 0 ? null : birthDateFor(index),
      notas:
        index % 3 === 0
          ? advancedContext
            ? 'Seguimiento activo, segmento prioritario y ultima atencion registrada.'
            : sharedContext
              ? 'Paciente compartido entre profesionales del centro.'
              : 'Nota interna para seguimiento individual.'
          : null,
      activo: index % 17 !== 0,
      created_at: timestamp,
      updated_at: timestamp,
    }
  })
}

function makeReservaProfesionales(
  profesionales: ProfesionalListItem[]
): ReservaProfesionalOption[] {
  return profesionales
    .filter((profesional) => profesional.activo)
    .map((profesional) => ({
      id: profesional.profile_id,
      nombre: [profesional.nombre, profesional.apellido].filter(Boolean).join(' '),
      email: profesional.email,
      avatar_url: profesional.avatar_url,
      descanso_entre_reservas_minutos:
        profesional.descanso_entre_reservas_minutos,
      duracion_sesion_minutos: profesional.duracion_sesion_minutos,
      intervalo_reservas_minutos: profesional.intervalo_reservas_minutos,
    }))
}

function makeReservaPacientes(
  pacientes: PacienteListItem[]
): ReservaPacienteOption[] {
  return pacientes.map((paciente) => ({
    id: paciente.id,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    email: paciente.email,
    telefono: paciente.telefono,
  }))
}

function makeServicios(planId: PlanId): ServicioListItem[] {
  const canUseTelemedicine = hasFeature(planId, 'meeting_links')

  return demoServicios.map((servicio) => ({
    ...servicio,
    id: `${planId}-${servicio.id}`,
    activo:
      servicio.id === 'demo-servicio-3' ? canUseTelemedicine : servicio.activo,
  }))
}

function makeSalas(planId: PlanId): SalaListItem[] {
  const canUseTelemedicine = hasFeature(planId, 'meeting_links')

  return demoSalas.map((sala) => ({
    ...sala,
    id: `${planId}-${sala.id}`,
    activa: sala.id === 'demo-sala-3' ? canUseTelemedicine : sala.activa,
  }))
}

function makeReservaServicios(
  servicios: ServicioListItem[]
): ReservaServicioOption[] {
  return servicios
    .filter((servicio) => servicio.activo)
    .map((servicio) => ({
      id: servicio.id,
      nombre: servicio.nombre,
      duracion_minutos: servicio.duracion_minutos,
      precio: servicio.precio,
    }))
}

function makeReservaSalas(salas: SalaListItem[]): ReservaSalaOption[] {
  return salas
    .filter((sala) => sala.activa)
    .map((sala) => ({
      id: sala.id,
      nombre: sala.nombre,
    }))
}

function localIso(dayOffset: number, hour: number, minutes = 0) {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, minutes, 0, 0)

  return date.toISOString()
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

function statusFor(planId: PlanId, index: number): EstadoReserva {
  const basic: EstadoReserva[] = ['confirmed', 'pending', 'confirmed', 'completed']
  const center: EstadoReserva[] = [
    'confirmed',
    'pending',
    'confirmed',
    'completed',
    'cancelled',
  ]
  const advanced: EstadoReserva[] = [
    'confirmed',
    'completed',
    'pending',
    'no_show',
    'confirmed',
    'cancelled',
    'completed',
  ]

  if (planId === 'individual') return basic[index % basic.length]
  if (planId === 'center') return center[index % center.length]

  return advanced[index % advanced.length]
}

function asistenciaFor(status: EstadoReserva): EstadoAsistencia {
  if (status === 'completed') return 'asistio'
  if (status === 'no_show') return 'no_asistio'

  return 'sin_marcar'
}

function makeReservas({
  planId,
  profesionales,
  pacientes,
  servicios,
  salas,
}: {
  planId: PlanId
  profesionales: ReservaProfesionalOption[]
  pacientes: ReservaPacienteOption[]
  servicios: ReservaServicioOption[]
  salas: ReservaSalaOption[]
}): ReservaListItem[] {
  const count = planSizes[planId].reservations
  const canUseMeetingLinks = hasFeature(planId, 'meeting_links')

  return Array.from({ length: count }, (_, index) => {
    const profesional = profesionales[index % profesionales.length]
    const paciente = pacientes[index % pacientes.length]
    const serviceIndex =
      canUseMeetingLinks && index % 5 === 2
        ? Math.min(servicios.length - 1, 2)
        : index % servicios.length
    const servicio = servicios[serviceIndex]
    const sala =
      canUseMeetingLinks && index % 5 === 2
        ? salas[salas.length - 1]
        : salas[index % salas.length]
    const estado = statusFor(planId, index)
    const dayOffset = estado === 'completed' || estado === 'no_show' ? -1 - (index % 3) : Math.floor(index / 5)
    const hourBase = planId === 'individual' || planId === 'center' ? 9 : 8
    const hourSpread = planId === 'individual' ? 7 : planId === 'center' ? 8 : 10
    const hour = hourBase + (index % hourSpread)
    const minutes = index % 2 === 0 ? 0 : 30
    const start = localIso(dayOffset, hour, minutes)
    const duration = getServiceReservationDurationMinutes(
      servicio.duracion_minutos
    )
    const hasRemoteLink = canUseMeetingLinks && index % 5 === 2
    const provider = index % 2 === 0 ? 'google_meet' : 'zoom'

    return {
      id: `demo-${planId}-reserva-${index + 1}`,
      servicio,
      sala,
      profesional,
      paciente,
      fecha_inicio: start,
      fecha_fin: addMinutes(start, duration),
      estado,
      estado_asistencia: asistenciaFor(estado),
      notas: hasRemoteLink
        ? 'Atencion remota con enlace de reunion disponible.'
        : hasFeature(planId, 'shared_calendar')
          ? 'Reserva coordinada desde agenda compartida.'
          : 'Reserva personal de consulta individual.',
      meeting_provider: hasRemoteLink ? provider : null,
      meeting_url: hasRemoteLink
        ? provider === 'zoom'
          ? 'https://zoom.us/j/1234567890'
          : 'https://meet.google.com/agx-demo-pro'
        : null,
      auto_generated_meeting: planId === 'enterprise' && hasRemoteLink,
      created_at: start,
      updated_at: start,
    }
  })
}

function makeFichas(
  planId: PlanId,
  pacientes: PacienteListItem[],
  centro: CentroConfig
): FichaClinicaListItem[] {
  const advancedContext = hasFeature(planId, 'advanced_patient_management')
  const count = clinicalRecordCounts[planId]

  return pacientes.slice(0, count).map((paciente, index) => {
    const timestamp = timestampFor(index)

    return {
      id: `demo-${planId}-ficha-${index + 1}`,
      centro_id: centro.id,
      paciente_id: paciente.id,
      antecedentes_relevantes:
        index % 2 === 0
          ? 'Antecedentes familiares y objetivos de seguimiento registrados.'
          : 'Sin antecedentes críticos informados en admisión.',
      motivo_consulta:
        index % 3 === 0
          ? 'Consulta inicial y planificación de tratamiento.'
          : 'Seguimiento clínico y ajuste de indicaciones.',
      diagnostico_hipotesis: advancedContext
        ? 'Hipótesis clínica en seguimiento con prioridad y segmentación.'
        : 'Hipótesis clínica inicial pendiente de evolución.',
      notas_clinicas: hasFeature(planId, 'shared_active_patients')
        ? 'Ficha visible para el equipo clínico autorizado del centro.'
        : 'Ficha de seguimiento individual.',
      documentos: null,
      created_at: timestamp,
      updated_at: timestamp,
    }
  })
}

function makeEvoluciones(
  planId: PlanId,
  fichas: FichaClinicaListItem[],
  reservas: ReservaListItem[],
  centro: CentroConfig
): EvolucionSesionListItem[] {
  const fichaPatientIds = new Set(fichas.map((ficha) => ficha.paciente_id))
  const reservasConFicha = reservas.filter(
    (reserva) =>
      fichaPatientIds.has(reserva.paciente.id) && reserva.estado !== 'cancelled'
  )

  return reservasConFicha.slice(0, fichas.length).map((reserva, index) => {
    const timestamp = timestampFor(index)

    return {
      id: `demo-${planId}-evolucion-${index + 1}`,
      paciente_id: reserva.paciente.id,
      reserva_id: reserva.id,
      profesional_id: reserva.profesional.id,
      centro_id: centro.id,
      fecha: reserva.fecha_inicio,
      texto_evolucion: hasFeature(planId, 'center_stats')
        ? 'Sesión registrada con objetivos, asistencia y coordinación de equipo.'
        : 'Evolución de ejemplo asociada a la atención demo.',
      proximos_pasos:
        index % 2 === 0
          ? 'Mantener seguimiento y revisar avances en próxima sesión.'
          : null,
      observaciones_privadas: hasFeature(planId, 'roles_permissions')
        ? 'Nota interna visible solo para roles clínicos autorizados.'
        : null,
      created_at: timestamp,
      updated_at: timestamp,
    }
  })
}

export function getDemoPlanDataset(planId: PlanId): DemoPlanDataset {
  const centro = makeCentro(planId)
  const horarios = makeHorarios(planId)
  const recordatorios = makeRecordatorios(planId, centro)
  const profesionales = makeProfesionales(planId)
  const pacientes = makePacientes(planId)
  const servicios = makeServicios(planId)
  const salas = makeSalas(planId)
  const reservaProfesionales = makeReservaProfesionales(profesionales)
  const reservaPacientes = makeReservaPacientes(pacientes)
  const reservaServicios = makeReservaServicios(servicios)
  const reservaSalas = makeReservaSalas(salas)
  const reservas = makeReservas({
    planId,
    profesionales: reservaProfesionales,
    pacientes: reservaPacientes,
    servicios: reservaServicios,
    salas: reservaSalas,
  })
  const fichas = makeFichas(planId, pacientes, centro)
  const evoluciones = makeEvoluciones(planId, fichas, reservas, centro)

  return {
    centro,
    horarios,
    recordatorios,
    profesionales,
    pacientes,
    servicios,
    salas,
    reservaProfesionales,
    reservaPacientes,
    reservaServicios,
    reservaSalas,
    reservas,
    fichas,
    evoluciones,
  }
}
