import { z } from 'zod'
import { timeToMinutes } from './horarios'

export const centroSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Ingresa el nombre del centro')
    .max(140, 'El nombre del centro es demasiado largo'),
  rut: z.string().trim().max(20, 'El RUT es demasiado largo').optional(),
  direccion: z
    .string()
    .trim()
    .max(180, 'La dirección es demasiado larga')
    .optional(),
  telefono: z
    .string()
    .trim()
    .max(30, 'El teléfono es demasiado largo')
    .optional(),
  email: z
    .string()
    .trim()
    .max(140, 'El email es demasiado largo')
    .refine(
      (value) => value === '' || z.string().email().safeParse(value).success,
      'Ingresa un email válido'
    )
    .optional(),
})

export const horarioCentroSchema = z
  .object({
    dia: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(7),
    ]),
    activo: z.boolean(),
    inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
    fin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  })
  .superRefine((value, ctx) => {
    if (!value.activo) return

    if (timeToMinutes(value.fin) <= timeToMinutes(value.inicio)) {
      ctx.addIssue({
        code: 'custom',
        path: ['fin'],
        message: 'La hora de cierre debe ser posterior a la apertura',
      })
    }
  })

export const horariosCentroSchema = z.object({
  horarios: z.array(horarioCentroSchema).length(7, 'Configura los 7 días'),
})

export const recordatoriosCentroSchema = z.object({
  email_enabled: z.boolean(),
  whatsapp_enabled: z.boolean(),
})

export type CentroFormValues = z.infer<typeof centroSchema>
export type HorariosCentroFormValues = z.infer<typeof horariosCentroSchema>
export type RecordatoriosCentroFormValues = z.infer<typeof recordatoriosCentroSchema>
