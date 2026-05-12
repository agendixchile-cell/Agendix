import type { PacienteListItem } from './types'

const timestamp = new Date().toISOString()

export const demoPacientes: PacienteListItem[] = [
  {
    id: 'demo-paciente-1',
    nombre: 'Antonia',
    apellido: 'Fuentes',
    rut: '18.245.991-4',
    email: 'antonia.fuentes@demo.cl',
    telefono: '+56 9 5000 1001',
    fecha_nacimiento: '1992-08-14',
    notas: 'Prefiere sesiones en la manana.',
    created_at: timestamp,
    updated_at: timestamp,
  },
  {
    id: 'demo-paciente-2',
    nombre: 'Rodrigo',
    apellido: 'Mella',
    rut: '16.482.302-9',
    email: 'rodrigo.mella@demo.cl',
    telefono: '+56 9 5000 1002',
    fecha_nacimiento: '1988-03-02',
    notas: null,
    created_at: timestamp,
    updated_at: timestamp,
  },
  {
    id: 'demo-paciente-3',
    nombre: 'Javiera',
    apellido: 'Pino',
    rut: null,
    email: null,
    telefono: '+56 9 5000 1003',
    fecha_nacimiento: null,
    notas: 'Contacto principal por telefono.',
    created_at: timestamp,
    updated_at: timestamp,
  },
]
