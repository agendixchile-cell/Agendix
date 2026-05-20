import { redirect } from 'next/navigation'
import { ServiciosManager } from '@/components/servicios/servicios-manager'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import type { ServicioListItem } from '@/lib/servicios/types'
import { getDemoSubscriptionContext } from '@/lib/subscription/server'
import { createClient } from '@/lib/supabase/server'

export default async function ServiciosPage() {
  const demoMode = isDemoMode()

  if (demoMode) {
    const subscription = await getDemoSubscriptionContext()
    const dataset = getDemoPlanDataset(subscription.planId)

    return (
      <ServiciosManager
        initialServicios={dataset.servicios}
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
      <ServiciosManager
        initialServicios={[]}
        demoMode={false}
        loadError="No pudimos cargar el centro asociado a tu usuario."
      />
    )
  }

  if (!membership?.centro_id) {
    return (
      <ServiciosManager
        initialServicios={[]}
        demoMode={false}
        loadError={`No encontramos un centro asociado a ${user.email ?? demoUser.nombre}.`}
      />
    )
  }

  const { data: servicios, error: serviciosError } = await supabase
    .from('servicios')
    .select('id,nombre,descripcion,duracion_minutos,precio,activo,created_at,updated_at')
    .eq('centro_id', membership.centro_id)
    .order('created_at', { ascending: false })

  return (
    <ServiciosManager
      initialServicios={(servicios ?? []) as ServicioListItem[]}
      demoMode={false}
      loadError={
        serviciosError
          ? 'No pudimos cargar los servicios. Revisa permisos de Supabase e intenta nuevamente.'
          : undefined
      }
    />
  )
}
