import { z } from 'zod'

export const salaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Ingresa el nombre de la sala')
    .max(90, 'El nombre es demasiado largo'),
  descripcion: z
    .string()
    .trim()
    .max(240, 'La descripción no puede superar 240 caracteres')
    .optional(),
  capacidad: z
    .number({ error: 'Ingresa una capacidad válida' })
    .int('La capacidad debe ser un número entero')
    .min(1, 'La capacidad mínima es 1')
    .max(500, 'La capacidad máxima es 500')
    .nullable(),
  activa: z.boolean(),
})

export type SalaFormValues = z.infer<typeof salaSchema>
