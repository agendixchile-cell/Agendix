'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import {
  CalendarClock,
  Edit3,
  FileText,
  HeartHandshake,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Tags,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react'
import {
  createPacienteAction,
  deletePacienteAction,
  updatePacienteAction,
} from '@/app/actions/pacientes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { FormModal } from '@/components/ui/form-modal'
import { MetricStrip } from '@/components/ui/metric-strip'
import { PageHeader } from '@/components/ui/page-header'
import { SearchField } from '@/components/ui/search-field'
import { PlanLimitBanner } from '@/components/plans/plan-limit-banner'
import { UpgradeCard } from '@/components/plans/upgrade-card'
import { UsageMeter } from '@/components/plans/usage-meter'
import type { PacienteListItem } from '@/lib/pacientes/types'
import {
  pacienteSchema,
  type PacienteFormInput,
  type PacienteFormValues,
} from '@/lib/pacientes/validation'
import {
  canCreateActivePatient,
  getPatientLimit,
  hasFeature,
  type PlanUsageContext,
} from '@/lib/plans'
import {
  readDemoStorageItem,
  removeDemoStorageItem,
  writeDemoStorageItem,
} from '@/lib/demo-storage'
import { migrateLegacyAgendixStorage } from '@/lib/storage/migrations'

type PacientesManagerProps = {
  initialPacientes: PacienteListItem[]
  demoMode: boolean
  loadError?: string
  planContext?: PlanUsageContext
}

type ModalState =
  | {
      mode: 'create'
      paciente?: undefined
    }
  | {
      mode: 'edit'
      paciente: PacienteListItem
    }

