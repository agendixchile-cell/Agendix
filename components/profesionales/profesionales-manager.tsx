'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
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
import { EntityImage } from '@/components/ui/entity-image'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { FormModal } from '@/components/ui/form-modal'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { MetricStrip } from '@/components/ui/metric-strip'
import { PageHeader } from '@/components/ui/page-header'
import { SearchField } from '@/components/ui/search-field'
import { PlanLimitBanner } from '@/components/plans/plan-limit-banner'
import { UsageMeter } from '@/components/plans/usage-meter'
import {
  canAddProfessional,
  getProfessionalLimit,
  type PlanUsageContext,
} from '@/lib/plans'
import {
  profesionalRoleLabels,
  type ProfesionalListItem,
} from '@/lib/profesionales/types'
import {
  profesionalSchema,
  type ProfesionalFormValues,
} from '@/lib/profesionales/validation'
import {
  readDemoStorageItem,
  removeDemoStorageItem,
  writeDemoStorageItem,
} from '@/lib/demo-storage'
import {
  PROFESSIONAL_AVATARS_BUCKET,
  buildProfileImageStoragePath,
} from '@/lib/images/config'
import {
  readImageAsDataUrl,
  removeUploadedPublicImage,
  uploadPublicImage,
  type UploadedPublicImage,
} from '@/lib/images/client'
import { migrateLegacyAgendixStorage } from '@/lib/storage/migrations'

