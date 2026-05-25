import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('prelaunch hardening guardrails', () => {
  it('redirects the legacy public booking route to /agendar/:slug', () => {
    const legacyPage = read('app/[slug]/page.tsx')

    expect(legacyPage).toContain('permanentRedirect(`/agendar/${slug}`)')
    expect(existsSync(join(root, 'app/[slug]/reserva-modal.tsx'))).toBe(false)
  })

  it('does not serialize all clinical files for professional users', () => {
    const clinicalPage = read('app/(dashboard)/fichas-clinicas/page.tsx')

    expect(clinicalPage).toContain(".in('paciente_id', patientIds)")
    expect(clinicalPage).toContain(".eq('profesional_id', user.id)")
  })

  it('keeps reservation creation behind the atomic RPC', () => {
    const publicRoute = read('app/api/reserva-publica/route.ts')
    const internalAction = read('app/actions/reservas.ts')
    const migration = read(
      'supabase/migrations/20260515234829_hardening_prelaunch_security_integrity.sql'
    )

    expect(publicRoute).toContain(".rpc('create_reserva_atomic'")
    expect(internalAction).toContain(".rpc('create_reserva_atomic'")
    expect(migration).toContain('pg_advisory_xact_lock')
    expect(migration).toContain('create or replace function public.create_reserva_atomic')
    expect(migration).toContain('reservas_no_solapan_por_profesional')
    expect(migration).toContain('reservas_no_solapan_por_sala')
  })

  it('keeps reservation updates and public rate limits behind database RPCs', () => {
    const publicRoute = read('app/api/reserva-publica/route.ts')
    const internalAction = read('app/actions/reservas.ts')
    const atomicMigration = read(
      'supabase/migrations/20260516001627_serverless_rate_limits_and_update_reserva_atomic.sql'
    )
    const grantsMigration = read(
      'supabase/migrations/20260516220105_tighten_rpc_execute_grants.sql'
    )
    const rateLimitFixMigration = read(
      'supabase/migrations/20260516220217_fix_rate_limit_column_ambiguity.sql'
    )

    expect(publicRoute).toContain('await checkRateLimit')
    expect(internalAction).toContain(".rpc('update_reserva_atomic'")
    expect(atomicMigration).toContain(
      'create table if not exists public.rate_limit_buckets'
    )
    expect(atomicMigration).toContain('create or replace function public.check_rate_limit')
    expect(atomicMigration).toContain(
      'create or replace function public.update_reserva_atomic'
    )
    expect(atomicMigration).toContain('pg_advisory_xact_lock')
    expect(grantsMigration).toContain('from public, anon, authenticated')
    expect(grantsMigration).toContain('from public, anon')
    expect(rateLimitFixMigration).toContain(
      'delete from public.rate_limit_buckets as rlb'
    )
    expect(rateLimitFixMigration).toContain('where rlb.reset_at')
  })

  it('creates online patient payments through Mercado Pago without marking them paid in the client', () => {
    const publicRoute = read('app/api/reserva-publica/route.ts')
    const bookingFlow = read('components/booking/public-booking-flow.tsx')
    const confirmationPage = read('app/agendar/[slug]/confirmacion/page.tsx')

    expect(publicRoute).toContain("getPaymentProvider('mercado_pago')")
    expect(publicRoute).toContain("from('patient_payments')")
    expect(publicRoute).toContain('checkout_url')
    expect(publicRoute).not.toContain("isOnlinePayment ? 'paid'")
    expect(publicRoute).not.toContain("isOnlinePayment ? 'pagado'")
    expect(publicRoute).not.toContain('online_mock')
    expect(bookingFlow).toContain('window.location.assign(body.checkout_url)')
    expect(bookingFlow).not.toContain('Procesando pago')
    expect(confirmationPage).not.toContain('mockeado')
  })

  it('keeps demo mode explicitly gated for preview and local-only legacy use', () => {
    const demoAuth = read('lib/auth/demo.ts')
    const demoPlanAction = read('app/actions/demo-plan.ts')
    const envExample = read('.env.example')
    const pilotGuide = read('docs/piloto-productivo.md')

    expect(demoAuth).toContain('AGENDIX_DEMO_ENABLED')
    expect(demoAuth).toContain('NEXT_PUBLIC_AGENDIX_DEMO_ENABLED')
    expect(demoAuth).toContain("process.env.NODE_ENV !== 'production'")
    expect(demoPlanAction).toContain('AGENDIX_DEMO_ENABLED')
    expect(envExample).toContain('No lo actives en producción real')
    expect(envExample).toContain('NEXT_PUBLIC_AGENDIX_DEMO_ENABLED=false')
    expect(pilotGuide).toContain('Production')
    expect(pilotGuide).toContain('Demo comercial')
  })

  it('removes direct anon profile/member reads in favor of a minimal public view', () => {
    const migration = read(
      'supabase/migrations/20260522090000_public_booking_minimal_profiles.sql'
    )
    const securityInvokerMigration = read(
      'supabase/migrations/20260524143000_security_invoker_public_booking_professionals.sql'
    )
    const viewGrantMigration = read(
      'supabase/migrations/20260524190313_restrict_public_booking_view_grants.sql'
    )

    expect(migration).toContain('create or replace view public.public_booking_professionals')
    expect(migration).toContain('revoke select on public.profiles from anon')
    expect(migration).toContain('revoke select on public.miembros_centro from anon')
    expect(migration).toContain('grant select on public.public_booking_professionals to anon')
    expect(securityInvokerMigration).toContain('security_invoker = true')
    expect(securityInvokerMigration).toContain(
      "rol in ('owner', 'admin', 'profesional')"
    )
    expect(securityInvokerMigration).toContain('grant select (')
    expect(securityInvokerMigration).not.toContain('email')
    expect(securityInvokerMigration).not.toContain('telefono')
    expect(viewGrantMigration).toContain(
      'revoke all on table public.public_booking_professionals from anon'
    )
    expect(viewGrantMigration).toContain(
      'grant select on table public.public_booking_professionals to anon, authenticated'
    )
    expect(migration).not.toContain('p.email')
    expect(migration).not.toContain('mc.rol,')
  })

  it('keeps the closed pilot migration revoking anon access to sensitive tables', () => {
    const migration = read(
      'supabase/migrations/20260522053728_closed_pilot_rls_hardening.sql'
    )

    for (const table of [
      'profiles',
      'miembros_centro',
      'pacientes',
      'reservas',
      'pagos',
      'fichas_clinicas',
      'evoluciones_sesion',
      'recordatorios_reserva',
      'configuracion_recordatorios',
      'bloqueos_agenda',
      'subscriptions',
      'rate_limit_buckets',
      'salas',
    ]) {
      expect(migration).toContain(`revoke all on table public.${table} from anon`)
    }

    expect(migration).toContain(
      'grant select on table public.public_booking_professionals to anon, authenticated'
    )
    expect(migration).toContain("to_regclass('public.public_booking_professionals')")
    expect(migration).toContain(
      'revoke all on table public.public_booking_professionals from public'
    )
  })

  it('does not use the service role key from client components or browser hooks', () => {
    const clientFiles = [
      'hooks/use-demo-plan.ts',
      'components/booking/public-booking-flow.tsx',
      'lib/supabase/client.ts',
    ]

    for (const file of clientFiles) {
      expect(read(file)).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    }
  })

  it('keeps the public booking page on minimal public data transfer objects', () => {
    const publicPage = read('app/agendar/[slug]/page.tsx')

    expect(publicPage).toContain(".from('public_booking_professionals')")
    expect(publicPage).not.toContain(".from('profiles')")
    expect(publicPage).not.toContain(".from('miembros_centro')")
    expect(publicPage).not.toContain('paciente_id,')
    expect(publicPage).not.toContain('notas,')
  })

  it('does not log email recipients when reminder delivery fails', () => {
    const publicRoute = read('app/api/reserva-publica/route.ts')
    const reservaActions = read('app/actions/reservas.ts')

    expect(publicRoute).not.toContain('recipient: professionalNotification.recipient')
    expect(reservaActions).not.toContain('recipient: delivery.result.recipient')
  })

  it('keeps operational release documentation for the productive pilot', () => {
    const deployPolicy = read('docs/deploy-policy.md')
    const closureReport = read('docs/cierre-operativo-piloto.md')
    const environmentMap = read('docs/mapeo-ambientes-reales.md')
    const qaChecklist = read('docs/qa-production-piloto.md')
    const envSafetyScript = read('scripts/verify-production-env-safety.mjs')

    expect(deployPolicy).toContain('No se deploya a production si')
    expect(deployPolicy).toContain('backup production vigente')
    expect(deployPolicy).toContain('verify-production-env-safety.mjs')
    expect(closureReport).toContain('Cierre Operativo Piloto Productivo Agendix')
    expect(closureReport).toContain('Vercel Production fue verificado')
    expect(closureReport).toContain('Agendix puede seguir operando como piloto productivo cerrado')
    expect(environmentMap).toContain('Agendix Staging')
    expect(environmentMap).toContain('Pehuen Capital/Lawen')
    expect(qaChecklist).toContain('Paciente Prueba Agendix')
    expect(envSafetyScript).toContain('sbebrhlcxwmzixpzvhuq')
    expect(envSafetyScript).toContain('NEXT_PUBLIC_AGENDIX_DEMO_ENABLED')
  })
})
