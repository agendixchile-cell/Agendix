export const planIds = ['individual', 'center', 'center_pro', 'enterprise'] as const

export type PlanId = (typeof planIds)[number]
export type PlanCtaKind = 'self_service' | 'sales'

export type FeatureKey =
  | 'basic_stats'
  | 'advanced_calendar'
  | 'internal_notes'
  | 'shared_calendar'
  | 'multi_agenda'
  | 'roles_permissions'
  | 'admin_panel'
  | 'shared_active_patients'
  | 'center_stats'
  | 'attendance_control'
  | 'advanced_patient_management'
  | 'meeting_links'
  | 'integrated_telemedicine'
  | 'automatic_meeting_links'
  | 'clinical_team_meetings'
  | 'custom_training'
  | 'future_integrations'

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'pending'

type ProfessionalExtraConfig = {
  priceMonthlyClp: number
  enabled: boolean
  label: string
}

export type PlanDefinition = {
  id: PlanId
  slug: string
  commercialName: string
  shortName: string
  audience: string
  audienceTag: string
  description: string
  monthlyPriceClp: number
  ctaLabel: string
  ctaKind: PlanCtaKind
  highlighted?: boolean
  highlightLabel?: string
  professionalRangeLabel: string
  minProfessionals: number
  maxProfessionals: number | null
  maxActivePatients: number | null
  features: FeatureKey[]
  summaryBenefits: string[]
  comparison: Record<FeatureKey, boolean>
  extras: {
    professionals?: ProfessionalExtraConfig
  }
}

export type PlanUsageContext = {
  planId: PlanId
  plan: PlanDefinition
  status: SubscriptionStatus
  extraProfessionalsCount: number
  usage: {
    professionals: number
    activePatients: number
    upcomingReservations: number
  }
}

const includedFromIndividual: FeatureKey[] = [
  'basic_stats',
  'advanced_calendar',
  'internal_notes',
]

const includedFromCenter: FeatureKey[] = [
  ...includedFromIndividual,
  'shared_calendar',
  'multi_agenda',
  'roles_permissions',
  'admin_panel',
  'shared_active_patients',
]

const includedFromCenterPro: FeatureKey[] = [
  ...includedFromCenter,
  'center_stats',
  'attendance_control',
  'advanced_patient_management',
  'meeting_links',
]

const includedFromEnterprise: FeatureKey[] = [
  ...includedFromCenterPro,
  'integrated_telemedicine',
  'automatic_meeting_links',
  'clinical_team_meetings',
  'custom_training',
  'future_integrations',
]

const allFeatures: FeatureKey[] = [
  'basic_stats',
  'advanced_calendar',
  'internal_notes',
  'shared_calendar',
  'multi_agenda',
  'roles_permissions',
  'admin_panel',
  'shared_active_patients',
  'center_stats',
  'attendance_control',
  'advanced_patient_management',
  'meeting_links',
  'integrated_telemedicine',
  'automatic_meeting_links',
  'clinical_team_meetings',
  'custom_training',
  'future_integrations',
]

function comparison(features: FeatureKey[]): Record<FeatureKey, boolean> {
  const included = new Set(features)

  return Object.fromEntries(
    allFeatures.map((feature) => [feature, included.has(feature)])
  ) as Record<FeatureKey, boolean>
}

