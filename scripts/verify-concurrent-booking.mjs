import { createClient } from '@supabase/supabase-js'

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AGENDIX_VERIFY_CENTRO_ID',
  'AGENDIX_VERIFY_PROFESIONAL_ID',
  'AGENDIX_VERIFY_PACIENTE_ID',
  'AGENDIX_VERIFY_SERVICIO_ID',
  'AGENDIX_VERIFY_SALA_ID',
  'AGENDIX_VERIFY_FECHA_INICIO',
]

const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(', ')}`)
  process.exit(2)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const args = {
  p_centro_id: process.env.AGENDIX_VERIFY_CENTRO_ID,
  p_profesional_id: process.env.AGENDIX_VERIFY_PROFESIONAL_ID,
  p_paciente_id: process.env.AGENDIX_VERIFY_PACIENTE_ID,
  p_servicio_id: process.env.AGENDIX_VERIFY_SERVICIO_ID,
  p_fecha_inicio: process.env.AGENDIX_VERIFY_FECHA_INICIO,
  p_sala_id: process.env.AGENDIX_VERIFY_SALA_ID,
  p_estado: 'pending',
  p_notas: 'Verificacion de concurrencia pre-lanzamiento',
  p_origen: 'verification_script',
  p_modalidad: 'presencial',
  p_payment_status: 'pending',
  p_amount: null,
  p_currency: 'CLP',
}

const attempts = await Promise.allSettled([
  supabase.rpc('create_reserva_atomic', args).single(),
  supabase.rpc('create_reserva_atomic', args).single(),
])

const results = attempts.map((attempt) => {
  if (attempt.status === 'rejected') return { ok: false, error: attempt.reason }

  return attempt.value.error
    ? { ok: false, error: attempt.value.error }
    : attempt.value.data
})

console.log(JSON.stringify(results, null, 2))

const created = results.filter((result) => result?.ok === true).length
const rejected = results.filter((result) => result?.ok === false).length

if (created !== 1 || rejected !== 1) {
  console.error('Expected exactly one created reservation and one controlled conflict.')
  process.exit(1)
}
