-- Bloqueos de agenda son datos operativos internos.
-- El portal publico los consulta server-side con service role cuando esta disponible,
-- no necesita acceso directo anon por Data API.
revoke all on table public.bloqueos_agenda from anon;

grant select, insert, update, delete on table public.bloqueos_agenda to authenticated;
