import { demoUser } from '@/lib/auth/demo'
import type { CentroConfig, RecordatoriosConfig } from './types'

const timestamp = new Date().toISOString()

export const demoCentro: CentroConfig = {
  id: 'demo-centro',
  nombre: demoUser.centro,
  slug: 'centro-demo-agendix',
  rut: '76.123.456-7',
  direccion: 'Av. Providencia 1234, Santiago',
  telefono: '+56 2 2400 1000',
  email: 'contacto@agendix.demo',
  logo_url: null,
  activo: true,
  created_at: timestamp,
  updated_at: timestamp,
}

export const demoRecordatoriosConfig: RecordatoriosConfig = {
  id: 'demo-recordatorios',
  centro_id: demoCentro.id,
  email_enabled: true,
  whatsapp_enabled: false,
  email_hours_before: 24,
  whatsapp_hours_before: 24,
  whatsapp_mode: 'mock',
  email_subject_template: 'Recordatorio de tu hora en {{centro_nombre}}',
  email_body_template:
    'Hola {{paciente_nombre}}, te recordamos que tienes una hora agendada en {{centro_nombre}}.\n\nServicio: {{servicio_nombre}}\nProfesional: {{profesional_nombre}}\nFecha y hora: {{fecha_hora}}\n\nConfirma tu asistencia desde el boton del correo. Si necesitas cambiar tu hora, contacta directamente al centro.',
  created_at: timestamp,
  updated_at: timestamp,
}