type ProfesionalesManagerProps = {
  initialProfesionales: ProfesionalListItem[]
  centroId: string
  demoMode: boolean
  loadError?: string
  planContext?: PlanUsageContext
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
  recordatorio_email_subject: '',
  recordatorio_email_body: '',
  descanso_entre_reservas_minutos: 0,
  duracion_sesion_minutos: 60,
  intervalo_reservas_minutos: 60,
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

function revokePreviewUrl(url: string | null) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

function formatSpecialty(profesional: ProfesionalListItem) {
  if (profesional.especialidad) return profesional.especialidad
  if (profesional.rol === 'owner') return 'Owner clínico'
  if (profesional.rol === 'admin') return 'Dirección clínica'

  return 'Sin definir'
}

function formatAgenda(profesional: ProfesionalListItem) {
  const descanso = profesional.descanso_entre_reservas_minutos
  const duracion = profesional.duracion_sesion_minutos ?? 60
  const intervalo = profesional.intervalo_reservas_minutos ?? duracion

  return [
    `${duracion} min sesión`,
    `cada ${intervalo} min`,
    descanso > 0 ? `${descanso} min descanso` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function ProfesionalesManager({
  initialProfesionales,
  centroId,
  demoMode,
  loadError,
  planContext,
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageMarkedForRemoval, setImageMarkedForRemoval] = useState(false)
  const [imageUploadPending, setImageUploadPending] = useState(false)
  const [isPending, startTransition] = useTransition()
  const demoPlanId = planContext?.planId
  const isSaving = isPending || imageUploadPending

  const activeCount = useMemo(
    () => profesionales.filter((profesional) => profesional.activo).length,
    [profesionales]
  )
  const professionalLimit = planContext
    ? getProfessionalLimit(planContext.planId, planContext.extraProfessionalsCount)
    : null
  const reachedProfessionalLimit =
    professionalLimit !== null && activeCount >= professionalLimit
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
  const watchedProfesionalName =
    useWatch({ control: form.control, name: 'nombre' }) ?? ''

  useEffect(() => {
    if (!demoMode) return

    migrateLegacyAgendixStorage(demoPlanId)

    let storedValue: ProfesionalListItem[] | null = null

    try {
      const storedProfesionales = readDemoStorageItem(
        demoPlanId,
        'profesionales'
      )

      if (storedProfesionales) {
        const parsedProfesionales = JSON.parse(storedProfesionales)

        if (Array.isArray(parsedProfesionales)) {
          storedValue = (parsedProfesionales as ProfesionalListItem[]).map(
            (profesional) => ({
              ...profesional,
              avatar_url: profesional.avatar_url ?? null,
              descanso_entre_reservas_minutos:
                profesional.descanso_entre_reservas_minutos ?? 0,
              duracion_sesion_minutos:
                profesional.duracion_sesion_minutos ?? 60,
              intervalo_reservas_minutos:
                profesional.intervalo_reservas_minutos ??
                profesional.duracion_sesion_minutos ??
                60,
            })
          )
        }
      }
    } catch {
      removeDemoStorageItem(demoPlanId, 'profesionales')
    }

    window.setTimeout(() => {
      setProfesionales(storedValue ?? initialProfesionales)
    }, 0)
  }, [demoMode, demoPlanId, initialProfesionales])

  useEffect(() => () => revokePreviewUrl(imagePreviewUrl), [imagePreviewUrl])

  const saveDemoProfesionales = (nextProfesionales: ProfesionalListItem[]) => {
    setProfesionales(nextProfesionales)
    writeDemoStorageItem(
      demoPlanId,
      'profesionales',
      JSON.stringify(nextProfesionales)
    )
  }

  const resetImageDraft = () => {
    setImagePreviewUrl((current) => {
      revokePreviewUrl(current)
      return null
    })
    setImageFile(null)
    setImageMarkedForRemoval(false)
  }

  const selectImageFile = (file: File) => {
    setImagePreviewUrl((current) => {
      revokePreviewUrl(current)
      return URL.createObjectURL(file)
    })
    setImageFile(file)
    setImageMarkedForRemoval(false)
  }

  const removeImage = () => {
    setImagePreviewUrl((current) => {
      revokePreviewUrl(current)
      return null
    })
    setImageFile(null)
    setImageMarkedForRemoval(true)
  }

  const resolveAvatarUpdate = async (): Promise<{
    avatarUrl?: string | null
    uploadedImage?: UploadedPublicImage
  }> => {
    if (imageFile && demoMode) {
      return { avatarUrl: await readImageAsDataUrl(imageFile) }
    }

    if (imageFile) {
      if (!centroId) {
        throw new Error('No pudimos identificar el centro para subir la imagen.')
      }

      const entityId =
        modal?.mode === 'edit' ? modal.profesional.id : `nuevo-${demoId('avatar')}`
      const uploadedImage = await uploadPublicImage({
        bucket: PROFESSIONAL_AVATARS_BUCKET,
        path: buildProfileImageStoragePath({
          centroId,
          entityId,
          file: imageFile,
          folder: 'professionals',
        }),
        file: imageFile,
      })

      return { avatarUrl: uploadedImage.publicUrl, uploadedImage }
    }

    if (imageMarkedForRemoval) {
      return { avatarUrl: null }
    }

    return { avatarUrl: undefined }
  }

  const openCreate = () => {
    setFeedback(null)
    if (reachedProfessionalLimit) {
      setFeedback({
        type: 'error',
        message:
          planContext?.planId === 'individual'
            ? 'Tu plan Individual permite 1 profesional. Mejora a Agendix Center para gestionar un equipo.'
            : `Alcanzaste el límite de ${professionalLimit} profesionales de tu plan.`,
      })
      return
    }
    resetImageDraft()
    form.reset(emptyValues)
    setModal({ mode: 'create' })
  }

  const openEdit = (profesional: ProfesionalListItem) => {
    setFeedback(null)
    resetImageDraft()
    form.reset({
      nombre: profesional.nombre,
      email: profesional.email,
      telefono: profesional.telefono ?? '',
      especialidad: profesional.especialidad ?? '',
      recordatorio_email_subject: profesional.recordatorio_email_subject ?? '',
      recordatorio_email_body: profesional.recordatorio_email_body ?? '',
      descanso_entre_reservas_minutos:
        profesional.descanso_entre_reservas_minutos ?? 0,
      duracion_sesion_minutos: profesional.duracion_sesion_minutos ?? 60,
      intervalo_reservas_minutos: profesional.intervalo_reservas_minutos ?? 60,
      activo: profesional.activo,
    })
    setModal({ mode: 'edit', profesional })
  }

  const closeModal = () => {
    setModal(null)
    resetImageDraft()
    form.reset(emptyValues)
  }

  const resetDemo = () => {
    saveDemoProfesionales(initialProfesionales)
    setFeedback({ type: 'success', message: 'Demo restablecido.' })
  }

  const handleDemoSave = async (
    values: ProfesionalFormValues,
    avatarUrl?: string | null
  ) => {
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
      const activatingProfesional =
        values.activo && modal.profesional.activo === false

      if (demoMode && activatingProfesional && planContext) {
        const capacity = canAddProfessional({
          planId: planContext.planId,
          currentCount: activeCount,
          extraProfessionalsCount: planContext.extraProfessionalsCount,
        })

        if (!capacity.allowed) {
          setFeedback({
            type: 'error',
            message: `Alcanzaste el límite de ${capacity.limit} profesionales de tu plan.`,
          })
          return
        }
      }

      const updatedProfesional: ProfesionalListItem = {
        ...modal.profesional,
        nombre: values.nombre.trim(),
        email: normalizedEmail,
        telefono: values.telefono?.trim() || null,
        especialidad: values.especialidad?.trim() || null,
        avatar_url:
          avatarUrl === undefined ? modal.profesional.avatar_url : avatarUrl,
        recordatorio_email_subject:
          values.recordatorio_email_subject?.trim() || null,
        recordatorio_email_body: values.recordatorio_email_body?.trim() || null,
        descanso_entre_reservas_minutos:
          values.descanso_entre_reservas_minutos,
        duracion_sesion_minutos: values.duracion_sesion_minutos,
        intervalo_reservas_minutos: values.intervalo_reservas_minutos,
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
    if (demoMode && values.activo && planContext) {
      const capacity = canAddProfessional({
        planId: planContext.planId,
        currentCount: activeCount,
        extraProfessionalsCount: planContext.extraProfessionalsCount,
      })

      if (!capacity.allowed) {
        setFeedback({
          type: 'error',
          message:
            planContext.planId === 'individual'
              ? 'Tu plan Individual permite 1 profesional. Mejora a Agendix Center para gestionar un equipo.'
              : `Alcanzaste el límite de ${capacity.limit} profesionales de tu plan.`,
        })
        return
      }
    }

    const nuevoProfesional: ProfesionalListItem = {
      id: demoId('demo-miembro'),
      profile_id: demoId('demo-profile'),
      nombre: values.nombre.trim(),
      apellido: null,
      email: normalizedEmail,
      telefono: values.telefono?.trim() || null,
      especialidad: values.especialidad?.trim() || null,
      avatar_url: avatarUrl ?? null,
      recordatorio_email_subject: values.recordatorio_email_subject?.trim() || null,
      recordatorio_email_body: values.recordatorio_email_body?.trim() || null,
      descanso_entre_reservas_minutos:
        values.descanso_entre_reservas_minutos,
      duracion_sesion_minutos: values.duracion_sesion_minutos,
      intervalo_reservas_minutos: values.intervalo_reservas_minutos,
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

    startTransition(async () => {
      let uploadedImage: UploadedPublicImage | undefined

      try {
        setImageUploadPending(true)
        const imageUpdate = await resolveAvatarUpdate()
        uploadedImage = imageUpdate.uploadedImage

        if (demoMode) {
          await handleDemoSave(values, imageUpdate.avatarUrl)
          return
        }

        const result =
          modal.mode === 'edit'
            ? await updateProfesionalAction(
                modal.profesional.id,
                values,
                imageUpdate.avatarUrl
              )
            : await createProfesionalAction(values, imageUpdate.avatarUrl)

        if (!result.ok) {
          if (uploadedImage) {
            await removeUploadedPublicImage(uploadedImage).catch(() => null)
          }
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
      } catch (error) {
        if (uploadedImage) {
          await removeUploadedPublicImage(uploadedImage).catch(() => null)
        }
        setFeedback({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'No pudimos guardar la imagen del profesional.',
        })
      } finally {
        setImageUploadPending(false)
      }
    })
  })

  const toggleProfesional = (profesional: ProfesionalListItem) => {
    const nextActiveState = !profesional.activo
    setFeedback(null)

    if (demoMode) {
      if (nextActiveState && planContext) {
        const capacity = canAddProfessional({
          planId: planContext.planId,
          currentCount: activeCount,
          extraProfessionalsCount: planContext.extraProfessionalsCount,
        })

        if (!capacity.allowed) {
          setFeedback({
            type: 'error',
            message:
              planContext.planId === 'individual'
                ? 'Tu plan Individual permite 1 profesional. Mejora a Agendix Center para gestionar un equipo.'
                : `Alcanzaste el límite de ${capacity.limit} profesionales de tu plan.`,
          })
          return
        }
      }

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
            item.id === savedProfesional.id ? savedProfesional : item
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

      {reachedProfessionalLimit && (
        <PlanLimitBanner
          title="Límite de profesionales alcanzado"
          description={
            planContext?.planId === 'individual'
              ? 'Tu plan Individual permite 1 profesional. Mejora a Agendix Center para gestionar un equipo.'
              : 'Tu plan actual llegó al máximo de profesionales activos. Mejora el plan o habilita profesionales extra cuando estén disponibles comercialmente.'
          }
        />
      )}

      {planContext && (
        <UsageMeter
          label="Profesionales activos"
          value={activeCount}
          limit={professionalLimit}
          helper={`Plan ${planContext.plan.shortName}`}
        />
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
            <ImageUploadField
              label="Foto de perfil"
              description="Se usará internamente y en el portal público cuando pacientes elijan profesional."
              entityName={
                watchedProfesionalName || modal.profesional?.nombre || 'Profesional'
              }
              imageUrl={modal.profesional?.avatar_url ?? null}
              previewUrl={imagePreviewUrl}
              markedForRemoval={imageMarkedForRemoval}
              variant="avatar"
              disabled={isSaving}
              uploading={imageUploadPending}
              onFileSelect={selectImageFile}
              onRemove={removeImage}
              onRestore={resetImageDraft}
            />

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

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Duración sesión"
                hint="min"
                error={form.formState.errors.duracion_sesion_minutos?.message}
              >
                <input
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  placeholder="60"
                  className="agendix-input"
                  aria-invalid={
                    form.formState.errors.duracion_sesion_minutos
                      ? 'true'
                      : 'false'
                  }
                  {...form.register('duracion_sesion_minutos', {
                    setValueAs: (value) => (value === '' ? NaN : Number(value)),
                  })}
                />
              </Field>

              <Field
                label="Cada cuánto"
                hint="min"
                error={form.formState.errors.intervalo_reservas_minutos?.message}
              >
                <input
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  placeholder="60"
                  className="agendix-input"
                  aria-invalid={
                    form.formState.errors.intervalo_reservas_minutos
                      ? 'true'
                      : 'false'
                  }
                  {...form.register('intervalo_reservas_minutos', {
                    setValueAs: (value) => (value === '' ? NaN : Number(value)),
                  })}
                />
              </Field>

              <Field
                label="Descanso"
                hint="min"
                error={
                  form.formState.errors.descanso_entre_reservas_minutos?.message
                }
              >
                <input
                  type="number"
                  min={0}
                  max={240}
                  step={5}
                  placeholder="0"
                  className="agendix-input"
                  aria-invalid={
                    form.formState.errors.descanso_entre_reservas_minutos
                      ? 'true'
                      : 'false'
                  }
                  {...form.register('descanso_entre_reservas_minutos', {
                    setValueAs: (value) => (value === '' ? NaN : Number(value)),
                  })}
                />
              </Field>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
              <Field
                label="Asunto personalizado"
                error={form.formState.errors.recordatorio_email_subject?.message}
              >
                <input
                  type="text"
                  className="agendix-input bg-white"
                  aria-invalid={
                    form.formState.errors.recordatorio_email_subject
                      ? 'true'
                      : 'false'
                  }
                  {...form.register('recordatorio_email_subject')}
                />
              </Field>

              <Field
                label="Mensaje personalizado"
                error={form.formState.errors.recordatorio_email_body?.message}
              >
                <textarea
                  rows={6}
                  className="agendix-input min-h-36 resize-y bg-white leading-6"
                  aria-invalid={
                    form.formState.errors.recordatorio_email_body
                      ? 'true'
                      : 'false'
                  }
                  {...form.register('recordatorio_email_body')}
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
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? imageUploadPending
                    ? 'Subiendo imagen...'
                    : 'Guardando...'
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
              <th className="px-4 py-3 font-medium">Agenda</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/70">
            {profesionales.map((profesional) => (
              <tr key={profesional.id} className="transition hover:bg-slate-50/60">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <EntityImage
                      src={profesional.avatar_url}
                      name={profesional.nombre}
                      size="sm"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">
                        {profesional.nombre}
                      </p>
                      <div className="mt-0.5">
                        <Badge tone={profesional.rol === 'owner' ? 'orange' : profesional.rol === 'admin' ? 'blue' : 'slate'}>
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
                <td className="px-4 py-3.5 text-sm text-slate-500">
                  {formatAgenda(profesional)}
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
                <EntityImage
                  src={profesional.avatar_url}
                  name={profesional.nombre}
                  size="sm"
                />
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
              <p>{formatAgenda(profesional)}</p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <Badge tone={profesional.rol === 'owner' ? 'orange' : profesional.rol === 'admin' ? 'blue' : 'slate'}>
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
