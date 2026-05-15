export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RolCentro = 'admin' | 'profesional' | 'recepcion'
export type EstadoReserva =
  | 'pendiente'
  | 'en_espera'
  | 'confirmada'
  | 'cancelada'
  | 'completada'
  | 'reagendada'
export type EstadoAsistencia = 'sin_marcar' | 'asistio' | 'no_asistio'
export type EstadoPago = 'pendiente' | 'pagado' | 'reembolsado'
export type CanalRecordatorio = 'email' | 'whatsapp'
export type TipoRecordatorio = 'recordatorio_48h' | 'recordatorio_24h'
export type EstadoRecordatorio =
  | 'pendiente'
  | 'procesando'
  | 'enviado'
  | 'fallido'
  | 'omitido'

export interface Database {
  public: {
    Tables: {
      centros: {
        Row: {
          id: string
          nombre: string
          slug: string
          descripcion: string | null
          rut: string | null
          direccion: string | null
          telefono: string | null
          email: string | null
          logo_url: string | null
          public_booking_enabled: boolean
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          slug: string
          descripcion?: string | null
          rut?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          logo_url?: string | null
          public_booking_enabled?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          slug?: string
          descripcion?: string | null
          rut?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          logo_url?: string | null
          public_booking_enabled?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          nombre: string
          apellido: string | null
          telefono: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nombre: string
          apellido?: string | null
          telefono?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nombre?: string
          apellido?: string | null
          telefono?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      miembros_centro: {
        Row: {
          id: string
          centro_id: string
          profile_id: string
          rol: RolCentro
          especialidad: string | null
          bio: string | null
          avatar_url: string | null
          public_visible: boolean
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          centro_id: string
          profile_id: string
          rol: RolCentro
          especialidad?: string | null
          bio?: string | null
          avatar_url?: string | null
          public_visible?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          centro_id?: string
          profile_id?: string
          rol?: RolCentro
          especialidad?: string | null
          bio?: string | null
          avatar_url?: string | null
          public_visible?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'miembros_centro_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'miembros_centro_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      salas: {
        Row: {
          id: string
          centro_id: string
          nombre: string
          descripcion: string | null
          capacidad: number | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          centro_id: string
          nombre: string
          descripcion?: string | null
          capacidad?: number | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          centro_id?: string
          nombre?: string
          descripcion?: string | null
          capacidad?: number | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'salas_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
        ]
      }
      servicios: {
        Row: {
          id: string
          centro_id: string
          nombre: string
          descripcion: string | null
          duracion_minutos: number
          precio: number | null
          moneda: string
          modalidad: string
          public_visible: boolean
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          centro_id: string
          nombre: string
          descripcion?: string | null
          duracion_minutos: number
          precio?: number | null
          moneda?: string
          modalidad?: string
          public_visible?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          centro_id?: string
          nombre?: string
          descripcion?: string | null
          duracion_minutos?: number
          precio?: number | null
          moneda?: string
          modalidad?: string
          public_visible?: boolean
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'servicios_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
        ]
      }
      pacientes: {
        Row: {
          id: string
          centro_id: string
          nombre: string
          apellido: string | null
          rut: string | null
          email: string | null
          telefono: string | null
          fecha_nacimiento: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          centro_id: string
          nombre: string
          apellido?: string | null
          rut?: string | null
          email?: string | null
          telefono?: string | null
          fecha_nacimiento?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          centro_id?: string
          nombre?: string
          apellido?: string | null
          rut?: string | null
          email?: string | null
          telefono?: string | null
          fecha_nacimiento?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pacientes_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
        ]
      }
      reservas: {
        Row: {
          id: string
          centro_id: string
          sala_id: string
          profesional_id: string
          paciente_id: string
          servicio_id: string
          fecha_inicio: string
          fecha_fin: string
          estado: EstadoReserva
          estado_asistencia: EstadoAsistencia
          notas: string | null
          origen: string
          modalidad: string
          payment_status: string
          payment_provider: string | null
          payment_reference: string | null
          amount: number | null
          currency: string
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          centro_id: string
          sala_id: string
          profesional_id: string
          paciente_id: string
          servicio_id: string
          fecha_inicio: string
          fecha_fin: string
          estado?: EstadoReserva
          estado_asistencia?: EstadoAsistencia
          notas?: string | null
          origen?: string
          modalidad?: string
          payment_status?: string
          payment_provider?: string | null
          payment_reference?: string | null
          amount?: number | null
          currency?: string
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          centro_id?: string
          sala_id?: string
          profesional_id?: string
          paciente_id?: string
          servicio_id?: string
          fecha_inicio?: string
          fecha_fin?: string
          estado?: EstadoReserva
          estado_asistencia?: EstadoAsistencia
          notas?: string | null
          origen?: string
          modalidad?: string
          payment_status?: string
          payment_provider?: string | null
          payment_reference?: string | null
          amount?: number | null
          currency?: string
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reservas_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservas_sala_id_fkey'
            columns: ['sala_id']
            isOneToOne: false
            referencedRelation: 'salas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservas_profesional_id_fkey'
            columns: ['profesional_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservas_paciente_id_fkey'
            columns: ['paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservas_servicio_id_fkey'
            columns: ['servicio_id']
            isOneToOne: false
            referencedRelation: 'servicios'
            referencedColumns: ['id']
          },
        ]
      }
      fichas_clinicas: {
        Row: {
          id: string
          centro_id: string
          paciente_id: string
          antecedentes_relevantes: string | null
          motivo_consulta: string | null
          diagnostico_hipotesis: string | null
          notas_clinicas: string | null
          documentos: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          centro_id: string
          paciente_id: string
          antecedentes_relevantes?: string | null
          motivo_consulta?: string | null
          diagnostico_hipotesis?: string | null
          notas_clinicas?: string | null
          documentos?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          centro_id?: string
          paciente_id?: string
          antecedentes_relevantes?: string | null
          motivo_consulta?: string | null
          diagnostico_hipotesis?: string | null
          notas_clinicas?: string | null
          documentos?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fichas_clinicas_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fichas_clinicas_paciente_id_fkey'
            columns: ['paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['id']
          },
        ]
      }
      evoluciones_sesion: {
        Row: {
          id: string
          paciente_id: string
          reserva_id: string
          profesional_id: string
          centro_id: string
          fecha: string
          texto_evolucion: string
          proximos_pasos: string | null
          observaciones_privadas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          paciente_id: string
          reserva_id: string
          profesional_id: string
          centro_id: string
          fecha: string
          texto_evolucion: string
          proximos_pasos?: string | null
          observaciones_privadas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          paciente_id?: string
          reserva_id?: string
          profesional_id?: string
          centro_id?: string
          fecha?: string
          texto_evolucion?: string
          proximos_pasos?: string | null
          observaciones_privadas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'evoluciones_sesion_paciente_id_fkey'
            columns: ['paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evoluciones_sesion_reserva_id_fkey'
            columns: ['reserva_id']
            isOneToOne: true
            referencedRelation: 'reservas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evoluciones_sesion_profesional_id_fkey'
            columns: ['profesional_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evoluciones_sesion_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
        ]
      }
      recordatorios_reserva: {
        Row: {
          id: string
          centro_id: string
          reserva_id: string
          paciente_id: string
          canal: CanalRecordatorio
          tipo: TipoRecordatorio
          estado: EstadoRecordatorio
          scheduled_for: string
          sent_at: string | null
          error_message: string | null
          provider: string | null
          provider_message_id: string | null
          attempt_count: number
          processing_started_at: string | null
          last_attempt_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          centro_id: string
          reserva_id: string
          paciente_id: string
          canal?: CanalRecordatorio
          tipo: TipoRecordatorio
          estado?: EstadoRecordatorio
          scheduled_for: string
          sent_at?: string | null
          error_message?: string | null
          provider?: string | null
          provider_message_id?: string | null
          attempt_count?: number
          processing_started_at?: string | null
          last_attempt_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          centro_id?: string
          reserva_id?: string
          paciente_id?: string
          canal?: CanalRecordatorio
          tipo?: TipoRecordatorio
          estado?: EstadoRecordatorio
          scheduled_for?: string
          sent_at?: string | null
          error_message?: string | null
          provider?: string | null
          provider_message_id?: string | null
          attempt_count?: number
          processing_started_at?: string | null
          last_attempt_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recordatorios_reserva_reserva_id_fkey'
            columns: ['reserva_id']
            isOneToOne: false
            referencedRelation: 'reservas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recordatorios_reserva_paciente_id_fkey'
            columns: ['paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['id']
          },
        ]
      }
      configuracion_recordatorios: {
        Row: {
          id: string
          centro_id: string
          email_enabled: boolean
          whatsapp_enabled: boolean
          email_hours_before: number
          whatsapp_hours_before: number
          whatsapp_mode: 'mock' | 'live'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          centro_id: string
          email_enabled?: boolean
          whatsapp_enabled?: boolean
          email_hours_before?: number
          whatsapp_hours_before?: number
          whatsapp_mode?: 'mock' | 'live'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          centro_id?: string
          email_enabled?: boolean
          whatsapp_enabled?: boolean
          email_hours_before?: number
          whatsapp_hours_before?: number
          whatsapp_mode?: 'mock' | 'live'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'configuracion_recordatorios_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
        ]
      }
      recordatorio_envios: {
        Row: {
          id: string
          recordatorio_id: string
          reserva_id: string
          centro_id: string
          canal: CanalRecordatorio
          tipo: TipoRecordatorio
          estado: EstadoRecordatorio
          provider: string
          provider_message_id: string | null
          recipient: string | null
          metadata: Json
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recordatorio_id: string
          reserva_id: string
          centro_id: string
          canal: CanalRecordatorio
          tipo: TipoRecordatorio
          estado: EstadoRecordatorio
          provider: string
          provider_message_id?: string | null
          recipient?: string | null
          metadata?: Json
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          recordatorio_id?: string
          reserva_id?: string
          centro_id?: string
          canal?: CanalRecordatorio
          tipo?: TipoRecordatorio
          estado?: EstadoRecordatorio
          provider?: string
          provider_message_id?: string | null
          recipient?: string | null
          metadata?: Json
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recordatorio_envios_recordatorio_id_fkey'
            columns: ['recordatorio_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_reserva'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recordatorio_envios_reserva_id_fkey'
            columns: ['reserva_id']
            isOneToOne: false
            referencedRelation: 'reservas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recordatorio_envios_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
        ]
      }
      pagos: {
        Row: {
          id: string
          reserva_id: string
          monto: number
          estado: EstadoPago
          metodo_pago: string | null
          referencia: string | null
          provider: string | null
          currency: string
          payment_reference: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reserva_id: string
          monto: number
          estado?: EstadoPago
          metodo_pago?: string | null
          referencia?: string | null
          provider?: string | null
          currency?: string
          payment_reference?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reserva_id?: string
          monto?: number
          estado?: EstadoPago
          metodo_pago?: string | null
          referencia?: string | null
          provider?: string | null
          currency?: string
          payment_reference?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pagos_reserva_id_fkey'
            columns: ['reserva_id']
            isOneToOne: false
            referencedRelation: 'reservas'
            referencedColumns: ['id']
          },
        ]
      }
      horarios_centro: {
        Row: {
          id: string
          centro_id: string
          dia: number
          activo: boolean
          inicio: string
          fin: string
          descanso_activo: boolean
          descanso_inicio: string
          descanso_fin: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          centro_id: string
          dia: number
          activo?: boolean
          inicio?: string
          fin?: string
          descanso_activo?: boolean
          descanso_inicio?: string
          descanso_fin?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          centro_id?: string
          dia?: number
          activo?: boolean
          inicio?: string
          fin?: string
          descanso_activo?: boolean
          descanso_inicio?: string
          descanso_fin?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'horarios_centro_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      claim_due_reservation_reminders: {
        Args: {
          batch_size?: number
        }
        Returns: Array<{
          recordatorio_id: string
          reserva_id: string
          centro_id: string
          paciente_id: string
          canal: CanalRecordatorio
          tipo: TipoRecordatorio
          scheduled_for: string
          fecha_inicio: string
          fecha_fin: string
          paciente_nombre: string
          paciente_apellido: string | null
          paciente_email: string | null
          paciente_telefono: string | null
          centro_nombre: string
          centro_email: string | null
          centro_telefono: string | null
          servicio_nombre: string
          profesional_nombre: string
        }>
      }
    }
    Enums: {
      rol_centro: RolCentro
      estado_reserva: EstadoReserva
      estado_asistencia: EstadoAsistencia
      estado_pago: EstadoPago
      canal_recordatorio: CanalRecordatorio
      tipo_recordatorio: TipoRecordatorio
      estado_recordatorio: EstadoRecordatorio
    }
  }
}
