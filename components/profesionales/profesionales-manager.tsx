'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import {
  AtSign,
  Edit3,
  Phone,
  Plus,
  Power,
  RotateCcw,
  Search,
  Stethoscope,
  UserRoundCheck,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import {
  createProfesionalAction,
  toggleProfesionalAction,
  updateProfesionalAction,
} from '@/app/actions/profesionales'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { FormModal } from '@/components/ui/form-modal'
import { MetricStrip } from '@/components/ui/metric-strip'
import { PageHeader } from '@/components/ui/page-header'
import { SearchField } from '@/components/ui/search-field'
import {
  profesionalRoleLabels,
  type ProfesionalListItem,
} from '@/lib/profesionales/types'
import {
  profesionalSchema,
  type ProfesionalFormValues,
} from '@/lib/profesionales/validation'
import { migrateLegacyAgendixStorage } from '@/lib/storage/migrations'

type ProfesionalesManagerProps = {
  initialProfesionales: ProfesionalListItem[]
  demoMode: boolean
  loadError?: string
}

type ModalState =
  | {
      mode: 'create'
      profesional?: undefined
    }
  | {
      mode: 'edit'
      profesional: ProfesionalListItem
    }

const emptyValues: ProfesionalFormValues = {
  nombre: '',
  email: '',
  telefono: '',
  especialidad: '',
  activo: true,
}

const demoStorageKey = 'agendix-demo-profesionales'

function nowIso() {
  return new Date().toISOString()
}

