import { redirect } from 'next/navigation'
import { PacientesManager } from '@/components/pacientes/pacientes-manager'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { demoPacientes } from '@/lib/pacientes/demo'
import type { PacienteListItem } from '@/lib/pacientes/types'
import { createClient } from '@/lib/supabase/server'

export default async function PacientesPage() {
  const demoMode = isDemoMode()

  if (demoMode) {
    return <PacientesManager initialPacientes={demoPacientes} demoMode />
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership, error: membershipError } = await supabase
    .from('miembros_centro')
    .select('centro_id')
    .eq('profile_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    return (
      <PacientesManager
        initialPacientes={[]}
        demoMode={false}
        loadError="No pudimos cargar el centro asociado a tu usuario."
      />
    )
  }

  if (!membership?.centro_id) {
    return (
      <PacientesManager
        initialPacientes={[]}
        demoMode={false}
        loadError={`No encontramos un centro asociado a ${user.email ?? demoUser.nombre}.`}
      />
    )
  }

  const { data: pacientes, error: pacientesError } = await supabase
    .from('pacientes')
    .select(
      'id,nombre,apellido,rut,email,telefono,fecha_nacimiento,notas,created_at,updated_at'
    )
    .eq('centro_id', membership.centro_id)
    .order('created_at', { ascending: false })

  return (
    <PacientesManager
      initialPacientes={(pacientes ?? []) as PacienteListItem[]}
      demoMode={false}
      loadError={
        pacientesError
          ? 'No pudimos cargar pacientes. Revisa permisos de Supabase e intenta nuevamente.'
          : undefined
      }
    />
  )
}
