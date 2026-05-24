import { readFileSync } from 'node:fs'

function readLocalEnv() {
  return Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      })
  )
}

const env = readLocalEnv()
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!baseUrl || !anonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  )
}

const objects = [
  'public_booking_professionals',
  'profiles',
  'miembros_centro',
  'pacientes',
  'reservas',
  'pagos',
  'fichas_clinicas',
  'evoluciones_sesion',
  'recordatorios_reserva',
  'configuracion_recordatorios',
  'configuracion_recordatorios_profesional',
  'bloqueos_agenda',
  'subscriptions',
  'rate_limit_buckets',
  'salas',
]

const results = []

for (const object of objects) {
  const response = await fetch(`${baseUrl}/rest/v1/${object}?select=*&limit=1`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      prefer: 'count=exact',
    },
  })
  const body = await response.text()
  let parsed = null

  try {
    parsed = body ? JSON.parse(body) : null
  } catch {
    parsed = null
  }

  results.push({
    object,
    status: response.status,
    ok: response.ok,
    contentRange: response.headers.get('content-range'),
    errorCode: parsed && !Array.isArray(parsed) ? parsed.code : null,
    readableRowsReturned: Array.isArray(parsed) ? parsed.length : null,
  })
}

console.log(JSON.stringify({ baseUrl, results }, null, 2))
