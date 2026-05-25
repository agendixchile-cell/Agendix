'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  Copy,
  CreditCard,
  ExternalLink,
  LinkIcon,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { FormModal } from '@/components/ui/form-modal'
import { StatCard } from '@/components/ui/stat-card'
import type { PatientPaymentStatus, PaymentProvider } from '@/lib/payments/types'

export type PaymentPatientOption = {
  id: string
  nombre: string
  apellido: string | null
  email: string | null
}

export type PaymentServiceOption = {
  id: string
  nombre: string
  precio: number | null
}

export type PaymentReservationOption = {
  id: string
  patientId: string
  serviceId: string
  professionalId: string
  label: string
  amount: number | null
}

export type PatientPaymentListItem = {
  id: string
  patientId: string
  patientName: string
  serviceName: string | null
  reservationLabel: string | null
  provider: PaymentProvider
  amount: number
  currency: 'CLP'
  description: string | null
  status: PatientPaymentStatus
  checkoutUrl: string | null
  createdAt: string
  paidAt: string | null
}

type PatientPaymentsManagerProps = {
  initialPayments: PatientPaymentListItem[]
  patients: PaymentPatientOption[]
  services: PaymentServiceOption[]
  reservations: PaymentReservationOption[]
  demoMode: boolean
  defaultPatientId?: string
  defaultReservationId?: string
  defaultOpen?: boolean
}

const statusLabels: Record<PatientPaymentStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Pagado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
  refunded: 'Devuelto',
}

const statusTone: Record<PatientPaymentStatus, 'orange' | 'green' | 'red' | 'slate'> = {
  draft: 'slate',
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  cancelled: 'slate',
  expired: 'slate',
  refunded: 'slate',
}

