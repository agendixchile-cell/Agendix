import type { ServicioListItem } from '@/lib/servicios/types'

export const demoServicios: ServicioListItem[] = [
  {
    id: 'demo-servicio-1',
    nombre: 'Consulta medica general',
    descripcion: 'Evaluacion clinica inicial, orientacion y plan de tratamiento.',
    duracion_minutos: 30,
    precio: 25000,
    activo: true,
    created_at: '2026-01-04T12:00:00.000Z',
    updated_at: '2026-01-04T12:00:00.000Z',
  },
  {
    id: 'demo-servicio-2',
    nombre: 'Sesion kinesiologia',
    descripcion: 'Tratamiento personalizado para rehabilitacion y movilidad.',
    duracion_minutos: 45,
    precio: 32000,
    activo: true,
    created_at: '2026-01-05T12:00:00.000Z',
    updated_at: '2026-01-05T12:00:00.000Z',
  },
  {
    id: 'demo-servicio-3',
    nombre: 'Teleconsulta seguimiento',
    descripcion: 'Control remoto breve para revisar avances y ajustar indicaciones.',
    duracion_minutos: 20,
    precio: 18000,
    activo: false,
    created_at: '2026-01-06T12:00:00.000Z',
    updated_at: '2026-01-06T12:00:00.000Z',
  },
]
