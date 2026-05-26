import { redirect } from 'next/navigation'
import { CentroManager } from '@/components/centro/centro-manager'
import { demoCentro, demoRecordatoriosConfig } from '@/lib/centro/demo'
import { defaultHorariosCentro } from '@/lib/centro/horarios'
import type { CentroConfig, CentroMembership } from '@/lib/centro/types'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import { createClient } from '@/lib/supabase/server'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { getHorariosCentro, getRecordatoriosCentro } from '@/app/actions/centro'
import { getMercadoPagoSettings } from '@/app/actions/centro'
import { getDemoPlanId } from '@/lib/subscription/server'
import { normalizePlanId, type PlanId } from '@/lib/plans'

type MembershipQueryRow = {
  rol: CentroMembership['rol']
  centros: (CentroConfig & { plan_id?: string | null }) | null
}

export default async function CentroPage() {
  const demoMode = isDemoMode()

  if (demoMode) {
    const demoPlanId = await getDemoPlanId()
    const dataset = getDemoPlanDataset(demoPlanId)

    return (
      <CentroManager
        initialCentro={dataset.centro}
        initialHorarios={dataset.horarios}
        initialRecordatorios={dataset.recordatorios}
        initialMercadoPagoSettings={{
          configured: false,
          source: 'missing',
          public_key: null,
          account_label: null,
          updated_at: null,
        }}
        planId={demoPlanId}
        rol="admin"
        demoMode
        demoPlanId={demoPlanId}
      />
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('miembros_centro')
    .select(
      `
        rol,
        centros!inner(id,nombre,slug,rut,direccion,telefono,email,logo_url,activo,created_at,updated_at,plan_id)
      `
    )
    .eq('profile_id', user.id)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    return (
      <CentroManager
        initialCentro={{
          ...demoCentro,
          nombre: demoUser.centro,
        }}
        initialHorarios={defaultHorariosCentro}
        initialRecordatorios={demoRecordatoriosConfig}
        initialMercadoPagoSettings={{
          configured: false,
          source: 'missing',
          public_key: null,
          account_label: null,
          updated_at: null,
        }}
        planId="individual"
        rol="profesional"
        demoMode={false}
        loadError="No pudimos cargar la configuración de tu espacio de atención."
      />
    )
  }

  const membership = data as unknown as MembershipQueryRow | null

  if (!membership?.centros) {
    return (
      <CentroManager
        initialCentro={{
          ...demoCentro,
          nombre: demoUser.centro,
        }}
        initialHorarios={defaultHorariosCentro}
        initialRecordatorios={demoRecordatoriosConfig}
        initialMercadoPagoSettings={{
          configured: false,
          source: 'missing',
          public_key: null,
          account_label: null,
          updated_at: null,
        }}
        planId="individual"
        rol="profesional"
        demoMode={false}
        loadError={`No encontramos un espacio profesional o centro asociado a ${user.email ?? demoUser.nombre}.`}
      />
    )
  }

  const [horarios, recordatorios, mercadoPagoSettings] = await Promise.all([
    getHorariosCentro(membership.centros.id),
    getRecordatoriosCentro(membership.centros.id),
    getMercadoPagoSettings(membership.centros.id),
  ])

  return (
    <CentroManager
      initialCentro={membership.centros}
      initialHorarios={horarios}
      initialRecordatorios={recordatorios}
      initialMercadoPagoSettings={mercadoPagoSettings}
      planId={normalizePlanId(membership.centros.plan_id) as PlanId}
      rol={membership.rol}
      demoMode={false}
    />
  )
}
