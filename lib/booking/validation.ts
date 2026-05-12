import { z } from 'zod'

export const publicBookingRequestSchema = z.object({
  centro_id: z.string().min(1, 'No pudimos identificar el centro.'),
  servicio_id: z.string().min(1, 'Selecciona un servicio.'),
  profesional_id: z.string().min(1, 'Selecciona un profesional.'),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha válida.'),
  hora: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Selecciona una hora válida.'),
  nombre: z
    .string()
    .trim()
    .min(2, 'Ingresa tu nombre completo.')
    .max(160, 'El nombre es demasiado largo.'),
  documento: z
    .string()
    .trim()
    .max(30, 'El documento es demasiado largo.')
    .optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Ingresa un email válido.')
    .max(140, 'El email es demasiado largo.'),
  telefono: z
    .string()
    .trim()
    .min(8, 'Ingresa un teléfono de contacto.')
    .max(30, 'El teléfono es demasiado largo.'),
  motivo: z
    .string()
    .trim()
    .max(360, 'El comentario no puede superar 360 caracteres.')
    .optional(),
  payment_method: z.enum(['presencial', 'online'], {
    message: 'Selecciona cómo quieres pagar.',
  }),
  aceptaTerminos: z.boolean().refine(Boolean, {
    message: 'Debes aceptar el uso de tus datos para solicitar la reserva.',
  }),
})

export type PublicBookingRequestValues = z.infer<
  typeof publicBookingRequestSchema
>

export const publicBookingFormSchema = publicBookingRequestSchema.pick({
  nombre: true,
  documento: true,
  email: true,
  telefono: true,
  motivo: true,
  payment_method: true,
  aceptaTerminos: true,
})

export type PublicBookingFormValues = z.infer<typeof publicBookingFormSchema>
