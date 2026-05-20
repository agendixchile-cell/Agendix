import { z } from 'zod'

const optionalTemplate = (field: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${field} es demasiado largo`)
    .refine((value) => value === '' || value.length >= min, {
      message: `${field} es demasiado corto`,
    })
    .optional()

export const profesionalSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Ingresa el nombre del profesional')
    .max(100, 'El nombre es demasiado largo'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Ingresa un email válido')
    .max(140, 'El email es demasiado largo'),
  telefono: z
    .string()
    .trim()
    .max(30, 'El teléfono es demasiado largo')
    .optional(),
  especialidad: z
    .string()
    .trim()
    .max(90, 'La especialidad es demasiado larga')
    .optional(),
  recordatorio_email_subject: optionalTemplate('El asunto personalizado', 5, 160),
  recordatorio_email_body: optionalTemplate('El mensaje personalizado', 20, 1600),
  descanso_entre_reservas_minutos: z
    .number({ error: 'Ingresa un descanso válido' })
    .int('El descanso debe ser un número entero')
    .min(0, 'El descanso no puede ser negativo')
    .max(240, 'El descanso máximo es 240 minutos'),
  duracion_sesion_minutos: z
    .number({ error: 'Ingresa una duración válida' })
    .int('La duración debe ser un número entero')
    .min(5, 'La duración mínima es 5 minutos')
    .max(240, 'La duración máxima es 240 minutos')
    .refine((value) => value % 5 === 0, {
      message: 'Usa múltiplos de 5 minutos',
    }),
  intervalo_reservas_minutos: z
    .number({ error: 'Ingresa una frecuencia válida' })
    .int('La frecuencia debe ser un número entero')
    .min(5, 'La frecuencia mínima es 5 minutos')
    .max(240, 'La frecuencia máxima es 240 minutos')
    .refine((value) => value % 5 === 0, {
      message: 'Usa múltiplos de 5 minutos',
    }),
  activo: z.boolean(),
}).superRefine((values, ctx) => {
  if (values.intervalo_reservas_minutos < values.duracion_sesion_minutos) {
    ctx.addIssue({
      code: 'custom',
      path: ['intervalo_reservas_minutos'],
      message: 'La frecuencia no puede ser menor que la duración',
    })
  }
})

export type ProfesionalFormValues = z.infer<typeof profesionalSchema>
