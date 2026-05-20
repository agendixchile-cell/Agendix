import { demoPacientes } from '@/lib/pacientes/demo'
import { demoProfesionales } from '@/lib/profesionales/demo'
import { demoSalas } from '@/lib/salas/demo'
import { demoServicios } from '@/lib/servicios/demo'
import type {
  ReservaListItem,
  ReservaPacienteOption,
  ReservaProfesionalOption,
  ReservaSalaOption,
  ReservaServicioOption,
} from './types'

export const demoReservaServicios: ReservaServicioOption[] = demoServicios
  .filter((servicio) => servicio.activo)
  .map((servicio) => ({
    id: servicio.id,
    nombre: servicio.nombre,
    duracion_minutos: servicio.duracion_minutos,
    precio: servicio.precio,
  }))

export const demoReservaSalas: ReservaSalaOption[] = demoSalas
  .filter((sala) => sala.activa)
  .map((sala) => ({
    id: sala.id,
    nombre: sala.nombre,
  }))

export const demoReservaProfesionales: ReservaProfesionalOption[] =
  demoProfesionales
    .filter((profesional) => profesional.activo)
    .map((profesional) => ({
      id: profesional.profile_id,
      nombre: profesional.nombre,
      email: profesional.email,
      descanso_entre_reservas_minutos:
        profesional.descanso_entre_reservas_minutos,
      duracion_sesion_minutos: profesional.duracion_sesion_minutos,
      intervalo_reservas_minutos: profesional.intervalo_reservas_minutos,
    }))

export const demoReservaPacientes: ReservaPacienteOption[] = demoPacientes.map(
  (paciente) => ({
    id: paciente.id,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    email: paciente.email,
    telefono: paciente.telefono,
  })
)

function localIsoForToday(hour: number, minutes = 0) {
  const date = new Date()
  date.setHours(hour, minutes, 0, 0)
  return date.toISOString()
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

const firstService = demoReservaServicios[0]
const secondService = demoReservaServicios[1] ?? firstService
const firstSala = demoReservaSalas[0]
const secondSala = demoReservaSalas[1] ?? firstSala
const firstProfesional = demoReservaProfesionales[0]
const secondProfesional = demoReservaProfesionales[1] ?? firstProfesional
const todayMorning = localIsoForToday(10, 0)
const todayAfternoon = localIsoForToday(15, 30)

export const demoReservas: ReservaListItem[] =
  firstService && firstSala && firstProfesional
    ? [
        {
          id: 'demo-reserva-1',
          servicio: firstService,
          sala: firstSala,
          profesional: firstProfesional,
          paciente: demoReservaPacientes[0],
          fecha_inicio: todayMorning,
          fecha_fin: addMinutes(
            todayMorning,
            firstProfesional.duracion_sesion_minutos ??
              firstService.duracion_minutos
          ),
          estado: 'confirmed',
          estado_asistencia: 'sin_marcar',
          notas: 'Primera sesión agendada desde demo.',
          meeting_provider: null,
          meeting_url: null,
          auto_generated_meeting: false,
          created_at: todayMorning,
          updated_at: todayMorning,
        },
        {
          id: 'demo-reserva-2',
          servicio: secondService,
          sala: secondSala,
          profesional: secondProfesional,
          paciente: demoReservaPacientes[1],
          fecha_inicio: todayAfternoon,
          fecha_fin: addMinutes(
            todayAfternoon,
            secondProfesional.duracion_sesion_minutos ??
              secondService.duracion_minutos
          ),
          estado: 'pending',
          estado_asistencia: 'sin_marcar',
          notas: null,
          meeting_provider: null,
          meeting_url: null,
          auto_generated_meeting: false,
          created_at: todayAfternoon,
          updated_at: todayAfternoon,
        },
      ]
    : []
