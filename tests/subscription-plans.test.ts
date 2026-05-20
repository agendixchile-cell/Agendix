import { describe, expect, it } from 'vitest'
import {
  canAddProfessional,
  canCreateActivePatient,
  getPatientLimit,
  getProfessionalLimit,
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
