import { z } from 'zod'
import { isSupportedManualMeetingUrl } from '@/lib/meetings'

export const reservaSchema = z
  .object({
    servicio_id: z.string().min(1, 'Selecciona un servicio'),
    profesional_id: z.string().min(1, 'Selecciona un profesional'),
    sala_id: z.string().min(1, 'Selecciona una sala'),
    paciente_id: z.string().optional(),
    paciente_nombre: z
      .string()
      .trim()
      .max(120, 'El nombre del paciente es demasiado largo')
      .optional(),
    paciente_email: z
      .string()
      .trim()
      .max(140, 'El email es demasiado largo')
      .refine(
        (value) => value === '' || z.string().email().safeParse(value).success,
        'Ingresa un email válido'
      )
      .optional(),
    paciente_telefono: z
      .string()
      .trim()
      .max(30, 'El teléfono es demasiado largo')
      .optional(),
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha válida'),
    hora: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Selecciona una hora válida'),
    estado: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']),
    estado_asistencia: z.enum(['sin_marcar', 'asistio', 'no_asistio']),
    notas: z
      .string()
      .trim()
      .max(320, 'Las notas no pueden superar 320 caracteres')
      .optional(),
    meeting_url: z
      .string()
      .trim()
      .max(300, 'El enlace de reunión es demasiado largo')
      .refine(
        (value) => value === '' || isSupportedManualMeetingUrl(value),
        'Ingresa un enlace válido de Zoom o Google Meet'
      )
      .optional(),
  })
  .superRefine((values, ctx) => {
    if (values.paciente_id) return

    if (!values.paciente_nombre || values.paciente_nombre.trim().length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['paciente_nombre'],
        message: 'Ingresa el nombre del paciente',
      })
    }
  })

export type ReservaFormValues = z.infer<typeof reservaSchema>

export const bloqueoAgendaSchema = z
  .object({
    scope: z.enum(['centro', 'profesional']),
    profesional_id: z.string().optional(),
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha válida'),
    hora_inicio: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Selecciona una hora de inicio válida'),
    hora_fin: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Selecciona una hora de término válida'),
    motivo: z
      .string()
      .trim()
      .max(240, 'El motivo no puede superar 240 caracteres')
      .optional(),
  })
  .superRefine((values, ctx) => {
    if (values.scope === 'profesional' && !values.profesional_id) {
      ctx.addIssue({
        code: 'custom',
        path: ['profesional_id'],
        message: 'Selecciona un profesional',
      })
    }

    if (values.hora_fin <= values.hora_inicio) {
      ctx.addIssue({
        code: 'custom',
        path: ['hora_fin'],
        message: 'La hora de término debe ser posterior al inicio',
      })
    }
  })

export type BloqueoAgendaFormValues = z.infer<typeof bloqueoAgendaSchema>
