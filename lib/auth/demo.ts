export function isDemoMode(): boolean {
  const demoEnabled =
    process.env.AGENDIX_DEMO_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_AGENDIX_DEMO_ENABLED === 'true'
  const legacyLocalDemo =
    process.env.AGENDIX_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production'

  return demoEnabled || legacyLocalDemo
}

export const demoUser = {
  nombre: 'Usuario Demo',
  centro: 'Centro Demo Agendix',
}
