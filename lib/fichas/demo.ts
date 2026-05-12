import { demoCentro } from '@/lib/centro/demo'
import { demoPacientes } from '@/lib/pacientes/demo'
import { demoProfesionales } from '@/lib/profesionales/demo'
import { demoReservas } from '@/lib/reservas/demo'
import type { EvolucionSesionListItem, FichaClinicaListItem } from './types'

const timestamp = new Date().toISOString()
const firstPaciente = demoPacientes[0]
const firstProfesional = demoProfesionales[0]
const firstReserva = demoReservas[0]

export const demoFichasClinicas: FichaClinicaListItem[] = firstPaciente
  ? [
      {
        id: 'demo-ficha-1',
        centro_id: demoCentro.id,
        paciente_id: firstPaciente.id,
        antecedentes_relevantes:
          'Antecedentes relevantes de ejemplo para validar la ficha clínica simple.',
        motivo_consulta: 'Consulta inicial y evaluación de necesidades actuales.',
        diagnostico_hipotesis: 'Hipótesis clínica inicial pendiente de seguimiento.',
        notas_clinicas: 'Notas generales visibles solo para roles clínicos.',
        documentos: null,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ]
  : []

export const demoEvolucionesSesion: EvolucionSesionListItem[] =
  firstPaciente && firstProfesional && firstReserva
    ? [
        {
          id: 'demo-evolucion-1',
          paciente_id: firstPaciente.id,
          reserva_id: firstReserva.id,
          profesional_id: firstProfesional.profile_id,
          centro_id: demoCentro.id,
          fecha: firstReserva.fecha_inicio,
          texto_evolucion: 'Evolución de ejemplo asociada a la primera cita demo.',
          proximos_pasos: 'Mantener seguimiento y revisar objetivos en próxima sesión.',
          observaciones_privadas: null,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ]
    : []
