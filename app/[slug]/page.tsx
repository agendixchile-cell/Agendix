import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MapPin, Phone, Mail, Clock, Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { diasSemana, defaultHorariosCentro, normalizeHorarios } from '@/lib/centro/horarios'
import type { HorarioCentro } from '@/lib/centro/types'
import type { Servicio } from '@/lib/types/app'
import { isDemoMode } from '@/lib/auth/demo'
import { demoCentro } from '@/lib/centro/demo'
import { demoServicios } from '@/lib/servicios/demo'
import { demoProfesionales } from '@/lib/profesionales/demo'
import { ReservaModal } from './reserva-modal'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  if (isDemoMode() && slug === demoCentro.slug) {
    return {
      title: demoCentro.nombre,
      description: `Reserva tu hora en ${demoCentro.nombre}. Agenda online disponible.`,
    }
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('centros')
    .select('nombre')
    .eq('slug', slug)
    .eq('activo', true)
    .maybeSingle()

  if (!data) return { title: 'Centro no encontrado' }

  return {
    title: data.nombre,
    description: `Reserva tu hora en ${data.nombre}. Agenda online disponible.`,
  }
}

type CentroPublico = {
  id: string
  nombre: string
  slug: string
  direccion: string | null
  telefono: string | null
  email: string | null
}

type ProfesionalPublico = {
  id: string
  nombre: string
  especialidad: string | null
}

export default async function CentroPublicoPage({ params }: Props) {
  const { slug } = await params

  // Modo demo — sirve datos en memoria sin tocar Supabase
  if (isDemoMode() && slug === demoCentro.slug) {
    const servicios = demoServicios.filter((s) => s.activo) as unknown as Servicio[]
    const horarios = normalizeHorarios(defaultHorariosCentro)
    const profesionales: ProfesionalPublico[] = demoProfesionales
      .filter((p) => p.activo)
      .map((p) => ({
        id: p.profile_id,
        nombre: p.nombre + (p.apellido ? ` ${p.apellido}` : ''),
        especialidad: p.especialidad,
      }))

    return (
      <CentroView
        centro={demoCentro}
        servicios={servicios}
        horarios={horarios}
        profesionales={profesionales}
        demoMode
      />
    )
  }

  const supabase = await createClient()

  const { data: centro } = await supabase
    .from('centros')
    .select('id,nombre,slug,direccion,telefono,email')
    .eq('slug', slug)
    .eq('activo', true)
    .maybeSingle()

  if (!centro) notFound()

  const [{ data: serviciosData }, { data: horariosData }, { data: profesionalesData }] =
    await Promise.all([
      supabase
        .from('servicios')
        .select('id,nombre,descripcion,duracion_minutos,precio')
        .eq('centro_id', centro.id)
        .eq('activo', true)
        .order('nombre'),
      supabase
        .from('horarios_centro')
        .select('dia,activo,inicio,fin,descanso_activo,descanso_inicio,descanso_fin')
        .eq('centro_id', centro.id)
        .order('dia'),
      supabase
        .from('miembros_centro')
        .select('profile_id,profiles!inner(nombre,apellido)')
        .eq('centro_id', centro.id)
        .eq('rol', 'profesional')
        .eq('activo', true),
    ])

  const servicios = (serviciosData ?? []) as Servicio[]
  const horarios = normalizeHorarios((horariosData ?? []) as HorarioCentro[])
  const profesionales: ProfesionalPublico[] = (
    (profesionalesData ?? []) as Array<{
      profile_id: string
      profiles: { nombre: string; apellido: string | null }
    }>
  ).map((m) => ({
    id: m.profile_id,
    nombre: m.profiles.nombre + (m.profiles.apellido ? ` ${m.profiles.apellido}` : ''),
    especialidad: null,
  }))

  return (
    <CentroView
      centro={centro}
      servicios={servicios}
      horarios={horarios}
      profesionales={profesionales}
      demoMode={false}
    />
  )
}

