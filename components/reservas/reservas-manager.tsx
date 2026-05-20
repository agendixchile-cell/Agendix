'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Edit3,
  FileText,
  Info,
  LinkIcon,
  Plus,
  RotateCcw,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  createAgendaBlockAction,
  deleteAgendaBlockAction,
} from '@/app/actions/bloqueos-agenda'
import {
  createReservaAction,
  sendReservaEmailReminderAction,
  updateReservaAction,
  updateReservaEstadoAction,
} from '@/app/actions/reservas'
import { saveEvolucionSesionAction } from '@/app/actions/fichas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EntityImage } from '@/components/ui/entity-image'
import { FeedbackBanner, type FeedbackMessage } from '@/components/ui/feedback-banner'
import { Field } from '@/components/ui/field'
import { FormModal } from '@/components/ui/form-modal'
import { PageHeader } from '@/components/ui/page-header'
import { SearchField } from '@/components/ui/search-field'
import {
  firstBookableTime,
  getHorarioForDate,
  normalizeHorarios,
  timeRangeOverlapsDescanso,
  timeToMinutes,
} from '@/lib/centro/horarios'
import {
  appTimeZone,
  normalizeIntlText,
  zonedDateKey,
  zonedDateTime,
  zonedHour,
  zonedTimeInput,
} from '@/lib/timezone'
import type { HorarioCentro } from '@/lib/centro/types'
import type { Database, EstadoReserva } from '@/lib/types/database'
import {
  reservaEstadoDescriptions,
  reservaEstadoLabels,
  reservaEstados,
  type AgendaBlockListItem,
  type AgendaBlockScope,
  type ReservaListItem,
  type ReservaPacienteOption,
  type ReservaProfesionalOption,
  type ReservaSalaOption,
  type ReservaServicioOption,
} from '@/lib/reservas/types'
import {
  bloqueoAgendaSchema,
  reservaSchema,
  type BloqueoAgendaFormValues,
  type ReservaFormValues,
} from '@/lib/reservas/validation'
import type { EvolucionSesionListItem } from '@/lib/fichas/types'
import {
  evolucionSesionSchema,
  type EvolucionSesionFormValues,
} from '@/lib/fichas/validation'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import { detectMeetingProvider, toMeetingPayload } from '@/lib/meetings'
import { hasFeature, type PlanUsageContext } from '@/lib/plans'
import {
  readDemoStorageItem,
  removeDemoStorageItem,
  writeDemoStorageItem,
} from '@/lib/demo-storage'
import { migrateLegacyAgendixStorage } from '@/lib/storage/migrations'

export type ReservasManagerProps = {
  initialReservas: ReservaListItem[]
  initialBloqueos: AgendaBlockListItem[]
  initialServicios: ReservaServicioOption[]
  initialSalas: ReservaSalaOption[]
  initialProfesionales: ReservaProfesionalOption[]
  initialPacientes: ReservaPacienteOption[]
  initialHorarios: HorarioCentro[]
  initialEvoluciones?: EvolucionSesionListItem[]
  publicBookingPath?: string
  viewMode?: 'agenda' | 'reservas'
  demoMode: boolean
  loadError?: string
  planContext?: PlanUsageContext
}

type ModalState =
  | {
      mode: 'create'
      reserva?: undefined
    }
  | {
      mode: 'edit'
      reserva: ReservaListItem
    }

type EvolucionModalState = {
  reserva: ReservaListItem
  evolucion?: EvolucionSesionListItem
}

type CalendarView = 'dia' | 'semana' | 'mes'

type CalendarFiltersState = {
  profesionalId: string
  servicioId: string
  estado: EstadoReserva | 'todos'
  salaId: string
}

type SlotSelection = {
  fecha: string
  hora: string
}

type ReservaRealtimeRow = Database['public']['Tables']['reservas']['Row']
type AgendaBlockRealtimeRow = Database['public']['Tables']['bloqueos_agenda']['Row']

type DemoState = {
  reservas: ReservaListItem[]
  pacientes: ReservaPacienteOption[]
  evoluciones?: EvolucionSesionListItem[]
  bloqueos?: AgendaBlockListItem[]
}

const timeFormatOptions = {
  timeZone: appTimeZone,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
} as const

type StoredDemoServicio = ReservaServicioOption & {
  activo?: boolean
}

type StoredDemoSala = ReservaSalaOption & {
  activa?: boolean
}

type StoredDemoProfesional = {
  profile_id: string
  nombre: string
  email: string
  avatar_url?: string | null
  descanso_entre_reservas_minutos?: number
  duracion_sesion_minutos?: number
  intervalo_reservas_minutos?: number
  activo?: boolean
}

type StoredDemoPaciente = ReservaPacienteOption & {
  rut?: string | null
  fecha_nacimiento?: string | null
  notas?: string | null
  created_at?: string
  updated_at?: string
}