function money(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

function dateLabel(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function patientName(patient: PaymentPatientOption) {
  return [patient.nombre, patient.apellido].filter(Boolean).join(' ')
}

export function PatientPaymentsManager({
  initialPayments,
  patients,
  services,
  reservations,
  demoMode,
  defaultPatientId,
  defaultReservationId,
  defaultOpen = false,
}: PatientPaymentsManagerProps) {
  const initialReservation = defaultReservationId
    ? reservations.find((reservation) => reservation.id === defaultReservationId)
    : null
  const [payments, setPayments] = useState(initialPayments)
  const [modalOpen, setModalOpen] = useState(defaultOpen)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  const [isPending, startTransition] = useTransition()
  const [patientId, setPatientId] = useState(
    initialReservation?.patientId ?? defaultPatientId ?? patients[0]?.id ?? ''
  )
  const [serviceId, setServiceId] = useState(initialReservation?.serviceId ?? '')
  const [reservationId, setReservationId] = useState(defaultReservationId ?? '')
  const [amount, setAmount] = useState(
    initialReservation?.amount == null ? '' : String(initialReservation.amount)
  )
  const [description, setDescription] = useState(initialReservation?.label ?? '')

  const selectedPatient = patients.find((patient) => patient.id === patientId)
  const selectedReservation = reservations.find(
    (reservation) => reservation.id === reservationId
  )
  const selectedService = services.find((service) => service.id === serviceId)
  const filteredPatient = defaultPatientId
    ? patients.find((patient) => patient.id === defaultPatientId)
    : null
  const visiblePayments = defaultPatientId
    ? payments.filter((payment) => payment.patientId === defaultPatientId)
    : payments

  const monthTotal = useMemo(() => {
    const now = new Date()

    return visiblePayments
      .filter((payment) => {
        if (payment.status !== 'approved' || !payment.paidAt) return false
        const paidAt = new Date(payment.paidAt)

        return (
          paidAt.getMonth() === now.getMonth() &&
          paidAt.getFullYear() === now.getFullYear()
        )
      })
      .reduce((sum, payment) => sum + payment.amount, 0)
  }, [visiblePayments])

  const pendingCount = visiblePayments.filter((payment) => payment.status === 'pending').length
  const approvedCount = visiblePayments.filter((payment) => payment.status === 'approved').length
  const rejectedCount = visiblePayments.filter((payment) => payment.status === 'rejected').length

  function fillFromReservation(nextReservationId: string) {
    setReservationId(nextReservationId)
    const reservation = reservations.find((item) => item.id === nextReservationId)

    if (!reservation) return

    setPatientId(reservation.patientId)
    setServiceId(reservation.serviceId)
    setAmount(String(reservation.amount ?? ''))
    setDescription(reservation.label)
  }

  function fillFromService(nextServiceId: string) {
    setServiceId(nextServiceId)
    const service = services.find((item) => item.id === nextServiceId)

    if (!service) return

    if (!amount && service.precio) setAmount(String(service.precio))
    if (!description) setDescription(service.nombre)
  }

  function resetForm() {
    setPatientId(patients[0]?.id ?? '')
    setServiceId('')
    setReservationId('')
    setAmount('')
    setDescription('')
  }

  async function copyLink(link: string | null) {
    if (!link) return

    await navigator.clipboard.writeText(link)
    setFeedback({ type: 'success', message: 'Link de pago copiado.' })
  }

  async function createPayment() {
    if (!patientId || !amount || !description.trim()) {
      setFeedback({
        type: 'error',
        message: 'Selecciona paciente, monto y descripción para crear el cobro.',
      })
      return
    }

    if (demoMode) {
      const demoPayment: PatientPaymentListItem = {
        id: `demo-payment-${Date.now()}`,
        patientId,
        patientName: selectedPatient ? patientName(selectedPatient) : 'Paciente demo',
        serviceName: selectedService?.nombre ?? null,
        reservationLabel: selectedReservation?.label ?? null,
        provider: 'mercado_pago',
        amount: Number(amount),
        currency: 'CLP',
        description,
        status: 'pending',
        checkoutUrl: 'https://www.mercadopago.cl/checkout/v1/redirect/demo',
        createdAt: new Date().toISOString(),
        paidAt: null,
      }

      setPayments((current) => [demoPayment, ...current])
      setFeedback({ type: 'success', message: 'Cobro demo creado.' })
      setModalOpen(false)
      resetForm()
      return
    }

    startTransition(async () => {
      const response = await fetch('/api/patient-payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          reservationId: reservationId || null,
          serviceId: serviceId || null,
          amount: Number(amount),
          description,
          provider: 'mercado_pago',
        }),
      })
      const body = (await response.json().catch(() => null)) as
        | {
            message?: string
            payment?: {
              id: string
              status: PatientPaymentStatus
              checkout_url: string | null
              provider: PaymentProvider
              provider_preference_id: string | null
            }
          }
        | null

      if (!response.ok || !body?.payment) {
        setFeedback({
          type: 'error',
          message: body?.message ?? 'No pudimos generar el link de pago.',
        })
        return
      }

      const created: PatientPaymentListItem = {
        id: body.payment.id,
        patientId,
        patientName: selectedPatient ? patientName(selectedPatient) : 'Paciente',
        serviceName: selectedService?.nombre ?? null,
        reservationLabel: selectedReservation?.label ?? null,
        provider: 'mercado_pago',
        amount: Number(amount),
        currency: 'CLP',
        description,
        status: body.payment.status,
        checkoutUrl: body.payment.checkout_url,
        createdAt: new Date().toISOString(),
        paidAt: null,
      }

      setPayments((current) => [created, ...current])
      setFeedback({ type: 'success', message: 'Link de Mercado Pago generado.' })
      setModalOpen(false)
      resetForm()
    })
  }

  return (
    <div className="space-y-5">
      {feedback && <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />}

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard
          label="Cobrado este mes"
          value={money(monthTotal)}
          icon={CreditCard}
          tone="green"
        />
        <StatCard label="Pendientes" value={pendingCount} icon={LinkIcon} tone="orange" />
        <StatCard label="Pagados" value={approvedCount} icon={CreditCard} tone="green" />
        <StatCard label="Rechazados" value={rejectedCount} icon={X} tone="red" />
      </section>

      <section className="agendix-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {filteredPatient
                ? `Pagos de ${patientName(filteredPatient)}`
                : 'Historial de cobros'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Links de pago para pacientes, reservas y servicios.
            </p>
          </div>
          <Button type="button" onClick={() => setModalOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            Nuevo cobro
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Reserva</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Creación</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visiblePayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Aún no hay cobros creados.
                  </td>
                </tr>
              ) : (
                visiblePayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {payment.patientName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {payment.serviceName ?? payment.description ?? 'Cobro manual'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {payment.reservationLabel ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {money(payment.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[payment.status]}>
                        {statusLabels[payment.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{dateLabel(payment.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-500">{dateLabel(payment.paidAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!payment.checkoutUrl}
                          onClick={() => copyLink(payment.checkoutUrl)}
                        >
                          <Copy size={14} aria-hidden="true" />
                          Copiar
                        </Button>
                        {payment.checkoutUrl && payment.status === 'pending' && (
                          <Button asChild size="sm" variant="ghost">
                            <a href={payment.checkoutUrl} target="_blank" rel="noreferrer">
                              <ExternalLink size={14} aria-hidden="true" />
                              Abrir
                            </a>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <FormModal
          title="Nuevo cobro"
          description="Genera un link de Mercado Pago para cobrar una sesión, reserva o abono."
          onClose={() => setModalOpen(false)}
        >
          <div className="space-y-4 p-5">
            <Field label="Paciente">
              <select
                className="agendix-select"
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
              >
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patientName(patient)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Reserva" hint="opcional">
              <select
                className="agendix-select"
                value={reservationId}
                onChange={(event) => fillFromReservation(event.target.value)}
              >
                <option value="">Cobro manual sin reserva</option>
                {reservations.map((reservation) => (
                  <option key={reservation.id} value={reservation.id}>
                    {reservation.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Servicio" hint="opcional">
              <select
                className="agendix-select"
                value={serviceId}
                onChange={(event) => fillFromService(event.target.value)}
              >
                <option value="">Sin servicio asociado</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monto">
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="agendix-input"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="25000"
                />
              </Field>
              <Field label="Proveedor">
                <select className="agendix-select" value="mercado_pago" disabled>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="fintoc">Fintoc próximamente</option>
                  <option value="manual">Transferencia manual próximamente</option>
                </select>
              </Field>
            </div>

            <Field label="Descripción">
              <input
                className="agendix-input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Sesión de fonoaudiología"
              />
            </Field>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={createPayment} disabled={isPending}>
                {isPending ? (
                  <>
                    <RotateCcw size={16} aria-hidden="true" className="animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <LinkIcon size={16} aria-hidden="true" />
                    Generar link de pago
                  </>
                )}
              </Button>
            </div>
          </div>
        </FormModal>
      )}
    </div>
  )
}
