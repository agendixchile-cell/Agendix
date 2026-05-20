import { LoginForm } from './login-form'
import { isDemoMode } from '@/lib/auth/demo'

type LoginPageProps = {
  searchParams: Promise<{
    authError?: string | string[]
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const authError = Array.isArray(params.authError)
    ? params.authError[0]
    : params.authError

  return (
    <LoginForm
      demoMode={isDemoMode()}
      showCallbackError={authError === 'callback'}
    />
  )
}