function nowIso() {
  return new Date().toISOString()
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function demoId(prefix: string) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}`
}

function dateInputValue(date?: Date) {
  if (!date) return zonedDateKey()

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dateFromInput(value: string) {
  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) return new Date()

  return new Date(year, month - 1, day)
}

function roundedTimeInputValue() {
  const [hours = 0, minutes = 0] = zonedTimeInput(new Date()).split(':').map(Number)
  const roundedTotal = Math.min(
    23 * 60 + 45,
    Math.ceil((hours * 60 + minutes) / 15) * 15
  )

  return `${pad(Math.floor(roundedTotal / 60))}:${pad(roundedTotal % 60)}`
}

function addMinutesToTime(value: string, minutes: number) {
  const [hours = 0, currentMinutes = 0] = value.split(':').map(Number)
  const total = Math.min(23 * 60 + 45, hours * 60 + currentMinutes + minutes)

  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

function isoToDateInput(iso: string) {
  return zonedDateKey(iso)
}

function isoToTimeInput(iso: string) {
  return zonedTimeInput(iso)
}

function dateKey(value: string | Date = new Date()) {
  return zonedDateKey(value)
}

function formatDateTime(iso: string) {
  return normalizeIntlText(
    new Intl.DateTimeFormat('es-CL', {
      timeZone: appTimeZone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).format(new Date(iso))
  )
}

function formatTodayLabel() {
  return normalizeIntlText(
    new Intl.DateTimeFormat('es-CL', {
      timeZone: appTimeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date())
  )
}

function formatTimeRange(reserva: ReservaListItem) {
  const formatter = new Intl.DateTimeFormat('es-CL', timeFormatOptions)
  const start = normalizeIntlText(formatter.format(new Date(reserva.fecha_inicio)))
  const end = normalizeIntlText(formatter.format(new Date(reserva.fecha_fin)))

  return `${start} - ${end}`
}

function formatBlockTimeRange(block: AgendaBlockListItem) {
  const formatter = new Intl.DateTimeFormat('es-CL', timeFormatOptions)
  const start = normalizeIntlText(formatter.format(new Date(block.fecha_inicio)))
  const end = normalizeIntlText(formatter.format(new Date(block.fecha_fin)))

  return `${start} - ${end}`
}

function patientName(paciente: ReservaPacienteOption) {
  return [paciente.nombre, paciente.apellido].filter(Boolean).join(' ')
}

function estadoTone(estado: EstadoReserva): 'orange' | 'green' | 'slate' | 'red' {
  if (estado === 'confirmed') return 'green'
  if (estado === 'completed') return 'slate'
  if (estado === 'cancelled' || estado === 'no_show') return 'red'
  return 'orange'
}

function normalizeReservaStatus(estado?: string | null): EstadoReserva {
  if (estado === 'confirmed' || estado === 'confirmada') return 'confirmed'
  if (estado === 'completed' || estado === 'completada') return 'completed'
  if (estado === 'cancelled' || estado === 'cancelada') return 'cancelled'
  if (estado === 'no_show') return 'no_show'

  return 'pending'
}

function asistenciaForReservaStatus(
  estado: EstadoReserva
): ReservaListItem['estado_asistencia'] {
  if (estado === 'completed') return 'asistio'
  if (estado === 'no_show') return 'no_asistio'

  return 'sin_marcar'
}

function buildDateRange(values: ReservaFormValues, durationMinutes: number) {
  const start = zonedDateTime(values.fecha, values.hora)
  const end = new Date(start.getTime() + durationMinutes * 60_000)

  return {
    fecha_inicio: start.toISOString(),
    fecha_fin: end.toISOString(),
  }
}

function mergeReservaRealtimeUpdate(
  reserva: ReservaListItem,
  update: Partial<ReservaRealtimeRow>
): ReservaListItem {
  return {
    ...reserva,
    fecha_inicio: update.fecha_inicio ?? reserva.fecha_inicio,
    fecha_fin: update.fecha_fin ?? reserva.fecha_fin,
    estado: update.estado ?? reserva.estado,
    estado_asistencia: update.estado_asistencia ?? reserva.estado_asistencia,
    notas: update.notas ?? reserva.notas,
    meeting_provider:
      update.meeting_provider === undefined
        ? reserva.meeting_provider
        : update.meeting_provider,
    meeting_url:
      update.meeting_url === undefined ? reserva.meeting_url : update.meeting_url,
    auto_generated_meeting:
      update.auto_generated_meeting ?? reserva.auto_generated_meeting,
    updated_at: update.updated_at ?? reserva.updated_at,
  }
}

function mergeAgendaBlockRealtimeUpdate(
  block: AgendaBlockListItem,
  update: Partial<AgendaBlockRealtimeRow>
): AgendaBlockListItem {
  return {
    ...block,
    profesional_id:
      update.profesional_id === undefined
        ? block.profesional_id
        : update.profesional_id,
    fecha_inicio: update.fecha_inicio ?? block.fecha_inicio,
    fecha_fin: update.fecha_fin ?? block.fecha_fin,
    motivo: update.motivo === undefined ? block.motivo : update.motivo,
    updated_at: update.updated_at ?? block.updated_at,
  }
}

function hasDemoConflict(
  reservas: ReservaListItem[],
  nextReserva: Pick<
    ReservaListItem,
    | 'id'
    | 'fecha_inicio'
    | 'fecha_fin'
    | 'estado'
    | 'sala'
    | 'profesional'
  >
) {
  if (nextReserva.estado === 'cancelled') return null

  const nextStart = new Date(nextReserva.fecha_inicio).getTime()
  const nextEnd = new Date(nextReserva.fecha_fin).getTime()
  const professionalBreakMs =
    (nextReserva.profesional.descanso_entre_reservas_minutos ?? 0) * 60_000

  return (
    reservas.find((reserva) => {
      if (reserva.id === nextReserva.id || reserva.estado === 'cancelled') {
        return false
      }

      const reservaStart = new Date(reserva.fecha_inicio).getTime()
      const reservaEnd = new Date(reserva.fecha_fin).getTime()
      const overlaps = reservaStart < nextEnd && reservaEnd > nextStart
      const sameProfessional = reserva.profesional.id === nextReserva.profesional.id
      const professionalOverlaps =
        sameProfessional &&
        nextStart < reservaEnd + professionalBreakMs &&
        nextEnd + professionalBreakMs > reservaStart

      return (
        (overlaps && reserva.sala.id === nextReserva.sala.id) ||
        professionalOverlaps
      )
    }) ?? null
  )
}

function overlapsIsoRange(
  startIso: string,
  endIso: string,
  busyStartIso: string,
  busyEndIso: string
) {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  const busyStart = new Date(busyStartIso).getTime()
  const busyEnd = new Date(busyEndIso).getTime()

  return start < busyEnd && end > busyStart
}

function hasDemoBlockConflict(
  reservas: ReservaListItem[],
  block: Pick<
    AgendaBlockListItem,
    'fecha_inicio' | 'fecha_fin' | 'profesional_id'
  >
) {
  return (
    reservas.find((reserva) => {
      if (reserva.estado === 'cancelled') return false
      if (
        block.profesional_id &&
        reserva.profesional.id !== block.profesional_id
      ) {
        return false
      }

      return overlapsIsoRange(
        block.fecha_inicio,
        block.fecha_fin,
        reserva.fecha_inicio,
        reserva.fecha_fin
      )
    }) ?? null
  )
}

export function ReservasManager({
  initialReservas,
  initialBloqueos,
  initialServicios,
  initialSalas,
  initialProfesionales,
  initialPacientes,
  initialHorarios,
  initialEvoluciones = [],
  publicBookingPath,
  viewMode = 'agenda',
  demoMode,
  loadError,
  planContext,
}: ReservasManagerProps) {
  const router = useRouter()
  const [reservas, setReservas] = useState(initialReservas)
  const [bloqueos, setBloqueos] = useState(initialBloqueos)
  const [pacientes, setPacientes] = useState(initialPacientes)
  const [evoluciones, setEvoluciones] = useState(initialEvoluciones)
  const [servicios, setServicios] = useState(initialServicios)
  const [salas, setSalas] = useState(initialSalas)
  const [profesionales, setProfesionales] = useState(initialProfesionales)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(
    loadError ? { type: 'error', message: loadError } : null
  )
  const [modal, setModal] = useState<ModalState | null>(null)
  const [blockModal, setBlockModal] = useState(false)
  const [selectedReserva, setSelectedReserva] =
    useState<ReservaListItem | null>(null)
  const [selectedBlock, setSelectedBlock] =
    useState<AgendaBlockListItem | null>(null)
  const [evolucionModal, setEvolucionModal] =
    useState<EvolucionModalState | null>(null)
  const [copiedPublicLink, setCopiedPublicLink] = useState(false)
  const [pendingReservaId, setPendingReservaId] = useState<string | null>(null)
  const [calendarView, setCalendarView] = useState<CalendarView>('semana')
  const [selectedDate, setSelectedDate] = useState(dateInputValue())
  const [reservasSearch, setReservasSearch] = useState('')
  const [calendarFilters, setCalendarFilters] = useState<CalendarFiltersState>({
    profesionalId: '',
    servicioId: '',
    estado: 'todos',
    salaId: '',
  })
  const [currentTime, setCurrentTime] = useState(() => new Date().getTime())
  const [isPending, startTransition] = useTransition()
  const demoPlanId = planContext?.planId

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setReservas(initialReservas)
      setSelectedReserva((current) => {
        if (!current) return current

        return initialReservas.find((reserva) => reserva.id === current.id) ?? current
      })
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [initialReservas])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setBloqueos(initialBloqueos)
      setSelectedBlock((current) => {
        if (!current) return current

        return initialBloqueos.find((block) => block.id === current.id) ?? current
      })
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [initialBloqueos])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date().getTime())
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (demoMode) return

    const supabase = createBrowserSupabaseClient()
    const refreshAgenda = () => router.refresh()
    const applyReservaUpdate = (next: Partial<ReservaRealtimeRow>) => {
      const reservaId = next.id

      if (!reservaId) {
        refreshAgenda()
        return
      }

      setReservas((current) =>
        current.map((reserva) =>
          reserva.id === reservaId
            ? mergeReservaRealtimeUpdate(reserva, next)
            : reserva
        )
      )
      setSelectedReserva((current) =>
        current?.id === reservaId
          ? mergeReservaRealtimeUpdate(current, next)
          : current
      )
      refreshAgenda()
    }
    const applyBlockUpdate = (next: Partial<AgendaBlockRealtimeRow>) => {
      const blockId = next.id

      if (!blockId) {
        refreshAgenda()
        return
      }

      setBloqueos((current) =>
        current.map((block) =>
          block.id === blockId ? mergeAgendaBlockRealtimeUpdate(block, next) : block
        )
      )
      setSelectedBlock((current) =>
        current?.id === blockId
          ? mergeAgendaBlockRealtimeUpdate(current, next)
          : current
      )
      refreshAgenda()
    }

    const channel = supabase
      .channel('agendix-reservas-agenda')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reservas' },
        (payload) => {
          applyReservaUpdate(payload.new as Partial<ReservaRealtimeRow>)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reservas' },
        refreshAgenda
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reservas' },
        (payload) => {
          const reservaId = (payload.old as Partial<ReservaRealtimeRow>).id

          if (reservaId) {
            setReservas((current) =>
              current.filter((reserva) => reserva.id !== reservaId)
            )
            setSelectedReserva((current) =>
              current?.id === reservaId ? null : current
            )
          }

          refreshAgenda()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bloqueos_agenda' },
        (payload) => {
          applyBlockUpdate(payload.new as Partial<AgendaBlockRealtimeRow>)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bloqueos_agenda' },
        refreshAgenda
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bloqueos_agenda' },
        (payload) => {
          const blockId = (payload.old as Partial<AgendaBlockRealtimeRow>).id

          if (blockId) {
            setBloqueos((current) =>
              current.filter((block) => block.id !== blockId)
            )
            setSelectedBlock((current) =>
              current?.id === blockId ? null : current
            )
          }

          refreshAgenda()
        }
      )
      .subscribe()
    const interval = window.setInterval(refreshAgenda, 30_000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshAgenda()
    }

    window.addEventListener('focus', refreshAgenda)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshAgenda)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void supabase.removeChannel(channel)
    }
  }, [demoMode, router])

  const agendaReservas = reservas

  const reservasFiltradas = useMemo(() => {
    const selected = selectedDate ? dateFromInput(selectedDate) : new Date()
    const selectedMonth = selectedDate.slice(0, 7)
    const weekStart = startOfWeek(selected)
    const weekEnd = addDays(weekStart, 7)

    return agendaReservas.filter((reserva) => {
      const reservaKey = dateKey(reserva.fecha_inicio)
      const matchesFilters =
        (!calendarFilters.profesionalId ||
          reserva.profesional.id === calendarFilters.profesionalId) &&
        (!calendarFilters.servicioId ||
          reserva.servicio.id === calendarFilters.servicioId) &&
        (!calendarFilters.salaId || reserva.sala.id === calendarFilters.salaId) &&
        (calendarFilters.estado === 'todos' ||
          reserva.estado === calendarFilters.estado)

      if (!matchesFilters) return false

      if (calendarView === 'dia') {
        return reservaKey === selectedDate
      }

      if (calendarView === 'semana') {
        const reservaDay = dateFromInput(reservaKey)
        return reservaDay >= weekStart && reservaDay < weekEnd
      }

      return reservaKey.startsWith(selectedMonth)
    })
  }, [agendaReservas, calendarFilters, calendarView, selectedDate])

  const bloqueosFiltrados = useMemo(() => {
    const selected = selectedDate ? dateFromInput(selectedDate) : new Date()
    const selectedMonth = selectedDate.slice(0, 7)
    const weekStart = startOfWeek(selected)
    const weekEnd = addDays(weekStart, 7)

    return bloqueos.filter((block) => {
      const blockKey = dateKey(block.fecha_inicio)
      const matchesProfessional =
        !calendarFilters.profesionalId ||
        !block.profesional_id ||
        block.profesional_id === calendarFilters.profesionalId

      if (!matchesProfessional) return false

      if (calendarView === 'dia') {
        return blockKey === selectedDate
      }

      if (calendarView === 'semana') {
        const blockDay = dateFromInput(blockKey)
        return blockDay >= weekStart && blockDay < weekEnd
      }

      return blockKey.startsWith(selectedMonth)
    })
  }, [bloqueos, calendarFilters.profesionalId, calendarView, selectedDate])

  const reservasDirectory = useMemo(() => {
    const term = normalizeIntlText(reservasSearch).trim().toLowerCase()

    return reservas
      .filter((reserva) => {
        const matchesFilters =
          (!calendarFilters.profesionalId ||
            reserva.profesional.id === calendarFilters.profesionalId) &&
          (!calendarFilters.servicioId ||
            reserva.servicio.id === calendarFilters.servicioId) &&
          (!calendarFilters.salaId || reserva.sala.id === calendarFilters.salaId) &&
          (calendarFilters.estado === 'todos' ||
            reserva.estado === calendarFilters.estado)

        if (!matchesFilters) return false
        if (!term) return true

        const searchable = normalizeIntlText(
          [
            patientName(reserva.paciente),
            reserva.paciente.email ?? '',
            reserva.paciente.telefono ?? '',
            reserva.servicio.nombre,
            reserva.profesional.nombre,
            reserva.sala.nombre,
            reservaEstadoLabels[reserva.estado],
          ].join(' ')
        ).toLowerCase()

        return searchable.includes(term)
      })
      .sort(
        (first, second) =>
          new Date(first.fecha_inicio).getTime() -
          new Date(second.fecha_inicio).getTime()
      )
  }, [calendarFilters, reservas, reservasSearch])

  const todayReservas = useMemo(() => {
    const today = dateKey()
    return agendaReservas
      .filter((reserva) => dateKey(reserva.fecha_inicio) === today)
      .sort(
        (a, b) =>
          new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
      )
  }, [agendaReservas])
  const todayCount = todayReservas.length
  const totalCount = reservas.length
  const confirmedTodayCount = todayReservas.filter(
    (reserva) => reserva.estado === 'confirmed'
  ).length
  const pendingTodayCount = todayReservas.filter(
    (reserva) => reserva.estado === 'pending'
  ).length
  const completedTodayCount = todayReservas.filter(
    (reserva) => reserva.estado === 'completed'
  ).length
  const totalConfirmedCount = reservas.filter(
    (reserva) => reserva.estado === 'confirmed'
  ).length
  const totalPendingCount = reservas.filter(
    (reserva) => reserva.estado === 'pending'
  ).length
  const totalCompletedCount = reservas.filter(
    (reserva) => reserva.estado === 'completed'
  ).length
  const attentionNeededCount = todayReservas.filter(
    (reserva) => reserva.estado === 'cancelled' || reserva.estado === 'no_show'
  ).length
  const nextReserva = todayReservas.find((reserva) => {
    return (
      reserva.estado !== 'cancelled' &&
      reserva.estado !== 'completed' &&
      reserva.estado !== 'no_show' &&
      new Date(reserva.fecha_fin).getTime() >= currentTime
    )
  })
  const setupReady =
    servicios.length > 0 && salas.length > 0 && profesionales.length > 0
  const canUseMeetingLinks = planContext
    ? hasFeature(planContext.planId, 'meeting_links')
    : true
  const canUseSharedCalendar = planContext
    ? hasFeature(planContext.planId, 'shared_calendar')
    : true
  const canUseAttendanceControl = planContext
    ? hasFeature(planContext.planId, 'attendance_control')
    : true

  const copyPublicLink = async () => {
    if (!publicBookingPath) {
      setFeedback({
        type: 'error',
        message: 'Configura el slug del centro para compartir tu página pública.',
      })
      return
    }

    try {
      const url = new URL(publicBookingPath, window.location.origin).toString()
      await navigator.clipboard.writeText(url)
      setCopiedPublicLink(true)
      setFeedback({
        type: 'success',
        message: 'Link público copiado. Ya puedes compartirlo con tus pacientes.',
      })
      window.setTimeout(() => setCopiedPublicLink(false), 1800)
    } catch {
      setFeedback({
        type: 'error',
        message: 'No pudimos copiar el link. Intenta desde la página de configuración.',
      })
    }
  }

  const form = useForm<ReservaFormValues>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      servicio_id: '',
      profesional_id: '',
      sala_id: '',
      paciente_id: '',
      paciente_nombre: '',
      paciente_email: '',
      paciente_telefono: '',
      fecha: '',
      hora: '',
      estado: 'pending',
      estado_asistencia: 'sin_marcar',
      notas: '',
      meeting_url: '',
    },
  })

  const evolucionForm = useForm<EvolucionSesionFormValues>({
    resolver: zodResolver(evolucionSesionSchema),
    defaultValues: {
      reserva_id: '',
      texto_evolucion: '',
      proximos_pasos: '',
      observaciones_privadas: '',
    },
  })

  const blockForm = useForm<BloqueoAgendaFormValues>({
    resolver: zodResolver(bloqueoAgendaSchema),
    defaultValues: {
      scope: 'centro',
      profesional_id: '',
      fecha: '',
      hora_inicio: '',
      hora_fin: '',
      motivo: '',
    },
  })

  const selectedServiceId = useWatch({
    control: form.control,
    name: 'servicio_id',
  })
  const selectedProfessionalId = useWatch({
    control: form.control,
    name: 'profesional_id',
  })
  const blockScope = useWatch({
    control: blockForm.control,
    name: 'scope',
  })
  const selectedPacienteId = useWatch({
    control: form.control,
    name: 'paciente_id',
  })
  const selectedPaciente = pacientes.find(
    (paciente) => paciente.id === selectedPacienteId
  )
  const selectedService = servicios.find(
    (servicio) => servicio.id === selectedServiceId
  )
  const selectedProfessional = profesionales.find(
    (profesional) => profesional.id === selectedProfessionalId
  )
  const selectedDurationMinutes =
    selectedProfessional?.duracion_sesion_minutos ??
    selectedService?.duracion_minutos ??
    0
  const creatingNewPaciente = !selectedPacienteId

  useEffect(() => {
    if (!modal) return

    form.setValue('paciente_email', selectedPaciente?.email ?? '')
    form.setValue('paciente_telefono', selectedPaciente?.telefono ?? '')
  }, [form, modal, selectedPaciente])

  useEffect(() => {
    if (!demoMode) return

    migrateLegacyAgendixStorage(demoPlanId)

    let storedValue: DemoState | null = null
    let storedPacientesValue: ReservaPacienteOption[] | null = null
    let storedServiciosValue: ReservaServicioOption[] | null = null
    let storedSalasValue: ReservaSalaOption[] | null = null
    let storedProfesionalesValue: ReservaProfesionalOption[] | null = null
    let storedBloqueosValue: AgendaBlockListItem[] | null = null

    try {
      const storedState = readDemoStorageItem(demoPlanId, 'reservas')

      if (storedState) {
        const parsedState = JSON.parse(storedState)

        if (Array.isArray(parsedState?.reservas) && Array.isArray(parsedState?.pacientes)) {
          storedValue = parsedState as DemoState
        }
      }

      const storedPacientes = readDemoStorageItem(demoPlanId, 'pacientes')

      if (storedPacientes) {
        const parsedPacientes = JSON.parse(storedPacientes)

        if (Array.isArray(parsedPacientes)) {
          storedPacientesValue = (parsedPacientes as StoredDemoPaciente[]).map(
            (paciente) => ({
              id: paciente.id,
              nombre: paciente.nombre,
              apellido: paciente.apellido,
              email: paciente.email,
              telefono: paciente.telefono,
            })
          )
        }
      }

      const storedServicios = readDemoStorageItem(demoPlanId, 'servicios')

      if (storedServicios) {
        const parsedServicios = JSON.parse(storedServicios)

        if (Array.isArray(parsedServicios)) {
          storedServiciosValue = (parsedServicios as StoredDemoServicio[])
            .filter((servicio) => servicio.activo !== false)
            .map((servicio) => ({
              id: servicio.id,
              nombre: servicio.nombre,
              duracion_minutos: servicio.duracion_minutos,
              precio: servicio.precio,
            }))
        }
      }

      const storedSalas = readDemoStorageItem(demoPlanId, 'salas')

      if (storedSalas) {
        const parsedSalas = JSON.parse(storedSalas)

        if (Array.isArray(parsedSalas)) {
          storedSalasValue = (parsedSalas as StoredDemoSala[])
            .filter((sala) => sala.activa !== false)
            .map((sala) => ({
              id: sala.id,
              nombre: sala.nombre,
            }))
        }
      }

      const storedProfesionales = readDemoStorageItem(
        demoPlanId,
        'profesionales'
      )

      if (storedProfesionales) {
        const parsedProfesionales = JSON.parse(storedProfesionales)

        if (Array.isArray(parsedProfesionales)) {
          storedProfesionalesValue = (
            parsedProfesionales as StoredDemoProfesional[]
          )
            .filter((profesional) => profesional.activo !== false)
            .map((profesional) => ({
              id: profesional.profile_id,
              nombre: profesional.nombre,
              email: profesional.email,
              avatar_url: profesional.avatar_url ?? null,
              descanso_entre_reservas_minutos:
                profesional.descanso_entre_reservas_minutos ?? 0,
              duracion_sesion_minutos:
                profesional.duracion_sesion_minutos ?? 60,
              intervalo_reservas_minutos:
                profesional.intervalo_reservas_minutos ?? 60,
            }))
        }
      }

      const storedBloqueos = readDemoStorageItem(demoPlanId, 'bloqueos-agenda')

      if (storedBloqueos) {
        const parsedBloqueos = JSON.parse(storedBloqueos)

        if (Array.isArray(parsedBloqueos)) {
          storedBloqueosValue = parsedBloqueos as AgendaBlockListItem[]
        }
      }
    } catch {
      removeDemoStorageItem(demoPlanId, 'reservas')
      removeDemoStorageItem(demoPlanId, 'pacientes')
      removeDemoStorageItem(demoPlanId, 'servicios')
      removeDemoStorageItem(demoPlanId, 'salas')
      removeDemoStorageItem(demoPlanId, 'profesionales')
      removeDemoStorageItem(demoPlanId, 'bloqueos-agenda')
    }

    window.setTimeout(() => {
      setReservas(
        (storedValue?.reservas ?? initialReservas).map((reserva) => {
          const estado = normalizeReservaStatus(reserva.estado)

          return {
            ...reserva,
            estado,
            estado_asistencia:
              reserva.estado_asistencia ?? asistenciaForReservaStatus(estado),
            meeting_provider: reserva.meeting_provider ?? null,
            meeting_url: reserva.meeting_url ?? null,
            auto_generated_meeting: reserva.auto_generated_meeting ?? false,
          }
        })
      )
      setPacientes(storedPacientesValue ?? storedValue?.pacientes ?? initialPacientes)
      setEvoluciones(storedValue?.evoluciones ?? initialEvoluciones)
      setBloqueos(storedBloqueosValue ?? storedValue?.bloqueos ?? initialBloqueos)
      setServicios(storedServiciosValue ?? initialServicios)
      setSalas(storedSalasValue ?? initialSalas)
      setProfesionales(storedProfesionalesValue ?? initialProfesionales)
    }, 0)
  }, [
    demoMode,
    demoPlanId,
    initialReservas,
    initialPacientes,
    initialServicios,
    initialSalas,
    initialProfesionales,
    initialBloqueos,
    initialEvoluciones,
  ])

  const saveSharedDemoPacientes = (nextPacientes: ReservaPacienteOption[]) => {
    const timestamp = nowIso()
    let storedPacientes: StoredDemoPaciente[] = []

    try {
      const currentStoredPacientes = readDemoStorageItem(demoPlanId, 'pacientes')

      if (currentStoredPacientes) {
        const parsedPacientes = JSON.parse(currentStoredPacientes)

        if (Array.isArray(parsedPacientes)) {
          storedPacientes = parsedPacientes as StoredDemoPaciente[]
        }
      }
    } catch {
      storedPacientes = []
    }

    const storedById = new Map<string, StoredDemoPaciente>(
      storedPacientes.map((paciente) => [paciente.id, paciente])
    )

    nextPacientes.forEach((paciente) => {
      const storedPaciente = storedById.get(paciente.id)

      storedById.set(paciente.id, {
        id: paciente.id,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        rut: storedPaciente?.rut ?? null,
        email: paciente.email,
        telefono: paciente.telefono,
        fecha_nacimiento: storedPaciente?.fecha_nacimiento ?? null,
        notas: storedPaciente?.notas ?? null,
        created_at: storedPaciente?.created_at ?? timestamp,
        updated_at: storedPaciente?.updated_at ?? timestamp,
      })
    })

    const sharedPacientes = Array.from(storedById.values())

    writeDemoStorageItem(
      demoPlanId,
      'pacientes',
      JSON.stringify(sharedPacientes)
    )
  }

  const saveDemoState = (
    nextReservas: ReservaListItem[],
    nextPacientes = pacientes,
    nextEvoluciones = evoluciones,
    nextBloqueos = bloqueos
  ) => {
    setReservas(nextReservas)
    setPacientes(nextPacientes)
    setEvoluciones(nextEvoluciones)
    setBloqueos(nextBloqueos)
    writeDemoStorageItem(
      demoPlanId,
      'reservas',
      JSON.stringify({
        reservas: nextReservas,
        pacientes: nextPacientes,
        evoluciones: nextEvoluciones,
        bloqueos: nextBloqueos,
      })
    )
    writeDemoStorageItem(
      demoPlanId,
      'bloqueos-agenda',
      JSON.stringify(nextBloqueos)
    )
    saveSharedDemoPacientes(nextPacientes)
  }

  const buildCreateDefaults = (): ReservaFormValues => ({
    servicio_id: servicios[0]?.id ?? '',
    profesional_id: profesionales[0]?.id ?? '',
    sala_id: salas[0]?.id ?? '',
    paciente_id: pacientes[0]?.id ?? '',
    paciente_nombre: '',
    paciente_email: '',
    paciente_telefono: '',
    fecha: dateInputValue(),
    hora: roundedTimeInputValue(),
    estado: 'pending',
    estado_asistencia: 'sin_marcar',
    notas: '',
    meeting_url: '',
  })

  const currentHorarios = () => {
    if (!demoMode) return normalizeHorarios(initialHorarios)

    try {
      const storedHorariosValue = readDemoStorageItem(
        demoPlanId,
        'horarios-centro'
      )

      if (storedHorariosValue) {
        return normalizeHorarios(
          JSON.parse(storedHorariosValue) as HorarioCentro[]
        )
      }
    } catch {
      removeDemoStorageItem(demoPlanId, 'horarios-centro')
    }

    return normalizeHorarios(initialHorarios)
  }

  const openCreate = (slot?: SlotSelection) => {
    if (!setupReady) {
      setFeedback({
        type: 'error',
        message: 'Necesitas al menos un servicio, una sala y un profesional activo.',
      })
      return
    }

    setFeedback(null)
    setSelectedReserva(null)
    form.reset({
      ...buildCreateDefaults(),
      fecha: slot?.fecha ?? dateInputValue(),
      hora: slot?.hora ?? roundedTimeInputValue(),
    })
    setModal({ mode: 'create' })
  }

  const openBlockModal = (slot?: SlotSelection) => {
    const start = slot?.hora ?? roundedTimeInputValue()

    setFeedback(null)
    setSelectedBlock(null)
    blockForm.reset({
      scope: 'centro',
      profesional_id: profesionales[0]?.id ?? '',
      fecha: slot?.fecha ?? dateInputValue(),
      hora_inicio: start,
      hora_fin: addMinutesToTime(start, 60),
      motivo: '',
    })
    setBlockModal(true)
  }

  const openEdit = (reserva: ReservaListItem) => {
    setFeedback(null)
    setSelectedReserva(null)
    form.reset({
      servicio_id: reserva.servicio.id,
      profesional_id: reserva.profesional.id,
      sala_id: reserva.sala.id,
      paciente_id: reserva.paciente.id,
      paciente_nombre: '',
      paciente_email: reserva.paciente.email ?? '',
      paciente_telefono: reserva.paciente.telefono ?? '',
      fecha: isoToDateInput(reserva.fecha_inicio),
      hora: isoToTimeInput(reserva.fecha_inicio),
      estado: reserva.estado,
      estado_asistencia: reserva.estado_asistencia,
      notas: reserva.notas ?? '',
      meeting_url: reserva.meeting_url ?? '',
    })
    setModal({ mode: 'edit', reserva })
  }

  const closeModal = () => {
    setModal(null)
    form.reset()
  }

  const closeBlockModal = () => {
    setBlockModal(false)
    blockForm.reset()
  }

  const resetDemo = () => {
    saveDemoState(
      initialReservas,
      initialPacientes,
      initialEvoluciones,
      initialBloqueos
    )
    setFeedback({ type: 'success', message: 'Demo restablecido.' })
  }

  const appendPacienteIfNeeded = (paciente?: ReservaPacienteOption) => {
    if (!paciente) return pacientes

    if (pacientes.some((item) => item.id === paciente.id)) {
      const nextPacientes = pacientes.map((item) =>
        item.id === paciente.id ? paciente : item
      )
      setPacientes(nextPacientes)

      return nextPacientes
    }

    const nextPacientes = [paciente, ...pacientes]
    setPacientes(nextPacientes)

    return nextPacientes
  }

  const handleDemoSave = (values: ReservaFormValues) => {
    const servicio = servicios.find((item) => item.id === values.servicio_id)
    const sala = salas.find((item) => item.id === values.sala_id)
    const profesional = profesionales.find((item) => item.id === values.profesional_id)

    if (!servicio || !sala || !profesional) {
      setFeedback({
        type: 'error',
        message: 'Selecciona servicio, sala y profesional para crear la reserva.',
      })
      return
    }

    let nextPacientes = pacientes
    let paciente = pacientes.find((item) => item.id === values.paciente_id)

    if (!paciente) {
      paciente = {
        id: demoId('demo-paciente'),
        nombre: values.paciente_nombre?.trim() ?? '',
        apellido: null,
        email: values.paciente_email?.trim().toLowerCase() || null,
        telefono: values.paciente_telefono?.trim() || null,
      }
      nextPacientes = [paciente, ...pacientes]
    } else {
      const updatedPaciente: ReservaPacienteOption = {
        ...paciente,
        email: values.paciente_email?.trim().toLowerCase() || null,
        telefono: values.paciente_telefono?.trim() || null,
      }
      paciente = updatedPaciente
      nextPacientes = pacientes.map((item) =>
        item.id === updatedPaciente.id ? updatedPaciente : item
      )
    }

    const timestamp = nowIso()
    const durationMinutes =
      profesional.duracion_sesion_minutos ?? servicio.duracion_minutos
    const meetingPayload = toMeetingPayload(values.meeting_url)

    if (
      meetingPayload.meeting_url &&
      planContext &&
      !hasFeature(planContext.planId, 'meeting_links')
    ) {
      setFeedback({
        type: 'error',
        message:
          'Los enlaces de Zoom o Google Meet están disponibles desde Agendix Center Pro.',
      })
      return
    }

    const range = buildDateRange(values, durationMinutes)
    const horarios = currentHorarios()
    const horario = getHorarioForDate(zonedDateTime(values.fecha, '12:00'), horarios)
    const startMinutes = timeToMinutes(values.hora)
    const endMinutes = startMinutes + durationMinutes

    if (
      !horario?.activo ||
      startMinutes < timeToMinutes(horario.inicio) ||
      endMinutes > timeToMinutes(horario.fin)
    ) {
      setFeedback({
        type: 'error',
        message: 'Ese horario está fuera del horario de atención.',
      })
      return
    }

    if (timeRangeOverlapsDescanso(horario, startMinutes, endMinutes)) {
      setFeedback({
        type: 'error',
        message: 'Ese horario coincide con el descanso del centro.',
      })
      return
    }

    const reservaId = modal?.mode === 'edit' ? modal.reserva.id : demoId('demo-reserva')
    const reservaEstado = modal?.mode === 'edit' ? values.estado : 'pending'
    const nextReserva: ReservaListItem = {
      id: reservaId,
      servicio,
      sala,
      profesional,
      paciente,
      fecha_inicio: range.fecha_inicio,
      fecha_fin: range.fecha_fin,
      estado: reservaEstado,
      estado_asistencia: asistenciaForReservaStatus(reservaEstado),
      notas: values.notas?.trim() || null,
      meeting_provider: meetingPayload.meeting_provider,
      meeting_url: meetingPayload.meeting_url,
      auto_generated_meeting: meetingPayload.auto_generated_meeting,
      created_at: modal?.mode === 'edit' ? modal.reserva.created_at : timestamp,
      updated_at: timestamp,
    }
    const blockConflict = bloqueos.find((block) => {
      const appliesToProfessional =
        !block.profesional_id || block.profesional_id === nextReserva.profesional.id

      return (
        appliesToProfessional &&
        overlapsIsoRange(
          nextReserva.fecha_inicio,
          nextReserva.fecha_fin,
          block.fecha_inicio,
          block.fecha_fin
        )
      )
    })

    if (blockConflict) {
      setFeedback({
        type: 'error',
        message: blockConflict.profesional_id
          ? 'El profesional tiene bloqueado ese horario.'
          : 'El centro tiene bloqueado ese horario.',
      })
      return
    }

    const conflict = hasDemoConflict(reservas, nextReserva)

    if (conflict) {
      const overlapsSameRoom =
        conflict.sala.id === nextReserva.sala.id &&
        overlapsIsoRange(
          nextReserva.fecha_inicio,
          nextReserva.fecha_fin,
          conflict.fecha_inicio,
          conflict.fecha_fin
        )

      setFeedback({
        type: 'error',
        message:
          overlapsSameRoom
            ? 'La sala ya tiene una reserva en ese horario.'
            : 'El profesional ya tiene una reserva en ese horario.',
      })
      return
    }

    const nextReservas =
      modal?.mode === 'edit'
        ? reservas.map((reserva) =>
            reserva.id === nextReserva.id ? nextReserva : reserva
          )
        : [nextReserva, ...reservas]

    saveDemoState(nextReservas, nextPacientes)
    setFeedback({
      type: 'success',
      message:
        modal?.mode === 'edit'
          ? 'Reserva actualizada en modo demo.'
          : 'Reserva creada en modo demo.',
    })
    closeModal()
  }

  const handleDemoBlockSave = (values: BloqueoAgendaFormValues) => {
    const start = zonedDateTime(values.fecha, values.hora_inicio)
    const end = zonedDateTime(values.fecha, values.hora_fin)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setFeedback({
        type: 'error',
        message: 'Selecciona fecha y horas válidas para bloquear.',
      })
      return
    }

    const profesional =
      values.scope === 'profesional'
        ? profesionales.find((item) => item.id === values.profesional_id) ?? null
        : null

    if (values.scope === 'profesional' && !profesional) {
      setFeedback({
        type: 'error',
        message: 'Selecciona un profesional activo para bloquear.',
      })
      return
    }

    const timestamp = nowIso()
    const nextBlock: AgendaBlockListItem = {
      id: demoId('demo-bloqueo'),
      centro_id: 'demo-centro',
      profesional_id: profesional?.id ?? null,
      fecha_inicio: start.toISOString(),
      fecha_fin: end.toISOString(),
      motivo: values.motivo?.trim() || null,
      created_at: timestamp,
      updated_at: timestamp,
      profesional,
    }
    const conflict = hasDemoBlockConflict(reservas, nextBlock)

    if (conflict) {
      setFeedback({
        type: 'error',
        message: nextBlock.profesional_id
          ? 'Ese profesional ya tiene una reserva en ese bloque.'
          : 'Ya existe una reserva del centro dentro de ese bloque.',
      })
      return
    }

    const nextBloqueos = [nextBlock, ...bloqueos]
    saveDemoState(reservas, pacientes, evoluciones, nextBloqueos)
    setFeedback({ type: 'success', message: 'Bloqueo creado en modo demo.' })
    closeBlockModal()
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
          ? await updateReservaAction(modal.reserva.id, values)
          : await createReservaAction(values)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      const nextPacientes = appendPacienteIfNeeded(result.paciente)

      if (result.reserva) {
        const savedReserva = result.reserva
        setReservas((current) =>
          modal.mode === 'edit'
            ? current.map((reserva) =>
                reserva.id === savedReserva.id ? savedReserva : reserva
              )
            : [savedReserva, ...current]
        )
        setPacientes(nextPacientes)
      }

      setFeedback({ type: 'success', message: result.message })
      closeModal()
      router.refresh()
    })
  })

  const onSubmitBlock = blockForm.handleSubmit((values) => {
    if (demoMode) {
      handleDemoBlockSave(values)
      return
    }

    startTransition(async () => {
      const result = await createAgendaBlockAction(values)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      const savedBlock = result.bloqueo

      if (savedBlock) {
        setBloqueos((current) => [savedBlock, ...current])
      }

      setFeedback({ type: 'success', message: result.message })
      closeBlockModal()
      router.refresh()
    })
  })

  const deleteBlock = (block: AgendaBlockListItem) => {
    setFeedback(null)

    if (demoMode) {
      const nextBloqueos = bloqueos.filter((item) => item.id !== block.id)
      saveDemoState(reservas, pacientes, evoluciones, nextBloqueos)
      setSelectedBlock(null)
      setFeedback({ type: 'success', message: 'Bloqueo eliminado en modo demo.' })
      return
    }

    setPendingReservaId(block.id)
    startTransition(async () => {
      const result = await deleteAgendaBlockAction(block.id)
      setPendingReservaId(null)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      setBloqueos((current) => current.filter((item) => item.id !== block.id))
      setSelectedBlock(null)
      setFeedback({ type: 'success', message: result.message })
      router.refresh()
    })
  }

  const updateEstado = (reserva: ReservaListItem, estado: EstadoReserva) => {
    setFeedback(null)

    if (demoMode) {
      let updatedReserva = reserva
      const nextReservas = reservas.map((item) => {
        if (item.id !== reserva.id) return item
        updatedReserva = {
          ...item,
          estado,
          estado_asistencia: asistenciaForReservaStatus(estado),
          updated_at: nowIso(),
        }
        return updatedReserva
      })
      saveDemoState(nextReservas)
      setSelectedReserva((current) => {
        return current?.id === reserva.id ? updatedReserva : current
      })
      setFeedback({ type: 'success', message: 'Estado actualizado en modo demo.' })
      return
    }

    setPendingReservaId(reserva.id)
    startTransition(async () => {
      const result = await updateReservaEstadoAction(reserva.id, estado)
      setPendingReservaId(null)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.reserva) {
        const savedReserva = result.reserva
        setReservas((current) =>
          current.map((item) => (item.id === savedReserva.id ? savedReserva : item))
        )
        setSelectedReserva((current) => {
          return current?.id === savedReserva.id ? savedReserva : current
        })
      }

      setFeedback({ type: 'success', message: result.message })
      router.refresh()
    })
  }

  const sendForcedEmailReminder = (reserva: ReservaListItem) => {
    setFeedback(null)

    if (!reserva.paciente.email?.trim()) {
      openEdit(reserva)
      setFeedback({
        type: 'error',
        message:
          'Agrega el email del paciente y guarda la reserva para enviar el recordatorio.',
      })
      return
    }

    if (demoMode) {
      setFeedback({
        type: 'success',
        message: 'Recordatorio de correo simulado en modo demo.',
      })
      return
    }

    setPendingReservaId(reserva.id)
    startTransition(async () => {
      try {
        const result = await sendReservaEmailReminderAction(reserva.id)

        if (!result.ok) {
          setFeedback({ type: 'error', message: result.message })
          return
        }

        setFeedback({ type: 'success', message: result.message })
        router.refresh()
      } catch {
        setFeedback({
          type: 'error',
          message: 'No pudimos enviar el recordatorio. Intenta nuevamente.',
        })
      } finally {
        setPendingReservaId(null)
      }
    })
  }

  const openEvolucion = (reserva: ReservaListItem) => {
    const evolucion = evoluciones.find((item) => item.reserva_id === reserva.id)

    evolucionForm.reset({
      reserva_id: reserva.id,
      texto_evolucion: evolucion?.texto_evolucion ?? '',
      proximos_pasos: evolucion?.proximos_pasos ?? '',
      observaciones_privadas: evolucion?.observaciones_privadas ?? '',
    })
    setEvolucionModal({ reserva, evolucion })
  }

  const closeEvolucion = () => {
    setEvolucionModal(null)
    evolucionForm.reset()
  }

  const onSubmitEvolucion = evolucionForm.handleSubmit((values) => {
    if (!evolucionModal) return

    if (demoMode) {
      const timestamp = nowIso()
      const nextEvolucion: EvolucionSesionListItem = {
        id: evolucionModal.evolucion?.id ?? demoId('demo-evolucion'),
        paciente_id: evolucionModal.reserva.paciente.id,
        reserva_id: evolucionModal.reserva.id,
        profesional_id: evolucionModal.reserva.profesional.id,
        centro_id: 'demo-centro',
        fecha: evolucionModal.reserva.fecha_inicio,
        texto_evolucion: values.texto_evolucion.trim(),
        proximos_pasos: values.proximos_pasos?.trim() || null,
        observaciones_privadas:
          values.observaciones_privadas?.trim() || null,
        created_at: evolucionModal.evolucion?.created_at ?? timestamp,
        updated_at: timestamp,
      }
      const nextEvoluciones = evolucionModal.evolucion
        ? evoluciones.map((item) =>
            item.id === nextEvolucion.id ? nextEvolucion : item
          )
        : [nextEvolucion, ...evoluciones]
      const nextReservas = reservas.map((item) =>
        item.id === evolucionModal.reserva.id
          ? {
              ...item,
              estado: 'completed' as EstadoReserva,
              estado_asistencia: 'asistio' as ReservaListItem['estado_asistencia'],
              updated_at: timestamp,
            }
          : item
      )

      saveDemoState(nextReservas, pacientes, nextEvoluciones)
      setFeedback({ type: 'success', message: 'Ficha clínica guardada en modo demo.' })
      closeEvolucion()
      return
    }

    startTransition(async () => {
      const result = await saveEvolucionSesionAction(values)

      if (!result.ok) {
        setFeedback({ type: 'error', message: result.message })
        return
      }

      if (result.evolucion) {
        const savedEvolucion = result.evolucion
        setEvoluciones((current) => {
          const exists = current.some((item) => item.id === savedEvolucion.id)
          return exists
            ? current.map((item) =>
                item.id === savedEvolucion.id ? savedEvolucion : item
              )
            : [savedEvolucion, ...current]
        })
        setReservas((current) =>
          current.map((item) =>
            item.id === savedEvolucion.reserva_id
              ? {
                  ...item,
                  estado: 'completed',
                  estado_asistencia: 'asistio',
                  updated_at: savedEvolucion.updated_at,
                }
              : item
          )
        )
      }

      setFeedback({ type: 'success', message: result.message })
      closeEvolucion()
      router.refresh()
    })
  })

  const headerConfig =
    viewMode === 'reservas'
      ? {
          title: 'Reservas',
          description:
            'Revisa solicitudes, confirma estados y encuentra cualquier reserva sin entrar al calendario.',
          eyebrow: 'Gestión de reservas',
          icon: FileText,
        }
      : {
          title: 'Agenda',
          description:
            'Revisa tu próxima atención, confirma pendientes y abre nuevos horarios sin perder contexto.',
          eyebrow: formatTodayLabel(),
          icon: CalendarDays,
        }

  return (
    <div className="space-y-5">
      <PageHeader
        title={headerConfig.title}
        description={headerConfig.description}
        eyebrow={headerConfig.eyebrow}
        icon={headerConfig.icon}
        meta={demoMode && <Badge tone="slate">Modo demo</Badge>}
      >
        {demoMode && (
          <Button type="button" variant="secondary" onClick={resetDemo}>
            <RotateCcw size={16} aria-hidden="true" />
            Restablecer demo
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={copyPublicLink}
          disabled={!publicBookingPath}
        >
          <Copy size={16} aria-hidden="true" />
          {copiedPublicLink ? 'Link copiado' : 'Copiar link público'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => openBlockModal()}
        >
          <CalendarX2 size={16} aria-hidden="true" />
          Bloquear horario
        </Button>
        <Button onClick={() => openCreate()} disabled={!setupReady}>
          <CalendarPlus size={17} aria-hidden="true" />
          Nueva reserva
        </Button>
      </PageHeader>

      {feedback && (
        <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />
      )}

      {viewMode === 'reservas' ? (
        <ReservationsManagementView
          reservas={reservasDirectory}
          total={totalCount}
          confirmed={totalConfirmedCount}
          pending={totalPendingCount}
          completed={totalCompletedCount}
          search={reservasSearch}
          onSearchChange={setReservasSearch}
          setupReady={setupReady}
          onCreate={() => openCreate()}
          onOpenReserva={setSelectedReserva}
          onEditReserva={openEdit}
        />
      ) : (
        <>
          <AgendaMetricCards
            total={todayCount}
            nextReserva={nextReserva}
            confirmed={confirmedTodayCount}
            pending={pendingTodayCount}
            attentionNeeded={attentionNeededCount}
          />

          <NextAttentionCard
            nextReserva={nextReserva}
            hasPublicLink={Boolean(publicBookingPath)}
            isPending={isPending && pendingReservaId === nextReserva?.id}
            onCreate={() => openCreate({ fecha: dateInputValue(), hora: roundedTimeInputValue() })}
            onCopyPublicLink={copyPublicLink}
            onOpenDetail={setSelectedReserva}
            onComplete={(reserva) => {
              if (!canUseAttendanceControl) {
                setFeedback({
                  type: 'error',
                  message:
                    'El control de asistencia está disponible desde Agendix Center Pro.',
                })
                return
              }

              updateEstado(reserva, 'completed')
            }}
            onEvolucion={openEvolucion}
            onReschedule={openEdit}
          />

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_292px]">
            <div className="min-w-0 space-y-3">
              <CalendarFiltersBar
                filters={calendarFilters}
                profesionales={profesionales}
                servicios={servicios}
                salas={salas}
                canUseSharedCalendar={canUseSharedCalendar}
                onChange={setCalendarFilters}
              />
              <CalendarHeader
                view={calendarView}
                selectedDate={selectedDate}
                onViewChange={setCalendarView}
                onDateChange={setSelectedDate}
                onToday={() => setSelectedDate(dateInputValue())}
                onPrevious={() =>
                  setSelectedDate(shiftDateValue(selectedDate, calendarView, -1))
                }
                onNext={() =>
                  setSelectedDate(shiftDateValue(selectedDate, calendarView, 1))
                }
              />

              <CalendarView
                reservas={reservasFiltradas}
                bloqueos={bloqueosFiltrados}
                view={calendarView}
                selectedDate={selectedDate}
                initialHorarios={initialHorarios}
                demoMode={demoMode}
                demoPlanId={demoPlanId}
                onOpenReserva={setSelectedReserva}
                onOpenBlock={setSelectedBlock}
                onCreateAtSlot={openCreate}
                onBlockAtSlot={openBlockModal}
              />
            </div>

            <aside className="grid gap-3 lg:grid-cols-2 2xl:sticky 2xl:top-20 2xl:block 2xl:self-start 2xl:space-y-3">
              <TodaySummary
                nextReserva={nextReserva}
                total={todayCount}
                confirmed={confirmedTodayCount}
                pending={pendingTodayCount}
                completed={completedTodayCount}
              />
              <TodayAgendaPanel
                reservas={todayReservas}
                onOpenReserva={setSelectedReserva}
                onCreate={() => openCreate({ fecha: dateInputValue(), hora: roundedTimeInputValue() })}
                onCopyPublicLink={copyPublicLink}
                hasPublicLink={Boolean(publicBookingPath)}
              />
            </aside>
          </div>
        </>
      )}

      {selectedReserva && (
        <AppointmentDetailsPanel
          reserva={selectedReserva}
          isPending={isPending && pendingReservaId === selectedReserva.id}
          hasEvolucion={evoluciones.some(
            (item) => item.reserva_id === selectedReserva.id
          )}
          canUseAttendanceControl={canUseAttendanceControl}
          onClose={() => setSelectedReserva(null)}
          onEdit={openEdit}
          onConfirm={(reserva) => updateEstado(reserva, 'confirmed')}
          onComplete={(reserva) => {
            if (!canUseAttendanceControl) {
              setFeedback({
                type: 'error',
                message:
                  'El control de asistencia está disponible desde Agendix Center Pro.',
              })
              return
            }

            updateEstado(reserva, 'completed')
          }}
          onNoShow={(reserva) => {
            if (!canUseAttendanceControl) {
              setFeedback({
                type: 'error',
                message:
                  'El control de asistencia está disponible desde Agendix Center Pro.',
              })
              return
            }

            updateEstado(reserva, 'no_show')
          }}
          onCancel={(reserva) => updateEstado(reserva, 'cancelled')}
          onReschedule={openEdit}
          onEvolucion={openEvolucion}
          onReminder={sendForcedEmailReminder}
        />
      )}

      {selectedBlock && (
        <AgendaBlockDetailsPanel
          block={selectedBlock}
          isPending={isPending && pendingReservaId === selectedBlock.id}
          onClose={() => setSelectedBlock(null)}
          onDelete={deleteBlock}
        />
      )}

      {modal && (
        <FormModal
          title={modal.mode === 'edit' ? 'Editar reserva' : 'Nueva reserva'}
          description="Configura los datos principales para dejar la agenda lista."
          onClose={closeModal}
        >
          <form onSubmit={onSubmit} className="space-y-5 px-5 py-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Servicio" error={form.formState.errors.servicio_id?.message}>
                <select
                  className="agendix-select"
                  aria-invalid={form.formState.errors.servicio_id ? 'true' : 'false'}
                  {...form.register('servicio_id')}
                >
                  <option value="">Seleccionar servicio</option>
                  {servicios.map((servicio) => (
                    <option key={servicio.id} value={servicio.id}>
                      {servicio.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Profesional"
                error={form.formState.errors.profesional_id?.message}
              >
                <select
                  className="agendix-select"
                  aria-invalid={
                    form.formState.errors.profesional_id ? 'true' : 'false'
                  }
                  {...form.register('profesional_id')}
                >
                  <option value="">Seleccionar profesional</option>
                  {profesionales.map((profesional) => (
                    <option key={profesional.id} value={profesional.id}>
                      {profesional.nombre}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sala" error={form.formState.errors.sala_id?.message}>
                <select
                  className="agendix-select"
                  aria-invalid={form.formState.errors.sala_id ? 'true' : 'false'}
                  {...form.register('sala_id')}
                >
                  <option value="">Seleccionar sala</option>
                  {salas.map((sala) => (
                    <option key={sala.id} value={sala.id}>
                      {sala.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Paciente" error={form.formState.errors.paciente_id?.message}>
                <select className="agendix-select" {...form.register('paciente_id')}>
                  <option value="">Nuevo paciente</option>
                  {pacientes.map((paciente) => (
                    <option key={paciente.id} value={paciente.id}>
                      {patientName(paciente)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
                <UserRound size={16} aria-hidden="true" />
                {creatingNewPaciente ? 'Nuevo paciente' : 'Contacto del paciente'}
              </div>
              {creatingNewPaciente && (
                <div className="mb-4">
                  <Field
                    label="Nombre"
                    error={form.formState.errors.paciente_nombre?.message}
                  >
                    <input
                      type="text"
                      placeholder="Antonia Fuentes"
                      className="agendix-input"
                      aria-invalid={
                        form.formState.errors.paciente_nombre ? 'true' : 'false'
                      }
                      {...form.register('paciente_nombre')}
                    />
                  </Field>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Email"
                  error={form.formState.errors.paciente_email?.message}
                >
                  <input
                    type="email"
                    placeholder="paciente@correo.cl"
                    className="agendix-input"
                    aria-invalid={
                      form.formState.errors.paciente_email ? 'true' : 'false'
                    }
                    {...form.register('paciente_email')}
                  />
                </Field>
                <Field
                  label="Teléfono"
                  error={form.formState.errors.paciente_telefono?.message}
                >
                  <input
                    type="tel"
                    placeholder="+56 9 5000 1000"
                    className="agendix-input"
                    aria-invalid={
                      form.formState.errors.paciente_telefono ? 'true' : 'false'
                    }
                    {...form.register('paciente_telefono')}
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Fecha" error={form.formState.errors.fecha?.message}>
                <input
                  type="date"
                  className="agendix-input"
                  aria-invalid={form.formState.errors.fecha ? 'true' : 'false'}
                  {...form.register('fecha')}
                />
              </Field>
              <Field label="Hora" error={form.formState.errors.hora?.message}>
                <input
                  type="time"
                  step={900}
                  lang="es-CL"
                  pattern="[0-9]{2}:[0-9]{2}"
                  className="agendix-input"
                  aria-invalid={form.formState.errors.hora ? 'true' : 'false'}
                  {...form.register('hora')}
                />
              </Field>
              <Field label="Estado" error={form.formState.errors.estado?.message}>
                {modal.mode === 'edit' ? (
                  <select className="agendix-select" {...form.register('estado')}>
                    {reservaEstados.map((estado) => (
                      <option key={estado} value={estado}>
                        {reservaEstadoLabels[estado]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input type="hidden" {...form.register('estado')} />
                    <div className="flex h-11 items-center rounded-xl border border-amber-200/70 bg-amber-50 px-3 text-sm font-semibold text-amber-700">
                      Pendiente
                    </div>
                  </>
                )}
              </Field>
              <input type="hidden" {...form.register('estado_asistencia')} />
            </div>

            {selectedService && selectedDurationMinutes > 0 && (
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2 text-sm text-slate-500">
                Duración estimada: {selectedDurationMinutes} min
              </div>
            )}

            <Field label="Notas" error={form.formState.errors.notas?.message}>
              <textarea
                rows={3}
                placeholder="Indicaciones internas, modalidad o información de llegada"
                className="agendix-input min-h-24 resize-none"
                aria-invalid={form.formState.errors.notas ? 'true' : 'false'}
                {...form.register('notas')}
              />
            </Field>

            <Field
              label="Enlace Zoom o Google Meet"
              error={form.formState.errors.meeting_url?.message}
            >
              <div className="space-y-2">
                <input
                  type="url"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="agendix-input"
                  aria-invalid={
                    form.formState.errors.meeting_url ? 'true' : 'false'
                  }
                  disabled={!canUseMeetingLinks}
                  {...form.register('meeting_url')}
                />
                {!canUseMeetingLinks && (
                  <p className="rounded-lg border border-orange-200/70 bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-800">
                    Disponible desde Agendix Center Pro para guardar enlaces de
                    telemedicina manuales.
                  </p>
                )}
              </div>
            </Field>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? 'Guardando...'
                  : modal.mode === 'edit'
                    ? 'Guardar cambios'
                    : 'Crear reserva'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}

      {blockModal && (
        <FormModal
          title="Bloquear horario"
          description="Cierra un bloque para el centro completo o para un profesional específico."
          onClose={closeBlockModal}
        >
          <form onSubmit={onSubmitBlock} className="space-y-5 px-5 py-5" noValidate>
            <Field label="Alcance" error={blockForm.formState.errors.scope?.message}>
              <div className="grid grid-cols-2 rounded-xl border border-slate-200/70 bg-slate-50/80 p-1">
                {([
                  ['centro', 'Centro completo'],
                  ['profesional', 'Profesional'],
                ] as [AgendaBlockScope, string][]).map(([scope, label]) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => blockForm.setValue('scope', scope)}
                    className={`h-9 rounded-lg px-2 text-sm font-semibold transition ${
                      blockScope === scope
                        ? 'bg-[#22211F] text-white shadow-sm shadow-slate-950/15'
                        : 'text-slate-500 hover:text-orange-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input type="hidden" {...blockForm.register('scope')} />
            </Field>

            {blockScope === 'profesional' && (
              <Field
                label="Profesional"
                error={blockForm.formState.errors.profesional_id?.message}
              >
                <select
                  className="agendix-select"
                  aria-invalid={
                    blockForm.formState.errors.profesional_id ? 'true' : 'false'
                  }
                  {...blockForm.register('profesional_id')}
                >
                  <option value="">Seleccionar profesional</option>
                  {profesionales.map((profesional) => (
                    <option key={profesional.id} value={profesional.id}>
                      {profesional.nombre}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Fecha" error={blockForm.formState.errors.fecha?.message}>
                <input
                  type="date"
                  className="agendix-input"
                  aria-invalid={blockForm.formState.errors.fecha ? 'true' : 'false'}
                  {...blockForm.register('fecha')}
                />
              </Field>
              <Field
                label="Inicio"
                error={blockForm.formState.errors.hora_inicio?.message}
              >
                <input
                  type="time"
                  step={900}
                  lang="es-CL"
                  className="agendix-input"
                  aria-invalid={
                    blockForm.formState.errors.hora_inicio ? 'true' : 'false'
                  }
                  {...blockForm.register('hora_inicio')}
                />
              </Field>
              <Field label="Término" error={blockForm.formState.errors.hora_fin?.message}>
                <input
                  type="time"
                  step={900}
                  lang="es-CL"
                  className="agendix-input"
                  aria-invalid={
                    blockForm.formState.errors.hora_fin ? 'true' : 'false'
                  }
                  {...blockForm.register('hora_fin')}
                />
              </Field>
            </div>

            <Field label="Motivo" error={blockForm.formState.errors.motivo?.message}>
              <textarea
                rows={3}
                placeholder="Reunión, capacitación, trámite, feriado interno"
                className="agendix-input min-h-24 resize-none"
                aria-invalid={blockForm.formState.errors.motivo ? 'true' : 'false'}
                {...blockForm.register('motivo')}
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeBlockModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Bloqueando...' : 'Bloquear horario'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}

      {evolucionModal && (
        <FormModal
          title="Ficha clínica"
          description={`${patientName(evolucionModal.reserva.paciente)} · ${formatTimeRange(
            evolucionModal.reserva
          )}`}
          onClose={closeEvolucion}
        >
          <form
            onSubmit={onSubmitEvolucion}
            className="space-y-5 px-5 py-5"
            noValidate
          >
            <input type="hidden" {...evolucionForm.register('reserva_id')} />

            <Field
              label="Historia clínica"
              error={evolucionForm.formState.errors.texto_evolucion?.message}
            >
              <textarea
                rows={7}
                placeholder="Escribe la ficha clínica con el detalle que necesites"
                className="agendix-input min-h-44 resize-y"
                aria-invalid={
                  evolucionForm.formState.errors.texto_evolucion
                    ? 'true'
                    : 'false'
                }
                {...evolucionForm.register('texto_evolucion')}
              />
            </Field>

            <Field
              label="Tratamiento"
              error={evolucionForm.formState.errors.proximos_pasos?.message}
            >
              <textarea
                rows={3}
                placeholder="Indicaciones, plan, objetivos o seguimiento"
                className="agendix-input min-h-24 resize-y"
                aria-invalid={
                  evolucionForm.formState.errors.proximos_pasos
                    ? 'true'
                    : 'false'
                }
                {...evolucionForm.register('proximos_pasos')}
              />
            </Field>

            <Field
              label="Antecedentes / Configuración"
              error={
                evolucionForm.formState.errors.observaciones_privadas?.message
              }
            >
              <textarea
                rows={3}
                placeholder="Antecedentes, observaciones internas o configuración del caso"
                className="agendix-input min-h-24 resize-y"
                aria-invalid={
                  evolucionForm.formState.errors.observaciones_privadas
                    ? 'true'
                    : 'false'
                }
                {...evolucionForm.register('observaciones_privadas')}
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeEvolucion}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  )
}

function startOfWeek(date = new Date()) {
  const weekStart = new Date(date)
  const day = weekStart.getDay()
  const diff = day === 0 ? -6 : 1 - day
  weekStart.setDate(weekStart.getDate() + diff)
  weekStart.setHours(0, 0, 0, 0)

  return weekStart
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)

  return nextDate
}

function formatWeekday(date: Date) {
  return normalizeIntlText(
    new Intl.DateTimeFormat('es-CL', {
      weekday: 'short',
      timeZone: appTimeZone,
    }).format(date)
  )
}

function formatShortDate(date: Date) {
  return normalizeIntlText(
    new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      timeZone: appTimeZone,
    }).format(date)
  )
}

function getDayOfMonth(date: Date) {
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    timeZone: appTimeZone,
  }).format(date)
}

