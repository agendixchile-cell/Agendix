import { RegisterForm } from './register-form'
import { normalizePlanId } from '@/lib/plans'

type RegisterPageProps = {
  searchParams: Promise<{
    plan?: string | string[]
  }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams
  const requestedPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan

  return <RegisterForm selectedPlanId={normalizePlanId(requestedPlan)} />
}
