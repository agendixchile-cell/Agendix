'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import {
  Clock3,
  Edit3,
  HeartPulse,
  Plus,
  Power,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import {
  createServicioAction,
  toggleServicioAction,
  updateServicioAction,
} from '@/app/actions/servicios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { FormModal } from '@/components/ui/form-modal'
import { MetricStrip } from '@/components/ui/metric-strip'
import { PageHeader } from '@/components/ui/page-header'
import { SearchField } from '@/components/ui/search-field'
import type { ServicioListItem } from '@/lib/servicios/types'
import {
  servicioSchema,
  type ServicioFormValues,
} from '@/lib/servicios/validation'
import {
  readDemoStorageItem,
  removeDemoStorageItem,
  writeDemoStorageItem,
} from '@/lib/demo-storage'
import type { PlanId } from '@/lib/plans'
import { migrateLegacyAgendixStorage } from '@/lib/storage/migrations'

type ServiciosManagerProps = {
  initialServicios: ServicioListItem[]
  demoMode: boolean
  demoPlanId?: PlanId
  loadError?: string
}

type ModalState =
  | {
      mode: 'create'
      servicio?: undefined
    }
  | {
      mode: 'edit'
      servicio: ServicioListItem
    }

const emptyValues: ServicioFormValues = {
  nombre: '',
  descripcion: '',
  duracion_minutos: 30,
  precio: null,
  activo: true,
}

function nowIso() {
  return new Date().toISOString()
}

