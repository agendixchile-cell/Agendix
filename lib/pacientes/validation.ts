import { z } from 'zod'

export const pacienteSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Ingresa el nombre del paciente')
    .max(100, 'El nombre es demasiado largo'),
  apellido: z
    .string()
    .trim()
    .max(100, 'El apellido es demasiado largo')
    .optional(),
  rut: z.string().trim().max(20, 'El RUT es demasiado largo').optional(),
  email: z
    .string()
    .trim()
    .max(140, 'El email es demasiado largo')
    .refine(
      (value) => value === '' || z.string().email().safeParse(value).success,
      'Ingresa un email válido'
    )
    .optional(),
  telefono: z
    .string()
    .trim()
    .max(30, 'El teléfono es demasiado largo')
    .optional(),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha válida')
    .optional()
    .or(z.literal('')),
  notas: z
    .string()
    .trim()
    .max(500, 'Las notas no pueden superar 500 caracteres')
    .optional(),
  activo: z.boolean().default(true),
})

export type PacienteFormInput = z.input<typeof pacienteSchema>
export type PacienteFormValues = z.output<typeof pacienteSchema>
