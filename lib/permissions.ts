import type { FeatureKey, PlanId } from '@/lib/plans'
import { hasFeature } from '@/lib/plans'

export type OrganizationRole = 'owner' | 'admin' | 'profesional' | 'recepcion'

const roleLabels: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  profesional: 'Profesional',
  recepcion: 'Recepción',
}

export function normalizeOrganizationRole(
  role: string | null | undefined
): OrganizationRole {
  if (role === 'owner' || role === 'admin' || role === 'profesional') {
    return role
  }

  return 'recepcion'
}

export function organizationRoleLabel(role: string | null | undefined): string {
  return roleLabels[normalizeOrganizationRole(role)]
}

export function canManageTeam(role: string | null | undefined): boolean {
  const normalized = normalizeOrganizationRole(role)

  return normalized === 'owner' || normalized === 'admin'
}

export function canViewAdminPanel({
  role,
  planId,
}: {
  role: string | null | undefined
  planId: PlanId
}): boolean {
  return canManageTeam(role) && hasFeature(planId, 'admin_panel')
}

export function canEditOrganizationSettings(
  role: string | null | undefined
): boolean {
  return canManageTeam(role)
}

export function canManageBilling(role: string | null | undefined): boolean {
  return normalizeOrganizationRole(role) === 'owner'
}

export function canUseFeature({
  role,
  planId,
  feature,
}: {
  role: string | null | undefined
  planId: PlanId
  feature: FeatureKey
}): boolean {
  if (feature === 'roles_permissions' || feature === 'admin_panel') {
    return canManageTeam(role) && hasFeature(planId, feature)
  }

  return hasFeature(planId, feature)
}

export function roleCanOperatePatients(role: string | null | undefined): boolean {
  return ['owner', 'admin', 'profesional', 'recepcion'].includes(
    normalizeOrganizationRole(role)
  )
}

export function roleCanOperateReservations(role: string | null | undefined): boolean {
  return ['owner', 'admin', 'profesional', 'recepcion'].includes(
    normalizeOrganizationRole(role)
  )
}