export const subscriptionPlans: Record<PlanId, PlanDefinition> = {
  individual: {
    id: 'individual',
    slug: 'agendix-individual',
    commercialName: 'Agendix Individual',
    shortName: 'Individual',
    audience: 'Para profesionales independientes',
    audienceTag: 'Para independientes',
    description:
      'Agenda profesional, pacientes activos y notas internas para operar una consulta individual con claridad.',
    monthlyPriceClp: 15990,
    ctaLabel: 'Comenzar',
    ctaKind: 'self_service',
    professionalRangeLabel: '1 profesional',
    minProfessionals: 1,
    maxProfessionals: 1,
    maxActivePatients: 50,
    features: includedFromIndividual,
    summaryBenefits: [
      '1 profesional',
      'Hasta 50 pacientes activos',
      'Estadísticas básicas',
      'Organización avanzada de agenda',
      'Notas internas',
    ],
    comparison: comparison(includedFromIndividual),
    extras: {},
  },
  center: {
    id: 'center',
    slug: 'agendix-center',
    commercialName: 'Agendix Center',
    shortName: 'Center',
    audience: 'Ideal para centros pequeños',
    audienceTag: 'Centros pequeños',
    description:
      'Agenda compartida, panel administrativo y roles para coordinar un equipo pequeño sin perder control operativo.',
    monthlyPriceClp: 49990,
    ctaLabel: 'Elegir plan',
    ctaKind: 'self_service',
    highlightLabel: 'Más popular',
    professionalRangeLabel: '2 a 5 profesionales',
    minProfessionals: 2,
    maxProfessionals: 5,
    maxActivePatients: null,
    features: includedFromCenter,
    summaryBenefits: [
      '2 a 5 profesionales',
      'Agenda compartida',
      'Gestión de múltiples agendas',
      'Roles y permisos',
      'Panel administrativo',
      'Pacientes activos compartidos',
    ],
    comparison: comparison(includedFromCenter),
    extras: {
      professionals: {
        priceMonthlyClp: 2990,
        enabled: true,
        label: 'Profesional extra',
      },
    },
  },
  center_pro: {
    id: 'center_pro',
    slug: 'agendix-center-pro',
    commercialName: 'Agendix Center Pro',
    shortName: 'Center Pro',
    audience: 'Para centros medianos en crecimiento',
    audienceTag: 'Centros en crecimiento',
    description:
      'Métricas del centro, asistencia, gestión avanzada de pacientes y enlaces Meet o Zoom para centros que escalan.',
    monthlyPriceClp: 69990,
    ctaLabel: 'Elegir plan',
    ctaKind: 'self_service',
    highlighted: true,
    highlightLabel: 'Recomendado',
    professionalRangeLabel: '6 a 15 profesionales',
    minProfessionals: 6,
    maxProfessionals: 15,
    maxActivePatients: null,
    features: includedFromCenterPro,
    summaryBenefits: [
      '6 a 15 profesionales',
      'Todo lo incluido en planes anteriores',
      'Estadísticas del centro',
      'Control de asistencia',
      'Gestión avanzada de pacientes',
      'Enlace Zoom o Google Meet',
    ],
    comparison: comparison(includedFromCenterPro),
    extras: {
      professionals: {
        priceMonthlyClp: 2990,
        enabled: true,
        label: 'Profesional extra',
      },
    },
  },
  enterprise: {
    id: 'enterprise',
    slug: 'agendix-enterprise',
    commercialName: 'Agendix Enterprise',
    shortName: 'Enterprise',
    audience: 'Para clínicas y equipos grandes',
    audienceTag: 'Clínicas y equipos grandes',
    description:
      'Solución completa para gestión clínica, coordinación multidisciplinaria e integraciones avanzadas.',
    monthlyPriceClp: 119990,
    ctaLabel: 'Solicitar demo',
    ctaKind: 'sales',
    professionalRangeLabel: 'Profesionales ilimitados',
    minProfessionals: 16,
    maxProfessionals: null,
    maxActivePatients: null,
    features: includedFromEnterprise,
    summaryBenefits: [
      'Profesionales ilimitados',
      'Todo Agendix Center Pro',
      'Telemedicina integrada',
      'Enlaces automáticos de Zoom o Google Meet',
      'Reuniones clínicas de equipo',
      'Capacitación personalizada',
      'Funciones avanzadas e integraciones futuras',
    ],
    comparison: comparison(includedFromEnterprise),
    extras: {},
  },
}