const emptyValues: PacienteFormInput = {
  nombre: '',
  apellido: '',
  rut: '',
  email: '',
  telefono: '',
  fecha_nacimiento: '',
  notas: '',
  activo: true,
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

function formatDate(date?: string | null) {
  if (!date) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function contactoPrincipal(paciente: PacienteListItem) {
  return paciente.telefono || paciente.email || 'Sin contacto'
}

export function PacientesManager({
  initialPacientes,
  demoMode,
  loadError,
  planContext,
}: PacientesManagerProps) {
  const router = useRouter()
  const [pacientes, setPacientes] = useState(initialPacientes)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(
    loadError ? { type: 'error', message: loadError } : null
  )
  const [modal, setModal] = useState<ModalState | null>(null)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const demoPlanId = planContext?.planId

  const form = useForm<PacienteFormInput, unknown, PacienteFormValues>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!demoMode) return

    migrateLegacyAgendixStorage(demoPlanId)

    let storedValue: PacienteListItem[] | null = null

    try {
      const storedPacientes = readDemoStorageItem(demoPlanId, 'pacientes')

      if (storedPacientes) {
        const parsedPacientes = JSON.parse(storedPacientes)

        if (Array.isArray(parsedPacientes)) {
          storedValue = (parsedPacientes as PacienteListItem[]).map((paciente) => ({
            ...paciente,
            activo: paciente.activo !== false,
          }))
        }
      }
    } catch {
      removeDemoStorageItem(demoPlanId, 'pacientes')
    }

    window.setTimeout(() => {
      setPacientes(storedValue ?? initialPacientes)
    }, 0)
  }, [demoMode, demoPlanId, initialPacientes])

  const filteredPacientes = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return pacientes

    return pacientes.filter((paciente) => {
      const searchable = [
        fullName(paciente),
        paciente.rut,
        paciente.email,
        paciente.telefono,
        paciente.notas,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(term)
    })
  }, [pacientes, search])

  const activeCount = pacientes.filter((paciente) => paciente.activo !== false).length
  const inactiveCount = pacientes.length - activeCount
  const patientLimit = planContext ? getPatientLimit(planContext.planId) : null
  const reachedPatientLimit =
    patientLimit !== null && activeCount >= patientLimit
  const withContactCount = pacientes.filter(
    (paciente) => paciente.email || paciente.telefono
  ).length
  const withRutCount = pacientes.filter((paciente) => paciente.rut).length
  const withNotesCount = pacientes.filter((paciente) => paciente.notas).length

  const saveDemoPacientes = (nextPacientes: PacienteListItem[]) => {
    setPacientes(nextPacientes)
    writeDemoStorageItem(demoPlanId, 'pacientes', JSON.stringify(nextPacientes))
  }

  const openCreate = () => {
    setFeedback(null)
    form.reset({
      ...emptyValues,
      activo: !reachedPatientLimit,
    })
    if (reachedPatientLimit) {
      setFeedback({
        type: 'error',
        message:
          'Alcanzaste el máximo de 50 pacientes activos de tu plan. Mejora tu plan para seguir creciendo.',
      })
    }
    setModal({ mode: 'create' })
  }

  const openEdit = (paciente: PacienteListItem) => {
    setFeedback(null)
    form.reset({
      nombre: paciente.nombre,
      apellido: paciente.apellido ?? '',
      rut: paciente.rut ?? '',
      email: paciente.email ?? '',
      telefono: paciente.telefono ?? '',
      fecha_nacimiento: paciente.fecha_nacimiento ?? '',
      notas: paciente.notas ?? '',
      activo: paciente.activo,
    })
    setModal({ mode: 'edit', paciente })
  }

  const closeModal = () => {
    setModal(null)
    form.reset(emptyValues)
  }

  const resetDemo = () => {
    saveDemoPacientes(initialPacientes)
    setFeedback({ type: 'success', message: 'Demo restablecido.' })
  }

  const handleDelete = (paciente: PacienteListItem) => {
    const pacienteName = fullName(paciente)
    const confirmed = window.confirm(
      `¿Eliminar a ${pacienteName}? Esta acción no se puede deshacer y también quitará sus reservas y fichas asociadas.`
    )

    if (!confirmed) return

    setFeedback(null)

    if (demoMode) {
      saveDemoPacientes(
        pacientes.filter((currentPaciente) => currentPaciente.id !== paciente.id)
      )
      setFeedback({ type: 'success', message: 'Paciente eliminado en modo demo.' })
      return
    }

    startTransition(async () => {
      const result = await deletePacienteAction(paciente.id)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      setPacientes((current) =>
        current.filter((currentPaciente) => currentPaciente.id !== paciente.id)
      )
      setFeedback({ type: 'success', message: result.message })
      router.refresh()
    })
  }

  const handleDemoSave = (values: PacienteFormValues) => {
    const normalizedEmail = values.email?.trim().toLowerCase() || null
    const normalizedRut = values.rut?.trim() || null
    const duplicateRut =
      normalizedRut &&
      pacientes.some(
        (paciente) =>
          paciente.rut?.toLowerCase() === normalizedRut.toLowerCase() &&
          paciente.id !== modal?.paciente?.id
      )

    if (duplicateRut) {
      setFeedback({
        type: 'error',
        message: 'Ya existe un paciente con ese RUT en el demo.',
      })
      return
    }

    if (modal?.mode === 'edit') {
      const activatingPaciente = values.activo && modal.paciente.activo === false

      if (demoMode && activatingPaciente && planContext) {
        const capacity = canCreateActivePatient({
          planId: planContext.planId,
          currentActivePatients: activeCount,
        })

        if (!capacity.allowed) {
          setFeedback({
            type: 'error',
            message:
              'Alcanzaste el máximo de 50 pacientes activos de tu plan. Mejora tu plan para seguir creciendo.',
          })
          return
        }
      }

      const updatedPaciente: PacienteListItem = {
        ...modal.paciente,
        nombre: values.nombre.trim(),
        apellido: values.apellido?.trim() || null,
        rut: normalizedRut,
        email: normalizedEmail,
        telefono: values.telefono?.trim() || null,
        fecha_nacimiento: values.fecha_nacimiento || null,
        notas: values.notas?.trim() || null,
        activo: values.activo,
        updated_at: nowIso(),
      }

      saveDemoPacientes(
        pacientes.map((paciente) =>
          paciente.id === updatedPaciente.id ? updatedPaciente : paciente
        )
      )
      setFeedback({ type: 'success', message: 'Paciente actualizado en modo demo.' })
      closeModal()
      return
    }

    if (demoMode && values.activo && planContext) {
      const capacity = canCreateActivePatient({
        planId: planContext.planId,
        currentActivePatients: activeCount,
      })

      if (!capacity.allowed) {
        setFeedback({
          type: 'error',
          message:
            'Alcanzaste el máximo de 50 pacientes activos de tu plan. Mejora tu plan para seguir creciendo.',
        })
        return
      }
    }

    const timestamp = nowIso()
    const nuevoPaciente: PacienteListItem = {
      id: demoId('demo-paciente'),
      nombre: values.nombre.trim(),
      apellido: values.apellido?.trim() || null,
      rut: normalizedRut,
      email: normalizedEmail,
      telefono: values.telefono?.trim() || null,
      fecha_nacimiento: values.fecha_nacimiento || null,
      notas: values.notas?.trim() || null,
      activo: values.activo,
      created_at: timestamp,
      updated_at: timestamp,
    }

    saveDemoPacientes([nuevoPaciente, ...pacientes])
    setFeedback({ type: 'success', message: 'Paciente creado en modo demo.' })
    closeModal()
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!modal) return

    if (demoMode) {
      handleDemoSave(values)
      return
    }

    startTransition(async () => {
      const result =
        modal.mode === 'edit'
          ? await updatePacienteAction(modal.paciente.id, values)
          : await createPacienteAction(values)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.paciente) {
        const savedPaciente = result.paciente
        setPacientes((current) =>
          modal.mode === 'edit'
            ? current.map((paciente) =>
                paciente.id === savedPaciente.id ? savedPaciente : paciente
              )
            : [savedPaciente, ...current]
        )
      }

      setFeedback({ type: 'success', message: result.message })
      closeModal()
      router.refresh()
    })
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pacientes"
        description="Tu base de pacientes. Busca, agrega fichas y accede a toda la información antes de crear una reserva."
        eyebrow="Base clínica"
        icon={HeartHandshake}
        meta={demoMode && <Badge tone="slate">Modo demo</Badge>}
      >
        {demoMode && (
          <Button type="button" variant="secondary" onClick={resetDemo}>
            <RotateCcw size={16} aria-hidden="true" />
            Restablecer demo
          </Button>
        )}
        <Button onClick={openCreate}>
          <Plus size={18} aria-hidden="true" />
          Nuevo paciente
        </Button>
      </PageHeader>

      {feedback && (
        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
      )}

      {reachedPatientLimit && (
        <PlanLimitBanner
          title="Límite de pacientes activos alcanzado"
          description="Tu plan Individual permite hasta 50 pacientes activos. Puedes inactivar pacientes o mejorar tu plan para seguir creciendo."
        />
      )}

      {planContext && (
        <UsageMeter
          label="Pacientes activos"
          value={activeCount}
          limit={patientLimit}
          helper={`Plan ${planContext.plan.shortName}`}
          tone="green"
        />
      )}

      {planContext && !hasFeature(planContext.planId, 'advanced_patient_management') && (
        <UpgradeCard
          planId={planContext.planId}
          feature="advanced_patient_management"
          title="Gestión avanzada de pacientes"
          description="Filtros avanzados, historial operativo y segmentación de pacientes están disponibles desde Agendix Center Pro."
          compact
        />
      )}

      {planContext && hasFeature(planContext.planId, 'advanced_patient_management') && (
        <section className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: 'Segmentación activa',
              description: 'Etiquetas demo para priorizar seguimiento y revisar grupos clínicos.',
              icon: Tags,
            },
            {
              title: 'Historial visible',
              description: 'Última atención y contexto operativo disponibles para el equipo.',
              icon: FileText,
            },
            {
              title: 'Asignación profesional',
              description: 'Pacientes vinculados a profesionales en operación compartida.',
              icon: UsersRound,
            },
          ].map(({ title, description, icon: Icon }) => (
            <article key={title} className="agendix-surface rounded-2xl p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70">
                <Icon size={17} aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-sm font-semibold text-slate-900">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </article>
          ))}
        </section>
      )}

      <MetricStrip
        variant="cards"
        items={[
          {
            label: 'Activos',
            value: activeCount,
            description: 'Pacientes activos para límites del plan.',
            icon: UsersRound,
          },
          {
            label: 'Inactivos',
            value: inactiveCount,
            description: 'Archivados sin perder historial.',
            icon: CalendarClock,
            tone: 'slate',
          },
          {
            label: 'Con contacto',
            value: withContactCount,
            description: 'Con email o teléfono registrado.',
            icon: Phone,
            tone: 'green',
          },
          {
            label: 'Con RUT',
            value: withRutCount,
            description: 'Con identificador civil.',
            icon: FileText,
            tone: 'slate',
          },
          {
            label: 'Con notas',
            value: withNotesCount,
            description: 'Con contexto clínico u operativo.',
            icon: CalendarClock,
          },
        ]}
      />

      <section className="agendix-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-100/80 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-700">Pacientes registrados</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Busca, edita o crea fichas para agendar con rapidez.
            </p>
          </div>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, RUT o contacto"
            label="Buscar pacientes"
            className="lg:w-[340px]"
          />
        </div>

        {pacientes.length === 0 ? (
          <EmptyState
            title="Aún no hay pacientes registrados"
            description="Cuando crees una reserva, podrás asociarla a un paciente o crear una ficha nueva en segundos."
            icon={HeartHandshake}
            actionLabel="Crear primer paciente"
            onAction={openCreate}
            note={demoMode ? 'En modo demo los cambios se guardan en este navegador.' : undefined}
          />
        ) : filteredPacientes.length === 0 ? (
          <EmptyState
            title="No encontramos pacientes"
            description="Prueba con otro nombre, RUT, email o teléfono."
            icon={Search}
          />
        ) : (
          <PacientesList
            pacientes={filteredPacientes}
            onEdit={openEdit}
            onDelete={handleDelete}
            disabled={isPending}
          />
        )}
      </section>

      {modal && (
        <FormModal
          title={modal.mode === 'edit' ? 'Editar paciente' : 'Nuevo paciente'}
          description="Guarda los datos esenciales para agendar y coordinar atenciones."
          onClose={closeModal}
        >
          <form onSubmit={onSubmit} className="space-y-5 px-5 py-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" error={form.formState.errors.nombre?.message}>
                <input
                  type="text"
                  placeholder="Antonia"
                  className="agendix-input"
                  aria-invalid={form.formState.errors.nombre ? 'true' : 'false'}
                  {...form.register('nombre')}
                />
              </Field>
              <Field label="Apellido" error={form.formState.errors.apellido?.message}>
                <input
                  type="text"
                  placeholder="Fuentes"
                  className="agendix-input"
                  aria-invalid={form.formState.errors.apellido ? 'true' : 'false'}
                  {...form.register('apellido')}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="RUT" error={form.formState.errors.rut?.message}>
                <input
                  type="text"
                  placeholder="18.245.991-4"
                  className="agendix-input"
                  aria-invalid={form.formState.errors.rut ? 'true' : 'false'}
                  {...form.register('rut')}
                />
              </Field>
              <Field
                label="Fecha de nacimiento"
                error={form.formState.errors.fecha_nacimiento?.message}
              >
                <input
                  type="date"
                  className="agendix-input"
                  aria-invalid={
                    form.formState.errors.fecha_nacimiento ? 'true' : 'false'
                  }
                  {...form.register('fecha_nacimiento')}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" error={form.formState.errors.email?.message}>
                <input
                  type="email"
                  placeholder="paciente@correo.cl"
                  className="agendix-input"
                  aria-invalid={form.formState.errors.email ? 'true' : 'false'}
                  {...form.register('email')}
                />
              </Field>
              <Field label="Teléfono" error={form.formState.errors.telefono?.message}>
                <input
                  type="tel"
                  placeholder="+56 9 5000 1000"
                  className="agendix-input"
                  aria-invalid={form.formState.errors.telefono ? 'true' : 'false'}
                  {...form.register('telefono')}
                />
              </Field>
            </div>

            <Field label="Notas internas" error={form.formState.errors.notas?.message}>
              <textarea
                rows={3}
                placeholder="Preferencias de horario, contexto operativo o datos relevantes para coordinación"
                className="agendix-input min-h-24 resize-none"
                aria-invalid={form.formState.errors.notas ? 'true' : 'false'}
                {...form.register('notas')}
              />
            </Field>

            <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 text-sm font-medium text-slate-700">
              <span>Paciente activo</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                {...form.register('activo')}
              />
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? 'Guardando...'
                  : modal.mode === 'edit'
                    ? 'Guardar cambios'
                    : 'Crear paciente'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  )
}

