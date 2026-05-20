'use client'

import { useEffect, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { useForm, useWatch } from 'react-hook-form'
import {
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  RotateCcw,
  Save,
  Settings,
} from 'lucide-react'
import {
  updateCentroAction,
  updateHorariosAction,
  updateRecordatoriosAction,
} from '@/app/actions/centro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { MetricStrip } from '@/components/ui/metric-strip'
import { PageHeader } from '@/components/ui/page-header'
import {
  defaultHorariosCentro,
  diasSemana,
  horarioDescansoDurationMinutes,
  horarioDurationMinutes,
  horariosCentroStorageKey,
  normalizeHorarios,
  weeklyAvailabilityMinutes,
} from '@/lib/centro/horarios'
import type {
  CentroConfig,
  HorarioCentro,
  RecordatoriosConfig,
} from '@/lib/centro/types'
import type { RolCentro } from '@/lib/types/database'
import {
  centroSchema,
  horariosCentroSchema,
  recordatoriosCentroSchema,
  type CentroFormValues,
  type HorariosCentroFormValues,
  type RecordatoriosCentroFormValues,
} from '@/lib/centro/validation'
import { migrateLegacyAgendixStorage } from '@/lib/storage/migrations'

type CentroManagerProps = {
  initialCentro: CentroConfig
  initialHorarios: HorarioCentro[]
  initialRecordatorios: RecordatoriosConfig
  rol: RolCentro
  demoMode: boolean
  loadError?: string
}

const centroStorageKey = 'agendix-demo-centro'
const recordatoriosStorageKey = 'agendix-demo-recordatorios'

function nowIso() {
  return new Date().toISOString()
}

function centroFormValues(centro: CentroConfig): CentroFormValues {
  return {
    nombre: centro.nombre,
    rut: centro.rut ?? '',
    direccion: centro.direccion ?? '',
    telefono: centro.telefono ?? '',
    email: centro.email ?? '',
  }
}

function recordatoriosFormValues(
  recordatorios: RecordatoriosConfig
): RecordatoriosCentroFormValues {
  return {
    email_enabled: recordatorios.email_enabled,
    whatsapp_enabled: recordatorios.whatsapp_enabled,
    email_hours_before: recordatorios.email_hours_before ?? 24,
    email_subject_template: recordatorios.email_subject_template,
    email_body_template: recordatorios.email_body_template,
  }
}

function completionScore(centro: CentroConfig) {
  const fields = [
    centro.nombre,
    centro.rut,
    centro.email,
    centro.telefono,
    centro.direccion,
  ]
  const completed = fields.filter(Boolean).length

  return Math.round((completed / fields.length) * 100)
}

function weeklyHoursLabel(horarios: HorarioCentro[]) {
  return hoursFromMinutesLabel(weeklyAvailabilityMinutes(horarios))
}

function hoursFromMinutesLabel(minutes: number) {
  const hours = minutes / 60

  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`
}

function activeDaysLabel(horarios: HorarioCentro[]) {
  const activeDays = normalizeHorarios(horarios).filter(
    (horario) => horario.activo
  ).length

  return `${activeDays}/7`
}

function roleLabel(rol: RolCentro) {
  if (rol === 'owner') return 'Owner'
  if (rol === 'admin') return 'Administrador'
  if (rol === 'recepcion') return 'Recepción'

  return 'Profesional'
}

export function CentroManager({
  initialCentro,
  initialHorarios,
  initialRecordatorios,
  rol,
  demoMode,
  loadError,
}: CentroManagerProps) {
  const router = useRouter()
  const [centro, setCentro] = useState(initialCentro)
  const [horarios, setHorarios] = useState(normalizeHorarios(initialHorarios))
  const [recordatorios, setRecordatorios] = useState(initialRecordatorios)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(
    loadError ? { type: 'error', message: loadError } : null
  )
  const [isPending, startTransition] = useTransition()

  const canEditCentro = demoMode || rol === 'owner' || rol === 'admin'
  const score = completionScore(centro)
  const activeDays = activeDaysLabel(horarios)
  const weeklyHours = weeklyHoursLabel(horarios)
  const publicUrl = `/${centro.slug}`

  const centroForm = useForm<CentroFormValues>({
    resolver: zodResolver(centroSchema),
    defaultValues: centroFormValues(initialCentro),
  })
  const horariosForm = useForm<HorariosCentroFormValues>({
    resolver: zodResolver(horariosCentroSchema),
    defaultValues: { horarios },
  })
  const recordatoriosForm = useForm<RecordatoriosCentroFormValues>({
    resolver: zodResolver(recordatoriosCentroSchema),
    defaultValues: recordatoriosFormValues(initialRecordatorios),
  })
  const watchedHorarios =
    useWatch({
      control: horariosForm.control,
      name: 'horarios',
    }) ?? horarios
  const watchedRecordatorios =
    useWatch({
      control: recordatoriosForm.control,
    }) ?? recordatoriosFormValues(recordatorios)
  const watchedEmailReminderHours = Number(watchedRecordatorios.email_hours_before)
  const emailReminderHours = Number.isFinite(watchedEmailReminderHours)
    ? watchedEmailReminderHours
    : 24

  useEffect(() => {
    if (demoMode) return

    centroForm.reset(centroFormValues(initialCentro))
    horariosForm.reset({ horarios: normalizeHorarios(initialHorarios) })
    recordatoriosForm.reset(recordatoriosFormValues(initialRecordatorios))
  }, [
    centroForm,
    demoMode,
    horariosForm,
    initialCentro,
    initialHorarios,
    initialRecordatorios,
    recordatoriosForm,
  ])

  useEffect(() => {
    if (!demoMode) return

    migrateLegacyAgendixStorage()

    let storedCentro: CentroConfig | null = null
    let storedHorarios: HorarioCentro[] | null = null
    let storedRecordatorios: RecordatoriosConfig | null = null

    try {
      const storedCentroValue = window.localStorage.getItem(centroStorageKey)
      if (storedCentroValue) storedCentro = JSON.parse(storedCentroValue) as CentroConfig

      const storedHorariosValue = window.localStorage.getItem(horariosCentroStorageKey)
      if (storedHorariosValue) {
        storedHorarios = normalizeHorarios(JSON.parse(storedHorariosValue) as HorarioCentro[])
      }

      const storedRecordatoriosValue =
        window.localStorage.getItem(recordatoriosStorageKey)
      if (storedRecordatoriosValue) {
        storedRecordatorios = JSON.parse(storedRecordatoriosValue) as RecordatoriosConfig
      }
    } catch {
      window.localStorage.removeItem(centroStorageKey)
      window.localStorage.removeItem(horariosCentroStorageKey)
      window.localStorage.removeItem(recordatoriosStorageKey)
    }

    const nextCentro = storedCentro ?? initialCentro
    const nextHorarios = storedHorarios ?? normalizeHorarios(initialHorarios)
    const nextRecordatorios = storedRecordatorios ?? initialRecordatorios

    window.setTimeout(() => {
      setCentro(nextCentro)
      centroForm.reset(centroFormValues(nextCentro))
      setHorarios(nextHorarios)
      horariosForm.reset({ horarios: nextHorarios })
      setRecordatorios(nextRecordatorios)
      recordatoriosForm.reset(recordatoriosFormValues(nextRecordatorios))
    }, 0)
  }, [
    centroForm,
    demoMode,
    horariosForm,
    initialCentro,
    initialHorarios,
    initialRecordatorios,
    recordatoriosForm,
  ])

  const saveDemoCentro = (values: CentroFormValues) => {
    const updatedCentro: CentroConfig = {
      ...centro,
      nombre: values.nombre.trim(),
      rut: values.rut?.trim() || null,
      direccion: values.direccion?.trim() || null,
      telefono: values.telefono?.trim() || null,
      email: values.email?.trim().toLowerCase() || null,
      updated_at: nowIso(),
    }

    setCentro(updatedCentro)
    window.localStorage.setItem(centroStorageKey, JSON.stringify(updatedCentro))
    setFeedback({ type: 'success', message: 'Centro actualizado en modo demo.' })
  }

  const onCentroSubmit = centroForm.handleSubmit((values) => {
    setFeedback(null)

    if (demoMode) {
      saveDemoCentro(values)
      return
    }

    if (!canEditCentro) {
      setFeedback({
        type: 'error',
        message: 'Solo administradores pueden actualizar la configuración del centro.',
      })
      return
    }

    startTransition(async () => {
      const result = await updateCentroAction(values)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.centro) {
        setCentro(result.centro)
        centroForm.reset(centroFormValues(result.centro))
      }

      setFeedback({ type: 'success', message: result.message })
      router.refresh()
    })
  })

  const onHorariosSubmit = horariosForm.handleSubmit((values) => {
    setFeedback(null)

    if (demoMode) {
      const normalizedHorarios = normalizeHorarios(values.horarios)
      setHorarios(normalizedHorarios)
      window.localStorage.setItem(horariosCentroStorageKey, JSON.stringify(normalizedHorarios))
      setFeedback({ type: 'success', message: 'Horario operativo actualizado en modo demo.' })
      return
    }

    startTransition(async () => {
      const result = await updateHorariosAction(values)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      const normalizedHorarios = normalizeHorarios(values.horarios)
      setHorarios(normalizedHorarios)
      setFeedback({ type: 'success', message: result.message })
    })
  })

  const onRecordatoriosSubmit = recordatoriosForm.handleSubmit((values) => {
    setFeedback(null)

    if (demoMode) {
      const updatedRecordatorios: RecordatoriosConfig = {
        ...recordatorios,
        email_enabled: values.email_enabled,
        whatsapp_enabled: values.whatsapp_enabled,
        email_hours_before: values.email_hours_before,
        email_subject_template: values.email_subject_template.trim(),
        email_body_template: values.email_body_template.trim(),
        updated_at: nowIso(),
      }

      setRecordatorios(updatedRecordatorios)
      window.localStorage.setItem(
        recordatoriosStorageKey,
        JSON.stringify(updatedRecordatorios)
      )
      setFeedback({
        type: 'success',
        message: 'Recordatorios actualizados en modo demo.',
      })
      return
    }

    if (!canEditCentro) {
      setFeedback({
        type: 'error',
        message: 'Solo administradores pueden actualizar los recordatorios.',
      })
      return
    }

    startTransition(async () => {
      const result = await updateRecordatoriosAction(values)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.recordatorios) {
        setRecordatorios(result.recordatorios)
        recordatoriosForm.reset(recordatoriosFormValues(result.recordatorios))
      }

      setFeedback({ type: 'success', message: result.message })
      router.refresh()
    })
  })

  const resetHorarios = () => {
    const normalizedDefault = normalizeHorarios(defaultHorariosCentro)
    setFeedback(null)

    if (demoMode) {
      setHorarios(normalizedDefault)
      horariosForm.reset({ horarios: normalizedDefault })
      window.localStorage.setItem(horariosCentroStorageKey, JSON.stringify(normalizedDefault))
      setFeedback({ type: 'success', message: 'Horario operativo restablecido.' })
      return
    }

    startTransition(async () => {
      const result = await updateHorariosAction({ horarios: normalizedDefault })

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      setHorarios(normalizedDefault)
      horariosForm.reset({ horarios: normalizedDefault })
      setFeedback({ type: 'success', message: 'Horario operativo restablecido.' })
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Centro"
        description="Configura el nombre, contacto y horario de tu centro. Esta información aparece en la página pública de reservas."
        eyebrow="Configuración"
        icon={Settings}
        meta={
          <div className="flex flex-wrap gap-2">
            {demoMode && <Badge tone="slate">Modo demo</Badge>}
            <Badge tone={centro.activo ? 'green' : 'red'}>
              {centro.activo ? 'Centro activo' : 'Centro inactivo'}
            </Badge>
          </div>
        }
      >
        <Button
          type="button"
          variant="secondary"
          onClick={resetHorarios}
        >
          <RotateCcw size={16} aria-hidden="true" />
          Restablecer horario
        </Button>
        <Button type="submit" form="centro-form" disabled={isPending || !canEditCentro}>
          <Save size={16} aria-hidden="true" />
          {isPending ? 'Guardando...' : 'Guardar centro'}
        </Button>
      </PageHeader>

      {feedback && (
        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
      )}

      <MetricStrip
        items={[
          {
            label: 'Ficha completa',
            value: `${score}%`,
            description: 'Datos mínimos para operar y publicar.',
            icon: CheckCircle2,
            tone: score >= 80 ? 'green' : 'blue',
          },
          {
            label: 'Horario semanal',
            value: weeklyHours,
            description: 'Horas base disponibles para agenda.',
            icon: Clock3,
          },
          {
            label: 'Días activos',
            value: activeDays,
            description: 'Jornadas abiertas en la semana.',
            icon: CalendarClock,
            tone: 'slate',
          },
          {
            label: 'Página pública',
            value: publicUrl,
            description: 'Ruta base para futuras reservas online.',
            icon: Globe2,
            tone: 'green',
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_480px] 2xl:grid-cols-[minmax(0,1fr)_520px]">
        <section id="datos" className="agendix-surface scroll-mt-24 overflow-hidden rounded-2xl">
          <div className="border-b border-slate-200/80 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-200/60">
                <Building2 size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-medium text-slate-800">
                  Datos del centro
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Información visible para operación interna y futuras reservas públicas.
                </p>
              </div>
            </div>
          </div>

          <form
            id="centro-form"
            onSubmit={onCentroSubmit}
            className="space-y-5 p-5"
            noValidate
          >
            <Field label="Nombre del centro" error={centroForm.formState.errors.nombre?.message}>
              <input
                type="text"
                placeholder="Centro Integral de Salud"
                className="agendix-input"
                disabled={!canEditCentro}
                aria-invalid={centroForm.formState.errors.nombre ? 'true' : 'false'}
                {...centroForm.register('nombre')}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="RUT" error={centroForm.formState.errors.rut?.message}>
                <input
                  type="text"
                  placeholder="76.123.456-7"
                  className="agendix-input"
                  disabled={!canEditCentro}
                  aria-invalid={centroForm.formState.errors.rut ? 'true' : 'false'}
                  {...centroForm.register('rut')}
                />
              </Field>
              <Field label="Email" error={centroForm.formState.errors.email?.message}>
                <input
                  type="email"
                  placeholder="contacto@centro.cl"
                  className="agendix-input"
                  disabled={!canEditCentro}
                  aria-invalid={centroForm.formState.errors.email ? 'true' : 'false'}
                  {...centroForm.register('email')}
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Teléfono" error={centroForm.formState.errors.telefono?.message}>
                <input
                  type="tel"
                  placeholder="+56 2 2400 1000"
                  className="agendix-input"
                  disabled={!canEditCentro}
                  aria-invalid={centroForm.formState.errors.telefono ? 'true' : 'false'}
                  {...centroForm.register('telefono')}
                />
              </Field>
              <Field label="Slug público">
                <input
                  type="text"
                  value={centro.slug}
                  className="agendix-input bg-slate-50/60 text-slate-500"
                  disabled
                  readOnly
                />
              </Field>
            </div>

            <Field
              label="Dirección"
              error={centroForm.formState.errors.direccion?.message}
            >
              <input
                type="text"
                placeholder="Av. Providencia 1234, Santiago"
                className="agendix-input"
                disabled={!canEditCentro}
                aria-invalid={centroForm.formState.errors.direccion ? 'true' : 'false'}
                {...centroForm.register('direccion')}
              />
            </Field>

            {!canEditCentro && (
              <p className="rounded-xl border border-slate-200/60 bg-slate-50/60 px-3 py-2 text-sm text-slate-600">
                Tu rol actual es {roleLabel(rol)}. Puedes revisar la configuración,
                pero solo administradores pueden editarla.
              </p>
            )}
          </form>
        </section>

        <section className="rounded-2xl border border-orange-100/80 bg-orange-50/30 p-4 shadow-sm shadow-slate-900/[0.025] sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-500 ring-1 ring-orange-200/60">
              <MapPin size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-medium text-slate-800">Resumen operativo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Señales rápidas para dejar el centro presentable.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <InfoRow icon={Building2} label="Centro" value={centro.nombre} />
            <InfoRow icon={Mail} label="Contacto" value={centro.email ?? 'Sin email'} />
            <InfoRow icon={MapPin} label="Ubicación" value={centro.direccion ?? 'Sin dirección'} />
            <InfoRow icon={Globe2} label="Ruta pública" value={publicUrl} />
          </div>
        </section>
      </div>

      <section id="recordatorios" className="agendix-surface scroll-mt-24 overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-200/60">
              <BellRing size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-medium text-slate-800">
                Recordatorios automáticos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Agendix prepara email con confirmación y mantiene WhatsApp como canal pendiente.
              </p>
            </div>
          </div>
          <Button
            type="submit"
            form="recordatorios-form"
            disabled={isPending || !canEditCentro}
          >
            <Save size={16} aria-hidden="true" />
            Guardar recordatorios
          </Button>
        </div>

        <form
          id="recordatorios-form"
          onSubmit={onRecordatoriosSubmit}
          className="grid gap-4 p-5 lg:grid-cols-2"
          noValidate
        >
          <ReminderToggle
            icon={Mail}
            title={`Email ${emailReminderHours} horas antes`}
            description="Envía un correo con el resumen de la reserva usando Resend."
            enabled={!!watchedRecordatorios.email_enabled}
            disabled={!canEditCentro}
            inputProps={recordatoriosForm.register('email_enabled')}
          />
          <ReminderToggle
            icon={MessageCircle}
            title="WhatsApp 24 horas antes"
            description="Canal preparado para cuando esté activa la integración de WhatsApp."
            enabled={!!watchedRecordatorios.whatsapp_enabled}
            disabled={!canEditCentro}
            inputProps={recordatoriosForm.register('whatsapp_enabled')}
          />

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 lg:col-span-2">
            <Field
              label="Anticipación del correo"
              error={recordatoriosForm.formState.errors.email_hours_before?.message}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="number"
                  min={1}
                  max={168}
                  step={1}
                  className="agendix-input sm:max-w-40"
                  disabled={!canEditCentro}
                  aria-invalid={
                    recordatoriosForm.formState.errors.email_hours_before
                      ? 'true'
                      : 'false'
                  }
                  {...recordatoriosForm.register('email_hours_before', {
                    valueAsNumber: true,
                  })}
                />
                <span className="text-sm font-medium text-slate-500">
                  horas antes de la cita
                </span>
              </div>
            </Field>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <Field
              label="Asunto del correo"
              error={recordatoriosForm.formState.errors.email_subject_template?.message}
            >
              <input
                type="text"
                className="agendix-input"
                disabled={!canEditCentro}
                aria-invalid={
                  recordatoriosForm.formState.errors.email_subject_template
                    ? 'true'
                    : 'false'
                }
                {...recordatoriosForm.register('email_subject_template')}
              />
            </Field>

            <Field
              label="Mensaje del correo"
              error={recordatoriosForm.formState.errors.email_body_template?.message}
            >
              <textarea
                rows={7}
                className="agendix-input min-h-40 resize-y leading-6"
                disabled={!canEditCentro}
                aria-invalid={
                  recordatoriosForm.formState.errors.email_body_template
                    ? 'true'
                    : 'false'
                }
                {...recordatoriosForm.register('email_body_template')}
              />
            </Field>
          </div>
        </form>

        <div className="border-t border-slate-200/80 bg-orange-50/30 px-5 py-3 text-sm text-slate-600">
          Los mensajes no se envían si la reserva está cancelada o si la hora ya venció.
        </div>
      </section>

      <section id="horarios" className="agendix-surface scroll-mt-24 overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-200/60">
              <CalendarClock size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-medium text-slate-800">
                Horario operativo
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Base semanal usada por el calendario para comparar disponibilidad y ocupación.
              </p>
            </div>
          </div>
          <Button type="submit" form="horarios-form">
            <Save size={16} aria-hidden="true" />
            Guardar horario
          </Button>
        </div>

        <form
          id="horarios-form"
          onSubmit={onHorariosSubmit}
          className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2 xl:grid-cols-4"
          noValidate
        >
          {diasSemana.map((dia, index) => {
            const watchedHorario = watchedHorarios[index] ?? defaultHorariosCentro[index]
            const activo = watchedHorario.activo
            const descansoActivo = activo && Boolean(watchedHorario.descanso_activo)
            const duration = horarioDurationMinutes(watchedHorario)
            const descansoDuration = horarioDescansoDurationMinutes(watchedHorario)
            const horarioErrors = horariosForm.formState.errors.horarios?.[index]

            return (
              <article
                key={dia.dia}
                className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3"
              >
                <input
                  type="hidden"
                  value={dia.dia}
                  {...horariosForm.register(`horarios.${index}.dia`, {
                    valueAsNumber: true,
                  })}
                />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {dia.shortLabel}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {dia.label}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-orange-200 text-orange-600 focus:ring-orange-500"
                      {...horariosForm.register(`horarios.${index}.activo`)}
                    />
                    Activo
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700">
                      Apertura
                    </span>
                    <input
                      type="time"
                      className="agendix-time-input mt-1"
                      disabled={!activo}
                      {...horariosForm.register(`horarios.${index}.inicio`)}
                    />
                    {horarioErrors?.inicio?.message && (
                      <span className="mt-1 block text-[11px] font-medium text-red-500">
                        {horarioErrors.inicio.message}
                      </span>
                    )}
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-700">
                      Cierre
                    </span>
                    <input
                      type="time"
                      className="agendix-time-input mt-1"
                      disabled={!activo}
                      {...horariosForm.register(`horarios.${index}.fin`)}
                    />
                    {horarioErrors?.fin?.message && (
                      <span className="mt-1 block text-[11px] font-medium text-red-500">
                        {horarioErrors.fin.message}
                      </span>
                    )}
                  </label>
                </div>

                <div
                  className={`mt-3 rounded-xl border px-2.5 py-2 transition-colors ${
                    descansoActivo
                      ? 'border-orange-200 bg-orange-50/45'
                      : 'border-slate-200/80 bg-white/85'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 shrink-0 rounded border-orange-200 text-orange-600 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!activo}
                        {...horariosForm.register(`horarios.${index}.descanso_activo`)}
                      />
                      <span className="truncate">Descanso</span>
                    </label>
                    <span className="shrink-0 text-[11px] font-medium text-slate-400">
                      Almuerzo
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[11px] font-semibold text-slate-600">
                        Inicio
                      </span>
                      <input
                        type="time"
                        className="agendix-time-input mt-1"
                        disabled={!activo}
                        {...horariosForm.register(`horarios.${index}.descanso_inicio`)}
                      />
                      {horarioErrors?.descanso_inicio?.message && (
                        <span className="mt-1 block text-[11px] font-medium text-red-500">
                          {horarioErrors.descanso_inicio.message}
                        </span>
                      )}
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-semibold text-slate-600">
                        Fin
                      </span>
                      <input
                        type="time"
                        className="agendix-time-input mt-1"
                        disabled={!activo}
                        {...horariosForm.register(`horarios.${index}.descanso_fin`)}
                      />
                      {horarioErrors?.descanso_fin?.message && (
                        <span className="mt-1 block text-[11px] font-medium text-red-500">
                          {horarioErrors.descanso_fin.message}
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                <p className="mt-2 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium leading-4 text-slate-500 ring-1 ring-slate-200/60">
                  {activo
                    ? `${hoursFromMinutesLabel(duration)} disponibles${
                        descansoDuration > 0
                          ? `, ${hoursFromMinutesLabel(descansoDuration)} descanso`
                          : ''
                      }`
                    : 'Cerrado'}
                </p>
              </article>
            )
          })}
        </form>
      </section>
    </div>
  )
}

function ReminderToggle({
  icon: Icon,
  title,
  description,
  enabled,
  disabled,
  inputProps,
}: {
  icon: LucideIcon
  title: string
  description: string
  enabled: boolean
  disabled: boolean
  inputProps: UseFormRegisterReturn
}) {
  return (
    <label className="group relative flex cursor-pointer gap-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 transition hover:border-orange-200 hover:bg-orange-50/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70">
      <input
        type="checkbox"
        className="peer sr-only"
        disabled={disabled}
        {...inputProps}
      />
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-orange-500 ring-1 ring-orange-200/70">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="font-semibold text-slate-800">{title}</span>
          <span
            className={[
              'rounded-full px-2.5 py-1 text-xs font-semibold',
              enabled
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'
                : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
            ].join(' ')}
          >
            {enabled ? 'Activo' : 'Pausado'}
          </span>
        </span>
        <span className="mt-2 block text-sm leading-6 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white p-3">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
        <Icon size={15} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  )
}