function formatPrice(value: number | null) {
  if (value === null) return 'Sin precio'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ServiciosManager({
  initialServicios,
  demoMode,
  demoPlanId,
  loadError,
}: ServiciosManagerProps) {
  const router = useRouter()
  const [servicios, setServicios] = useState(initialServicios)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(
    loadError ? { type: 'error', message: loadError } : null
  )
  const [modal, setModal] = useState<ModalState | null>(null)
  const [search, setSearch] = useState('')
  const [pendingServicioId, setPendingServicioId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeCount = useMemo(
    () => servicios.filter((servicio) => servicio.activo).length,
    [servicios]
  )
  const inactiveCount = servicios.length - activeCount
  const averageDuration = useMemo(() => {
    if (servicios.length === 0) return 0
    const total = servicios.reduce(
      (sum, servicio) => sum + servicio.duracion_minutos,
      0
    )
    return Math.round(total / servicios.length)
  }, [servicios])
  const filteredServicios = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return servicios

    return servicios.filter((servicio) =>
      [servicio.nombre, servicio.descripcion, String(servicio.duracion_minutos)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [servicios, search])

  const form = useForm<ServicioFormValues>({
    resolver: zodResolver(servicioSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!demoMode) return

    migrateLegacyAgendixStorage(demoPlanId)

    let storedValue: ServicioListItem[] | null = null

    try {
      const storedServicios = readDemoStorageItem(demoPlanId, 'servicios')

      if (storedServicios) {
        const parsedServicios = JSON.parse(storedServicios)

        if (Array.isArray(parsedServicios)) {
          storedValue = parsedServicios as ServicioListItem[]
        }
      }
    } catch {
      removeDemoStorageItem(demoPlanId, 'servicios')
    }

    window.setTimeout(() => {
      setServicios(storedValue ?? initialServicios)
    }, 0)
  }, [demoMode, demoPlanId, initialServicios])

  const saveDemoServicios = (nextServicios: ServicioListItem[]) => {
    setServicios(nextServicios)
    writeDemoStorageItem(demoPlanId, 'servicios', JSON.stringify(nextServicios))
  }

  const openCreate = () => {
    setFeedback(null)
    form.reset(emptyValues)
    setModal({ mode: 'create' })
  }

  const openEdit = (servicio: ServicioListItem) => {
    setFeedback(null)
    form.reset({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion ?? '',
      duracion_minutos: servicio.duracion_minutos,
      precio: servicio.precio,
      activo: servicio.activo,
    })
    setModal({ mode: 'edit', servicio })
  }

  const closeModal = () => {
    setModal(null)
    form.reset(emptyValues)
  }

  const resetDemo = () => {
    saveDemoServicios(initialServicios)
    setFeedback({ type: 'success', message: 'Demo restablecido.' })
  }

  const handleDemoSave = (values: ServicioFormValues) => {
    if (modal?.mode === 'edit') {
      const updatedAt = nowIso()
      const updatedServicio: ServicioListItem = {
        ...modal.servicio,
        nombre: values.nombre.trim(),
        descripcion: values.descripcion?.trim() || null,
        duracion_minutos: values.duracion_minutos,
        precio: values.precio,
        activo: values.activo,
        updated_at: updatedAt,
      }

      saveDemoServicios(
        servicios.map((servicio) =>
          servicio.id === updatedServicio.id ? updatedServicio : servicio
        )
      )
      setFeedback({ type: 'success', message: 'Servicio actualizado en modo demo.' })
      closeModal()
      return
    }

    const timestamp = nowIso()
    const nuevoServicio: ServicioListItem = {
      id: `demo-servicio-local-${servicios.length + 1}`,
      nombre: values.nombre.trim(),
      descripcion: values.descripcion?.trim() || null,
      duracion_minutos: values.duracion_minutos,
      precio: values.precio,
      activo: values.activo,
      created_at: timestamp,
      updated_at: timestamp,
    }

    saveDemoServicios([nuevoServicio, ...servicios])
    setFeedback({ type: 'success', message: 'Servicio creado en modo demo.' })
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
          ? await updateServicioAction(modal.servicio.id, values)
          : await createServicioAction(values)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.servicio) {
        const savedServicio = result.servicio
        setServicios((current) =>
          modal.mode === 'edit'
            ? current.map((servicio) =>
                servicio.id === savedServicio.id ? savedServicio : servicio
              )
            : [savedServicio, ...current]
        )
      }

      setFeedback({ type: 'success', message: result.message })
      closeModal()
      router.refresh()
    })
  })

  const toggleServicio = (servicio: ServicioListItem) => {
    const nextActiveState = !servicio.activo
    setFeedback(null)

    if (demoMode) {
      saveDemoServicios(
        servicios.map((item) =>
          item.id === servicio.id
            ? { ...item, activo: nextActiveState, updated_at: nowIso() }
            : item
        )
      )
      setFeedback({
        type: 'success',
        message: nextActiveState
          ? 'Servicio activado en modo demo.'
          : 'Servicio desactivado en modo demo.',
      })
      return
    }

    setPendingServicioId(servicio.id)
    startTransition(async () => {
      const result = await toggleServicioAction(servicio.id, nextActiveState)
      setPendingServicioId(null)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.servicio) {
        const savedServicio = result.servicio
        setServicios((current) =>
          current.map((item) => (item.id === savedServicio.id ? savedServicio : item))
        )
      }

      setFeedback({ type: 'success', message: result.message })
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Servicios"
        description="Define qué ofreces, cuánto dura y cuánto cuesta. Los servicios activos aparecen en las reservas."
        eyebrow="Catálogo clínico"
        icon={HeartPulse}
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
          Nuevo servicio
        </Button>
      </PageHeader>

      {feedback && (
        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
      )}

      <MetricStrip
        items={[
          {
            label: 'Total',
            value: servicios.length,
            description: 'Prestaciones en tu catálogo.',
            icon: Sparkles,
          },
          {
            label: 'Activos',
            value: activeCount,
            description: 'Disponibles para usar en reservas.',
            icon: HeartPulse,
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
            label: 'Duración promedio',
            value: `${averageDuration} min`,
            description: 'Referencia para planificar la agenda.',
            icon: Clock3,
          },
        ]}
      />

      {servicios.length === 0 ? (
        <EmptyState
          title="Aún no hay servicios configurados"
          description="Crea tus servicios para que tus pacientes puedan reservar según duración, precio y modalidad."
          icon={HeartPulse}
          actionLabel="Crear primer servicio"
          onAction={openCreate}
          note={demoMode ? 'En modo demo los cambios se guardan en este navegador.' : undefined}
        />
      ) : (
        <ServiciosList
          servicios={filteredServicios}
          totalCount={servicios.length}
          search={search}
          onSearchChange={setSearch}
          pendingServicioId={pendingServicioId}
          isPending={isPending}
          onEdit={openEdit}
          onToggle={toggleServicio}
        />
      )}

      {modal && (
        <FormModal
          title={modal.mode === 'edit' ? 'Editar servicio' : 'Nuevo servicio'}
          description="Define el precio, duración y estado para mantener el catálogo operativo."
          onClose={closeModal}
        >
          <form onSubmit={onSubmit} className="space-y-5 px-5 py-5" noValidate>
            <Field label="Nombre" error={form.formState.errors.nombre?.message}>
              <input
                type="text"
                placeholder="Consulta medica general"
                className="agendix-input"
                aria-invalid={form.formState.errors.nombre ? 'true' : 'false'}
                {...form.register('nombre')}
              />
            </Field>

            <Field
              label="Descripción"
              error={form.formState.errors.descripcion?.message}
            >
              <textarea
                rows={3}
                placeholder="Que incluye el servicio, indicaciones o notas internas"
                className="agendix-input min-h-24 resize-none"
                aria-invalid={form.formState.errors.descripcion ? 'true' : 'false'}
                {...form.register('descripcion')}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Duración"
                hint="minutos"
                error={form.formState.errors.duracion_minutos?.message}
              >
                <input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  placeholder="30"
                  className="agendix-input"
                  aria-invalid={
                    form.formState.errors.duracion_minutos ? 'true' : 'false'
                  }
                  {...form.register('duracion_minutos', {
                    setValueAs: (value) => (value === '' ? NaN : Number(value)),
                  })}
                />
              </Field>

              <Field
                label="Precio"
                hint="CLP"
                error={form.formState.errors.precio?.message}
              >
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="25000"
                  className="agendix-input"
                  aria-invalid={form.formState.errors.precio ? 'true' : 'false'}
                  {...form.register('precio', {
                    setValueAs: (value) =>
                      value === '' || value === null ? null : Number(value),
                  })}
                />
              </Field>
            </div>

            <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-700">
              <span>Servicio activo</span>
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
                    : 'Crear servicio'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  )
}

function ServiciosList({
  servicios,
  totalCount,
  search,
  onSearchChange,
  pendingServicioId,
  isPending,
  onEdit,
  onToggle,
}: {
  servicios: ServicioListItem[]
  totalCount: number
  search: string
  onSearchChange: (value: string) => void
  pendingServicioId: string | null
  isPending: boolean
  onEdit: (servicio: ServicioListItem) => void
  onToggle: (servicio: ServicioListItem) => void
}) {
  return (
    <section className="agendix-surface overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Catálogo de servicios</h2>
        </div>
        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder={`Buscar en ${totalCount} servicios`}
          label="Buscar servicios"
          className="sm:max-w-xs"
        />
      </div>

      {servicios.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-500">
          No encontramos servicios con esa búsqueda.
        </div>
      ) : (
      <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="agendix-table w-full text-left text-sm">
          <thead className="border-b border-slate-100/80 bg-slate-50/60 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Servicio</th>
              <th className="px-4 py-3 font-medium">Duración</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {servicios.map((servicio) => (
              <tr key={servicio.id} className="transition hover:bg-slate-50/60">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-800">{servicio.nombre}</p>
                  <p className="mt-1 max-w-xl text-sm text-slate-500">
                    {servicio.descripcion || 'Sin descripción'}
                  </p>
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {servicio.duracion_minutos} min
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {formatPrice(servicio.precio)}
                </td>
                <td className="px-4 py-4">
                  <Badge tone={servicio.activo ? 'green' : 'slate'}>
                    {servicio.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit(servicio)}
                    >
                      <Edit3 size={14} aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending && pendingServicioId === servicio.id}
                      onClick={() => onToggle(servicio)}
                    >
                      <Power size={14} aria-hidden="true" />
                      {servicio.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 lg:hidden">
        {servicios.map((servicio) => (
          <article
            key={servicio.id}
            className="agendix-surface rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-800">{servicio.nombre}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {servicio.descripcion || 'Sin descripción'}
                </p>
              </div>
              <Badge tone={servicio.activo ? 'green' : 'slate'}>
                {servicio.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">Duración:</span>{' '}
                {servicio.duracion_minutos} min
              </p>
              <p>
                <span className="font-semibold text-slate-800">Precio:</span>{' '}
                {formatPrice(servicio.precio)}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => onEdit(servicio)}>
                <Edit3 size={14} aria-hidden="true" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending && pendingServicioId === servicio.id}
                onClick={() => onToggle(servicio)}
              >
                <Power size={14} aria-hidden="true" />
                {servicio.activo ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
          </article>
        ))}
      </div>
      </>
      )}
    </section>
  )
}
