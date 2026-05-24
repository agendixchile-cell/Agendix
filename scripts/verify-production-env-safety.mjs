import { existsSync, readFileSync } from 'node:fs'

const envPath = process.argv[2] ?? '.env.production.verification'
const expectedSupabaseUrl = 'https://sbebrhlcxwmzixpzvhuq.supabase.co'

function parseEnv(path) {
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index), normalizeEnvValue(line.slice(index + 1))]
      })
  )
}

function normalizeEnvValue(value) {
  const trimmed = value.trim()
  const quote = trimmed[0]

  if (
    trimmed.length >= 2 &&
    (quote === '"' || quote === "'") &&
    trimmed[trimmed.length - 1] === quote
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

if (!existsSync(envPath)) {
  console.error(
    [
      `Missing ${envPath}.`,
      'Export or pull Vercel Production variables into a local verification file first.',
      'Do not commit that file.',
    ].join('\n')
  )
  process.exit(2)
}

const env = parseEnv(envPath)
const findings = []
const warnings = []

function fail(variable, message) {
  findings.push({ variable, message })
}

function warn(variable, message) {
  warnings.push({ variable, message })
}

if (env.NEXT_PUBLIC_SUPABASE_URL !== expectedSupabaseUrl) {
  fail(
    'NEXT_PUBLIC_SUPABASE_URL',
    `must point to Agendix production Supabase (${expectedSupabaseUrl})`
  )
}

if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  fail('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'must be configured for production')
}

if (!Object.prototype.hasOwnProperty.call(env, 'SUPABASE_SERVICE_ROLE_KEY')) {
  fail('SUPABASE_SERVICE_ROLE_KEY', 'must exist server-side for approved server actions')
} else if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  warn(
    'SUPABASE_SERVICE_ROLE_KEY',
    'is present but empty in this export; Vercel sensitive variables may not be decrypted by env pull'
  )
}

for (const key of Object.keys(env)) {
  if (
    key.startsWith('NEXT_PUBLIC_') &&
    /(SERVICE_ROLE|SECRET|RESEND|STRIPE|WEBHOOK|PASSWORD|TOKEN|PRIVATE)/i.test(key)
  ) {
    fail(key, 'looks like a private secret exposed with NEXT_PUBLIC_')
  }
}

if (env.AGENDIX_DEMO_ENABLED === 'true') {
  fail('AGENDIX_DEMO_ENABLED', 'must be false or absent in production')
}

if (env.NEXT_PUBLIC_AGENDIX_DEMO_ENABLED === 'true') {
  fail('NEXT_PUBLIC_AGENDIX_DEMO_ENABLED', 'must be false or absent in production')
}

if (env.AGENDIX_DEMO_MODE === 'true') {
  fail('AGENDIX_DEMO_MODE', 'legacy local demo mode must not be true in production')
}

if (!env.NEXT_PUBLIC_APP_URL) {
  fail('NEXT_PUBLIC_APP_URL', 'must be the real production app domain')
}

if (!env.APP_BASE_URL) {
  fail('APP_BASE_URL', 'must be the real production app domain for server-side links')
}

if (env.STRIPE_SECRET_KEY || env.STRIPE_WEBHOOK_SECRET) {
  fail(
    'STRIPE_*',
    'payments are not released for the pilot; remove or confirm they are inert before production deploy'
  )
}

if (findings.length > 0) {
  console.error('Production env safety check failed:')
  for (const finding of findings) {
    console.error(`- ${finding.variable}: ${finding.message}`)
  }
  process.exit(1)
}

if (warnings.length > 0) {
  console.warn('Production env safety check warnings:')
  for (const warning of warnings) {
    console.warn(`- ${warning.variable}: ${warning.message}`)
  }
}

console.log('Production env safety check passed without printing secrets.')
