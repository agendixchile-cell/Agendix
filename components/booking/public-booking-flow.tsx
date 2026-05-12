'use client'

import { useMemo, useRef, useState, type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useForm,
  type UseFormRegisterReturn,
  type UseFormReturn,
} from 'react-hook-form'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  CreditCard,
  HeartPulse,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { Field } from '@/components/ui/field'
import {
  formatBookingDate,
  generateBookingDays,
  getAvailableSlots,
} from '@/lib/booking/availability'
import type {
  PublicBookingData,
  PublicBookingProfessional,
  PublicBookingResult,
  PublicBookingService,
  PublicPaymentMethod,
} from '@/lib/booking/types'
import {
  publicBookingFormSchema,
  type PublicBookingFormValues,
} from '@/lib/booking/validation'

type Step = 1 | 2 | 3 | 4

const stepLabels = ['Servicio', 'Profesional', 'Fecha y hora', 'Datos y pago']

function formatPrice(value: number | null, currency: string) {
  if (value == null || value <= 0) return 'Sin precio publicado'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function modalityLabel(modality: PublicBookingService['modalidad']) {
  if (modality === 'online') return 'Online'
  if (modality === 'ambas') return 'Online o presencial'
  return 'Presencial'
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function stepIsReady({
  step,
  serviceId,
  professionalId,
  fecha,
  hora,
}: {
  step: Step
  serviceId: string
  professionalId: string
  fecha: string
  hora: string
}) {
  if (step === 1) return Boolean(serviceId)
  if (step === 2) return Boolean(professionalId)
  if (step === 3) return Boolean(fecha && hora)
  return true
}

function resolveNextBookingDate({
  data,
  serviceId,
  professionalId,
  currentDate,
}: {
  data: PublicBookingData
  serviceId: string
  professionalId: string
  currentDate: string
}) {
  const service = data.servicios.find((item) => item.id === serviceId) ?? null

  if (!service || !professionalId) return ''

  if (
    currentDate &&
    getAvailableSlots({
      fecha: currentDate,
      servicio: service,
      profesionalId: professionalId,
      horarios: data.horarios,
      busySlots: data.busySlots,
      activeRoomCount: data.activeRoomCount,
    }).length > 0
  ) {
    return currentDate
  }

  const days = generateBookingDays({ horarios: data.horarios, days: 28 })
  const nextDay = days.find((day) => {
    if (!day.active) return false

    return (
      getAvailableSlots({
        fecha: day.value,
        servicio: service,
        profesionalId: professionalId,
        horarios: data.horarios,
        busySlots: data.busySlots,
        activeRoomCount: data.activeRoomCount,
      }).length > 0
    )
  })

  return nextDay?.value ?? ''
}

export function PublicBookingFlow({
  data,
  slug,
}: {
  data: PublicBookingData
  slug: string
}) {
  const router = useRouter()
  const bookingRef = useRef<HTMLDivElement | null>(null)
  const initialServiceId = data.servicios.length === 1 ? data.servicios[0].id : ''
  const initialProfessionalId =
    data.profesionales.length === 1 ? data.profesionales[0].id : ''
  const [step, setStep] = useState<Step>(1)
  const [serviceId, setServiceId] = useState(initialServiceId)
  const [professionalId, setProfessionalId] = useState(initialProfessionalId)
  const [fecha, setFecha] = useState(() =>
    resolveNextBookingDate({
      data,
      serviceId: initialServiceId,
      professionalId: initialProfessionalId,
      currentDate: '',
    })
  )
  const [hora, setHora] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<PublicBookingFormValues>({
    resolver: zodResolver(publicBookingFormSchema),
    defaultValues: {
      nombre: '',
      documento: '',
      email: '',
      telefono: '',
      motivo: '',
      payment_method: 'presencial',
      aceptaTerminos: false,
    },
  })

  const selectedService =
    data.servicios.find((service) => service.id === serviceId) ?? null
  const selectedProfessional =
    data.profesionales.find((professional) => professional.id === professionalId) ??
    null

  const days = useMemo(
    () => generateBookingDays({ horarios: data.horarios, days: 28 }),
    [data.horarios]
  )

  const slots = useMemo(
    () =>
      getAvailableSlots({
        fecha,
        servicio: selectedService,
        profesionalId: professionalId,
        horarios: data.horarios,
        busySlots: data.busySlots,
        activeRoomCount: data.activeRoomCount,
      }),
    [
      data.activeRoomCount,
      data.busySlots,
      data.horarios,
      fecha,
      professionalId,
      selectedService,
    ]
  )

  function scrollToBooking() {
    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function selectService(id: string) {
    setServiceId(id)
    setFecha(
      resolveNextBookingDate({
        data,
        serviceId: id,
        professionalId,
        currentDate: fecha,
      })
    )
    setHora('')
  }

  function selectProfessional(id: string) {
    setProfessionalId(id)
    setFecha(
      resolveNextBookingDate({
        data,
        serviceId,
        professionalId: id,
        currentDate: fecha,
      })
    )
    setHora('')
  }

  function goNext() {
    if (!stepIsReady({ step, serviceId, professionalId, fecha, hora })) return
    setStep((current) => Math.min(current + 1, 4) as Step)
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 1) as Step)
  }

  async function submitBooking(values: PublicBookingFormValues) {
    if (!selectedService || !selectedProfessional || !fecha || !hora) return

    setSubmitting(true)
    setSubmitError('')

    try {
      if (data.demoMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 700))
        const params = new URLSearchParams({
          demo: '1',
          servicio: selectedService.nombre,
          profesional: selectedProfessional.nombre,
          fecha,
          hora,
          precio: selectedService.precio?.toString() ?? '',
          payment_method: values.payment_method,
          payment_status:
            values.payment_method === 'online' ? 'paid' : 'pending',
        })
        router.push(`/agendar/${slug}/confirmacion?${params.toString()}`)
        return
      }

      const response = await fetch('/api/reserva-publica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: data.centro.id,
          servicio_id: selectedService.id,
          profesional_id: selectedProfessional.id,
          fecha,
          hora,
          ...values,
        }),
      })

      const body = (await response.json().catch(() => null)) as
        | PublicBookingResult
        | { message?: string }
        | null

      if (!response.ok || !body || !('ok' in body)) {
        const errorMessage = body && 'message' in body ? body.message : undefined

        setSubmitError(
          errorMessage ??
            'No pudimos solicitar la hora. Revisa los datos e intenta nuevamente.'
        )
        return
      }

      router.push(`/agendar/${slug}/confirmacion?reserva=${body.reserva_id}`)
    } catch {
      setSubmitError('No pudimos conectar con la agenda. Intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const hasBookableData =
    data.servicios.length > 0 && data.profesionales.length > 0

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-slate-800">
      <header className="border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4EF] text-sm font-bold text-[#F9735B] ring-1 ring-orange-200/70">
              {data.centro.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.centro.logoUrl}
                  alt=""
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                initials(data.centro.nombre)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {data.centro.nombre}
              </p>
              <p className="text-xs text-slate-500">Agenda online</p>
            </div>
          </div>
          {data.centro.telefono && (
            <a
              href={`tel:${data.centro.telefono}`}
              className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 sm:inline-flex"
            >
              Contactar
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,1fr)] lg:gap-5 lg:px-8 lg:py-7">
        <section className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[1.35rem] bg-[#22211F] p-5 text-white shadow-xl shadow-slate-950/12 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-[#F9735B] ring-1 ring-white/15">
                <HeartPulse size={20} aria-hidden="true" />
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/10">
                Atención en salud
              </span>
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
              Agenda tu hora con {data.centro.nombre}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/72">
              {data.centro.descripcion ??
                'Elige un servicio, revisa horarios disponibles y solicita tu reserva en pocos pasos.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-white/75">
              {['Sin crear cuenta', 'Horarios disponibles', 'Recordatorios antes de tu atención'].map(
                (item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10"
                  >
                    <Check size={12} className="text-[#F9735B]" aria-hidden="true" />
                    {item}
                  </span>
                )
              )}
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white/10 p-3 text-sm leading-5 text-white/75 ring-1 ring-white/10">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#F9735B]" aria-hidden="true" />
              <span>
                Reserva tu hora en pocos pasos. Recibirás la confirmación y recordatorios antes de tu atención.
              </span>
            </div>
            <button
              type="button"
              onClick={scrollToBooking}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#F9735B] px-5 text-sm font-semibold text-white shadow-sm shadow-orange-950/20 transition hover:bg-[#E85C45]"
            >
              Agendar hora
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {data.centro.direccion && (
              <InfoCard icon={MapPin} label="Ubicación" value={data.centro.direccion} />
            )}
            {data.centro.telefono && (
              <InfoCard icon={Phone} label="Teléfono" value={data.centro.telefono} />
            )}
            {data.centro.email && (
              <InfoCard icon={Mail} label="Email" value={data.centro.email} />
            )}
          </div>
        </section>

        <section
          ref={bookingRef}
          className="scroll-mt-6 overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/[0.045]"
        >
          <div className="border-b border-slate-100 bg-[#FAFAF8] px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F9735B]">
                  Reserva pública
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Encuentra tu horario
                </h2>
              </div>
              <span className="rounded-full bg-[#FFF4EF] px-3 py-1 text-xs font-semibold text-[#F9735B]">
                {step}/4
              </span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-1.5">
              {stepLabels.map((label, index) => {
                const itemStep = (index + 1) as Step
                const active = itemStep <= step

                return (
                  <div key={label} className="min-w-0">
                    <div
                      className={`h-1.5 rounded-full ${
                        active ? 'bg-[#F9735B]' : 'bg-orange-100'
                      }`}
                    />
                    <p
                      className={`mt-1 hidden truncate text-[11px] font-semibold sm:block ${
                        active ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {!hasBookableData ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
                <p className="font-semibold text-slate-800">
                  Agenda online en preparación
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Este centro todavía no tiene servicios o profesionales activos para reservas públicas.
                </p>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <ServiceStep
                    services={data.servicios}
                    selectedId={serviceId}
                    onSelect={selectService}
                  />
                )}

                {step === 2 && (
                  <ProfessionalStep
                    professionals={data.profesionales}
                    selectedId={professionalId}
                    onSelect={selectProfessional}
                  />
                )}

                {step === 3 && (
                  <DateTimeStep
                    days={days}
                    selectedDate={fecha}
                    selectedHour={hora}
                    selectedService={selectedService}
                    selectedProfessionalId={professionalId}
                    data={data}
                    slots={slots}
                    onDateChange={(value) => {
                      setFecha(value)
                      setHora('')
                    }}
                    onHourChange={setHora}
                  />
                )}

                {step === 4 && (
                  <ContactStep
                    form={form}
                    selectedDate={fecha}
                    selectedHour={hora}
                    selectedService={selectedService}
                    selectedProfessional={selectedProfessional}
                    submitError={submitError}
                    submitting={submitting}
                    onBack={goBack}
                    onSubmit={submitBooking}
                  />
                )}

                {step !== 4 && (
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={step === 1}
                      className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-0"
                    >
                      <ChevronLeft size={16} aria-hidden="true" />
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={
                        !stepIsReady({ step, serviceId, professionalId, fecha, hora })
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#F9735B] px-5 text-sm font-semibold text-white shadow-sm shadow-orange-600/20 transition hover:bg-[#E85C45] disabled:pointer-events-none disabled:opacity-50"
                    >
                      Continuar
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70 py-5 text-center text-xs text-slate-500">
        Reservas gestionadas con <span className="font-semibold text-[#F9735B]">Agendix</span>
      </footer>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-900/[0.035]">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF4EF] text-[#F9735B]">
          <Icon size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-sm font-medium leading-5 text-slate-700">{value}</p>
        </div>
      </div>
    </div>
  )
}

function ServiceStep({
  services,
  selectedId,
  onSelect,
}: {
  services: PublicBookingService[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Elige el servicio
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Selecciona la atención que necesitas.
        </p>
      </div>
      <div className="grid gap-3">
        {services.map((service) => {
          const selected = selectedId === service.id

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service.id)}
              className={`w-full rounded-2xl border p-3.5 text-left transition ${
                selected
                  ? 'border-[#22211F] bg-[#FFF4EF] shadow-sm ring-2 ring-slate-200/80'
                  : 'border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{service.nombre}</p>
                    {selected && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22211F] text-white">
                        <Check size={13} aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  {service.descripcion && (
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {service.descripcion}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-500 ring-1 ring-slate-200/80">
                      {service.duracionMinutos} min
                    </span>
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700 ring-1 ring-orange-200/70">
                      {modalityLabel(service.modalidad)}
                    </span>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold text-slate-900 sm:text-right">
                  {formatPrice(service.precio, service.moneda)}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProfessionalStep({
  professionals,
  selectedId,
  onSelect,
}: {
  professionals: PublicBookingProfessional[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Elige profesional
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Puedes reservar con el integrante disponible que prefieras.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {professionals.map((professional) => {
          const selected = selectedId === professional.id

          return (
            <button
              key={professional.id}
              type="button"
              onClick={() => onSelect(professional.id)}
              className={`rounded-2xl border p-3.5 text-left transition ${
                selected
                  ? 'border-[#22211F] bg-[#FFF4EF] shadow-sm ring-2 ring-slate-200/80'
                  : 'border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-sm'
              }`}
            >
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-sm font-semibold text-white">
                  {professional.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={professional.avatarUrl}
                      alt=""
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    initials(professional.nombre)
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {professional.nombre}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {professional.especialidad ?? 'Profesional del centro'}
                  </p>
                  {professional.bio && (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                      {professional.bio}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DateTimeStep({
  days,
  selectedDate,
  selectedHour,
  selectedService,
  selectedProfessionalId,
  data,
  slots,
  onDateChange,
  onHourChange,
}: {
  days: ReturnType<typeof generateBookingDays>
  selectedDate: string
  selectedHour: string
  selectedService: PublicBookingService | null
  selectedProfessionalId: string
  data: PublicBookingData
  slots: string[]
  onDateChange: (date: string) => void
  onHourChange: (hour: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Escoge fecha y hora
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Solo verás horarios que todavía están disponibles.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {days.map((day) => {
          const daySlots =
            selectedService && selectedProfessionalId
              ? getAvailableSlots({
                  fecha: day.value,
                  servicio: selectedService,
                  profesionalId: selectedProfessionalId,
                  horarios: data.horarios,
                  busySlots: data.busySlots,
                  activeRoomCount: data.activeRoomCount,
                })
              : []
          const disabled = daySlots.length === 0
          const selected = selectedDate === day.value

          return (
            <button
              key={day.value}
              type="button"
              disabled={disabled}
              onClick={() => onDateChange(day.value)}
              className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                selected
                  ? 'border-[#22211F] bg-[#FFF4EF] text-slate-900 shadow-sm ring-2 ring-slate-200/80'
                  : disabled
                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-sm'
              }`}
            >
              <p className="text-sm font-semibold capitalize">{day.label}</p>
              <p className="mt-1 text-xs">
                {disabled ? 'Sin horas' : `${daySlots.length} horarios`}
              </p>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-[#FAFAF8] p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CalendarDays size={16} className="text-[#F9735B]" aria-hidden="true" />
          {selectedDate ? (
            <span className="capitalize">{formatBookingDate(selectedDate)}</span>
          ) : (
            <span>Selecciona un día</span>
          )}
        </div>

        {slots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400">
            No hay horarios disponibles para esta fecha.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const selected = selectedHour === slot

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onHourChange(slot)}
                  className={`h-10 rounded-xl border text-sm font-semibold transition ${
                    selected
                      ? 'border-[#22211F] bg-[#22211F] text-white shadow-sm shadow-slate-950/15'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-[#F9735B]'
                  }`}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ContactStep({
  form,
  selectedDate,
  selectedHour,
  selectedService,
  selectedProfessional,
  submitError,
  submitting,
  onBack,
  onSubmit,
}: {
  form: UseFormReturn<PublicBookingFormValues>
  selectedDate: string
  selectedHour: string
  selectedService: PublicBookingService | null
  selectedProfessional: PublicBookingProfessional | null
  submitError: string
  submitting: boolean
  onBack: () => void
  onSubmit: (values: PublicBookingFormValues) => Promise<void>
}) {
  const paymentMethod = form.watch('payment_method')
  const submitLabel =
    paymentMethod === 'online' ? 'Pagar online y reservar' : 'Reservar y pagar presencial'

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Completa tus datos
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          El centro usará esta información para confirmar tu reserva.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-[#FAFAF8] p-3.5">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <SummaryItem label="Servicio" value={selectedService?.nombre ?? '—'} />
          <SummaryItem
            label="Profesional"
            value={selectedProfessional?.nombre ?? '—'}
          />
          <SummaryItem
            label="Fecha"
            value={selectedDate ? formatBookingDate(selectedDate) : '—'}
          />
          <SummaryItem label="Hora" value={selectedHour || '—'} />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200/70">
          <CreditCard size={14} className="text-[#F9735B]" aria-hidden="true" />
          Por ahora puedes reservar pagando presencial. El pago online queda preparado para activarse cuando el centro conecte checkout.
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre completo" error={form.formState.errors.nombre?.message}>
          <input
            type="text"
            placeholder="María González"
            className="agendix-input"
            aria-invalid={form.formState.errors.nombre ? 'true' : 'false'}
            {...form.register('nombre')}
          />
        </Field>

        <Field label="RUT o documento" hint="opcional" error={form.formState.errors.documento?.message}>
          <input
            type="text"
            placeholder="12.345.678-9"
            className="agendix-input"
            aria-invalid={form.formState.errors.documento ? 'true' : 'false'}
            {...form.register('documento')}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email" error={form.formState.errors.email?.message}>
          <input
            type="email"
            placeholder="correo@email.com"
            className="agendix-input"
            aria-invalid={form.formState.errors.email ? 'true' : 'false'}
            {...form.register('email')}
          />
        </Field>

        <Field label="Teléfono" error={form.formState.errors.telefono?.message}>
          <input
            type="tel"
            placeholder="+56 9 1234 5678"
            className="agendix-input"
            aria-invalid={form.formState.errors.telefono ? 'true' : 'false'}
            {...form.register('telefono')}
          />
        </Field>
      </div>

      <Field label="Motivo de consulta" hint="opcional" error={form.formState.errors.motivo?.message}>
        <textarea
          rows={3}
          placeholder="Cuéntanos brevemente qué necesitas"
          className="agendix-input min-h-24 resize-none"
          aria-invalid={form.formState.errors.motivo ? 'true' : 'false'}
          {...form.register('motivo')}
        />
      </Field>

      <div>
        <p className="text-sm font-semibold text-slate-700">Forma de pago</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <PaymentOption
            value="presencial"
            selected={paymentMethod === 'presencial'}
            title="Pagar presencial"
            description="Reserva ahora y paga directamente en el centro."
            price={selectedService?.precio ?? null}
            register={form.register('payment_method')}
          />
          <PaymentOption
            value="online"
            selected={paymentMethod === 'online'}
            title="Pago online"
            description="Próximamente con checkout real. Por ahora no confirma pagos."
            price={selectedService?.precio ?? null}
            disabled
            register={form.register('payment_method')}
          />
        </div>
        {form.formState.errors.payment_method && (
          <p className="mt-1.5 text-xs font-medium text-red-500">
            {form.formState.errors.payment_method.message}
          </p>
        )}
      </div>

      <label className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-5 text-slate-600">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#F9735B] focus:ring-[#F9735B]"
          {...form.register('aceptaTerminos')}
        />
        <span>
          Acepto que el centro use mis datos para gestionar esta reserva.
          {form.formState.errors.aceptaTerminos && (
            <span className="mt-1 block text-xs font-semibold text-red-500">
              {form.formState.errors.aceptaTerminos.message}
            </span>
          )}
        </span>
      </label>

      {submitError && (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {submitError}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Atrás
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#F9735B] px-5 text-sm font-semibold text-white shadow-sm shadow-orange-600/20 transition hover:bg-[#E85C45] disabled:pointer-events-none disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              {paymentMethod === 'online' ? 'Procesando pago' : 'Reservando'}
            </>
          ) : (
            <>
              <ShieldCheck size={16} aria-hidden="true" />
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

function PaymentOption({
  value,
  selected,
  title,
  description,
  price,
  disabled = false,
  register,
}: {
  value: PublicPaymentMethod
  selected: boolean
  title: string
  description: string
  price: number | null
  disabled?: boolean
  register: UseFormRegisterReturn<'payment_method'>
}) {
  return (
    <label
      className={`rounded-2xl border p-3 transition ${
        disabled
          ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70'
          : selected
          ? 'border-[#22211F] bg-[#FFF4EF] shadow-sm ring-2 ring-slate-200/80'
          : 'border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-sm'
      }`}
    >
      <input
        type="radio"
        value={value}
        disabled={disabled}
        className="sr-only"
        {...register}
      />
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold text-slate-900">
            {title}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {description}
          </span>
          <span className="mt-2 block text-xs font-semibold text-[#F9735B]">
            {disabled ? 'Disponible en una próxima etapa' : formatPrice(price, 'CLP')}
          </span>
        </span>
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            selected
              ? 'border-[#22211F] bg-[#22211F] text-white'
              : 'border-slate-300 bg-white'
          }`}
        >
          {selected && <Check size={13} aria-hidden="true" />}
        </span>
      </span>
    </label>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate font-medium capitalize text-slate-800">{value}</p>
    </div>
  )
}
