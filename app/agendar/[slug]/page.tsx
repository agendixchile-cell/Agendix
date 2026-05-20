import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicBookingFlow } from '@/components/booking/public-booking-flow'
import { isDemoMode } from '@/lib/auth/demo'
import { demoCentro } from '@/lib/centro/demo'
import {
  defaultHorariosCentro,
  normalizeHorarios,
} from '@/lib/centro/horarios'
import type { HorarioCentro } from '@/lib/centro/types'
import type { PublicBookingData } from '@/lib/booking/types'
import { demoProfesionales } from '@/lib/profesionales/demo'
import { demoReservas } from '@/lib/reservas/demo'
import { demoSalas } from '@/lib/salas/demo'
import { demoServicios } from '@/lib/servicios/demo'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{ slug: string }>
}

type CentroRow = {
  id: string
  nombre: string
  slug: string
  direccion: string | null
  telefono: string | null
  email: string | null
  logo_url: string | null
}

type ServicioRow = {
  id: string
  nombre: string
  descripcion: string | null
  duracion_minutos: number
  precio: number | null
}

type ProfesionalRow = {
  profile_id: string
  descanso_entre_reservas_minutos: number | null
  duracion_sesion_minutos: number | null
  intervalo_reservas_minutos: number | null
  profiles: {
    nombre: string
    apellido: string | null
    avatar_url: string | null
  } | null
}

type BusyReservaRow = {
  profesional_id: string
  fecha_inicio: string
  fecha_fin: string
}

type ScheduleBlockRow = {
  profesional_id: string | null
  fecha_inicio: string
  fecha_fin: string
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params

  if (isDemoMode() && slug === demoCentro.slug) {
    return {
      title: `Agendar hora | ${demoCentro.nombre}`,
      description: `Reserva una hora online en ${demoCentro.nombre}.`,
    }
  }

  const supabase = createAdminClient() ?? (await createClient())
  const { data } = await supabase
    .from('centros')
    .select('nombre')
    .eq('slug', slug)
    .eq('activo', true)
    .eq('public_booking_enabled', true)
    .maybeSingle()

  return {
    title: data?.nombre ? `Agendar hora | ${data.nombre}` : 'Agendar hora',
    description: data?.nombre
      ? `Reserva una hora online en ${data.nombre}.`
      : 'Agenda online con Agendix.',
  }
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getPublicBookingData(slug)

  if (!data) notFound()

  return <PublicBookingFlow data={data} slug={slug} />
}

