import { redirect } from 'next/navigation'
import { ProfesionalesManager } from '@/components/profesionales/profesionales-manager'
import { demoUser, isDemoMode } from '@/lib/auth/demo'
import { getDemoPlanDataset } from '@/lib/demo-plan-data'
import {
  getDemoSubscriptionContext,
  getOrganizationUsage,
  getPlanSnapshotForCentro,
} from '@/lib/subscription/server'
import type {
  ProfesionalListItem,
  ProfesionalQueryRow,
} from '@/lib/profesionales/types'
import { createClient } from '@/lib/supabase/server'

type ProfesionalReminderConfig = {
  profesional_id: string
  email_subject_template: string | null
  email_body_template: string | null
}

function toProfesionalListItem(
  row: ProfesionalQueryRow,
  reminderConfig?: ProfesionalReminderConfig
): ProfesionalListItem {
  return {
    id: row.id,
    profile_id: row.profile_id,
    nombre: row.profiles?.nombre ?? 'Sin nombre',
    apellido: row.profiles?.apellido ?? null,
    email: row.profiles?.email ?? '',
    telefono: row.profiles?.telefono ?? null,
    especialidad: row.especialidad ?? null,
    avatar_url: row.avatar_url ?? row.profiles?.avatar_url ?? null,
    descanso_entre_reservas_minutos:
      row.descanso_entre_reservas_minutos ?? 0,
    duracion_sesion_minutos: row.duracion_sesion_minutos ?? 60,
    intervalo_reservas_minutos: row.intervalo_reservas_minutos ?? 60,
    recordatorio_email_subject: reminderConfig?.email_subject_template ?? null,
    recordatorio_email_body: reminderConfig?.email_body_template ?? null,
    rol: row.rol,
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export default async function ProfesionalesPage() {
  const demoMode = isDemoMode()

  if (demoMode) {
    const subscription = await getDemoSubscriptionContext()
    const dataset = getDemoPlanDataset(subscription.planId)

    return (
      <ProfesionalesManager
        initialProfesionales={dataset.profesionales}
        centroId={dataset.centro.id}
        demoMode
        planContext={subscription}
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
      <ProfesionalesManager
        initialProfesionales={[]}
        centroId=""
        demoMode={false}
        loadError="No pudimos cargar el centro asociado a tu usuario."
      />
    )
  }

  if (!membership?.centro_id) {
    return (
      <ProfesionalesManager
        initialProfesionales={[]}
        centroId=""
        demoMode={false}
        loadError={`No encontramos un centro asociado a ${user.email ?? demoUser.nombre}.`}
      />
    )
  }

  const { data: profesionales, error: profesionalesError } = await supabase
    .from('miembros_centro')
    .select(
      'id,profile_id,rol,especialidad,avatar_url,descanso_entre_reservas_minutos,duracion_sesion_minutos,intervalo_reservas_minutos,activo,created_at,updated_at,profiles!inner(nombre,apellido,email,telefono,avatar_url)'
    )
    .eq('centro_id', membership.centro_id)
    .in('rol', ['owner', 'admin', 'profesional'])
    .order('created_at', { ascending: false })

  const { data: reminderConfigs, error: reminderConfigsError } = await supabase
    .from('configuracion_recordatorios_profesional')
    .select('profesional_id,email_subject_template,email_body_template')
    .eq('centro_id', membership.centro_id)
  const [snapshot, usage] = await Promise.all([
    getPlanSnapshotForCentro(supabase, membership.centro_id),
    getOrganizationUsage(supabase, membership.centro_id),
  ])

  const reminderConfigByProfileId = new Map(
    ((reminderConfigs ?? []) as ProfesionalReminderConfig[]).map((config) => [
      config.profesional_id,
      config,
    ])
  )

  return (
    <ProfesionalesManager
      initialProfesionales={((profesionales ?? []) as unknown as ProfesionalQueryRow[]).map(
        (profesional) =>
          toProfesionalListItem(
            profesional,
            reminderConfigByProfileId.get(profesional.profile_id)
          )
      )}
      centroId={membership.centro_id}
      demoMode={false}
      planContext={{ ...snapshot, usage }}
      loadError={
        profesionalesError || reminderConfigsError
          ? 'No pudimos cargar profesionales. Revisa permisos de Supabase e intenta nuevamente.'
          : undefined
      }
    />
  )
}
