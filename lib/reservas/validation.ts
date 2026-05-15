import { z } from 'zod'

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
    estado: z.enum([
      'pendiente',
      'en_espera',
      'confirmada',
      'cancelada',
      'completada',
      'reagendada',
    ]),
    estado_asistencia: z.enum(['sin_marcar', 'asistio', 'no_asistio']),
    notas: z
      .string()
      .trim()
      .max(320, 'Las notas no pueden superar 320 caracteres')
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
