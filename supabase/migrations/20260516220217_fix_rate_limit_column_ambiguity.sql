-- Corrige referencias ambiguas entre columnas de rate_limit_buckets y columnas
-- de retorno de la funcion check_rate_limit.

create or replace function public.check_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer,
  p_now timestamptz default now()
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
  v_reset_at timestamptz;
begin
  if p_key_hash is null or length(trim(p_key_hash)) = 0 then
    raise exception 'rate limit key is required';
  end if;

  if p_limit < 1 then
    raise exception 'rate limit must be positive';
  end if;

  if p_window_seconds < 1 then
    raise exception 'rate limit window must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('rate-limit:' || p_key_hash, 0));

  delete from public.rate_limit_buckets as rlb
  where rlb.reset_at < p_now - interval '1 day';

  select rlb.bucket_count, rlb.reset_at
    into v_count, v_reset_at
  from public.rate_limit_buckets as rlb
  where rlb.key_hash = p_key_hash
  for update;

  if v_count is null or v_reset_at <= p_now then
    v_count := 1;
    v_reset_at := p_now + (p_window_seconds * interval '1 second');

    insert into public.rate_limit_buckets (
      key_hash,
      bucket_count,
      reset_at,
      created_at,
      updated_at
    )
    values (
      p_key_hash,
      v_count,
      v_reset_at,
      p_now,
      p_now
    )
    on conflict (key_hash) do update
    set
      bucket_count = excluded.bucket_count,
      reset_at = excluded.reset_at,
      updated_at = excluded.updated_at;

    return query select
      true,
      greatest(0, p_limit - v_count),
      v_reset_at,
      0;
    return;
  end if;

  if v_count >= p_limit then
    return query select
      false,
      0,
      v_reset_at,
      greatest(1, ceil(extract(epoch from (v_reset_at - p_now)))::integer);
    return;
  end if;

  v_count := v_count + 1;

  update public.rate_limit_buckets as rlb
  set
    bucket_count = v_count,
    updated_at = p_now
  where rlb.key_hash = p_key_hash;

  return query select
    true,
    greatest(0, p_limit - v_count),
    v_reset_at,
    0;
end;
$$;

comment on function public.check_rate_limit(text, integer, integer, timestamptz) is
  'Atomic fixed-window rate limit backed by Postgres. The key must be a server-side hash.';

revoke execute on function public.check_rate_limit(
  text,
  integer,
  integer,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.check_rate_limit(
  text,
  integer,
  integer,
  timestamptz
) to service_role;
