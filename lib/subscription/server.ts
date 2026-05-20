import { cookies } from 'next/headers'
import { demoPlanCookieName } from '@/lib/demo-plan'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import {
  canAddProfessional,
  canCreateActivePatient,
  getPlan,
  normalizePlanId,
  type PlanDefinition,
  type PlanId,
  type PlanUsageContext,
  type SubscriptionStatus,
} from '@/lib/plans'
import { normalizeOrganizationRole, type OrganizationRole } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type SubscriptionSnapshot = {
  planId: PlanId
  plan: PlanDefinition
  status: SubscriptionStatus
  extraProfessionalsCount: number
}

export type OrganizationSubscriptionContext = PlanUsageContext & {
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: OrganizationRole
}

type MembershipWithPlan = {
  centro_id: string
  rol: string
  centros: {
    id: string
    nombre: string
    slug: string
    plan_id: string | null
    subscription_status: string | null
    extra_professionals_count: number | null
  } | null
}

type BasicMembership = {
  centro_id: string
  rol: string
  centros: {
    id: string
    nombre: string
    slug: string
  } | null
}

type UsageCounts = {
  professionals: number
  activePatients: number
  upcomingReservations: number
}

function normalizeSubscriptionStatus(
  value: string | null | undefined
): SubscriptionStatus {
  if (
    value === 'trial' ||
    value === 'active' ||
    value === 'cancelled' ||
    value === 'past_due' ||
    value === 'pending'
  ) {
    return value
  }

  return 'trial'
}

function inferPlanIdFromProfessionalCount(professionals: number): PlanId {
  if (professionals <= 1) return 'individual'
  if (professionals <= 5) return 'center'
  if (professionals <= 15) return 'center_pro'

  return 'enterprise'
}

export async function getDemoPlanId(): Promise<PlanId> {
  if (process.env.NODE_ENV === 'production') return 'individual'

  const cookiePlan = (await cookies()).get(demoPlanCookieName)?.value

  return normalizePlanId(cookiePlan ?? process.env.AGENDIX_DEMO_PLAN)
}

export async function getDemoSubscriptionContext(): Promise<OrganizationSubscriptionContext> {
  const planId = await getDemoPlanId()
  const dataset = getDemoPlanDataset(planId)

  return {
    organizationId: dataset.centro.id,
    organizationName: dataset.centro.nombre,
    organizationSlug: dataset.centro.slug,
    role: 'owner',
    planId,
    plan: getPlan(planId),
    status: 'trial',
    extraProfessionalsCount: 0,
    usage: {
      professionals: dataset.profesionales.filter((profesional) => profesional.activo)
        .length,
      activePatients: dataset.pacientes.filter((paciente) => paciente.activo !== false)
        .length,
      upcomingReservations: dataset.reservas.filter((reserva) =>
        ['pending', 'confirmed'].includes(reserva.estado)
      ).length,
    },
  }
}

export async function getPlanSnapshotForCentro(
  supabase: SupabaseClient,
  centroId: string
): Promise<SubscriptionSnapshot> {
  const { data, error } = await supabase
    .from('centros')
    .select('plan_id,subscription_status,extra_professionals_count')
    .eq('id', centroId)
    .maybeSingle()

  if (error) {
    const { count } = await supabase
      .from('miembros_centro')
      .select('id', { count: 'exact', head: true })
      .eq('centro_id', centroId)
      .eq('activo', true)
      .in('rol', ['owner', 'admin', 'profesional'])

    const inferredPlanId = inferPlanIdFromProfessionalCount(count ?? 1)

    return {
      planId: inferredPlanId,
      plan: getPlan(inferredPlanId),
      status: 'trial',
      extraProfessionalsCount: 0,
    }
  }

  const planId = normalizePlanId(data?.plan_id)

  return {
    planId,
    plan: getPlan(planId),
    status: normalizeSubscriptionStatus(data?.subscription_status),
    extraProfessionalsCount: Math.max(0, data?.extra_professionals_count ?? 0),
  }
}

export async function getOrganizationUsage(
  supabase: SupabaseClient,
  centroId: string
): Promise<UsageCounts> {
  const now = new Date().toISOString()
  const [professionals, activePatients, upcomingReservations] = await Promise.all([
    supabase
      .from('miembros_centro')
      .select('id', { count: 'exact', head: true })
      .eq('centro_id', centroId)
      .eq('activo', true)
      .in('rol', ['owner', 'admin', 'profesional']),
    supabase
      .from('pacientes')
      .select('id', { count: 'exact', head: true })
      .eq('centro_id', centroId)
      .eq('activo', true),
    supabase
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('centro_id', centroId)
      .gte('fecha_inicio', now)
      .in('estado', ['pending', 'confirmed']),
  ])

  return {
    professionals: professionals.count ?? 0,
    activePatients: activePatients.count ?? 0,
    upcomingReservations: upcomingReservations.count ?? 0,
  }
}

