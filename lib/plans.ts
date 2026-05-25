export const planIds = ['individual', 'center', 'center_pro', 'enterprise'] as const

export type PlanId = (typeof planIds)[number]
export type PlanCtaKind = 'self_service' | 'sales'
export type FeatureStatus = 'available' | 'preview' | 'coming_soon' | 'sales_only'
export type FeatureEnforcement = 'functional' | 'visual' | 'preview'

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

export type FeatureDefinition = {
  key: FeatureKey
  label: string
  description: string
  minimumPlan: PlanId
  status: FeatureStatus
  upgradeBenefit: string
  enforcement: FeatureEnforcement
}

export type PlanDefinition = {
  id: PlanId
  slug: string
  commercialName: string
  shortName: string
  audience: string
  audienceTag: string
  description: string
  positioning: string
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

export const featureDefinitions: Record<FeatureKey, FeatureDefinition> = {
  basic_stats: {
    key: 'basic_stats',
    label: 'Resumen básico de consulta',
    description: 'Indicadores simples de agenda, pacientes y actividad personal.',
    minimumPlan: 'individual',
    status: 'available',
    upgradeBenefit:
      'Mantén una lectura básica de tu consulta sin sumar herramientas de centro.',
    enforcement: 'preview',
  },
  advanced_calendar: {
    key: 'advanced_calendar',
    label: 'Agenda ordenada para tu operación diaria',
    description: 'Reservas, estados, disponibilidad y bloqueos para ordenar el día.',
    minimumPlan: 'individual',
    status: 'available',
    upgradeBenefit: 'Ordena tu consulta con una agenda clara desde Individual.',
    enforcement: 'functional',
  },
  internal_notes: {
    key: 'internal_notes',
    label: 'Notas internas de pacientes',
    description: 'Contexto clínico y operativo guardado junto a cada paciente.',
    minimumPlan: 'individual',
    status: 'available',
    upgradeBenefit: 'Registra notas internas sin depender de planillas o chats.',
    enforcement: 'functional',
  },
  shared_calendar: {
    key: 'shared_calendar',
    label: 'Agenda compartida del equipo',
    description: 'Coordina reservas de varios profesionales en una sola vista.',
    minimumPlan: 'center',
    status: 'available',
    upgradeBenefit:
      'Coordina múltiples profesionales y evita choques de agenda con Center.',
    enforcement: 'visual',
  },
  multi_agenda: {
    key: 'multi_agenda',
    label: 'Múltiples agendas profesionales',
    description: 'Cada profesional mantiene su disponibilidad dentro del centro.',
    minimumPlan: 'center',
    status: 'available',
    upgradeBenefit:
      'Gestiona varias agendas profesionales desde un mismo centro con Center.',
    enforcement: 'functional',
  },
  roles_permissions: {
    key: 'roles_permissions',
    label: 'Accesos separados por rol',
    description: 'Administrador, recepción y profesionales trabajan con permisos diferenciados.',
    minimumPlan: 'center',
    status: 'available',
    upgradeBenefit:
      'Ordena quién puede gestionar equipo, reservas y configuración con Center.',
    enforcement: 'functional',
  },
  admin_panel: {
    key: 'admin_panel',
    label: 'Panel para equipo, servicios, salas y configuración del centro',
    description: 'Un lugar para revisar capacidad, equipo y estado operativo del centro.',
    minimumPlan: 'center',
    status: 'available',
    upgradeBenefit:
      'Desbloquea el panel de coordinación del centro con Agendix Center.',
    enforcement: 'visual',
  },
  shared_active_patients: {
    key: 'shared_active_patients',
    label: 'Base de pacientes compartida para todo el equipo',
    description: 'El equipo autorizado trabaja sobre una misma base de pacientes.',
    minimumPlan: 'center',
    status: 'available',
    upgradeBenefit:
      'Comparte pacientes entre profesionales y recepción con Agendix Center.',
    enforcement: 'functional',
  },
  center_stats: {
    key: 'center_stats',
    label: 'Métricas de asistencia, ocupación y carga del equipo',
    description: 'Indicadores para entender asistencia, no-show, volumen y carga por profesional.',
    minimumPlan: 'center_pro',
    status: 'available',
    upgradeBenefit:
      'Desbloquea métricas de asistencia, ocupación y carga del equipo con Center Pro.',
    enforcement: 'visual',
  },
  attendance_control: {
    key: 'attendance_control',
    label: 'Registro de asistió/no asistió por reserva',
    description: 'Marca reservas completadas o no asistidas para medir cumplimiento.',
    minimumPlan: 'center_pro',
    status: 'available',
    upgradeBenefit:
      'Mide asistencia y no-show del centro con Agendix Center Pro.',
    enforcement: 'visual',
  },
  advanced_patient_management: {
    key: 'advanced_patient_management',
    label: 'Historial operativo y seguimiento del paciente',
    description: 'Preview de segmentación, historial visible y asignación profesional.',
    minimumPlan: 'center_pro',
    status: 'preview',
    upgradeBenefit:
      'Activa historial operativo, segmentación y seguimiento del paciente con Center Pro.',
    enforcement: 'preview',
  },
  meeting_links: {
    key: 'meeting_links',
    label: 'Links manuales de Meet/Zoom en reservas',
    description: 'Guarda links de videollamada dentro de cada reserva.',
    minimumPlan: 'center_pro',
    status: 'available',
    upgradeBenefit:
      'Los links manuales de Meet/Zoom están disponibles desde Agendix Center Pro.',
    enforcement: 'functional',
  },
  integrated_telemedicine: {
    key: 'integrated_telemedicine',
    label: 'Telemedicina bajo implementación Enterprise',
    description: 'Flujos de atención remota definidos según alcance de la clínica.',
    minimumPlan: 'enterprise',
    status: 'sales_only',
    upgradeBenefit:
      'Enterprise permite evaluar atención remota e integraciones bajo implementación a medida.',
    enforcement: 'preview',
  },
  automatic_meeting_links: {
    key: 'automatic_meeting_links',
    label: 'Generación automática de links bajo implementación',
    description: 'Automatización de links Meet/Zoom según integración aprobada.',
    minimumPlan: 'enterprise',
    status: 'sales_only',
    upgradeBenefit:
      'Enterprise puede incluir generación automática de links según alcance técnico.',
    enforcement: 'preview',
  },
  clinical_team_meetings: {
    key: 'clinical_team_meetings',
    label: 'Reuniones clínicas de equipo bajo alcance Enterprise',
    description: 'Coordinación clínica avanzada definida junto al equipo Agendix.',
    minimumPlan: 'enterprise',
    status: 'sales_only',
    upgradeBenefit:
      'Enterprise es una solución a medida para clínicas que requieren coordinación e implementación guiada.',
    enforcement: 'preview',
  },
  custom_training: {
    key: 'custom_training',
    label: 'Capacitación y acompañamiento personalizado',
    description: 'Onboarding y soporte de adopción definidos con la clínica.',
    minimumPlan: 'enterprise',
    status: 'sales_only',
    upgradeBenefit:
      'Enterprise suma acompañamiento para equipos grandes y operación clínica compleja.',
    enforcement: 'preview',
  },
  future_integrations: {
    key: 'future_integrations',
    label: 'Integraciones según alcance',
    description: 'Integraciones futuras o específicas evaluadas caso a caso.',
    minimumPlan: 'enterprise',
    status: 'sales_only',
    upgradeBenefit:
      'Enterprise permite revisar integraciones y requerimientos especiales con ventas.',
    enforcement: 'preview',
  },
}

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
      'Para ordenar mi consulta: agenda, pacientes y notas internas sin pagar por herramientas de equipo.',
    positioning: 'Para ordenar mi consulta.',
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
      'Agenda ordenada para reservas y disponibilidad',
      'Base de pacientes de consulta individual',
      'Notas internas y resumen básico de actividad',
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
      'Para coordinar un equipo: varias agendas, pacientes compartidos y roles claros en un centro pequeño.',
    positioning: 'Para coordinar un equipo.',
    monthlyPriceClp: 49990,
    ctaLabel: 'Coordinar mi centro',
    ctaKind: 'self_service',
    highlightLabel: 'Más popular',
    professionalRangeLabel: '2 a 5 profesionales',
    minProfessionals: 2,
    maxProfessionals: 5,
    maxActivePatients: null,
    features: includedFromCenter,
    summaryBenefits: [
      '2 a 5 profesionales',
      'Agenda compartida del equipo',
      'Múltiples agendas profesionales',
      'Accesos separados para administrador, recepción y profesionales',
      'Panel para equipo, servicios, salas y configuración del centro',
      'Base de pacientes compartida para todo el equipo',
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
      'Para controlar la operación del centro: asistencia, carga del equipo, seguimiento de pacientes y links de videollamada.',
    positioning: 'Para controlar la operación del centro.',
    monthlyPriceClp: 69990,
    ctaLabel: 'Mejorar a Pro',
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
      'Todo lo incluido en Center',
      'Métricas de asistencia, ocupación y carga del equipo',
      'Registro de asistió/no asistió por reserva',
      'Historial operativo y seguimiento del paciente',
      'Links manuales de Meet/Zoom en reservas',
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
      'Para clínicas con integración y acompañamiento: solución a medida según alcance, equipo e integraciones necesarias.',
    positioning: 'Para clínicas con integración y acompañamiento.',
    monthlyPriceClp: 0,
    ctaLabel: 'Contactar ventas',
    ctaKind: 'sales',
    professionalRangeLabel: 'Profesionales ilimitados',
    minProfessionals: 16,
    maxProfessionals: null,
    maxActivePatients: null,
    features: includedFromEnterprise,
    summaryBenefits: [
      'Profesionales ilimitados',
      'Todo Agendix Center Pro',
      'Solución a medida según operación clínica',
      'Telemedicina e integraciones bajo implementación Enterprise',
      'Acompañamiento y capacitación según alcance',
      'Revisión comercial y técnica antes de activar funciones especiales',
    ],
    comparison: comparison(includedFromEnterprise),
    extras: {},
  },
}

