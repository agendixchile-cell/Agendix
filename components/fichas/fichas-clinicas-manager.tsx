'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  CalendarDays,
  ClipboardList,
  Edit3,
  FileText,
  RotateCcw,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { saveFichaClinicaAction } from '@/app/actions/fichas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { FormModal } from '@/components/ui/form-modal'
import { PageHeader } from '@/components/ui/page-header'
import { SearchField } from '@/components/ui/search-field'
import type {
  EvolucionSesionListItem,
  FichaClinicaListItem,
} from '@/lib/fichas/types'
import {
  fichaClinicaSchema,
  type FichaClinicaFormValues,
} from '@/lib/fichas/validation'
import {
  readDemoStorageItem,
  removeDemoStorageItem,
  writeDemoStorageItem,
} from '@/lib/demo-storage'
import type { PacienteListItem } from '@/lib/pacientes/types'
import type { PlanId } from '@/lib/plans'
import type { ReservaListItem } from '@/lib/reservas/types'
import { migrateLegacyAgendixStorage } from '@/lib/storage/migrations'

type FichasClinicasManagerProps = {
  initialPacientes: PacienteListItem[]
  initialFichas: FichaClinicaListItem[]
  initialEvoluciones: EvolucionSesionListItem[]
  initialReservas: ReservaListItem[]
  initialSelectedPacienteId?: string
  demoMode: boolean
  demoPlanId?: PlanId
  loadError?: string
}

function nowIso() {
  return new Date().toISOString()
}

