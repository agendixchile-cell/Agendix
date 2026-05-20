export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RolCentro = 'owner' | 'admin' | 'profesional' | 'recepcion'
export type EstadoReserva =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
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
          owner_user_id: string | null
          plan_id: string
          subscription_status: string
          extra_professionals_count: number
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
          owner_user_id?: string | null
          plan_id?: string
          subscription_status?: string
          extra_professionals_count?: number
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
          owner_user_id?: string | null
          plan_id?: string
          subscription_status?: string
          extra_professionals_count?: number
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
          descanso_entre_reservas_minutos: number
          duracion_sesion_minutos: number
          intervalo_reservas_minutos: number
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
          descanso_entre_reservas_minutos?: number
          duracion_sesion_minutos?: number
          intervalo_reservas_minutos?: number
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
          descanso_entre_reservas_minutos?: number
          duracion_sesion_minutos?: number
          intervalo_reservas_minutos?: number
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
          activo: boolean
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
          activo?: boolean
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
          activo?: boolean
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
          meeting_provider: string | null
          meeting_url: string | null
          auto_generated_meeting: boolean
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
          meeting_provider?: string | null
          meeting_url?: string | null
          auto_generated_meeting?: boolean
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
          meeting_provider?: string | null
          meeting_url?: string | null
          auto_generated_meeting?: boolean
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
      rate_limit_buckets: {
        Row: {
          key_hash: string
          bucket_count: number
          reset_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          key_hash: string
          bucket_count?: number
          reset_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          key_hash?: string
          bucket_count?: number
          reset_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bloqueos_agenda: {
        Row: {
          id: string
          centro_id: string
          profesional_id: string | null
          fecha_inicio: string
          fecha_fin: string
          motivo: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          centro_id: string
          profesional_id?: string | null
          fecha_inicio: string
          fecha_fin: string
          motivo?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          centro_id?: string
          profesional_id?: string | null
          fecha_inicio?: string
          fecha_fin?: string
          motivo?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bloqueos_agenda_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bloqueos_agenda_profesional_id_fkey'
            columns: ['profesional_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bloqueos_agenda_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
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
          email_subject_template: string
          email_body_template: string
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
          email_subject_template?: string
          email_body_template?: string
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
          email_subject_template?: string
          email_body_template?: string
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
      configuracion_recordatorios_profesional: {
        Row: {
          id: string
          centro_id: string
          profesional_id: string
          email_subject_template: string | null
          email_body_template: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          centro_id: string
          profesional_id: string
          email_subject_template?: string | null
          email_body_template?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          centro_id?: string
          profesional_id?: string
          email_subject_template?: string | null
          email_body_template?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'configuracion_recordatorios_profesional_miembro_fkey'
            columns: ['centro_id', 'profesional_id']
            isOneToOne: false
            referencedRelation: 'miembros_centro'
            referencedColumns: ['centro_id', 'profile_id']
          },
        ]
      }
      reserva_confirmaciones: {
        Row: {
          id: string
          reserva_id: string
          centro_id: string
          paciente_id: string
          token: string
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reserva_id: string
          centro_id: string
          paciente_id: string
          token?: string
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reserva_id?: string
          centro_id?: string
          paciente_id?: string
          token?: string
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reserva_confirmaciones_reserva_id_fkey'
            columns: ['reserva_id']
            isOneToOne: true
            referencedRelation: 'reservas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reserva_confirmaciones_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reserva_confirmaciones_paciente_id_fkey'
            columns: ['paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
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
      subscriptions: {
        Row: {
          id: string
          organization_id: string
          plan_id: string
          status: string
          billing_provider: string | null
          billing_customer_id: string | null
          billing_subscription_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          billing_provider?: string | null
          billing_customer_id?: string | null
          billing_subscription_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          billing_provider?: string | null
          billing_customer_id?: string | null
          billing_subscription_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_organization_id_fkey'
            columns: ['organization_id']
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
          email_subject_template: string
          email_body_template: string
          confirmacion_token: string | null
        }>
      }
      check_rate_limit: {
        Args: {
          p_key_hash: string
          p_limit: number
          p_window_seconds: number
          p_now?: string
        }
        Returns: Array<{
          allowed: boolean
          remaining: number
          reset_at: string
          retry_after_seconds: number
        }>
      }
      reschedule_email_reminders_for_centro: {
        Args: {
          target_centro_id: string
        }
        Returns: number
      }
      is_centro_owner: {
        Args: {
          target_centro_id: string
        }
        Returns: boolean
      }
      plan_professional_limit: {
        Args: {
          target_plan_id: string
          extras?: number
        }
        Returns: number | null
      }
      plan_active_patient_limit: {
        Args: {
          target_plan_id: string
        }
        Returns: number | null
      }
      create_reserva_atomic: {
        Args: {
          p_centro_id: string
          p_profesional_id: string
          p_paciente_id: string
          p_servicio_id: string
          p_fecha_inicio: string
          p_sala_id?: string | null
          p_estado?: EstadoReserva
          p_notas?: string | null
          p_origen?: string
          p_modalidad?: string
          p_payment_status?: string
          p_amount?: number | null
          p_currency?: string
        }
        Returns: Array<{
          ok: boolean
          code: string
          message: string
          reserva_id: string | null
          sala_id: string | null
          fecha_inicio: string
          fecha_fin: string | null
        }>
      }
      update_reserva_atomic: {
        Args: {
          p_reserva_id: string
          p_centro_id: string
          p_profesional_id: string
          p_paciente_id: string
          p_servicio_id: string
          p_fecha_inicio: string
          p_sala_id: string
          p_estado?: EstadoReserva
          p_estado_asistencia?: EstadoAsistencia
          p_notas?: string | null
        }
        Returns: Array<{
          ok: boolean
          code: string
          message: string
          reserva_id: string | null
          sala_id: string | null
          fecha_inicio: string
          fecha_fin: string | null
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
