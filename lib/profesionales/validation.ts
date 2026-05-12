import { z } from 'zod'

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
  activo: z.boolean(),
})

export type ProfesionalFormValues = z.infer<typeof profesionalSchema>