export const featureLabels: Record<FeatureKey, string> = {
  basic_stats: featureDefinitions.basic_stats.label,
  advanced_calendar: featureDefinitions.advanced_calendar.label,
  internal_notes: featureDefinitions.internal_notes.label,
  shared_calendar: featureDefinitions.shared_calendar.label,
  multi_agenda: featureDefinitions.multi_agenda.label,
  roles_permissions: featureDefinitions.roles_permissions.label,
  admin_panel: featureDefinitions.admin_panel.label,
  shared_active_patients: featureDefinitions.shared_active_patients.label,
  center_stats: featureDefinitions.center_stats.label,
  attendance_control: featureDefinitions.attendance_control.label,
  advanced_patient_management: featureDefinitions.advanced_patient_management.label,
  meeting_links: featureDefinitions.meeting_links.label,
  integrated_telemedicine: featureDefinitions.integrated_telemedicine.label,
  automatic_meeting_links: featureDefinitions.automatic_meeting_links.label,
  clinical_team_meetings: featureDefinitions.clinical_team_meetings.label,
  custom_training: featureDefinitions.custom_training.label,
  future_integrations: featureDefinitions.future_integrations.label,
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
  return subscriptionPlans[featureDefinitions[feature].minimumPlan]
}

export function getFeatureDefinition(feature: FeatureKey): FeatureDefinition {
  return featureDefinitions[feature]
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

  return featureDefinitions[feature].upgradeBenefit
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
