export function isDemoMode(): boolean {
  return process.env.AGENDIX_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production'
}

export const demoUser = {
  nombre: 'Usuario Demo',
  centro: 'Centro Demo Agendix',
}
