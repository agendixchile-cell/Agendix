import { z } from 'zod'

export const fichaClinicaSchema = z.object({
  paciente_id: z.string().min(1, 'Selecciona un paciente'),
  antecedentes_relevantes: z
    .string()
    .trim()
    .max(2000, 'Los antecedentes no pueden superar 2000 caracteres')
    .optional(),
  motivo_consulta: z
    .string()
    .trim()
    .max(1200, 'El motivo de consulta no puede superar 1200 caracteres')
    .optional(),
  diagnostico_hipotesis: z
    .string()
    .trim()
    .max(1200, 'El diagnóstico o hipótesis no puede superar 1200 caracteres')
    .optional(),
  notas_clinicas: z
    .string()
    .trim()
    .max(2500, 'Las notas clínicas no pueden superar 2500 caracteres')
    .optional(),
})

export const evolucionSesionSchema = z.object({
  reserva_id: z.string().min(1, 'Selecciona una cita'),
  texto_evolucion: z
    .string()
    .trim()
    .min(3, 'Ingresa la evolución de la sesión')
    .max(4000, 'La evolución no puede superar 4000 caracteres'),
  proximos_pasos: z
    .string()
    .trim()
    .max(1600, 'Los próximos pasos no pueden superar 1600 caracteres')
    .optional(),
  observaciones_privadas: z
    .string()
    .trim()
    .max(2000, 'Las observaciones privadas no pueden superar 2000 caracteres')
    .optional(),
})

export type FichaClinicaFormValues = z.infer<typeof fichaClinicaSchema>
export type EvolucionSesionFormValues = z.infer<typeof evolucionSesionSchema>