function CentroView({
  centro,
  servicios,
  horarios,
  profesionales,
  demoMode,
}: {
  centro: CentroPublico
  servicios: Servicio[]
  horarios: HorarioCentro[]
  profesionales: ProfesionalPublico[]
  demoMode: boolean
}) {
  const diasActivos = horarios.filter((h) => h.activo)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-200/60">
                <Heart size={20} />
              </span>
              <span className="text-lg font-bold text-slate-900">{centro.nombre}</span>
            </div>
            <a
              href={`mailto:${centro.email}`}
              className="hidden rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-600/20 transition hover:bg-orange-600 sm:block"
            >
              Contactar
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="overflow-hidden rounded-2xl bg-[#22211F] px-6 py-8 text-white shadow-xl shadow-slate-950/12 sm:px-8 sm:py-10">
          <p className="mb-2 text-sm font-semibold uppercase text-white/55">
            Centro de salud
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{centro.nombre}</h1>

          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {centro.direccion && (
              <span className="flex items-center gap-2 text-white/70">
                <MapPin size={15} />
                {centro.direccion}
              </span>
            )}
            {centro.telefono && (
              <a
                href={`tel:${centro.telefono}`}
                className="flex items-center gap-2 text-white/70 transition hover:text-white"
              >
                <Phone size={15} />
                {centro.telefono}
              </a>
            )}
            {centro.email && (
              <a
                href={`mailto:${centro.email}`}
                className="flex items-center gap-2 text-white/70 transition hover:text-white"
              >
                <Mail size={15} />
                {centro.email}
              </a>
            )}
          </div>

          <div className="mt-8">
            <ReservaModal
              centroId={centro.id}
              centroNombre={centro.nombre}
              servicios={servicios}
              profesionales={profesionales}
              horarios={horarios}
              demoMode={demoMode}
            />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {/* Servicios */}
            {servicios.length > 0 && (
              <section>
                <h2 className="mb-4 text-base font-bold text-slate-900">Servicios</h2>
                <div className="space-y-3">
                  {servicios.map((servicio) => (
                    <div
                      key={servicio.id}
                      className="agendix-surface flex items-start justify-between gap-4 rounded-2xl p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{servicio.nombre}</p>
                        {servicio.descripcion && (
                          <p className="mt-1 text-sm text-slate-500">{servicio.descripcion}</p>
                        )}
                        <p className="mt-2 text-xs text-slate-400">
                          {servicio.duracion_minutos} min
                        </p>
                      </div>
                      {servicio.precio != null && (
                        <p className="shrink-0 text-sm font-bold text-orange-600">
                          ${servicio.precio.toLocaleString('es-CL')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Profesionales */}
            {profesionales.length > 0 && (
              <section>
                <h2 className="mb-4 text-base font-bold text-slate-900">Nuestro equipo</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {profesionales.map((p) => {
                    const initials = p.nombre
                      .split(' ')
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()

                    return (
                      <div
                        key={p.id}
                        className="agendix-surface flex items-center gap-3 rounded-2xl p-4"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-orange-500">
                          {initials}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{p.nombre}</p>
                          {p.especialidad && (
                            <p className="text-xs text-slate-500">{p.especialidad}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {servicios.length === 0 && profesionales.length === 0 && (
              <div className="agendix-surface rounded-2xl p-6 text-center text-sm text-slate-400">
                Información del centro próximamente disponible.
              </div>
            )}
          </div>

          {/* Sidebar — horarios */}
          <aside className="space-y-4">
            <div className="agendix-surface rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <Clock size={16} className="text-orange-500" />
                <h2 className="text-sm font-bold text-slate-900">Horario de atención</h2>
              </div>

              {diasActivos.length === 0 ? (
                <p className="text-sm text-slate-400">Horario no disponible.</p>
              ) : (
                <ul className="space-y-2">
                  {horarios.map((h) => {
                    const dia = diasSemana.find((d) => d.dia === h.dia)
                    return (
                      <li
                        key={h.dia}
                        className="flex items-center justify-between text-sm"
                      >
                        <span
                          className={
                            h.activo ? 'font-medium text-slate-700' : 'text-slate-400'
                          }
                        >
                          {dia?.label}
                        </span>
                        {h.activo ? (
                          <span className="text-right font-semibold text-slate-900">
                            {h.inicio} – {h.fin}
                            {h.descanso_activo && (
                              <span className="block text-xs font-medium text-slate-400">
                                Descanso {h.descanso_inicio} – {h.descanso_fin}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">Cerrado</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {centro.direccion && (
              <div className="agendix-surface rounded-2xl p-5">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin size={16} className="text-orange-500" />
                  <h2 className="text-sm font-bold text-slate-900">Ubicación</h2>
                </div>
                <p className="text-sm text-slate-600">{centro.direccion}</p>
              </div>
            )}
          </aside>
        </div>
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        Powered by{' '}
        <span className="font-semibold text-orange-500">Agendix</span>
      </footer>
    </div>
  )
}
