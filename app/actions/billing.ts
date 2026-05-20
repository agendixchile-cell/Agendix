'use server'

import { redirect } from 'next/navigation'
import {
  createStripeCheckoutSession,
  isStripeCheckoutConfigured,
} from '@/lib/billing/stripe'
import { canManageBilling } from '@/lib/permissions'
import { getPlan, isPlanId } from '@/lib/plans'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentOrganizationSubscriptionContext,
  hasSubscriptionSchemaReady,
} from '@/lib/subscription/server'
import { getAppUrl } from '@/lib/urls'

function redirectWithBillingError(error: string): never {
  redirect(`/configuracion/plan?billingError=${encodeURIComponent(error)}`)
}

export async function createBillingCheckoutAction(formData: FormData) {
  const planId = String(formData.get('planId') ?? '')

  if (!isPlanId(planId)) {
    redirectWithBillingError('plan')
  }

  const plan = getPlan(planId)

  if (plan.ctaKind !== 'self_service') {
    redirectWithBillingError('sales')
  }

  if (!isStripeCheckoutConfigured()) {
    redirectWithBillingError('stripe_config')
  }

  const contextResult = await getCurrentOrganizationSubscriptionContext()
  const context = contextResult.data

  if (!context) {
    redirect('/login')
  }

  if (!canManageBilling(context.role)) {
    redirectWithBillingError('role')
  }

  const supabase = await createClient()
  const schemaReady = await hasSubscriptionSchemaReady(
    supabase,
    context.organizationId
  )

  if (!schemaReady) {
    redirectWithBillingError('migration')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    const session = await createStripeCheckoutSession({
      organizationId: context.organizationId,
      organizationName: context.organizationName,
      plan,
      customerEmail: user?.email,
      successUrl: getAppUrl(
        '/configuracion/plan?billing=success&session_id={CHECKOUT_SESSION_ID}'
      ),
      cancelUrl: getAppUrl('/configuracion/plan?billing=cancelled'),
    })

    redirect(session.url)
  } catch (error) {
    console.error('[createBillingCheckoutAction] checkout failed', error)
    redirectWithBillingError('checkout')
  }
}
