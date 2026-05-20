-- Profile images for centers and professionals.
-- Public buckets keep images available in the patient-facing booking portal.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'center-logos',
    'center-logos',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'professional-avatars',
    'professional-avatars',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.centros
  add column if not exists logo_url text;

alter table public.miembros_centro
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists avatar_url text;

create or replace function public.storage_object_center_id(object_name text)
returns uuid
language plpgsql
stable
set search_path = public, storage
as $$
declare
  first_folder text;
begin
  first_folder := (storage.foldername(object_name))[1];

  if first_folder is null then
    return null;
  end if;

  if first_folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  return first_folder::uuid;
end;
$$;

comment on function public.storage_object_center_id(text) is
  'Extracts a valid centro_id from the first folder in a Supabase Storage object path.';

drop policy if exists "publico puede leer logos de centros" on storage.objects;
create policy "publico puede leer logos de centros"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'center-logos');

drop policy if exists "publico puede leer fotos de profesionales" on storage.objects;
create policy "publico puede leer fotos de profesionales"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'professional-avatars');

drop policy if exists "admins pueden subir logos de centros" on storage.objects;
create policy "admins pueden subir logos de centros"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'center-logos'
    and public.is_centro_admin(public.storage_object_center_id(name))
  );

drop policy if exists "admins pueden reemplazar logos de centros" on storage.objects;
create policy "admins pueden reemplazar logos de centros"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'center-logos'
    and public.is_centro_admin(public.storage_object_center_id(name))
  )
  with check (
    bucket_id = 'center-logos'
    and public.is_centro_admin(public.storage_object_center_id(name))
  );

drop policy if exists "admins pueden eliminar logos de centros" on storage.objects;
create policy "admins pueden eliminar logos de centros"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'center-logos'
    and public.is_centro_admin(public.storage_object_center_id(name))
  );

drop policy if exists "admins pueden subir fotos de profesionales" on storage.objects;
create policy "admins pueden subir fotos de profesionales"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'professional-avatars'
    and public.is_centro_admin(public.storage_object_center_id(name))
  );

drop policy if exists "admins pueden reemplazar fotos de profesionales" on storage.objects;
create policy "admins pueden reemplazar fotos de profesionales"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'professional-avatars'
    and public.is_centro_admin(public.storage_object_center_id(name))
  )
  with check (
    bucket_id = 'professional-avatars'
    and public.is_centro_admin(public.storage_object_center_id(name))
  );

drop policy if exists "admins pueden eliminar fotos de profesionales" on storage.objects;
create policy "admins pueden eliminar fotos de profesionales"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'professional-avatars'
    and public.is_centro_admin(public.storage_object_center_id(name))
  );

grant execute on function public.storage_object_center_id(text)
  to anon, authenticated;

grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;
