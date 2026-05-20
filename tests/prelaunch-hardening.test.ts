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
})
