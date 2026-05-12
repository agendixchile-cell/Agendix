import { redirect } from 'next/navigation'
import { ProfesionalesManager } from '@/components/profesionales/profesionales-manager'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { demoProfesionales } from '@/lib/profesionales/demo'
import type {
  ProfesionalListItem,
  ProfesionalQueryRow,
} from '@/lib/profesionales/types'
import { createClient } from '@/lib/supabase/server'

function toProfesionalListItem(row: ProfesionalQueryRow): ProfesionalListItem {
  return {
    id: row.id,
    profile_id: row.profile_id,
    nombre: row.profiles?.nombre ?? 'Sin nombre',
    apellido: row.profiles?.apellido ?? null,
    email: row.profiles?.email ?? '',
    telefono: row.profiles?.telefono ?? null,
    especialidad: null,
    rol: row.rol,
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export default async function ProfesionalesPage() {
  const demoMode = isDemoMode()

  if (demoMode) {
    return <ProfesionalesManager initialProfesionales={demoProfesionales} demoMode />
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
      <ProfesionalesManager
        initialProfesionales={[]}
        demoMode={false}
        loadError="No pudimos cargar el centro asociado a tu usuario."
      />
    )
  }

  if (!membership?.centro_id) {
    return (
      <ProfesionalesManager
        initialProfesionales={[]}
        demoMode={false}
        loadError={`No encontramos un centro asociado a ${user.email ?? demoUser.nombre}.`}
      />
    )
  }

  const { data: profesionales, error: profesionalesError } = await supabase
    .from('miembros_centro')
    .select(
      'id,profile_id,rol,activo,created_at,updated_at,profiles!inner(nombre,apellido,email,telefono)'
    )
    .eq('centro_id', membership.centro_id)
    .in('rol', ['admin', 'profesional'])
    .order('created_at', { ascending: false })

  return (
    <ProfesionalesManager
      initialProfesionales={((profesionales ?? []) as unknown as ProfesionalQueryRow[]).map(
        toProfesionalListItem
      )}
      demoMode={false}
      loadError={
        profesionalesError
          ? 'No pudimos cargar profesionales. Revisa permisos de Supabase e intenta nuevamente.'
          : undefined
      }
    />
  )
}
