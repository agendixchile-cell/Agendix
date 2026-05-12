'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, ChevronLeft, ChevronRight, Clock, User, X, CheckCircle2 } from 'lucide-react'
import { Field } from '@/components/ui/field'
import type { ServicioListItem } from '@/lib/servicios/types'

type Profesional = {
  id: string
  nombre: string
  especialidad: string | null
}

type ReservaPublicaProps = {
  centroId: string
  centroNombre: string
  servicios: ServicioListItem[]
  profesionales: Profesional[]
  horarios: Array<{ dia: number; activo: boolean; inicio: string; fin: string }>
  demoMode: boolean
}

const contactoSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa tu nombre'),
  email: z.string().trim().email('Ingresa un email válido'),
  telefono: z.string().trim().min(8, 'Ingresa tu teléfono').max(30),
})
type ContactoValues = z.infer<typeof contactoSchema>

function generarSlots(inicio: string, fin: string, duracion: number): string[] {
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  const startMin = hi * 60 + mi
  const endMin = hf * 60 + mf
  const slots: string[] = []
  for (let t = startMin; t + duracion <= endMin; t += duracion) {
    const h = String(Math.floor(t / 60)).padStart(2, '0')
    const m = String(t % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
  }
  return slots
}

function isoToLocalDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatFecha(isoDate: string) {
  return isoToLocalDate(isoDate).toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function CalendarioMini({
  horarios,
  selected,
  onSelect,
}: {
  horarios: ReservaPublicaProps['horarios']
  selected: string
  onSelect: (d: string) => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  // ISO weekday: Mon=1 … Sun=7
  const startDow = ((firstDay.getDay() + 6) % 7) // 0=Mon
  const days: (Date | null)[] = Array(startDow).fill(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(viewYear, viewMonth, d))

  function isDisabled(date: Date) {
    if (date < today) return true
    const dow = date.getDay() === 0 ? 7 : date.getDay()
    const horario = horarios.find((h) => h.dia === dow)
    return !horario?.activo
  }

  function toIso(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="rounded-xl p-1 text-slate-500 hover:bg-orange-50/60 hover:text-orange-500">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold capitalize text-slate-800">{monthLabel}</span>
        <button type="button" onClick={nextMonth} className="rounded-xl p-1 text-slate-500 hover:bg-orange-50/60 hover:text-orange-500">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => (
          <div key={d} className="pb-1 text-[11px] font-bold uppercase text-slate-400">{d}</div>
        ))}
        {days.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />
          const iso = toIso(date)
          const disabled = isDisabled(date)
          const isSelected = iso === selected
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={`rounded-xl py-1.5 text-sm font-medium transition ${
                isSelected
                  ? 'bg-orange-500 text-white'
                  : disabled
                  ? 'cursor-not-allowed text-slate-300'
                  : 'text-slate-700 hover:bg-orange-50/60 hover:text-orange-500'
              }`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ReservaModal({
  centroId,
  centroNombre,
  servicios,
  profesionales,
  horarios,
  demoMode,
}: ReservaPublicaProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3 | 'done'>(1)

  // Step 1
  const [servicioId, setServicioId] = useState('')
  // Step 2
  const [profesionalId, setProfesionalId] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  // Step 3
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const form = useForm<ContactoValues>({ resolver: zodResolver(contactoSchema) })

  const servicio = servicios.find(s => s.id === servicioId)
  const profesional = profesionales.find(p => p.id === profesionalId)

  const horarioDia = fecha
    ? horarios.find(h => {
        const dow = isoToLocalDate(fecha).getDay()
        return h.dia === (dow === 0 ? 7 : dow)
      })
    : null

  const slots = servicio && horarioDia?.activo
    ? generarSlots(horarioDia.inicio, horarioDia.fin, servicio.duracion_minutos)
    : []

  function reset() {
    setStep(1)
    setServicioId('')
    setProfesionalId('')
    setFecha('')
    setHora('')
    setSubmitError('')
    form.reset()
  }

  function handleOpen() { reset(); setOpen(true) }
  function handleClose() { setOpen(false) }

  async function onSubmitContacto(values: ContactoValues) {
    setSubmitting(true)
    setSubmitError('')
    try {
      if (demoMode) {
        await new Promise(r => setTimeout(r, 800))
        setStep('done')
        return
      }
      const res = await fetch('/api/reserva-publica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centro_id: centroId,
          servicio_id: servicioId,
          profesional_id: profesionalId,
          fecha,
          hora,
          ...values,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setSubmitError(body.message ?? 'No pudimos procesar tu reserva. Intenta nuevamente.')
        return
      }
      setStep('done')
    } catch {
      setSubmitError('Error de conexión. Intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-orange-500 shadow transition hover:bg-orange-50/80"
      >
        <Calendar size={16} />
        Reservar hora
        <ChevronRight size={14} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100/80 px-5 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{centroNombre}</p>
                <h2 className="mt-0.5 text-base font-bold text-slate-800">
                  {step === 'done' ? 'Reserva recibida' : 'Reservar hora'}
                </h2>
              </div>
              <button onClick={handleClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Steps indicator */}
            {step !== 'done' && (
              <div className="flex gap-1 px-5 pt-4">
                {([1, 2, 3] as const).map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-orange-500' : 'bg-orange-100'}`} />
                ))}
              </div>
            )}

            <div className="px-5 py-5">
              {/* STEP 1 — Servicio */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-slate-700">¿Qué servicio necesitas?</p>
                  <div className="space-y-2">
                    {servicios.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setServicioId(s.id)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          servicioId === s.id
                            ? 'border-orange-400 bg-orange-50 ring-1 ring-orange-400'
                            : 'border-slate-200 hover:border-orange-200 hover:bg-orange-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{s.nombre}</p>
                            {s.descripcion && <p className="mt-0.5 text-sm text-slate-500">{s.descripcion}</p>}
                            <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                              <Clock size={11} />
                              {s.duracion_minutos} min
                            </p>
                          </div>
                          {s.precio != null && (
                            <span className="shrink-0 text-sm font-bold text-orange-600">
                              ${s.precio.toLocaleString('es-CL')}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={!servicioId}
                      onClick={() => setStep(2)}
                      className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 — Profesional + fecha + hora */}
              {step === 2 && (
                <div className="space-y-5">
                  {/* Profesional */}
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">
                      <User size={14} className="mr-1 inline text-orange-500" />
                      Profesional
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {profesionales.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProfesionalId(p.id)}
                          className={`rounded-xl border p-3 text-left transition ${
                            profesionalId === p.id
                              ? 'border-orange-400 bg-orange-50 ring-1 ring-orange-400'
                              : 'border-slate-200 hover:border-orange-200 hover:bg-orange-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-orange-500">
                              {p.nombre[0].toUpperCase()}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{p.nombre}</p>
                              {p.especialidad && <p className="text-xs text-slate-500">{p.especialidad}</p>}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calendario */}
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">
                      <Calendar size={14} className="mr-1 inline text-orange-500" />
                      Fecha
                    </p>
                    <div className="rounded-xl border border-slate-200/70 p-3">
                      <CalendarioMini horarios={horarios} selected={fecha} onSelect={(d) => { setFecha(d); setHora('') }} />
                    </div>
                  </div>

                  {/* Slots horarios */}
                  {fecha && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-700">
                        <Clock size={14} className="mr-1 inline text-orange-500" />
                        Hora disponible
                      </p>
                      {slots.length === 0 ? (
                        <p className="text-sm text-slate-400">No hay horarios disponibles para este día.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {slots.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setHora(s)}
                              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                                hora === s
                                  ? 'border-orange-400 bg-orange-500 text-white'
                                  : 'border-orange-100 text-slate-700 hover:border-orange-300 hover:bg-orange-50'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between pt-1">
                    <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-orange-50">
                      <ChevronLeft size={16} /> Atrás
                    </button>
                    <button
                      type="button"
                      disabled={!profesionalId || !fecha || !hora}
                      onClick={() => setStep(3)}
                      className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — Datos de contacto */}
              {step === 3 && (
                <div className="space-y-4">
                  {/* Resumen */}
                  <div className="space-y-1 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 text-sm">
                    <p><span className="font-semibold text-slate-700">Servicio:</span> <span className="text-slate-600">{servicio?.nombre}</span></p>
                    <p><span className="font-semibold text-slate-700">Profesional:</span> <span className="text-slate-600">{profesional?.nombre}</span></p>
                    <p><span className="font-semibold text-slate-700">Fecha:</span> <span className="capitalize text-slate-600">{formatFecha(fecha)}</span></p>
                    <p><span className="font-semibold text-slate-700">Hora:</span> <span className="text-slate-600">{hora}</span></p>
                  </div>

                  <p className="text-sm font-semibold text-slate-700">Tus datos de contacto</p>

                  <form onSubmit={form.handleSubmit(onSubmitContacto)} className="space-y-3" noValidate>
                    <Field label="Nombre completo" error={form.formState.errors.nombre?.message}>
                      <input
                        type="text"
                        placeholder="Ej: María González"
                        className="agendix-input"
                        {...form.register('nombre')}
                      />
                    </Field>
                    <Field label="Email" error={form.formState.errors.email?.message}>
                      <input
                        type="email"
                        placeholder="tucorreo@email.com"
                        className="agendix-input"
                        {...form.register('email')}
                      />
                    </Field>
                    <Field label="Teléfono" error={form.formState.errors.telefono?.message}>
                      <input
                        type="tel"
                        placeholder="+56 9 1234 5678"
                        className="agendix-input"
                        {...form.register('telefono')}
                      />
                    </Field>

                    {submitError && (
                      <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {submitError}
                      </p>
                    )}

                    <div className="flex justify-between pt-1">
                      <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-orange-50">
                        <ChevronLeft size={16} /> Atrás
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? 'Enviando...' : 'Confirmar reserva'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* DONE */}
              {step === 'done' && (
                <div className="py-4 text-center space-y-4">
                  <div className="flex justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <CheckCircle2 size={36} />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">¡Reserva recibida!</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Te confirmamos tu hora para{' '}
                      <span className="font-semibold capitalize">{formatFecha(fecha)}</span>
                      {' '}a las <span className="font-semibold">{hora}</span>.
                    </p>
                    {demoMode && (
                      <p className="mt-2 text-xs text-slate-400">
                        Esta reserva fue simulada en modo demo y no quedó registrada.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleClose}
                    className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