function demoId(prefix: string) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}`
}

function formatSpecialty(profesional: ProfesionalListItem) {
  if (profesional.especialidad) return profesional.especialidad
  if (profesional.rol === 'admin') return 'Dirección clínica'

  return 'Sin definir'
}

export function ProfesionalesManager({
  initialProfesionales,
  demoMode,
  loadError,
}: ProfesionalesManagerProps) {
  const router = useRouter()
  const [profesionales, setProfesionales] = useState(initialProfesionales)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(
    loadError ? { type: 'error', message: loadError } : null
  )
  const [modal, setModal] = useState<ModalState | null>(null)
  const [search, setSearch] = useState('')
  const [pendingProfesionalId, setPendingProfesionalId] = useState<string | null>(
    null
  )
  const [isPending, startTransition] = useTransition()

  const activeCount = useMemo(
    () => profesionales.filter((profesional) => profesional.activo).length,
    [profesionales]
  )
  const inactiveCount = profesionales.length - activeCount
  const specialtyCount = useMemo(() => {
    const specialties = profesionales
      .map((profesional) => profesional.especialidad)
      .filter(Boolean)

    return new Set(specialties).size
  }, [profesionales])
  const filteredProfesionales = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return profesionales

    return profesionales.filter((profesional) =>
      [
        profesional.nombre,
        profesional.email,
        profesional.telefono,
        profesional.especialidad,
        profesionalRoleLabels[profesional.rol],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [profesionales, search])

  const form = useForm<ProfesionalFormValues>({
    resolver: zodResolver(profesionalSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!demoMode) return

    migrateLegacyAgendixStorage()

    let storedValue: ProfesionalListItem[] | null = null

    try {
      const storedProfesionales = window.localStorage.getItem(demoStorageKey)

      if (storedProfesionales) {
        const parsedProfesionales = JSON.parse(storedProfesionales)

        if (Array.isArray(parsedProfesionales)) {
          storedValue = parsedProfesionales as ProfesionalListItem[]
        }
      }
    } catch {
      window.localStorage.removeItem(demoStorageKey)
    }

    window.setTimeout(() => {
      if (storedValue) {
        setProfesionales(storedValue)
      }
    }, 0)
  }, [demoMode])

  const saveDemoProfesionales = (nextProfesionales: ProfesionalListItem[]) => {
    setProfesionales(nextProfesionales)
    window.localStorage.setItem(demoStorageKey, JSON.stringify(nextProfesionales))
  }

  const openCreate = () => {
    setFeedback(null)
    form.reset(emptyValues)
    setModal({ mode: 'create' })
  }

  const openEdit = (profesional: ProfesionalListItem) => {
    setFeedback(null)
    form.reset({
      nombre: profesional.nombre,
      email: profesional.email,
      telefono: profesional.telefono ?? '',
      especialidad: profesional.especialidad ?? '',
      activo: profesional.activo,
    })
    setModal({ mode: 'edit', profesional })
  }

  const closeModal = () => {
    setModal(null)
    form.reset(emptyValues)
  }

  const resetDemo = () => {
    saveDemoProfesionales(initialProfesionales)
    setFeedback({ type: 'success', message: 'Demo restablecido.' })
  }

  const handleDemoSave = (values: ProfesionalFormValues) => {
    const normalizedEmail = values.email.trim().toLowerCase()
    const duplicateEmail = profesionales.some(
      (profesional) =>
        profesional.email.toLowerCase() === normalizedEmail &&
        profesional.id !== modal?.profesional?.id
    )

    if (duplicateEmail) {
      setFeedback({
        type: 'error',
        message: 'Ya existe un profesional con ese email en el demo.',
      })
      return
    }

    if (modal?.mode === 'edit') {
      const updatedProfesional: ProfesionalListItem = {
        ...modal.profesional,
        nombre: values.nombre.trim(),
        email: normalizedEmail,
        telefono: values.telefono?.trim() || null,
        especialidad: values.especialidad?.trim() || null,
        activo: values.activo,
        updated_at: nowIso(),
      }

      saveDemoProfesionales(
        profesionales.map((profesional) =>
          profesional.id === updatedProfesional.id
            ? updatedProfesional
            : profesional
        )
      )
      setFeedback({
        type: 'success',
        message: 'Profesional actualizado en modo demo.',
      })
      closeModal()
      return
    }

    const timestamp = nowIso()
    const nuevoProfesional: ProfesionalListItem = {
      id: demoId('demo-miembro'),
      profile_id: demoId('demo-profile'),
      nombre: values.nombre.trim(),
      apellido: null,
      email: normalizedEmail,
      telefono: values.telefono?.trim() || null,
      especialidad: values.especialidad?.trim() || null,
      rol: 'profesional',
      activo: values.activo,
      created_at: timestamp,
      updated_at: timestamp,
    }

    saveDemoProfesionales([nuevoProfesional, ...profesionales])
    setFeedback({ type: 'success', message: 'Profesional creado en modo demo.' })
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
          ? await updateProfesionalAction(modal.profesional.id, values)
          : await createProfesionalAction(values)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.profesional) {
        const savedProfesional = result.profesional
        setProfesionales((current) =>
          modal.mode === 'edit'
            ? current.map((profesional) =>
                profesional.id === savedProfesional.id
                  ? savedProfesional
                  : profesional
              )
            : [savedProfesional, ...current]
        )
      }

      setFeedback({ type: 'success', message: result.message })
      closeModal()
      router.refresh()
    })
  })

  const toggleProfesional = (profesional: ProfesionalListItem) => {
    const nextActiveState = !profesional.activo
    setFeedback(null)

    if (demoMode) {
      saveDemoProfesionales(
        profesionales.map((item) =>
          item.id === profesional.id
            ? { ...item, activo: nextActiveState, updated_at: nowIso() }
            : item
        )
      )
      setFeedback({
        type: 'success',
        message: nextActiveState
          ? 'Profesional activado en modo demo.'
          : 'Profesional desactivado en modo demo.',
      })
      return
    }

    setPendingProfesionalId(profesional.id)
    startTransition(async () => {
      const result = await toggleProfesionalAction(profesional.id, nextActiveState)
      setPendingProfesionalId(null)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.profesional) {
        const savedProfesional = result.profesional
        setProfesionales((current) =>
          current.map((item) =>
            item.id === savedProfesional.id
              ? {
                  ...savedProfesional,
                  especialidad: item.especialidad,
                }
              : item
          )
        )
      }

      setFeedback({ type: 'success', message: result.message })
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profesionales"
        description="Configura el equipo que presta servicios y recibe reservas. Activa o pausa integrantes cuando necesites."
        eyebrow="Equipo clínico"
        icon={Users}
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
          Nuevo profesional
        </Button>
      </PageHeader>

      {feedback && (
        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
      )}

      <MetricStrip
        items={[
          {
            label: 'Total',
            value: profesionales.length,
            description: 'Integrantes registrados en el centro.',
            icon: Users,
          },
          {
            label: 'Activos',
            value: activeCount,
            description: 'Disponibles para recibir reservas.',
            icon: UserRoundCheck,
            tone: 'green',
          },
          {
            label: 'Inactivos',
            value: inactiveCount,
            description: 'Pausados temporalmente.',
            icon: Power,
            tone: 'slate',
          },
          {
            label: 'Especialidades',
            value: specialtyCount,
            description: 'Áreas clínicas distintas en el equipo.',
            icon: Stethoscope,
          },
        ]}
      />

      {profesionales.length === 0 ? (
        <EmptyState
          title="Aún no hay profesionales configurados"
          description="Agrega al equipo clínico para asignar reservas, mostrar disponibilidad y ordenar la agenda por profesional."
          icon={UserRoundPlus}
          actionLabel="Crear primer profesional"
          onAction={openCreate}
          note={demoMode ? 'En modo demo los cambios se guardan en este navegador.' : undefined}
        />
      ) : (
        <ProfesionalesList
          profesionales={filteredProfesionales}
          totalCount={profesionales.length}
          search={search}
          onSearchChange={setSearch}
          pendingProfesionalId={pendingProfesionalId}
          isPending={isPending}
          onEdit={openEdit}
          onToggle={toggleProfesional}
        />
      )}

      {modal && (
        <FormModal
          title={
            modal.mode === 'edit' ? 'Editar profesional' : 'Nuevo profesional'
          }
          description="Define contacto, especialidad y estado operativo del integrante."
          onClose={closeModal}
        >
          <form onSubmit={onSubmit} className="space-y-5 px-5 py-5" noValidate>
            <Field label="Nombre" error={form.formState.errors.nombre?.message}>
              <input
                type="text"
                placeholder="Camila Rojas"
                className="agendix-input"
                aria-invalid={form.formState.errors.nombre ? 'true' : 'false'}
                {...form.register('nombre')}
              />
            </Field>

            <Field label="Email" error={form.formState.errors.email?.message}>
              <input
                type="email"
                placeholder="camila@centro.cl"
                className="agendix-input"
                aria-invalid={form.formState.errors.email ? 'true' : 'false'}
                {...form.register('email')}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Teléfono"
                error={form.formState.errors.telefono?.message}
              >
                <input
                  type="tel"
                  placeholder="+56 9 6123 4567"
                  className="agendix-input"
                  aria-invalid={form.formState.errors.telefono ? 'true' : 'false'}
                  {...form.register('telefono')}
                />
              </Field>

              <Field
                label="Especialidad"
                error={form.formState.errors.especialidad?.message}
              >
                <input
                  type="text"
                  placeholder="Psicología clínica"
                  className="agendix-input"
                  aria-invalid={
                    form.formState.errors.especialidad ? 'true' : 'false'
                  }
                  {...form.register('especialidad')}
                />
              </Field>
            </div>

            <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5 text-sm font-medium text-slate-700">
              <span>Profesional activo</span>
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
                    : 'Crear profesional'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  )
}

function ProfesionalesList({
  profesionales,
  totalCount,
  search,
  onSearchChange,
  pendingProfesionalId,
  isPending,
  onEdit,
  onToggle,
}: {
  profesionales: ProfesionalListItem[]
  totalCount: number
  search: string
  onSearchChange: (value: string) => void
  pendingProfesionalId: string | null
  isPending: boolean
  onEdit: (profesional: ProfesionalListItem) => void
  onToggle: (profesional: ProfesionalListItem) => void
}) {
  return (
    <section className="agendix-surface overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 border-b border-slate-100/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Equipo clínico</h2>
        </div>
        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder={`Buscar en ${totalCount} profesionales`}
          label="Buscar profesionales"
          className="sm:max-w-xs"
        />
      </div>

      {profesionales.length === 0 ? (
        <EmptyState
          title="No encontramos profesionales"
          description="Prueba con otro nombre, email o especialidad."
          icon={Search}
        />
      ) : (
      <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="agendix-table w-full text-left text-sm">
          <thead className="border-b border-slate-100/80 bg-slate-50/60 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Profesional</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Especialidad</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/70">
            {profesionales.map((profesional) => (
              <tr key={profesional.id} className="transition hover:bg-slate-50/60">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-orange-600 ring-1 ring-orange-200/60">
                      {profesional.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {profesional.nombre}
                      </p>
                      <div className="mt-0.5">
                        <Badge tone={profesional.rol === 'admin' ? 'blue' : 'slate'}>
                          {profesionalRoleLabels[profesional.rol]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-500">
                  <p className="flex items-center gap-1.5">
                    <AtSign size={12} aria-hidden="true" className="text-slate-400" />
                    {profesional.email}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5">
                    <Phone size={12} aria-hidden="true" className="text-slate-400" />
                    {profesional.telefono || '—'}
                  </p>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-500">
                  {formatSpecialty(profesional)}
                </td>
                <td className="px-4 py-3.5">
                  <Badge tone={profesional.activo ? 'green' : 'slate'}>
                    {profesional.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit(profesional)}
                    >
                      <Edit3 size={14} aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending && pendingProfesionalId === profesional.id}
                      onClick={() => onToggle(profesional)}
                    >
                      <Power size={14} aria-hidden="true" />
                      {profesional.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 lg:hidden">
        {profesionales.map((profesional) => (
          <article
            key={profesional.id}
            className="agendix-surface rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-orange-600 ring-1 ring-orange-200/60">
                  {profesional.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {profesional.nombre}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatSpecialty(profesional)}
                  </p>
                </div>
              </div>
              <Badge tone={profesional.activo ? 'green' : 'slate'}>
                {profesional.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <div className="mt-3 space-y-1 text-sm text-slate-500">
              <p className="flex items-center gap-1.5">
                <AtSign size={12} aria-hidden="true" className="text-slate-400" />
                {profesional.email}
              </p>
              {profesional.telefono && (
                <p className="flex items-center gap-1.5">
                  <Phone size={12} aria-hidden="true" className="text-slate-400" />
                  {profesional.telefono}
                </p>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <Badge tone={profesional.rol === 'admin' ? 'blue' : 'slate'}>
                {profesionalRoleLabels[profesional.rol]}
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(profesional)}
                >
                  <Edit3 size={14} aria-hidden="true" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending && pendingProfesionalId === profesional.id}
                  onClick={() => onToggle(profesional)}
                >
                  <Power size={14} aria-hidden="true" />
                  {profesional.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      </>
      )}
    </section>
  )
}