function formatMonthLabel(date: Date) {
  return normalizeIntlText(
    new Intl.DateTimeFormat('es-CL', {
      month: 'long',
      year: 'numeric',
      timeZone: appTimeZone,
    }).format(date)
  )
}

function reservationMinutes(reserva: ReservaListItem) {
  const start = new Date(reserva.fecha_inicio).getTime()
  const end = new Date(reserva.fecha_fin).getTime()

  return Math.max(0, Math.round((end - start) / 60_000))
}

function shiftDateValue(value: string, view: CalendarView, direction: -1 | 1) {
  const date = value ? dateFromInput(value) : new Date()

  if (view === 'dia') {
    date.setDate(date.getDate() + direction)
  } else if (view === 'semana') {
    date.setDate(date.getDate() + direction * 7)
  } else {
    date.setMonth(date.getMonth() + direction)
  }

  return dateInputValue(date)
}

function parseHour(value: string) {
  return Number(value.split(':')[0] ?? 0)
}

function hourLabel(hour: number) {
  return `${pad(hour)}:00`
}

function minutesToClock(totalMinutes: number) {
  const minutes = Math.max(0, Math.min(23 * 60 + 59, totalMinutes))

  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

function blockOverlapsMinutes(
  block: AgendaBlockListItem,
  dayKey: string,
  startMinutes: number,
  endMinutes: number
) {
  const start = zonedDateTime(dayKey, minutesToClock(startMinutes))
  const end = zonedDateTime(dayKey, minutesToClock(endMinutes))

  return new Date(block.fecha_inicio) < end && new Date(block.fecha_fin) > start
}

function blockStartsInHour(block: AgendaBlockListItem, hour: number) {
  return zonedHour(block.fecha_inicio) === hour
}

function blockScopeLabel(block: AgendaBlockListItem) {
  return block.profesional?.nombre ?? 'Centro completo'
}

function appointmentStatusLabel(reserva: ReservaListItem) {
  return reservaEstadoLabels[reserva.estado]
}

function sessionLabel(count: number) {
  return `${count} ${count === 1 ? 'sesión' : 'sesiones'}`
}

function meetingLabel(url?: string | null) {
  if (!url) return 'Sin enlace'

  const provider = detectMeetingProvider(url)

  if (provider === 'google_meet') return 'Google Meet'
  if (provider === 'zoom') return 'Zoom'

  return 'Enlace externo'
}

function appointmentStateClasses(reserva: ReservaListItem) {
  if (reserva.estado === 'no_show') {
    return {
      card: 'border-rose-100 bg-rose-50/70 text-rose-900 hover:border-rose-200',
      accent: 'bg-rose-500',
      soft: 'bg-rose-100 text-rose-700',
    }
  }

  if (reserva.estado === 'confirmed') {
    return {
      card: 'border-emerald-100 bg-emerald-50/60 text-emerald-900 hover:border-emerald-200',
      accent: 'bg-emerald-400',
      soft: 'bg-emerald-100 text-emerald-700',
    }
  }

  if (reserva.estado === 'cancelled') {
    return {
      card: 'border-red-100 bg-red-50/70 text-red-900 hover:border-red-200',
      accent: 'bg-red-400',
      soft: 'bg-red-100 text-red-700',
    }
  }

  if (reserva.estado === 'completed') {
    return {
      card: 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300',
      accent: 'bg-slate-400',
      soft: 'bg-slate-100 text-slate-600',
    }
  }

  return {
    card: 'border-amber-100 bg-amber-50/60 text-amber-900 hover:border-amber-200',
    accent: 'bg-amber-400',
    soft: 'bg-amber-100 text-amber-700',
  }
}

function CalendarHeader({
  view,
  selectedDate,
  onViewChange,
  onDateChange,
  onToday,
  onPrevious,
  onNext,
}: {
  view: CalendarView
  selectedDate: string
  onViewChange: (view: CalendarView) => void
  onDateChange: (date: string) => void
  onToday: () => void
  onPrevious: () => void
  onNext: () => void
}) {
  const selected = selectedDate ? dateFromInput(selectedDate) : new Date()
  const rangeLabel =
    view === 'dia'
      ? formatShortDate(selected)
      : view === 'semana'
        ? `Semana de ${formatShortDate(startOfWeek(selected))}`
        : formatMonthLabel(selected)

  return (
    <section className="agendix-surface rounded-2xl p-4 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 transition hover:border-orange-200/80 hover:bg-orange-50 hover:text-orange-600"
              aria-label="Periodo anterior"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onNext}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 transition hover:border-orange-200/80 hover:bg-orange-50 hover:text-orange-600"
              aria-label="Periodo siguiente"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="h-10 rounded-xl border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-orange-200/80 hover:bg-orange-50 hover:text-orange-600 sm:px-4"
            >
              Hoy
            </button>
          </div>
          <div className="min-w-0 rounded-xl bg-slate-50/80 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/70 sm:inline-flex sm:min-w-[260px] sm:max-w-full">
            <span className="block min-w-0 truncate">{rangeLabel}</span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[170px_minmax(220px,240px)] sm:items-center xl:shrink-0">
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => onDateChange(event.target.value)}
            className="agendix-input h-10 min-w-0 rounded-xl"
            aria-label="Seleccionar fecha"
          />

          <div className="grid min-w-0 grid-cols-3 rounded-xl border border-slate-200/70 bg-slate-50/80 p-1">
            {(['dia', 'semana', 'mes'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onViewChange(option)}
                className={`h-8 rounded-lg px-2 text-xs font-semibold transition-all sm:px-3 sm:text-sm ${
                  view === option
                    ? 'bg-[#22211F] text-white shadow-sm shadow-slate-950/15'
                    : 'text-slate-500 hover:text-orange-600'
                }`}
              >
                {option === 'dia' ? 'Día' : option === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CalendarFiltersBar({
  filters,
  profesionales,
  servicios,
  salas,
  canUseSharedCalendar,
  onChange,
}: {
  filters: CalendarFiltersState
  profesionales: ReservaProfesionalOption[]
  servicios: ReservaServicioOption[]
  salas: ReservaSalaOption[]
  canUseSharedCalendar: boolean
  onChange: (filters: CalendarFiltersState) => void
}) {
  const updateFilter = <Key extends keyof CalendarFiltersState>(
    key: Key,
    value: CalendarFiltersState[Key]
  ) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <section className="agendix-surface rounded-2xl p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Profesional">
          <select
            className="agendix-select"
            value={filters.profesionalId}
            disabled={!canUseSharedCalendar}
            onChange={(event) => updateFilter('profesionalId', event.target.value)}
          >
            <option value="">
              {canUseSharedCalendar ? 'Todos los profesionales' : 'Agenda individual'}
            </option>
            {profesionales.map((profesional) => (
              <option key={profesional.id} value={profesional.id}>
                {profesional.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Servicio">
          <select
            className="agendix-select"
            value={filters.servicioId}
            onChange={(event) => updateFilter('servicioId', event.target.value)}
          >
            <option value="">Todos los servicios</option>
            {servicios.map((servicio) => (
              <option key={servicio.id} value={servicio.id}>
                {servicio.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sala">
          <select
            className="agendix-select"
            value={filters.salaId}
            onChange={(event) => updateFilter('salaId', event.target.value)}
          >
            <option value="">Todas las salas</option>
            {salas.map((sala) => (
              <option key={sala.id} value={sala.id}>
                {sala.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select
            className="agendix-select"
            value={filters.estado}
            onChange={(event) =>
              updateFilter('estado', event.target.value as CalendarFiltersState['estado'])
            }
          >
            <option value="todos">Todos los estados</option>
            {reservaEstados.map((estado) => (
              <option key={estado} value={estado}>
                {reservaEstadoLabels[estado]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {!canUseSharedCalendar && (
        <p className="mt-3 rounded-xl border border-orange-200/70 bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-800">
          La agenda compartida y la gestión de múltiples agendas están
          disponibles desde Agendix Center.
        </p>
      )}
    </section>
  )
}

function CalendarView({
  reservas,
  bloqueos,
  view,
  selectedDate,
  initialHorarios,
  demoMode,
  demoPlanId,
  onOpenReserva,
  onOpenBlock,
  onCreateAtSlot,
  onBlockAtSlot,
}: {
  reservas: ReservaListItem[]
  bloqueos: AgendaBlockListItem[]
  view: CalendarView
  selectedDate: string
  initialHorarios: HorarioCentro[]
  demoMode: boolean
  demoPlanId?: string | null
  onOpenReserva: (reserva: ReservaListItem) => void
  onOpenBlock: (block: AgendaBlockListItem) => void
  onCreateAtSlot: (slot: SlotSelection) => void
  onBlockAtSlot: (slot: SlotSelection) => void
}) {
  const normalizedInitialHorarios = useMemo(
    () => normalizeHorarios(initialHorarios),
    [initialHorarios]
  )
  const [horarios, setHorarios] = useState<HorarioCentro[]>(normalizedInitialHorarios)
  const selected = selectedDate ? dateFromInput(selectedDate) : new Date()
  const selectedMonth = selectedDate.slice(0, 7)
  const visibleDays = useMemo(() => {
    const selected = selectedDate ? dateFromInput(selectedDate) : new Date()
    const firstDay =
      view === 'dia'
        ? selected
        : view === 'semana'
          ? startOfWeek(selected)
          : startOfWeek(new Date(selected.getFullYear(), selected.getMonth(), 1))
    const length = view === 'dia' ? 1 : view === 'semana' ? 7 : 42

    return Array.from({ length }, (_, index) => addDays(firstDay, index))
  }, [selectedDate, view])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHorarios(normalizedInitialHorarios)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [normalizedInitialHorarios])

  useEffect(() => {
    if (!demoMode) return

    let storedHorarios: HorarioCentro[] | null = null

    try {
      const storedHorariosValue = readDemoStorageItem(
        demoPlanId,
        'horarios-centro'
      )

      if (storedHorariosValue) {
        storedHorarios = normalizeHorarios(
          JSON.parse(storedHorariosValue) as HorarioCentro[]
        )
      }
    } catch {
      removeDemoStorageItem(demoPlanId, 'horarios-centro')
    }

    window.setTimeout(() => {
      if (storedHorarios) {
        setHorarios(storedHorarios)
      }
    }, 0)
  }, [demoMode, demoPlanId])

  const hourSlots = useMemo(() => {
    const activeHours = visibleDays.flatMap((day) => {
      const horario = getHorarioForDate(day, horarios)
      if (!horario?.activo) return []

      const start = parseHour(horario.inicio)
      const end = Math.max(start + 1, parseHour(horario.fin))
      return Array.from({ length: end - start }, (_, index) => start + index)
    })

    const minHour = activeHours.length > 0 ? Math.min(...activeHours) : 8
    const maxHour = activeHours.length > 0 ? Math.max(...activeHours) : 18

    return Array.from({ length: maxHour - minHour + 1 }, (_, index) => minHour + index)
  }, [horarios, visibleDays])

  const selectedDayReservas = reservas.filter(
    (reserva) => dateKey(reserva.fecha_inicio) === selectedDate
  )
  const selectedDayBlocks = bloqueos.filter(
    (block) => dateKey(block.fecha_inicio) === selectedDate
  )
  const pendingCount = reservas.filter((reserva) => reserva.estado === 'pending').length
  const confirmedCount = reservas.filter(
    (reserva) => reserva.estado === 'confirmed'
  ).length
  const completedCount = reservas.filter(
    (reserva) => reserva.estado === 'completed'
  ).length

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/[0.04]">
      <div className="flex flex-col gap-3 border-b border-slate-100/80 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-200/60">
            <CalendarDays size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-700">
              Calendario
            </h2>
            <p className="text-xs text-slate-400">
              Toca un espacio para reservar o una sesión para ver el detalle.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs font-medium sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          <span className="whitespace-nowrap rounded-full bg-slate-50 px-2.5 py-1 text-center text-slate-500 ring-1 ring-slate-200/80">
            {sessionLabel(reservas.length)}
          </span>
          <StatusSummaryChip label="Pendientes" value={pendingCount} tone="amber" />
          <StatusSummaryChip label="Confirmadas" value={confirmedCount} tone="green" />
          <StatusSummaryChip label="Completadas" value={completedCount} tone="slate" />
          <ReservationStatusHelp />
        </div>
      </div>

      <div className="md:hidden">
        {view === 'dia' ? (
          <MobileDayTimeline
            date={selected}
            hourSlots={hourSlots}
            reservas={selectedDayReservas}
            bloqueos={selectedDayBlocks}
            horarios={horarios}
            onOpenReserva={onOpenReserva}
            onOpenBlock={onOpenBlock}
            onCreateAtSlot={onCreateAtSlot}
            onBlockAtSlot={onBlockAtSlot}
          />
        ) : (
          <MobileAgendaList
            days={visibleDays}
            selectedMonth={selectedMonth}
            view={view}
            reservas={reservas}
            bloqueos={bloqueos}
            horarios={horarios}
            onOpenReserva={onOpenReserva}
            onOpenBlock={onOpenBlock}
            onCreateAtSlot={onCreateAtSlot}
            onBlockAtSlot={onBlockAtSlot}
          />
        )}
      </div>

      <div className="hidden md:block">
        {view === 'mes' ? (
          <MonthCalendar
            days={visibleDays}
            selectedMonth={selectedMonth}
            reservas={reservas}
            bloqueos={bloqueos}
            onOpenReserva={onOpenReserva}
            onOpenBlock={onOpenBlock}
            onCreateAtSlot={onCreateAtSlot}
            onBlockAtSlot={onBlockAtSlot}
          />
        ) : (
          <WeekCalendar
            days={visibleDays}
            hourSlots={hourSlots}
            reservas={reservas}
            bloqueos={bloqueos}
            horarios={horarios}
            onOpenReserva={onOpenReserva}
            onOpenBlock={onOpenBlock}
            onCreateAtSlot={onCreateAtSlot}
            onBlockAtSlot={onBlockAtSlot}
          />
        )}
      </div>
    </section>
  )
}

function StatusSummaryChip({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'amber' | 'green' | 'slate'
}) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    slate: 'bg-slate-50 text-slate-600 ring-slate-200/80',
  }

  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-center ring-1 ${tones[tone]}`}>
      {value} {label}
    </span>
  )
}

function ReservationStatusHelp() {
  return (
    <details className="relative col-span-2 justify-self-end sm:col-span-1">
      <summary className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 [&::-webkit-details-marker]:hidden">
        <Info size={14} aria-hidden="true" />
        <span className="sr-only">Ver estados de reservas</span>
      </summary>
      <div className="absolute right-0 top-9 z-20 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl shadow-slate-900/10">
        <p className="text-sm font-semibold text-slate-900">
          Estados de las reservas
        </p>
        <div className="mt-3 space-y-3">
          {reservaEstados.map((estado) => (
            <div key={estado} className="grid gap-1">
              <Badge tone={estadoTone(estado)} className="w-fit">
                {reservaEstadoLabels[estado]}
              </Badge>
              <p className="text-xs leading-5 text-slate-500">
                {reservaEstadoDescriptions[estado]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}

function WeekCalendar({
  days,
  hourSlots,
  reservas,
  bloqueos,
  horarios,
  onOpenReserva,
  onOpenBlock,
  onCreateAtSlot,
  onBlockAtSlot,
}: {
  days: Date[]
  hourSlots: number[]
  reservas: ReservaListItem[]
  bloqueos: AgendaBlockListItem[]
  horarios: HorarioCentro[]
  onOpenReserva: (reserva: ReservaListItem) => void
  onOpenBlock: (block: AgendaBlockListItem) => void
  onCreateAtSlot: (slot: SlotSelection) => void
  onBlockAtSlot: (slot: SlotSelection) => void
}) {
  const todayKey = dateKey()
  const cols = `56px repeat(${days.length}, minmax(0, 1fr))`

  return (
    <div className="w-full overflow-hidden">
      <div className="divide-y divide-slate-100">
        {/* Sticky day-header */}
        <div
          className="sticky top-0 z-10 grid border-b border-slate-200 bg-white"
          style={{ gridTemplateColumns: cols }}
        >
          <div className="border-r border-slate-100 px-2 py-3 text-[11px] font-medium text-slate-400" />
          {days.map((day) => {
            const dayKey = dateInputValue(day)
            const isToday = dayKey === todayKey
            const dayReservas = reservas.filter(
              (r) => dateKey(r.fecha_inicio) === dayKey
            )

            return (
              <div
                key={dayKey}
                className={`border-r border-slate-100 px-2 py-3 text-center ${isToday ? 'bg-orange-50/60' : ''}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  {formatWeekday(day).replace('.', '')}
                </p>
                <p
                  className={`mt-1 text-lg font-bold leading-none tabular-nums ${
                    isToday
                      ? 'flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-white mx-auto'
                      : 'text-slate-700'
                  }`}
                >
                  {getDayOfMonth(day)}
                </p>
                {dayReservas.length > 0 && (
                  <span className="mt-1 inline-flex rounded-full bg-orange-100 px-1.5 py-px text-[11px] font-bold text-orange-700">
                    {dayReservas.length}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Hour rows */}
        {hourSlots.map((hour) => (
          <div
            key={hour}
            className="grid"
            style={{ gridTemplateColumns: cols }}
          >
            <div className="border-r border-slate-100 bg-slate-50/40 px-2 py-2 text-right text-[11px] font-medium text-slate-400">
              {hourLabel(hour)}
            </div>
            {days.map((day) => {
              const dayKey = dateInputValue(day)
              const isToday = dayKey === todayKey
              const horario = getHorarioForDate(day, horarios)
              const hourStart = hour * 60
              const hourEnd = hourStart + 60
              const isOpen =
                !!horario?.activo &&
                hourStart >= timeToMinutes(horario.inicio) &&
                hourStart < timeToMinutes(horario.fin) &&
                !timeRangeOverlapsDescanso(horario, hourStart, hourEnd)
              const isBreak =
                !!horario?.activo &&
                timeRangeOverlapsDescanso(horario, hourStart, hourEnd)
              const slotReservas = reservas
                .filter((reserva) => {
                  return dateKey(reserva.fecha_inicio) === dayKey && zonedHour(reserva.fecha_inicio) === hour
                })
                .sort(
                  (a, b) =>
                    new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
                )
              const slotBlocks = bloqueos
                .filter((block) =>
                  blockOverlapsMinutes(block, dayKey, hourStart, hourEnd)
                )
                .sort(
                  (a, b) =>
                    new Date(a.fecha_inicio).getTime() -
                    new Date(b.fecha_inicio).getTime()
                )
              const hasCenterBlock = slotBlocks.some((block) => !block.profesional_id)
              const compactSlot = slotReservas.length > 2

              return (
                <div
                  key={`${dayKey}-${hour}`}
                  className={`min-h-14 border-r border-slate-100 p-1.5 transition ${
                    isToday ? 'bg-orange-50/20' : 'bg-white hover:bg-slate-50/40'
                  }`}
                >
                  <div className="space-y-1">
                    {slotReservas.map((reserva) => (
                      <AppointmentCard
                        key={reserva.id}
                        reserva={reserva}
                        onOpen={onOpenReserva}
                        compact={compactSlot}
                      />
                    ))}
                    {slotBlocks.map((block) => (
                      <AgendaBlockCard
                        key={`${block.id}-${dayKey}-${hour}`}
                        block={block}
                        onOpen={onOpenBlock}
                        compact={!blockStartsInHour(block, hour)}
                      />
                    ))}
                    {isOpen && slotReservas.length === 0 && !hasCenterBlock && (
                      <button
                        type="button"
                        onClick={() =>
                          onCreateAtSlot({ fecha: dayKey, hora: hourLabel(hour) })
                        }
                        className="flex min-h-11 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-300 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500"
                      >
                        +
                      </button>
                    )}
                    {isOpen && slotReservas.length === 0 && hasCenterBlock && (
                      <button
                        type="button"
                        onClick={() =>
                          onBlockAtSlot({ fecha: dayKey, hora: hourLabel(hour) })
                        }
                        className="flex min-h-11 w-full items-center justify-center rounded-lg border border-dashed border-rose-200 bg-rose-50 text-xs font-semibold text-rose-400 transition hover:border-rose-300 hover:bg-rose-100/70 hover:text-rose-600"
                      >
                        Bloqueado
                      </button>
                    )}
                    {!isOpen && slotReservas.length === 0 && slotBlocks.length === 0 && (
                      <div
                        className={`flex min-h-11 items-center justify-center rounded-lg text-[11px] ${
                          isBreak
                            ? 'bg-amber-50 text-amber-500 ring-1 ring-amber-100'
                            : 'bg-slate-50/80 text-slate-200'
                        }`}
                      >
                        {isBreak ? 'Descanso' : '—'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthCalendar({
  days,
  selectedMonth,
  reservas,
  bloqueos,
  onOpenReserva,
  onOpenBlock,
  onCreateAtSlot,
  onBlockAtSlot,
}: {
  days: Date[]
  selectedMonth: string
  reservas: ReservaListItem[]
  bloqueos: AgendaBlockListItem[]
  onOpenReserva: (reserva: ReservaListItem) => void
  onOpenBlock: (block: AgendaBlockListItem) => void
  onCreateAtSlot: (slot: SlotSelection) => void
  onBlockAtSlot: (slot: SlotSelection) => void
}) {
  return (
    <div className="grid grid-cols-7 gap-px bg-slate-100 p-px">
      {days.map((day) => {
        const dayKey = dateInputValue(day)
        const isOutsideMonth = !dayKey.startsWith(selectedMonth)
        const dayReservas = reservas
          .filter((reserva) => dateKey(reserva.fecha_inicio) === dayKey)
          .sort(
            (a, b) =>
              new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
          )
        const dayBlocks = bloqueos
          .filter((block) => dateKey(block.fecha_inicio) === dayKey)
          .sort(
            (a, b) =>
              new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
          )

        return (
          <article
            key={dayKey}
            className={`min-h-40 bg-white p-2 transition hover:bg-slate-50/80 ${
              isOutsideMonth ? 'opacity-40' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {formatWeekday(day)}
              </p>
              <p className="text-xs font-semibold text-slate-600">
                {formatShortDate(day)}
              </p>
            </div>
            <div className="mt-2 space-y-1.5">
              {dayReservas.slice(0, 3).map((reserva) => (
                <AppointmentCard
                  key={reserva.id}
                  reserva={reserva}
                  onOpen={onOpenReserva}
                  compact
                />
              ))}
              {dayBlocks.slice(0, Math.max(0, 3 - dayReservas.length)).map((block) => (
                <AgendaBlockCard
                  key={block.id}
                  block={block}
                  onOpen={onOpenBlock}
                  compact
                />
              ))}
              {dayReservas.length + dayBlocks.length > 3 && (
                <p className="px-2 text-xs font-semibold text-slate-500">
                  +{dayReservas.length + dayBlocks.length - 3} más
                </p>
              )}
              {dayReservas.length === 0 && dayBlocks.length === 0 && (
                <button
                  type="button"
                  onClick={() => onCreateAtSlot({ fecha: dayKey, hora: '09:00' })}
                  className="mt-3 flex min-h-16 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs font-semibold text-slate-400 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                >
                  Libre
                </button>
              )}
              {dayReservas.length === 0 && dayBlocks.length > 0 && (
                <button
                  type="button"
                  onClick={() => onBlockAtSlot({ fecha: dayKey, hora: '09:00' })}
                  className="mt-2 flex min-h-10 w-full items-center justify-center rounded-lg border border-dashed border-rose-200 text-xs font-semibold text-rose-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  Añadir bloqueo
                </button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function MobileDayTimeline({
  date,
  hourSlots,
  reservas,
  bloqueos,
  horarios,
  onOpenReserva,
  onOpenBlock,
  onCreateAtSlot,
  onBlockAtSlot,
}: {
  date: Date
  hourSlots: number[]
  reservas: ReservaListItem[]
  bloqueos: AgendaBlockListItem[]
  horarios: HorarioCentro[]
  onOpenReserva: (reserva: ReservaListItem) => void
  onOpenBlock: (block: AgendaBlockListItem) => void
  onCreateAtSlot: (slot: SlotSelection) => void
  onBlockAtSlot: (slot: SlotSelection) => void
}) {
  const dayKey = dateInputValue(date)
  const horario = getHorarioForDate(date, horarios)

  return (
    <div className="space-y-3 p-3">
      <div className="rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200/60">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Agenda móvil
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-800">
          {formatWeekday(date)} {formatShortDate(date)}
        </p>
      </div>
      {hourSlots.map((hour) => {
        const slotReservas = reservas.filter((reserva) => {
          return zonedHour(reserva.fecha_inicio) === hour
        })
        const slotBlocks = bloqueos
          .filter((block) =>
            blockOverlapsMinutes(block, dayKey, hour * 60, hour * 60 + 60)
          )
          .sort(
            (a, b) =>
              new Date(a.fecha_inicio).getTime() -
              new Date(b.fecha_inicio).getTime()
          )
        const hasCenterBlock = slotBlocks.some((block) => !block.profesional_id)
        const isOpen =
          !!horario?.activo &&
          hour * 60 >= timeToMinutes(horario.inicio) &&
          hour * 60 < timeToMinutes(horario.fin) &&
          !timeRangeOverlapsDescanso(horario, hour * 60, hour * 60 + 60)
        const isBreak =
          !!horario?.activo &&
          timeRangeOverlapsDescanso(horario, hour * 60, hour * 60 + 60)

        return (
          <div key={hour} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
            <div className="pt-3 text-xs font-semibold text-slate-500">
              {hourLabel(hour)}
            </div>
            <div className="space-y-2 border-l border-slate-200 pl-3">
              {slotReservas.map((reserva) => (
                <AppointmentCard
                  key={reserva.id}
                  reserva={reserva}
                  onOpen={onOpenReserva}
                />
              ))}
              {slotBlocks.map((block) => (
                <AgendaBlockCard
                  key={`${block.id}-${hour}`}
                  block={block}
                  onOpen={onOpenBlock}
                  compact={!blockStartsInHour(block, hour)}
                />
              ))}
              {slotReservas.length === 0 && isOpen && !hasCenterBlock && (
                <button
                  type="button"
                  onClick={() => onCreateAtSlot({ fecha: dayKey, hora: hourLabel(hour) })}
                  className="flex min-h-16 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm font-semibold text-slate-400 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                >
                  Espacio disponible
                </button>
              )}
              {slotReservas.length === 0 && isOpen && hasCenterBlock && (
                <button
                  type="button"
                  onClick={() => onBlockAtSlot({ fecha: dayKey, hora: hourLabel(hour) })}
                  className="flex min-h-14 w-full items-center justify-center rounded-lg border border-dashed border-rose-200 bg-rose-50 text-sm font-semibold text-rose-400 transition hover:border-rose-300 hover:bg-rose-100/70 hover:text-rose-600"
                >
                  Bloqueado
                </button>
              )}
              {slotReservas.length === 0 && slotBlocks.length === 0 && !isOpen && (
                <div
                  className={`flex min-h-14 items-center justify-center rounded-lg text-sm font-semibold ${
                    isBreak
                      ? 'bg-amber-50 text-amber-500 ring-1 ring-amber-100'
                      : 'bg-slate-50 text-slate-300'
                  }`}
                >
                  {isBreak ? 'Descanso' : 'Cerrado'}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MobileAgendaList({
  days,
  selectedMonth,
  view,
  reservas,
  bloqueos,
  horarios,
  onOpenReserva,
  onOpenBlock,
  onCreateAtSlot,
  onBlockAtSlot,
}: {
  days: Date[]
  selectedMonth: string
  view: Exclude<CalendarView, 'dia'>
  reservas: ReservaListItem[]
  bloqueos: AgendaBlockListItem[]
  horarios: HorarioCentro[]
  onOpenReserva: (reserva: ReservaListItem) => void
  onOpenBlock: (block: AgendaBlockListItem) => void
  onCreateAtSlot: (slot: SlotSelection) => void
  onBlockAtSlot: (slot: SlotSelection) => void
}) {
  const visibleDays =
    view === 'mes'
      ? days.filter((day) => dateInputValue(day).startsWith(selectedMonth))
      : days

  return (
    <div className="space-y-3 p-3">
      <div className="rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200/60">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {view === 'semana' ? 'Semana' : 'Mes'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Revisa cada día y abre una sesión para ver el detalle.
        </p>
      </div>

      {visibleDays.map((day) => {
        const dayKey = dateInputValue(day)
        const horario = getHorarioForDate(day, horarios)
        const dayReservas = reservas
          .filter((reserva) => dateKey(reserva.fecha_inicio) === dayKey)
          .sort(
            (a, b) =>
              new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
          )
        const dayBlocks = bloqueos
          .filter((block) => dateKey(block.fecha_inicio) === dayKey)
          .sort(
            (a, b) =>
              new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
          )
        const suggestedHour = firstBookableTime(horario)

        return (
          <section
            key={dayKey}
            className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-900/[0.03]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {formatWeekday(day)}
                </p>
                <h3 className="mt-1 text-sm font-semibold text-slate-800">
                  {formatShortDate(day)}
                </h3>
              </div>
              <Badge tone="slate">
                {dayReservas.length + dayBlocks.length} eventos
              </Badge>
            </div>

            <div className="mt-3 space-y-2">
              {dayReservas.map((reserva) => (
                <AppointmentCard
                  key={reserva.id}
                  reserva={reserva}
                  onOpen={onOpenReserva}
                />
              ))}
              {dayBlocks.map((block) => (
                <AgendaBlockCard
                  key={block.id}
                  block={block}
                  onOpen={onOpenBlock}
                />
              ))}

              {dayReservas.length === 0 && dayBlocks.length === 0 && horario?.activo && (
                <button
                  type="button"
                  onClick={() => onCreateAtSlot({ fecha: dayKey, hora: suggestedHour })}
                  className="flex min-h-12 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-sm font-semibold text-slate-400 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                >
                  Crear reserva a las {suggestedHour}
                </button>
              )}

              {dayReservas.length === 0 && dayBlocks.length > 0 && horario?.activo && (
                <button
                  type="button"
                  onClick={() => onBlockAtSlot({ fecha: dayKey, hora: suggestedHour })}
                  className="flex min-h-12 w-full items-center justify-center rounded-lg border border-dashed border-rose-200 bg-white text-sm font-semibold text-rose-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  Añadir bloqueo
                </button>
              )}

              {dayReservas.length === 0 && dayBlocks.length === 0 && !horario?.activo && (
                <div className="flex min-h-12 items-center justify-center rounded-lg bg-slate-50 text-sm font-semibold text-slate-300">
                  Centro cerrado
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function AppointmentCard({
  reserva,
  onOpen,
  compact = false,
}: {
  reserva: ReservaListItem
  onOpen: (reserva: ReservaListItem) => void
  compact?: boolean
}) {
  const state = appointmentStateClasses(reserva)

  return (
    <button
      type="button"
      onClick={() => onOpen(reserva)}
      className={`relative w-full overflow-hidden rounded-xl border p-2 pl-3 text-left transition-all duration-150 hover:-translate-y-px hover:shadow-sm hover:shadow-slate-900/10 ${state.card}`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] rounded-r-full ${state.accent}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500">{formatTimeRange(reserva)}</p>
          <p className="mt-0.5 truncate text-xs font-semibold">
            {patientName(reserva.paciente)}
          </p>
        </div>
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${state.accent}`} />
      </div>
      <p className={`mt-0.5 truncate text-slate-500 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        {reserva.servicio.nombre}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className={`rounded-md px-1.5 py-0.5 font-semibold ${compact ? 'text-[10px]' : 'text-[11px]'} ${state.soft}`}>
          {appointmentStatusLabel(reserva)}
        </span>
      </div>
    </button>
  )
}

function AgendaBlockCard({
  block,
  onOpen,
  compact = false,
}: {
  block: AgendaBlockListItem
  onOpen: (block: AgendaBlockListItem) => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(block)}
      className="relative w-full overflow-hidden rounded-xl border border-rose-100 bg-rose-50/70 p-2 pl-3 text-left text-rose-900 transition-all duration-150 hover:-translate-y-px hover:border-rose-200 hover:shadow-sm hover:shadow-slate-900/10"
    >
      <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-rose-400" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-rose-500">
            {formatBlockTimeRange(block)}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold">
            {blockScopeLabel(block)}
          </p>
        </div>
        <CalendarX2 size={14} className="mt-0.5 shrink-0 text-rose-400" aria-hidden="true" />
      </div>
      {!compact && block.motivo && (
        <p className="mt-0.5 truncate text-[11px] text-rose-500">
          {block.motivo}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
          Bloqueado
        </span>
      </div>
    </button>
  )
}

function AgendaMetricCards({
  total,
  nextReserva,
  confirmed,
  pending,
  attentionNeeded,
}: {
  total: number
  nextReserva?: ReservaListItem
  confirmed: number
  pending: number
  attentionNeeded: number
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AgendaMetricCard
        icon={CalendarDays}
        label="Reservas de hoy"
        value={total}
        description={`${confirmed} confirmadas`}
        tone="orange"
      />
      <AgendaMetricCard
        icon={Clock3}
        label="Próximo paciente"
        value={nextReserva ? patientName(nextReserva.paciente) : 'Sin próximas'}
        description={nextReserva ? formatTimeRange(nextReserva) : 'Agenda despejada por ahora'}
        tone="slate"
      />
      <AgendaMetricCard
        icon={CheckCircle2}
        label="Pendientes"
        value={pending}
        description="Requieren confirmación"
        tone="amber"
      />
      <AgendaMetricCard
        icon={AlertCircle}
        label="Atención"
        value={attentionNeeded}
        description="Canceladas o no asistidas"
        tone="red"
      />
    </section>
  )
}

function AgendaMetricCard({
  icon: Icon,
  label,
  value,
  description,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  description: string
  tone: 'orange' | 'slate' | 'amber' | 'red'
}) {
  const toneClasses = {
    orange: 'bg-orange-50 text-orange-600 ring-orange-200/70',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200/80',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200/70',
    red: 'bg-red-50 text-red-600 ring-red-200/70',
  }

  return (
    <article className="agendix-surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pr-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-1.5 min-h-7 text-xl font-semibold leading-7 tracking-tight text-slate-900 [overflow-wrap:anywhere]">
            {value}
          </p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${toneClasses[tone]}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-1.5 min-h-4 text-xs leading-4 text-slate-500 [overflow-wrap:anywhere]">{description}</p>
    </article>
  )
}

function ReservationsManagementView({
  reservas,
  total,
  confirmed,
  pending,
  completed,
  search,
  onSearchChange,
  setupReady,
  onCreate,
  onOpenReserva,
  onEditReserva,
}: {
  reservas: ReservaListItem[]
  total: number
  confirmed: number
  pending: number
  completed: number
  search: string
  onSearchChange: (value: string) => void
  setupReady: boolean
  onCreate: () => void
  onOpenReserva: (reserva: ReservaListItem) => void
  onEditReserva: (reserva: ReservaListItem) => void
}) {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AgendaMetricCard
          icon={FileText}
          label="Total"
          value={total}
          description="Reservas creadas"
          tone="orange"
        />
        <AgendaMetricCard
          icon={CheckCircle2}
          label="Confirmadas"
          value={confirmed}
          description="Listas para atender"
          tone="slate"
        />
        <AgendaMetricCard
          icon={Clock3}
          label="Pendientes"
          value={pending}
          description="Requieren confirmación"
          tone="amber"
        />
        <AgendaMetricCard
          icon={FileText}
          label="Completadas"
          value={completed}
          description="Sesiones cerradas"
          tone="slate"
        />
      </section>

      <section className="agendix-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-100/80 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800">
              Listado de reservas
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {reservas.length === 1
                ? '1 reserva encontrada'
                : `${reservas.length} reservas encontradas`}
            </p>
          </div>
          <SearchField
            value={search}
            onChange={onSearchChange}
            placeholder="Buscar paciente, servicio o profesional"
            label="Buscar reservas"
            className="lg:w-[360px]"
          />
        </div>

        {reservas.length === 0 ? (
          <div className="px-4 py-8 sm:px-5">
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-orange-500 ring-1 ring-orange-200/70">
                <CalendarPlus size={19} aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                No hay reservas con estos filtros
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Ajusta la búsqueda o crea una reserva manual para dejar la agenda lista.
              </p>
              <Button type="button" onClick={onCreate} disabled={!setupReady} className="mt-4">
                <CalendarPlus size={16} aria-hidden="true" />
                Nueva reserva
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reservas.map((reserva) => (
              <ReservationDirectoryRow
                key={reserva.id}
                reserva={reserva}
                onOpen={onOpenReserva}
                onEdit={onEditReserva}
              />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function ReservationDirectoryRow({
  reserva,
  onOpen,
  onEdit,
}: {
  reserva: ReservaListItem
  onOpen: (reserva: ReservaListItem) => void
  onEdit: (reserva: ReservaListItem) => void
}) {
  return (
    <article className="grid gap-4 px-4 py-4 transition hover:bg-slate-50/70 sm:px-5 lg:grid-cols-[130px_minmax(0,1.15fr)_minmax(140px,180px)_minmax(150px,170px)_auto] lg:items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">
          {formatShortDate(new Date(reserva.fecha_inicio))}
        </p>
        <p className="mt-0.5 text-xs font-medium tabular-nums text-slate-500">
          {formatTimeRange(reserva)}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">
          {patientName(reserva.paciente)}
        </p>
        <p className="mt-0.5 text-xs leading-4 text-slate-500 [overflow-wrap:anywhere]">
          {reserva.servicio.nombre}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Profesional
        </p>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <EntityImage
            src={reserva.profesional.avatar_url}
            name={reserva.profesional.nombre}
            size="sm"
          />
          <p className="min-w-0 text-sm font-medium text-slate-700 [overflow-wrap:anywhere]">
            {reserva.profesional.nombre}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap gap-2">
        <Badge tone={estadoTone(reserva.estado)}>
          {appointmentStatusLabel(reserva)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:w-[170px]">
        <Button type="button" size="sm" variant="secondary" onClick={() => onOpen(reserva)}>
          Ver
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(reserva)}>
          Editar
        </Button>
      </div>
    </article>
  )
}

function NextAttentionCard({
  nextReserva,
  hasPublicLink,
  isPending,
  onCreate,
  onCopyPublicLink,
  onOpenDetail,
  onComplete,
  onEvolucion,
  onReschedule,
}: {
  nextReserva?: ReservaListItem
  hasPublicLink: boolean
  isPending: boolean
  onCreate: () => void
  onCopyPublicLink: () => void
  onOpenDetail: (reserva: ReservaListItem) => void
  onComplete: (reserva: ReservaListItem) => void
  onEvolucion: (reserva: ReservaListItem) => void
  onReschedule: (reserva: ReservaListItem) => void
}) {
  if (!nextReserva) {
    return (
      <section className="agendix-surface rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-200/70">
              <CalendarPlus size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">
                Todavía no tienes reservas para hoy
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Puedes crear una hora manualmente o compartir tu link público para que tus pacientes agenden sin escribirte por WhatsApp.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:flex sm:shrink-0 sm:flex-wrap sm:justify-end">
            <Button type="button" variant="secondary" onClick={onCopyPublicLink} disabled={!hasPublicLink}>
              <Copy size={16} aria-hidden="true" />
              Copiar link público
            </Button>
            <Button type="button" onClick={onCreate}>
              <CalendarPlus size={16} aria-hidden="true" />
              Crear reserva
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#22211F] bg-[#22211F] shadow-lg shadow-slate-950/15">
      <div className="grid gap-4 p-4 text-white lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
            Tu próxima atención
          </p>
          <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF4EF] text-sm font-bold text-orange-600 ring-1 ring-white/15">
              {patientName(nextReserva.paciente).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-7 tracking-tight text-white [overflow-wrap:anywhere]">
                {patientName(nextReserva.paciente)}
              </h2>
              <p className="mt-0.5 text-sm leading-5 text-white/70 [overflow-wrap:anywhere]">
                {formatTimeRange(nextReserva)} · {nextReserva.servicio.nombre} · {nextReserva.profesional.nombre}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
              {appointmentStatusLabel(nextReserva)}
            </span>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:w-[420px]">
          <button
            type="button"
            onClick={() => onOpenDetail(nextReserva)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#22211F] ring-1 ring-white/20 transition-all hover:bg-[#FFF4EF] active:bg-orange-50 whitespace-nowrap"
          >
            <UserRound size={16} aria-hidden="true" />
            Ver paciente
          </button>
          <button
            type="button"
            onClick={() => onComplete(nextReserva)}
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/15 transition-all hover:bg-white/20 active:bg-white/25 disabled:opacity-50 whitespace-nowrap"
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            Completar atención
          </button>
          <button
            type="button"
            onClick={() => onEvolucion(nextReserva)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/15 transition-all hover:bg-white/20 active:bg-white/25 whitespace-nowrap"
          >
            <FileText size={16} aria-hidden="true" />
            Ficha clínica
          </button>
          <button
            type="button"
            onClick={() => onReschedule(nextReserva)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/15 transition-all hover:bg-white/20 active:bg-white/25 whitespace-nowrap"
          >
            <Edit3 size={16} aria-hidden="true" />
            Reagendar
          </button>
        </div>
      </div>
    </section>
  )
}

function TodaySummary({
  nextReserva,
  total,
  confirmed,
  pending,
  completed,
}: {
  nextReserva?: ReservaListItem
  total: number
  confirmed: number
  pending: number
  completed: number
}) {
  return (
    <section className="agendix-surface rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Hoy
          </p>
          <h2 className="mt-0.5 text-lg font-semibold text-slate-800">
            {sessionLabel(total)}
          </h2>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-500 ring-1 ring-orange-200/60">
          <Clock3 size={17} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200/60">
        <p className="text-xs font-medium text-slate-400">Próxima sesión</p>
        {nextReserva ? (
          <div className="mt-1.5">
            <p className="font-semibold text-slate-800 [overflow-wrap:anywhere]">
              {patientName(nextReserva.paciente)}
            </p>
            <p className="mt-0.5 text-xs leading-4 text-slate-500 [overflow-wrap:anywhere]">
              {formatTimeRange(nextReserva)} · {nextReserva.servicio.nombre}
            </p>
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-slate-400">
            Sin sesiones pendientes por ahora.
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <SummaryPill label="Confirmadas" value={confirmed} tone="green" />
        <SummaryPill label="Pendientes" value={pending} tone="amber" />
        <SummaryPill label="Completadas" value={completed} tone="slate" />
      </div>
    </section>
  )
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'green' | 'amber' | 'orange' | 'slate' | 'red'
}) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    orange: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    slate: 'bg-slate-50 text-slate-600 ring-slate-200/80',
    red: 'bg-red-50 text-red-600 ring-red-200/60',
  }

  return (
    <div className={`rounded-xl p-2.5 text-center ring-1 ${tones[tone]}`}>
      <p className="text-base font-semibold">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium tracking-wide uppercase">{label}</p>
    </div>
  )
}

function TodayAgendaPanel({
  reservas,
  onOpenReserva,
  onCreate,
  onCopyPublicLink,
  hasPublicLink,
}: {
  reservas: ReservaListItem[]
  onOpenReserva: (reserva: ReservaListItem) => void
  onCreate: () => void
  onCopyPublicLink: () => void
  hasPublicLink: boolean
}) {
  return (
    <section className="agendix-surface rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Agenda de hoy
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-slate-700">
            Sesiones del día
          </h2>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-500 transition hover:bg-orange-100 hover:text-orange-600"
          aria-label="Crear reserva para hoy"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        {reservas.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-center">
            <p className="text-sm font-semibold text-slate-800">
              Hoy está despejado
            </p>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              Crea una reserva o comparte tu link para que tus pacientes elijan horario.
            </p>
            <div className="mt-3 grid gap-2">
              <Button type="button" size="sm" onClick={onCreate}>
                <CalendarPlus size={14} aria-hidden="true" />
                Crear reserva
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onCopyPublicLink}
                disabled={!hasPublicLink}
              >
                <Copy size={14} aria-hidden="true" />
                Copiar link público
              </Button>
            </div>
          </div>
        ) : (
          reservas.map((reserva) => (
            <button
              key={reserva.id}
              type="button"
              onClick={() => onOpenReserva(reserva)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-2.5 text-left transition hover:border-orange-200/80 hover:bg-orange-50/60"
            >
              <div className="w-12 shrink-0 text-xs font-semibold tabular-nums text-slate-500">
                {isoToTimeInput(reserva.fecha_inicio)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700">
                  {patientName(reserva.paciente)}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {reserva.servicio.nombre}
                </p>
              </div>
              <Badge tone={estadoTone(reserva.estado)} className="shrink-0">
                {appointmentStatusLabel(reserva)}
              </Badge>
            </button>
          ))
        )}
      </div>
    </section>
  )
}

function AppointmentDetailsPanel({
  reserva,
  isPending,
  hasEvolucion,
  canUseAttendanceControl,
  onClose,
  onEdit,
  onConfirm,
  onComplete,
  onNoShow,
  onCancel,
  onReschedule,
  onEvolucion,
  onReminder,
}: {
  reserva: ReservaListItem
  isPending: boolean
  hasEvolucion: boolean
  canUseAttendanceControl: boolean
  onClose: () => void
  onEdit: (reserva: ReservaListItem) => void
  onConfirm: (reserva: ReservaListItem) => void
  onComplete: (reserva: ReservaListItem) => void
  onNoShow: (reserva: ReservaListItem) => void
  onCancel: (reserva: ReservaListItem) => void
  onReschedule: (reserva: ReservaListItem) => void
  onEvolucion: (reserva: ReservaListItem) => void
  onReminder: (reserva: ReservaListItem) => void
}) {
  const patientEmail = reserva.paciente.email?.trim() ?? ''
  const canSendEmailReminder = patientEmail.length > 0

  return (
    <div className="agendix-modal-overlay fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-sm">
      <aside className="agendix-panel-slide absolute bottom-0 right-0 top-0 flex w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl shadow-slate-950/15">
        <div className="border-b border-slate-100/80 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Detalle de sesión
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-800">
                {patientName(reserva.paciente)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {formatDateTime(reserva.fecha_inicio)} · {reservationMinutes(reserva)} min
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar detalle"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={estadoTone(reserva.estado)}>
              {appointmentStatusLabel(reserva)}
            </Badge>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-2.5 rounded-xl bg-slate-50/80 p-4 text-sm ring-1 ring-slate-200/60">
            <DetailRow label="Servicio" value={reserva.servicio.nombre} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Profesional
              </span>
              <span className="flex min-w-0 items-center gap-2 text-right font-medium text-slate-700">
                <EntityImage
                  src={reserva.profesional.avatar_url}
                  name={reserva.profesional.nombre}
                  size="sm"
                />
                <span className="min-w-0 truncate">{reserva.profesional.nombre}</span>
              </span>
            </div>
            <DetailRow label="Sala" value={reserva.sala.nombre} />
            <DetailRow
              label="Teléfono"
              value={reserva.paciente.telefono || '—'}
            />
            <DetailRow
              label="Email"
              value={patientEmail || '—'}
            />
            <DetailRow
              label="Telemedicina"
              value={meetingLabel(reserva.meeting_url)}
            />
          </div>

          {reserva.meeting_url && (
            <a
              href={reserva.meeting_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-sky-200/70 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
            >
              <span className="flex min-w-0 items-center gap-2">
                <LinkIcon size={16} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{meetingLabel(reserva.meeting_url)}</span>
              </span>
              <ExternalLink size={15} aria-hidden="true" className="shrink-0" />
            </a>
          )}

          {reserva.notas && (
          <div className="rounded-xl border border-slate-200/70 p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Notas</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {reserva.notas}
            </p>
          </div>
          )}

          <div className="grid gap-2">
            {!canUseAttendanceControl && (
              <div className="rounded-xl border border-orange-200/70 bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-800">
                Control de asistencia disponible desde Agendix Center Pro.
              </div>
            )}
            <Button
              type="button"
              onClick={() => onConfirm(reserva)}
              disabled={isPending || reserva.estado === 'confirmed'}
              className="justify-start"
            >
              <CheckCircle2 size={17} aria-hidden="true" />
              Marcar como confirmada
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onComplete(reserva)}
              disabled={
                isPending || reserva.estado === 'completed' || !canUseAttendanceControl
              }
              className="justify-start"
            >
              <CheckCircle2 size={17} aria-hidden="true" />
              Marcar como completada
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onNoShow(reserva)}
              disabled={
                isPending || reserva.estado === 'no_show' || !canUseAttendanceControl
              }
              className="justify-start"
            >
              <AlertCircle size={17} aria-hidden="true" />
              Marcar como no asistió
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onCancel(reserva)}
              disabled={isPending || reserva.estado === 'cancelled'}
              className="justify-start"
            >
              <X size={17} aria-hidden="true" />
              Marcar como cancelada
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onReschedule(reserva)}
              className="justify-start"
            >
              <Edit3 size={17} aria-hidden="true" />
              Reagendar o editar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onEvolucion(reserva)}
              className="justify-start"
            >
              <FileText size={17} aria-hidden="true" />
              {hasEvolucion ? 'Editar ficha' : 'Ficha clínica'}
            </Button>
            <Button
              type="button"
              variant={canSendEmailReminder ? 'secondary' : 'ghost'}
              onClick={() => onReminder(reserva)}
              disabled={isPending}
              className="justify-start"
              title={
                canSendEmailReminder
                  ? 'Enviar recordatorio por correo'
                  : 'Abrir edición para agregar email al paciente'
              }
            >
              <Bell size={17} aria-hidden="true" />
              {canSendEmailReminder
                ? 'Enviar recordatorio por correo'
                : 'Agregar email para enviar correo'}
            </Button>
          </div>
        </div>

        <div className="border-t border-slate-200 p-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onEdit(reserva)}
            className="w-full"
          >
            <Edit3 size={17} aria-hidden="true" />
            Abrir formulario completo
          </Button>
        </div>
      </aside>
    </div>
  )
}

function AgendaBlockDetailsPanel({
  block,
  isPending,
  onClose,
  onDelete,
}: {
  block: AgendaBlockListItem
  isPending: boolean
  onClose: () => void
  onDelete: (block: AgendaBlockListItem) => void
}) {
  return (
    <div className="agendix-modal-overlay fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-sm">
      <aside className="agendix-panel-slide absolute bottom-0 right-0 top-0 flex w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl shadow-slate-950/15">
        <div className="border-b border-slate-100/80 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Bloqueo de agenda
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-800">
                {blockScopeLabel(block)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {formatDateTime(block.fecha_inicio)} · {formatBlockTimeRange(block)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar bloqueo"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="red">Bloqueado</Badge>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-2.5 rounded-xl bg-slate-50/80 p-4 text-sm ring-1 ring-slate-200/60">
            <DetailRow
              label="Alcance"
              value={block.profesional_id ? 'Profesional' : 'Centro completo'}
            />
            <DetailRow label="Horario" value={formatBlockTimeRange(block)} />
            <DetailRow
              label="Profesional"
              value={block.profesional?.nombre ?? '—'}
            />
          </div>

          {block.motivo && (
            <div className="rounded-xl border border-slate-200/70 p-4">
              <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Motivo
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {block.motivo}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onDelete(block)}
            disabled={isPending}
            className="w-full justify-start text-red-600 hover:text-red-700"
          >
            <Trash2 size={17} aria-hidden="true" />
            {isPending ? 'Eliminando...' : 'Eliminar bloqueo'}
          </Button>
        </div>
      </aside>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-slate-800">
        {value}
      </span>
    </div>
  )
}
