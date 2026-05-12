import type { SalaListItem } from '@/lib/salas/types'

export const demoSalas: SalaListItem[] = [
  {
    id: 'demo-sala-1',
    nombre: 'Box consulta 1',
    descripcion: 'Sala luminosa para atenciones individuales y controles.',
    capacidad: 2,
    activa: true,
    created_at: '2026-01-01T12:00:00.000Z',
    updated_at: '2026-01-01T12:00:00.000Z',
  },
  {
    id: 'demo-sala-2',
    nombre: 'Sala kinesiologia',
    descripcion: 'Espacio amplio para evaluaciones y sesiones de movimiento.',
    capacidad: 4,
    activa: true,
    created_at: '2026-01-02T12:00:00.000Z',
    updated_at: '2026-01-02T12:00:00.000Z',
  },
  {
    id: 'demo-sala-3',
    nombre: 'Box telemedicina',
    descripcion: 'Sala equipada para atenciones remotas y seguimiento.',
    capacidad: 1,
    activa: false,
    created_at: '2026-01-03T12:00:00.000Z',
    updated_at: '2026-01-03T12:00:00.000Z',
  },
]
