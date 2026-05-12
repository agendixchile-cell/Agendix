-- Extiende los enums existentes para soportar email, bloqueo de proceso y omisiones.
-- Separado de la migración principal para que PostgreSQL pueda usar los nuevos valores
-- en funciones y constraints luego del commit de este archivo.

alter type public.canal_recordatorio add value if not exists 'email';
alter type public.estado_recordatorio add value if not exists 'procesando';
alter type public.estado_recordatorio add value if not exists 'omitido';