export async function hasSubscriptionSchemaReady(
  supabase: SupabaseClient,
  centroId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('centros')
    .select('plan_id,subscription_status,extra_professionals_count')
    .eq('id', centroId)
    .maybeSingle()

  return !error
}

export async function getCurrentOrganizationSubscriptionContext(): Promise<{
  data: OrganizationSubscriptionContext | null
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Debes iniciar sesión para ver tu plan.' }
  }

  const { data: membership, error } = await supabase
    .from('miembros_centro')
    .select(
      'centro_id,rol,centros!inner(id,nombre,slug,plan_id,subscription_status,extra_professionals_count)'
    )
    .eq('profile_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  const activeMembership = membership as unknown as MembershipWithPlan | null

  if (error) {
    const { data: basicMembership, error: basicError } = await supabase
      .from('miembros_centro')
      .select('centro_id,rol,centros!inner(id,nombre,slug)')
      .eq('profile_id', user.id)
      .eq('activo', true)
      .limit(1)
      .maybeSingle()

    const activeBasicMembership =
      basicMembership as unknown as BasicMembership | null

    if (
      basicError ||
      !activeBasicMembership?.centro_id ||
      !activeBasicMembership.centros
    ) {
      return {
        data: null,
        error: 'No encontramos una organización asociada a tu usuario.',
      }
    }

    const [snapshot, usage] = await Promise.all([
      getPlanSnapshotForCentro(supabase, activeBasicMembership.centro_id),
      getOrganizationUsage(supabase, activeBasicMembership.centro_id),
    ])

    return {
      data: {
        organizationId: activeBasicMembership.centros.id,
        organizationName: activeBasicMembership.centros.nombre,
        organizationSlug: activeBasicMembership.centros.slug,
        role: normalizeOrganizationRole(activeBasicMembership.rol),
        planId: snapshot.planId,
        plan: snapshot.plan,
        status: snapshot.status,
        extraProfessionalsCount: snapshot.extraProfessionalsCount,
        usage,
      },
    }
  }

  if (!activeMembership?.centro_id || !activeMembership.centros) {
    return {
      data: null,
      error: 'No encontramos una organización asociada a tu usuario.',
    }
  }

  const snapshot = {
    planId: normalizePlanId(activeMembership.centros.plan_id),
    status: normalizeSubscriptionStatus(
      activeMembership.centros.subscription_status
    ),
    extraProfessionalsCount: Math.max(
      0,
      activeMembership.centros.extra_professionals_count ?? 0
    ),
  }
  const usage = await getOrganizationUsage(supabase, activeMembership.centro_id)
  const plan = getPlan(snapshot.planId)

  return {
    data: {
      organizationId: activeMembership.centros.id,
      organizationName: activeMembership.centros.nombre,
      organizationSlug: activeMembership.centros.slug,
      role: normalizeOrganizationRole(activeMembership.rol),
      planId: snapshot.planId,
      plan,
      status: snapshot.status,
      extraProfessionalsCount: snapshot.extraProfessionalsCount,
      usage,
    },
  }
}

export async function validateProfessionalCapacity(
  supabase: SupabaseClient,
  centroId: string,
  requested = 1
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [snapshot, usage] = await Promise.all([
    getPlanSnapshotForCentro(supabase, centroId),
    getOrganizationUsage(supabase, centroId),
  ])
  const result = canAddProfessional({
    planId: snapshot.planId,
    currentCount: usage.professionals,
    extraProfessionalsCount: snapshot.extraProfessionalsCount,
    requested,
  })

  if (result.allowed) return { ok: true }

  if (snapshot.planId === 'individual') {
    return {
      ok: false,
      message:
        'Tu plan Individual permite 1 profesional. Mejora a Agendix Center para gestionar un equipo.',
    }
  }

  const fallbackUpgrade =
    snapshot.planId === 'center'
      ? 'Mejora a Agendix Center Pro para sumar más profesionales.'
      : 'Mejora a Agendix Enterprise para gestionar equipos grandes.'

  return {
    ok: false,
    message: snapshot.plan.extras.professionals?.enabled
      ? `Alcanzaste el límite de ${result.limit} profesionales. Puedes contratar profesionales extra desde $2.990 / mes.`
      : `Alcanzaste el límite de ${result.limit} profesionales de tu plan. ${fallbackUpgrade}`,
  }
}

export async function validateActivePatientCapacity(
  supabase: SupabaseClient,
  centroId: string,
  requested = 1
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [snapshot, usage] = await Promise.all([
    getPlanSnapshotForCentro(supabase, centroId),
    getOrganizationUsage(supabase, centroId),
  ])
  const result = canCreateActivePatient({
    planId: snapshot.planId,
    currentActivePatients: usage.activePatients,
    requested,
  })

  if (result.allowed) return { ok: true }

  return {
    ok: false,
    message:
      'Alcanzaste el máximo de 50 pacientes activos de tu plan. Mejora tu plan para seguir creciendo.',
  }
}
