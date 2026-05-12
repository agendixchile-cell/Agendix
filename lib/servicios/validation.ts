import { z } from 'zod'

export const servicioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Ingresa el nombre del servicio')
    .max(90, 'El nombre es demasiado largo'),
  descripcion: z
    .string()
    .trim()
    .max(260, 'La descripción no puede superar 260 caracteres')
    .optional(),
  duracion_minutos: z
    .number({ error: 'Ingresa una duración válida' })
    .int('La duración debe ser un número entero')
    .min(5, 'La duración mínima es 5 minutos')
    .max(480, 'La duración máxima es 480 minutos'),
  precio: z
    .number({ error: 'Ingresa un precio válido' })
    .int('El precio debe ser un número entero')
    .min(0, 'El precio no puede ser negativo')
    .max(99999999, 'El precio es demasiado alto')
    .nullable(),
  activo: z.boolean(),
})

export type ServicioFormValues = z.infer<typeof servicioSchema>