function PacientesList({
  pacientes,
  onEdit,
  onDelete,
  disabled,
}: {
  pacientes: PacienteListItem[]
  onEdit: (paciente: PacienteListItem) => void
  onDelete: (paciente: PacienteListItem) => void
  disabled: boolean
}) {
  return (
    <>
      <div className="hidden overflow-x-auto xl:block">
        <table className="agendix-table w-full text-left text-sm">
          <thead className="border-b border-slate-100/80 bg-slate-50/60 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Identificación</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Notas</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/70">
            {pacientes.map((paciente) => (
              <tr key={paciente.id} className="transition hover:bg-slate-50/60">
                <td className="px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200/70">
                      <UserRound size={16} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 [overflow-wrap:anywhere]">
                        {fullName(paciente)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Nac. {formatDate(paciente.fecha_nacimiento)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-0.5 text-sm text-slate-500">
                    <p className="flex items-center gap-1.5 [overflow-wrap:anywhere]">
                      <Phone size={12} aria-hidden="true" className="text-slate-400" />
                      {paciente.telefono || '—'}
                    </p>
                    <p className="flex items-center gap-1.5 [overflow-wrap:anywhere]">
                      <Mail size={12} aria-hidden="true" className="text-slate-400" />
                      {paciente.email || '—'}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {paciente.rut ? (
                    <Badge tone="slate">{paciente.rut}</Badge>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <Badge tone={paciente.activo ? 'green' : 'slate'}>
                    {paciente.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="max-w-xs px-4 py-4 text-sm leading-5 text-slate-500">
                  <p className="line-clamp-2 [overflow-wrap:anywhere]">
                    {paciente.notas || '—'}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/fichas-clinicas?paciente=${paciente.id}`}>
                        <FileText size={14} aria-hidden="true" />
                        Ficha
                      </Link>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit(paciente)}
                      disabled={disabled}
                    >
                      <Edit3 size={14} aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(paciente)}
                      disabled={disabled}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 xl:hidden">
        {pacientes.map((paciente) => (
          <article
            key={paciente.id}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.02]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200/70">
                  <UserRound size={16} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800 [overflow-wrap:anywhere]">{fullName(paciente)}</h3>
                  <p className="mt-0.5 text-xs leading-4 text-slate-500 [overflow-wrap:anywhere]">
                    {contactoPrincipal(paciente)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={paciente.activo ? 'green' : 'slate'}>
                  {paciente.activo ? 'Activo' : 'Inactivo'}
                </Badge>
                {paciente.rut && <Badge tone="slate">{paciente.rut}</Badge>}
              </div>
            </div>

            {paciente.notas && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-500 ring-1 ring-slate-100 [overflow-wrap:anywhere]">
                {paciente.notas}
              </p>
            )}

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/fichas-clinicas?paciente=${paciente.id}`}>
                  <FileText size={14} aria-hidden="true" />
                  Ficha
                </Link>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(paciente)}
                disabled={disabled}
              >
                <Edit3 size={14} aria-hidden="true" />
                Editar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete(paciente)}
                disabled={disabled}
              >
                <Trash2 size={14} aria-hidden="true" />
                Eliminar
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
