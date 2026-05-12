import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingresa tu email')
    .email('Ingresa un email válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

export const registerSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, 'Ingresa tu nombre')
      .max(120, 'El nombre es demasiado largo'),
    email: z
      .string()
      .trim()
      .min(1, 'Ingresa tu email')
      .email('Ingresa un email válido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmarPassword: z.string().min(1, 'Confirma tu contraseña'),
    nombreCentro: z
      .string()
      .trim()
      .min(2, 'Ingresa el nombre del centro')
      .max(140, 'El nombre del centro es demasiado largo'),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmarPassword'],
  })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