async function getPublicBookingData(
  slug: string
): Promise<PublicBookingData | null> {
  if (isDemoMode() && slug === demoCentro.slug) {
    const horarios = normalizeHorarios(defaultHorariosCentro)

    return {
      centro: {
        id: demoCentro.id,
        nombre: demoCentro.nombre,
        slug: demoCentro.slug,
        descripcion:
          'Agenda simple para consultas, terapias y sesiones clínicas en un entorno cuidado.',
        direccion: demoCentro.direccion,
        telefono: demoCentro.telefono,
        email: demoCentro.email,
        logoUrl: demoCentro.logo_url,
      },
      servicios: demoServicios
        .filter((servicio) => servicio.activo)
        .map((servicio) => ({
          id: servicio.id,
          nombre: servicio.nombre,
          descripcion: servicio.descripcion,
          duracionMinutos: servicio.duracion_minutos,
          precio: servicio.precio,
          moneda: 'CLP',
          modalidad: 'presencial',
        })),
      profesionales: demoProfesionales
        .filter((profesional) => profesional.activo)
        .map((profesional) => ({
          id: profesional.profile_id,
          nombre: profesional.nombre,
          especialidad: profesional.especialidad,
          bio: null,
          avatarUrl: null,
          descansoEntreReservasMinutos:
            profesional.descanso_entre_reservas_minutos ?? 0,
          duracionSesionMinutos: profesional.duracion_sesion_minutos ?? 60,
          intervaloReservasMinutos:
            profesional.intervalo_reservas_minutos ?? 60,
        })),
      horarios,
      busySlots: demoReservas.map((reserva) => ({
        profesionalId: reserva.profesional.id,
        fechaInicio: reserva.fecha_inicio,
        fechaFin: reserva.fecha_fin,
      })),
      scheduleBlocks: [],
      activeRoomCount: Math.max(1, demoSalas.filter((sala) => sala.activa).length),
      demoMode: true,
    }
  }

  const supabase = createAdminClient() ?? (await createClient())
  const { data: centro } = await supabase
    .from('centros')
    .select('id,nombre,slug,direccion,telefono,email,logo_url')
    .eq('slug', slug)
    .eq('activo', true)
    .eq('public_booking_enabled', true)
    .maybeSingle()

  if (!centro) return null

  const now = new Date()
  const until = new Date(now.getTime() + 60 * 24 * 60 * 60_000)

  const [
    { data: serviciosData },
    { data: profesionalesData },
    { data: horariosData },
    { data: salasData },
    { data: reservasData },
    { data: blocksData },
  ] = await Promise.all([
    supabase
      .from('servicios')
      .select('id,nombre,descripcion,duracion_minutos,precio')
      .eq('centro_id', centro.id)
      .eq('activo', true)
      .eq('public_visible', true)
      .order('nombre'),
    supabase
      .from('miembros_centro')
      .select(
        'profile_id,descanso_entre_reservas_minutos,duracion_sesion_minutos,intervalo_reservas_minutos,profiles!inner(nombre,apellido,avatar_url)'
      )
      .eq('centro_id', centro.id)
      .eq('activo', true)
      .eq('public_visible', true)
      .in('rol', ['owner', 'admin', 'profesional']),
    supabase
      .from('horarios_centro')
      .select('dia,activo,inicio,fin,descanso_activo,descanso_inicio,descanso_fin')
      .eq('centro_id', centro.id)
      .order('dia'),
    supabase
      .from('salas')
      .select('id')
      .eq('centro_id', centro.id)
      .eq('activa', true),
    supabase
      .from('reservas')
      .select('profesional_id,fecha_inicio,fecha_fin')
      .eq('centro_id', centro.id)
      .neq('estado', 'cancelled')
      .gte('fecha_inicio', now.toISOString())
      .lte('fecha_inicio', until.toISOString()),
    supabase
      .from('bloqueos_agenda')
      .select('profesional_id,fecha_inicio,fecha_fin')
      .eq('centro_id', centro.id)
      .gte('fecha_fin', now.toISOString())
      .lte('fecha_inicio', until.toISOString()),
  ])

  const centroRow = centro as CentroRow
  const horarios =
    horariosData && horariosData.length > 0
      ? normalizeHorarios(horariosData as HorarioCentro[])
      : normalizeHorarios(defaultHorariosCentro)

  return {
    centro: {
      id: centroRow.id,
      nombre: centroRow.nombre,
      slug: centroRow.slug,
      descripcion: null,
      direccion: centroRow.direccion,
      telefono: centroRow.telefono,
      email: centroRow.email,
      logoUrl: centroRow.logo_url,
    },
    servicios: ((serviciosData ?? []) as ServicioRow[]).map((servicio) => ({
      id: servicio.id,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      duracionMinutos: servicio.duracion_minutos,
      precio: servicio.precio,
      moneda: 'CLP',
      modalidad: 'presencial',
    })),
    profesionales: ((profesionalesData ?? []) as unknown as ProfesionalRow[]).map(
      (miembro) => {
        const profile = miembro.profiles
        const nombre = [
          profile?.nombre ?? 'Profesional',
          profile?.apellido ?? '',
        ]
          .filter(Boolean)
          .join(' ')

        return {
          id: miembro.profile_id,
          nombre,
          especialidad: null,
          bio: null,
          avatarUrl: profile?.avatar_url ?? null,
          descansoEntreReservasMinutos:
            miembro.descanso_entre_reservas_minutos ?? 0,
          duracionSesionMinutos: miembro.duracion_sesion_minutos ?? 60,
          intervaloReservasMinutos:
            miembro.intervalo_reservas_minutos ?? 60,
        }
      }
    ),
    horarios,
    busySlots: ((reservasData ?? []) as BusyReservaRow[]).map((reserva) => ({
      profesionalId: reserva.profesional_id,
      fechaInicio: reserva.fecha_inicio,
      fechaFin: reserva.fecha_fin,
    })),
    scheduleBlocks: ((blocksData ?? []) as ScheduleBlockRow[]).map((block) => ({
      profesionalId: block.profesional_id,
      fechaInicio: block.fecha_inicio,
      fechaFin: block.fecha_fin,
    })),
    activeRoomCount: Math.max(1, salasData?.length ?? 0),
    demoMode: false,
  }
}