function demoId(prefix: string) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}`
}

function fullName(paciente: Pick<PacienteListItem, 'nombre' | 'apellido'>) {
  return [paciente.nombre, paciente.apellido].filter(Boolean).join(' ')
}

function formatDate(iso?: string | null) {
  if (!iso) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso.includes('T') ? iso : `${iso}T00:00:00`))
}

function emptyFichaValues(pacienteId = ''): FichaClinicaFormValues {
  return {
    paciente_id: pacienteId,
    antecedentes_relevantes: '',
    motivo_consulta: '',
    diagnostico_hipotesis: '',
    notas_clinicas: '',
  }
}

export function FichasClinicasManager({
  initialPacientes,
  initialFichas,
  initialEvoluciones,
  initialReservas,
  initialSelectedPacienteId,
  demoMode,
  demoPlanId,
  loadError,
}: FichasClinicasManagerProps) {
  const [pacientes, setPacientes] = useState(initialPacientes)
  const [fichas, setFichas] = useState(initialFichas)
  const [evoluciones, setEvoluciones] = useState(initialEvoluciones)
  const [reservas, setReservas] = useState(initialReservas)
  const [search, setSearch] = useState('')
  const [selectedPacienteId, setSelectedPacienteId] = useState(
    initialSelectedPacienteId ?? initialPacientes[0]?.id ?? ''
  )
  const [editing, setEditing] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(
    loadError ? { type: 'error', message: loadError } : null
  )
  const [isPending, startTransition] = useTransition()

  const form = useForm<FichaClinicaFormValues>({
    resolver: zodResolver(fichaClinicaSchema),
    defaultValues: emptyFichaValues(selectedPacienteId),
  })

  useEffect(() => {
    if (!demoMode) return

    migrateLegacyAgendixStorage(demoPlanId)

    let storedFichas: FichaClinicaListItem[] | null = null

    try {
      const stored = readDemoStorageItem(demoPlanId, 'fichas-clinicas')

      if (stored) {
        const parsed = JSON.parse(stored)

        if (Array.isArray(parsed)) {
          storedFichas = parsed as FichaClinicaListItem[]
        }
      }
    } catch {
      removeDemoStorageItem(demoPlanId, 'fichas-clinicas')
    }

    window.setTimeout(() => {
      setPacientes(initialPacientes)
      setFichas(storedFichas ?? initialFichas)
      setEvoluciones(initialEvoluciones)
      setReservas(initialReservas)
      setSelectedPacienteId(initialSelectedPacienteId ?? initialPacientes[0]?.id ?? '')
    }, 0)
  }, [
    demoMode,
    demoPlanId,
    initialEvoluciones,
    initialFichas,
    initialPacientes,
    initialReservas,
    initialSelectedPacienteId,
  ])

  const filteredPacientes = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return pacientes

    return pacientes.filter((paciente) =>
      [fullName(paciente), paciente.rut, paciente.email, paciente.telefono]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [pacientes, search])

  const selectedPaciente =
    pacientes.find((paciente) => paciente.id === selectedPacienteId) ??
    filteredPacientes[0] ??
    pacientes[0]

  const selectedFicha = selectedPaciente
    ? fichas.find((ficha) => ficha.paciente_id === selectedPaciente.id)
    : undefined

  const selectedReservas = selectedPaciente
    ? reservas.filter(
        (reserva) =>
          reserva.paciente.id === selectedPaciente.id &&
          reserva.estado !== 'cancelled'
      )
    : []

  const selectedEvoluciones = selectedPaciente
    ? evoluciones
        .filter((evolucion) => evolucion.paciente_id === selectedPaciente.id)
        .sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        )
    : []

  const saveDemoFichas = (nextFichas: FichaClinicaListItem[]) => {
    setFichas(nextFichas)
    writeDemoStorageItem(
      demoPlanId,
      'fichas-clinicas',
      JSON.stringify(nextFichas)
    )
  }

  const resetDemo = () => {
    saveDemoFichas(initialFichas)
    setFeedback({ type: 'success', message: 'Demo restablecido.' })
  }

  const openEdit = () => {
    if (!selectedPaciente) return

    form.reset({
      paciente_id: selectedPaciente.id,
      antecedentes_relevantes:
        selectedFicha?.antecedentes_relevantes ?? '',
      motivo_consulta: selectedFicha?.motivo_consulta ?? '',
      diagnostico_hipotesis: selectedFicha?.diagnostico_hipotesis ?? '',
      notas_clinicas: selectedFicha?.notas_clinicas ?? '',
    })
    setEditing(true)
  }

  const closeEdit = () => {
    setEditing(false)
    form.reset(emptyFichaValues(selectedPaciente?.id))
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!selectedPaciente) return

    if (demoMode) {
      const timestamp = nowIso()
      const nextFicha: FichaClinicaListItem = {
        id: selectedFicha?.id ?? demoId('demo-ficha'),
        centro_id: selectedFicha?.centro_id ?? 'demo-centro',
        paciente_id: selectedPaciente.id,
        antecedentes_relevantes:
          values.antecedentes_relevantes?.trim() || null,
        motivo_consulta: values.motivo_consulta?.trim() || null,
        diagnostico_hipotesis: values.diagnostico_hipotesis?.trim() || null,
        notas_clinicas: values.notas_clinicas?.trim() || null,
        documentos: selectedFicha?.documentos ?? null,
        created_at: selectedFicha?.created_at ?? timestamp,
        updated_at: timestamp,
      }
      const nextFichas = selectedFicha
        ? fichas.map((ficha) => (ficha.id === nextFicha.id ? nextFicha : ficha))
        : [nextFicha, ...fichas]
      saveDemoFichas(nextFichas)
      setFeedback({ type: 'success', message: 'Ficha clínica guardada en modo demo.' })
      closeEdit()
      return
    }

    startTransition(async () => {
      const result = await saveFichaClinicaAction(values)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.ficha) {
        const savedFicha = result.ficha
        setFichas((current) => {
          const exists = current.some((ficha) => ficha.id === savedFicha.id)
          return exists
            ? current.map((ficha) =>
                ficha.id === savedFicha.id ? savedFicha : ficha
              )
            : [savedFicha, ...current]
        })
      }

      setFeedback({ type: 'success', message: result.message })
      closeEdit()
    })
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fichas clínicas"
        description="Selecciona un paciente para ver o editar su ficha clínica y registrar la información de agenda."
        eyebrow="Registro clínico"
        icon={ClipboardList}
        meta={demoMode && <Badge tone="slate">Modo demo</Badge>}
      >
        {demoMode && (
          <Button type="button" variant="secondary" onClick={resetDemo}>
            <RotateCcw size={16} aria-hidden="true" />
            Restablecer demo
          </Button>
        )}
        <Button onClick={openEdit} disabled={!selectedPaciente}>
          <Edit3 size={16} aria-hidden="true" />
          Editar ficha
        </Button>
      </PageHeader>

      {feedback && (
        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
      )}

      {pacientes.length === 0 ? (
        <EmptyState
          title="Aún no hay pacientes"
          description="Cuando tengas pacientes registrados podrás abrir su ficha, revisar sesiones y documentar evoluciones clínicas."
          icon={UserRound}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr] 2xl:grid-cols-[380px_1fr]">
          <section className="agendix-surface overflow-hidden rounded-2xl">
            <div className="border-b border-slate-200/80 p-4">
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Buscar paciente"
                label="Buscar pacientes"
              />
            </div>
            <div className="max-h-[640px] overflow-y-auto p-2">
              {filteredPacientes.map((paciente) => {
                const active = paciente.id === selectedPaciente?.id
                const hasFicha = fichas.some(
                  (ficha) => ficha.paciente_id === paciente.id
                )

                return (
                  <button
                    key={paciente.id}
                    type="button"
                    onClick={() => setSelectedPacienteId(paciente.id)}
                    className={`w-full rounded-xl p-3 text-left transition ${
                      active
                        ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200/60'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {fullName(paciente)}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {paciente.rut || paciente.email || paciente.telefono || 'Sin identificador'}
                        </p>
                      </div>
                      <Badge tone={hasFicha ? 'green' : 'slate'}>
                        {hasFicha ? 'Ficha' : 'Nueva'}
                      </Badge>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {selectedPaciente && (
            <section className="space-y-4">
              <div className="agendix-surface rounded-2xl p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Paciente
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-800">
                      {fullName(selectedPaciente)}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedPaciente.rut || 'Sin RUT'} ·{' '}
                      {selectedPaciente.telefono || selectedPaciente.email || 'Sin contacto'}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={openEdit}>
                    <Edit3 size={16} aria-hidden="true" />
                    Editar ficha
                  </Button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <FichaBlock
                    title="Historia clínica"
                    value={selectedFicha?.motivo_consulta}
                  />
                  <FichaBlock
                    title="Tratamiento"
                    value={selectedFicha?.diagnostico_hipotesis}
                  />
                  <FichaBlock
                    title="Antecedentes"
                    value={selectedFicha?.antecedentes_relevantes}
                  />
                  <FichaBlock
                    title="Configuración"
                    value={selectedFicha?.notas_clinicas}
                  />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <HistoryPanel
                  title="Historial de citas"
                  icon={CalendarDays}
                  empty="Sin citas registradas"
                >
                  {selectedReservas.map((reserva) => (
                    <div
                      key={reserva.id}
                      className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3"
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        {formatDate(reserva.fecha_inicio)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {reserva.servicio.nombre} · {reserva.profesional.nombre}
                      </p>
                    </div>
                  ))}
                </HistoryPanel>

                <HistoryPanel
                  title="Fichas de agenda"
                  icon={FileText}
                  empty="Sin ficha clínica registrada"
                >
                  {selectedEvoluciones.map((evolucion) => (
                    <div
                      key={evolucion.id}
                      className="rounded-xl border border-slate-200/70 bg-white p-3"
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        {formatDate(evolucion.fecha)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {evolucion.texto_evolucion}
                      </p>
                      {evolucion.proximos_pasos && (
                        <p className="mt-2 text-sm text-slate-500">
                          Tratamiento: {evolucion.proximos_pasos}
                        </p>
                      )}
                    </div>
                  ))}
                </HistoryPanel>
              </div>
            </section>
          )}
        </div>
      )}

      {editing && selectedPaciente && (
        <FormModal
          title="Ficha clínica"
          description={fullName(selectedPaciente)}
          onClose={closeEdit}
        >
          <form onSubmit={onSubmit} className="space-y-5 px-5 py-5" noValidate>
            <input type="hidden" {...form.register('paciente_id')} />

            <Field
              label="Historia clínica"
              error={form.formState.errors.motivo_consulta?.message}
            >
              <textarea
                rows={3}
                className="agendix-input min-h-28 resize-y"
                placeholder="Historia clínica, motivo principal y detalle libre de la ficha"
                {...form.register('motivo_consulta')}
              />
            </Field>

            <Field
              label="Tratamiento"
              error={form.formState.errors.diagnostico_hipotesis?.message}
            >
              <textarea
                rows={3}
                className="agendix-input min-h-24 resize-y"
                placeholder="Tratamiento, plan, objetivos o seguimiento"
                {...form.register('diagnostico_hipotesis')}
              />
            </Field>

            <Field
              label="Antecedentes"
              error={form.formState.errors.antecedentes_relevantes?.message}
            >
              <textarea
                rows={3}
                className="agendix-input min-h-24 resize-y"
                placeholder="Antecedentes médicos, familiares, tratamientos previos o alertas"
                {...form.register('antecedentes_relevantes')}
              />
            </Field>

            <Field
              label="Configuración"
              error={form.formState.errors.notas_clinicas?.message}
            >
              <textarea
                rows={4}
                className="agendix-input min-h-28 resize-y"
                placeholder="Notas internas, configuración del caso o información que quieras ordenar a tu manera"
                {...form.register('notas_clinicas')}
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeEdit}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : 'Guardar ficha'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  )
}

function FichaBlock({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {value || 'Sin información registrada.'}
      </p>
    </div>
  )
}

function HistoryPanel({
  title,
  icon: Icon,
  empty,
  children,
}: {
  title: string
  icon: LucideIcon
  empty: string
  children: React.ReactNode
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)

  return (
    <section className="agendix-surface rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-200/60">
          <Icon size={17} aria-hidden="true" />
        </span>
        <h3 className="text-sm font-medium text-slate-800">{title}</h3>
      </div>
      <div className="space-y-3">
        {hasChildren ? (
          children
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-6 text-center text-sm text-slate-400">
            {empty}
          </p>
        )}
      </div>
    </section>
  )
}
