import { redirect } from 'next/navigation'
import { SalasManager } from '@/components/salas/salas-manager'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import type { SalaListItem } from '@/lib/salas/types'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { getDemoSubscriptionContext } from '@/lib/subscription/server'
import { createClient } from '@/lib/supabase/server'

export default async function SalasPage() {
  const demoMode = isDemoMode()

  if (demoMode) {
    const subscription = await getDemoSubscriptionContext()
    const dataset = getDemoPlanDataset(subscription.planId)

    return (
      <SalasManager
        initialSalas={dataset.salas}
        demoMode
        demoPlanId={subscription.planId}
      />
    )
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
      <SalasManager
        initialSalas={[]}
        demoMode={false}
        loadError="No pudimos cargar el centro asociado a tu usuario."
      />
    )
  }

  if (!membership?.centro_id) {
    return (
      <SalasManager
        initialSalas={[]}
        demoMode={false}
        loadError={`No encontramos un centro asociado a ${user.email ?? demoUser.nombre}.`}
      />
    )
  }

  const { data: salas, error: salasError } = await supabase
    .from('salas')
    .select('id,nombre,descripcion,capacidad,activa,created_at,updated_at')
    .eq('centro_id', membership.centro_id)
    .order('created_at', { ascending: false })

  return (
    <SalasManager
      initialSalas={(salas ?? []) as SalaListItem[]}
      demoMode={false}
      loadError={
        salasError
          ? 'No pudimos cargar las salas. Revisa permisos de Supabase e intenta nuevamente.'
          : undefined
      }
    />
  )
}