export const featureLabels: Record<FeatureKey, string> = {
  basic_stats: 'Estadísticas básicas',
  advanced_calendar: 'Organización avanzada de agenda',
  internal_notes: 'Notas internas',
  shared_calendar: 'Agenda compartida',
  multi_agenda: 'Gestión de múltiples agendas',
  roles_permissions: 'Roles y permisos',
  admin_panel: 'Panel administrativo',
  shared_active_patients: 'Pacientes activos compartidos',
  center_stats: 'Estadísticas del centro',
  attendance_control: 'Control de asistencia',
  advanced_patient_management: 'Gestión avanzada de pacientes',
  meeting_links: 'Enlaces Meet o Zoom',
  integrated_telemedicine: 'Telemedicina integrada',
  automatic_meeting_links: 'Enlaces automáticos',
  clinical_team_meetings: 'Reuniones clínicas',
  custom_training: 'Capacitación personalizada',
  future_integrations: 'Funciones avanzadas e integraciones futuras',
}

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  trial: 'Trial',
  active: 'Activa',
  cancelled: 'Cancelada',
  past_due: 'Pago pendiente',
  pending: 'Pendiente',
}

export function isPlanId(value: string | null | undefined): value is PlanId {
  return Boolean(value && planIds.includes(value as PlanId))
}

export function normalizePlanId(value: string | null | undefined): PlanId {
  return isPlanId(value) ? value : 'individual'
}

export function getPlan(planId: string | null | undefined): PlanDefinition {
  return subscriptionPlans[normalizePlanId(planId)]
}

export function getPlanIndex(planId: PlanId): number {
  return planIds.indexOf(planId)
}

export function hasFeature(
  planId: string | null | undefined,
  feature: FeatureKey
): boolean {
  return getPlan(planId).comparison[feature]
}

export function getProfessionalLimit(
  planId: string | null | undefined,
  extraProfessionalsCount = 0
): number | null {
  const baseLimit = getPlan(planId).maxProfessionals

  if (baseLimit === null) return null

  return baseLimit + Math.max(0, extraProfessionalsCount)
}

export function getPatientLimit(planId: string | null | undefined): number | null {
  return getPlan(planId).maxActivePatients
}

export function canAddProfessional({
  planId,
  currentCount,
  extraProfessionalsCount = 0,
  requested = 1,
}: {
  planId: string | null | undefined
  currentCount: number
  extraProfessionalsCount?: number
  requested?: number
}) {
  const plan = getPlan(planId)
  const limit = getProfessionalLimit(plan.id, extraProfessionalsCount)
  const nextCount = currentCount + requested

  return {
    allowed: limit === null || nextCount <= limit,
    limit,
    nextCount,
    plan,
    extrasEnabled: Boolean(plan.extras.professionals?.enabled),
  }
}

export function canCreateActivePatient({
  planId,
  currentActivePatients,
  requested = 1,
}: {
  planId: string | null | undefined
  currentActivePatients: number
  requested?: number
}) {
  const plan = getPlan(planId)
  const limit = getPatientLimit(plan.id)
  const nextCount = currentActivePatients + requested

  return {
    allowed: limit === null || nextCount <= limit,
    limit,
    nextCount,
    plan,
  }
}

export function formatPlanPrice(price: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price)
}

export function getMinimumPlanForFeature(feature: FeatureKey): PlanDefinition {
  return subscriptionPlans[
    planIds.find((planId) => hasFeature(planId, feature)) ?? 'enterprise'
  ]
}

export function getNextPlan(planId: string | null | undefined): PlanDefinition {
  const currentIndex = getPlanIndex(normalizePlanId(planId))
  const nextPlanId = planIds[Math.min(currentIndex + 1, planIds.length - 1)]

  return subscriptionPlans[nextPlanId]
}

export function getFeatureUpgradeText(
  planId: string | null | undefined,
  feature: FeatureKey
): string {
  const minimumPlan = getMinimumPlanForFeature(feature)

  if (getPlanIndex(normalizePlanId(planId)) >= getPlanIndex(minimumPlan.id)) {
    return `${featureLabels[feature]} ya está incluido en tu plan.`
  }

  return `${featureLabels[feature]} está disponible desde ${minimumPlan.commercialName}.`
}

export function professionalLimitLabel(
  planId: string | null | undefined,
  extraProfessionalsCount = 0
): string {
  const limit = getProfessionalLimit(planId, extraProfessionalsCount)

  return limit === null ? 'Ilimitados' : `${limit}`
}

export function patientLimitLabel(planId: string | null | undefined): string {
  const limit = getPatientLimit(planId)

  return limit === null ? 'Ilimitados' : `${limit}`
}
