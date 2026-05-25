import { describe, expect, it } from 'vitest'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import {
  getDemoStorageKey,
  getLegacyDemoStorageKeys,
} from '@/lib/demo-storage'
import {
  canAddProfessional,
  canCreateActivePatient,
  featureDefinitions,
  getPatientLimit,
  getProfessionalLimit,
  getFeatureUpgradeText,
  hasFeature,
  planIds,
  subscriptionPlans,
} from '@/lib/plans'
import { detectMeetingProvider, toMeetingPayload } from '@/lib/meetings'

describe('subscription plans', () => {
  it('exposes the four commercial Agendix plans with their core limits', () => {
    expect(planIds).toEqual([
      'individual',
      'center',
      'center_pro',
      'enterprise',
    ])
    expect(Object.values(subscriptionPlans).map((plan) => plan.id)).toEqual(planIds)
    expect(getProfessionalLimit('individual')).toBe(1)
    expect(getProfessionalLimit('center')).toBe(5)
    expect(getProfessionalLimit('center_pro')).toBe(15)
    expect(getProfessionalLimit('enterprise')).toBeNull()
    expect(getPatientLimit('individual')).toBe(50)
    expect(getPatientLimit('center')).toBeNull()
  })

  it('keeps professional and patient capacity decisions centralized', () => {
    expect(
      canAddProfessional({ planId: 'individual', currentCount: 1 })
    ).toMatchObject({ allowed: false, limit: 1, nextCount: 2 })

    expect(
      canAddProfessional({
        planId: 'center',
        currentCount: 5,
        extraProfessionalsCount: 2,
      })
    ).toMatchObject({ allowed: true, limit: 7, nextCount: 6 })

    expect(
      canCreateActivePatient({
        planId: 'individual',
        currentActivePatients: 50,
      })
    ).toMatchObject({ allowed: false, limit: 50, nextCount: 51 })
  })

  it('gates team and telemedicine features by plan', () => {
    expect(hasFeature('individual', 'shared_calendar')).toBe(false)
    expect(hasFeature('center', 'shared_calendar')).toBe(true)
    expect(hasFeature('center', 'center_stats')).toBe(false)
    expect(hasFeature('center_pro', 'meeting_links')).toBe(true)
    expect(hasFeature('enterprise', 'automatic_meeting_links')).toBe(true)
  })

  it('exposes user-facing feature metadata for upgrade messaging', () => {
    expect(featureDefinitions.center_stats).toMatchObject({
      label: 'Métricas de asistencia, ocupación y carga del equipo',
      minimumPlan: 'center_pro',
      status: 'available',
      enforcement: 'visual',
    })
    expect(featureDefinitions.automatic_meeting_links).toMatchObject({
      minimumPlan: 'enterprise',
      status: 'sales_only',
      enforcement: 'preview',
    })
    expect(getFeatureUpgradeText('center', 'meeting_links')).toBe(
      'Los links manuales de Meet/Zoom están disponibles desde Agendix Center Pro.'
    )
  })
})

describe('demo plan data', () => {
  it('builds plan-scoped storage keys from a central helper', () => {
    expect(getDemoStorageKey('center_pro', 'servicios')).toBe(
      'agendix-demo-center_pro-servicios'
    )
    expect(getDemoStorageKey('enterprise', 'horarios-centro')).toBe(
      'agendix-demo-enterprise-horarios-centro'
    )
    expect(getLegacyDemoStorageKeys('center', 'servicios')).toEqual([
      'agendix-demo-servicios:center',
      'agendix-demo-servicios',
    ])
  })

  it('keeps services and rooms aligned with reservation options by plan', () => {
    const individual = getDemoPlanDataset('individual')
    const pro = getDemoPlanDataset('center_pro')

    expect(individual.servicios.map((servicio) => servicio.id)).toContain(
      'individual-demo-servicio-3'
    )
    expect(individual.reservaServicios.map((servicio) => servicio.id)).not.toContain(
      'individual-demo-servicio-3'
    )
    expect(pro.reservaServicios.map((servicio) => servicio.id)).toContain(
      'center_pro-demo-servicio-3'
    )
    expect(pro.salas.find((sala) => sala.id === 'center_pro-demo-sala-3')).toMatchObject({
      activa: true,
    })
  })

  it('keeps center configuration, schedules and reminders plan-aware', () => {
    const individual = getDemoPlanDataset('individual')
    const enterprise = getDemoPlanDataset('enterprise')

    expect(individual.centro.id).toBe('demo-individual-centro')
    expect(enterprise.centro.id).toBe('demo-enterprise-centro')
    expect(individual.horarios.filter((horario) => horario.activo)).toHaveLength(5)
    expect(enterprise.horarios.filter((horario) => horario.activo)).toHaveLength(7)
    expect(individual.recordatorios.whatsapp_enabled).toBe(false)
    expect(enterprise.recordatorios.whatsapp_enabled).toBe(true)
    expect(enterprise.recordatorios.centro_id).toBe(enterprise.centro.id)
  })

  it('keeps clinical records tied to the active plan patients and reservations', () => {
    const enterprise = getDemoPlanDataset('enterprise')
    const patientIds = new Set(enterprise.pacientes.map((paciente) => paciente.id))
    const reservationIds = new Set(
      enterprise.reservas.map((reserva) => reserva.id)
    )

    expect(enterprise.fichas.length).toBeGreaterThan(0)
    expect(enterprise.fichas.every((ficha) => ficha.centro_id === enterprise.centro.id))
      .toBe(true)
    expect(enterprise.fichas.every((ficha) => patientIds.has(ficha.paciente_id)))
      .toBe(true)
    expect(
      enterprise.evoluciones.every(
        (evolucion) =>
          patientIds.has(evolucion.paciente_id) &&
          reservationIds.has(evolucion.reserva_id)
      )
    ).toBe(true)
  })
})

describe('meeting links', () => {
  it('detects supported manual meeting providers', () => {
    expect(detectMeetingProvider('https://zoom.us/j/123456789')).toBe('zoom')
    expect(detectMeetingProvider('https://meet.google.com/abc-defg-hij')).toBe(
      'google_meet'
    )
    expect(detectMeetingProvider('https://example.com/room')).toBeNull()
  })

  it('normalizes empty meeting links into a null payload', () => {
    expect(toMeetingPayload('')).toEqual({
      meeting_provider: null,
      meeting_url: null,
      auto_generated_meeting: false,
    })
  })
})
