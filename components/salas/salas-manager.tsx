'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import {
  DoorOpen,
  Edit3,
  Plus,
  Power,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react'
import {
  createSalaAction,
  toggleSalaAction,
  updateSalaAction,
} from '@/app/actions/salas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { FormModal } from '@/components/ui/form-modal'
import { MetricStrip } from '@/components/ui/metric-strip'
import { PageHeader } from '@/components/ui/page-header'
import { SearchField } from '@/components/ui/search-field'
import { salaSchema, type SalaFormValues } from '@/lib/salas/validation'
import type { SalaListItem } from '@/lib/salas/types'
import { migrateLegacyAgendixStorage } from '@/lib/storage/migrations'

type SalasManagerProps = {
  initialSalas: SalaListItem[]
  demoMode: boolean
  loadError?: string
}

type ModalState =
  | {
      mode: 'create'
      sala?: undefined
    }
  | {
      mode: 'edit'
      sala: SalaListItem
    }

const emptyValues: SalaFormValues = {
  nombre: '',
  descripcion: '',
  capacidad: null,
  activa: true,
}

const demoStorageKey = 'agendix-demo-salas'

function nowIso() {
  return new Date().toISOString()
}

export function SalasManager({ initialSalas, demoMode, loadError }: SalasManagerProps) {
  const router = useRouter()
  const [salas, setSalas] = useState(initialSalas)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(
    loadError ? { type: 'error', message: loadError } : null
  )
  const [modal, setModal] = useState<ModalState | null>(null)
  const [search, setSearch] = useState('')
  const [pendingSalaId, setPendingSalaId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeCount = useMemo(
    () => salas.filter((sala) => sala.activa).length,
    [salas]
  )

  const inactiveCount = salas.length - activeCount
  const filteredSalas = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return salas

    return salas.filter((sala) =>
      [sala.nombre, sala.descripcion, sala.capacidad ? String(sala.capacidad) : null]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [salas, search])

  const form = useForm<SalaFormValues>({
    resolver: zodResolver(salaSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!demoMode) return

    migrateLegacyAgendixStorage()

    let storedValue: SalaListItem[] | null = null

    try {
      const storedSalas = window.localStorage.getItem(demoStorageKey)

      if (storedSalas) {
        const parsedSalas = JSON.parse(storedSalas)

        if (Array.isArray(parsedSalas)) {
          storedValue = parsedSalas as SalaListItem[]
        }
      }
    } catch {
      window.localStorage.removeItem(demoStorageKey)
    }

    window.setTimeout(() => {
      if (storedValue) {
        setSalas(storedValue)
      }
    }, 0)
  }, [demoMode])

  const saveDemoSalas = (nextSalas: SalaListItem[]) => {
    setSalas(nextSalas)
    window.localStorage.setItem(demoStorageKey, JSON.stringify(nextSalas))
  }

  const openCreate = () => {
    setFeedback(null)
    form.reset(emptyValues)
    setModal({ mode: 'create' })
  }

  const openEdit = (sala: SalaListItem) => {
    setFeedback(null)
    form.reset({
      nombre: sala.nombre,
      descripcion: sala.descripcion ?? '',
      capacidad: sala.capacidad,
      activa: sala.activa,
    })
    setModal({ mode: 'edit', sala })
  }

  const closeModal = () => {
    setModal(null)
    form.reset(emptyValues)
  }

  const resetDemo = () => {
    saveDemoSalas(initialSalas)
    setFeedback({ type: 'success', message: 'Demo restablecido.' })
  }

  const handleDemoSave = (values: SalaFormValues) => {
    if (modal?.mode === 'edit') {
      const updatedAt = nowIso()
      const updatedSala: SalaListItem = {
        ...modal.sala,
        nombre: values.nombre.trim(),
        descripcion: values.descripcion?.trim() || null,
        capacidad: values.capacidad,
        activa: values.activa,
        updated_at: updatedAt,
      }

      saveDemoSalas(
        salas.map((sala) => (sala.id === updatedSala.id ? updatedSala : sala))
      )
      setFeedback({ type: 'success', message: 'Sala actualizada en modo demo.' })
      closeModal()
      return
    }

    const timestamp = nowIso()
    const nuevaSala: SalaListItem = {
      id: `demo-local-${salas.length + 1}`,
      nombre: values.nombre.trim(),
      descripcion: values.descripcion?.trim() || null,
      capacidad: values.capacidad,
      activa: values.activa,
      created_at: timestamp,
      updated_at: timestamp,
    }

    saveDemoSalas([nuevaSala, ...salas])
    setFeedback({ type: 'success', message: 'Sala creada en modo demo.' })
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
          ? await updateSalaAction(modal.sala.id, values)
          : await createSalaAction(values)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.sala) {
        const savedSala = result.sala
        setSalas((current) =>
          modal.mode === 'edit'
            ? current.map((sala) => (sala.id === savedSala.id ? savedSala : sala))
            : [savedSala, ...current]
        )
      }

      setFeedback({ type: 'success', message: result.message })
      closeModal()
      router.refresh()
    })
  })

  const toggleSala = (sala: SalaListItem) => {
    const nextActiveState = !sala.activa
    setFeedback(null)

    if (demoMode) {
      saveDemoSalas(
        salas.map((item) =>
          item.id === sala.id ? { ...item, activa: nextActiveState, updated_at: nowIso() } : item
        )
      )
      setFeedback({
        type: 'success',
        message: nextActiveState ? 'Sala activada en modo demo.' : 'Sala desactivada en modo demo.',
      })
      return
    }

    setPendingSalaId(sala.id)
    startTransition(async () => {
      const result = await toggleSalaAction(sala.id, nextActiveState)
      setPendingSalaId(null)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.sala) {
        setSalas((current) =>
          current.map((item) => (item.id === result.sala?.id ? result.sala : item))
        )
      }

      setFeedback({ type: 'success', message: result.message })
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Salas"
        description="Organiza los espacios físicos donde se realizan las atenciones. Las salas activas se asignan en cada reserva."
        eyebrow="Operaciones"
        icon={DoorOpen}
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
          Nueva sala
        </Button>
      </PageHeader>

      {feedback && (
        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
      )}

      <MetricStrip
        items={[
          {
            label: 'Total',
            value: salas.length,
            description: 'Espacios configurados en el centro.',
            icon: DoorOpen,
          },
          {
            label: 'Activas',
            value: activeCount,
            description: 'Disponibles para asignar en reservas.',
            icon: Users,
            tone: 'green',
          },
          {
            label: 'Inactivas',
            value: inactiveCount,
            description: 'Pausadas temporalmente.',
            icon: Power,
            tone: 'slate',
          },
        ]}
      />

      {salas.length === 0 ? (
        <EmptyState
          title="Aún no hay salas configuradas"
          description="Configura boxes, salas o espacios online para evitar choques de horario al reservar."
          icon={DoorOpen}
          actionLabel="Crear primera sala"
          onAction={openCreate}
          note={demoMode ? 'En modo demo los cambios se guardan en este navegador.' : undefined}
        />
      ) : (
        <SalasList
          salas={filteredSalas}
          totalCount={salas.length}
          search={search}
          onSearchChange={setSearch}
          pendingSalaId={pendingSalaId}
          isPending={isPending}
          onEdit={openEdit}
          onToggle={toggleSala}
        />
      )}

      {modal && (
        <FormModal
          title={modal.mode === 'edit' ? 'Editar sala' : 'Nueva sala'}
          description="Define capacidad, estado y contexto operativo del espacio."
          onClose={closeModal}
        >
          <form onSubmit={onSubmit} className="space-y-5 px-5 py-5" noValidate>
            <Field label="Nombre" error={form.formState.errors.nombre?.message}>
              <input
                type="text"
                placeholder="Box consulta 1"
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
                placeholder="Uso principal, equipamiento o notas internas"
                className="agendix-input min-h-24 resize-none"
                aria-invalid={form.formState.errors.descripcion ? 'true' : 'false'}
                {...form.register('descripcion')}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field
                label="Capacidad"
                error={form.formState.errors.capacidad?.message}
              >
                <input
                  type="number"
                  min={1}
                  max={500}
                  placeholder="2"
                  className="agendix-input"
                  aria-invalid={form.formState.errors.capacidad ? 'true' : 'false'}
                  {...form.register('capacidad', {
                    setValueAs: (value) =>
                      value === '' || value === null ? null : Number(value),
                  })}
                />
              </Field>

              <label className="flex min-h-10 items-center justify-between gap-4 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-700 sm:min-w-44">
                <span>Activa</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                  {...form.register('activa')}
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? 'Guardando...'
                  : modal.mode === 'edit'
                    ? 'Guardar cambios'
                    : 'Crear sala'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  )
}

function SalasList({
  salas,
  totalCount,
  search,
  onSearchChange,
  pendingSalaId,
  isPending,
  onEdit,
  onToggle,
}: {
  salas: SalaListItem[]
  totalCount: number
  search: string
  onSearchChange: (value: string) => void
  pendingSalaId: string | null
  isPending: boolean
  onEdit: (sala: SalaListItem) => void
  onToggle: (sala: SalaListItem) => void
}) {
  return (
    <section className="agendix-surface overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Inventario de salas</h2>
        </div>
        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder={`Buscar en ${totalCount} salas`}
          label="Buscar salas"
          className="sm:max-w-xs"
        />
      </div>

      {salas.length === 0 ? (
        <EmptyState
          title="No encontramos salas"
          description="Prueba con otro nombre o ajusta los filtros de búsqueda."
          icon={Search}
        />
      ) : (
      <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="agendix-table w-full text-left text-sm">
          <thead className="border-b border-slate-100/80 bg-slate-50/60 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Sala</th>
              <th className="px-4 py-3 font-medium">Capacidad</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {salas.map((sala) => (
              <tr key={sala.id} className="transition hover:bg-slate-50/60">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-800">{sala.nombre}</p>
                  <p className="mt-1 max-w-xl text-sm text-slate-500">
                    {sala.descripcion || 'Sin descripción'}
                  </p>
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {sala.capacidad ? `${sala.capacidad} personas` : 'Sin definir'}
                </td>
                <td className="px-4 py-4">
                  <Badge tone={sala.activa ? 'green' : 'slate'}>
                    {sala.activa ? 'Activa' : 'Inactiva'}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => onEdit(sala)}>
                      <Edit3 size={14} aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending && pendingSalaId === sala.id}
                      onClick={() => onToggle(sala)}
                    >
                      <Power size={14} aria-hidden="true" />
                      {sala.activa ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 lg:hidden">
        {salas.map((sala) => (
          <article
            key={sala.id}
            className="agendix-surface rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-800">{sala.nombre}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {sala.descripcion || 'Sin descripción'}
                </p>
              </div>
              <Badge tone={sala.activa ? 'green' : 'slate'}>
                {sala.activa ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Capacidad: {sala.capacidad ? `${sala.capacidad} personas` : 'Sin definir'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => onEdit(sala)}>
                <Edit3 size={14} aria-hidden="true" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending && pendingSalaId === sala.id}
                onClick={() => onToggle(sala)}
              >
                <Power size={14} aria-hidden="true" />
                {sala.activa ? 'Desactivar' : 'Activar'}
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
