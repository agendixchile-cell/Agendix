-- Ensure the public booking view exposes only read access to API roles.
-- The view is security_invoker, so underlying table RLS and column grants still
-- control which base-table fields anon can reach.

revoke all on table public.public_booking_professionals from public;
revoke all on table public.public_booking_professionals from anon;
revoke all on table public.public_booking_professionals from authenticated;

grant select on table public.public_booking_professionals to anon, authenticated;
