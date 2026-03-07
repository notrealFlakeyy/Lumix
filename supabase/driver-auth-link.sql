-- Add an explicit auth-user link to drivers and backfill existing matches.
-- Safe to run in Supabase SQL Editor for an existing project.

alter table public.drivers
add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists idx_drivers_company_auth_user_id
on public.drivers(company_id, auth_user_id)
where auth_user_id is not null;

with matched_drivers as (
  select distinct on (d.id)
    d.id as driver_id,
    cu.user_id
  from public.drivers d
  join public.company_users cu
    on cu.company_id = d.company_id
   and cu.is_active = true
   and cu.role = 'driver'
  left join public.profiles p
    on p.id = cu.user_id
  left join auth.users u
    on u.id = cu.user_id
  where d.auth_user_id is null
    and d.is_active = true
    and (
      lower(coalesce(d.email, '')) = lower(coalesce(u.email, ''))
      or lower(coalesce(d.full_name, '')) = lower(coalesce(p.full_name, ''))
    )
  order by
    d.id,
    case
      when lower(coalesce(d.email, '')) = lower(coalesce(u.email, '')) then 0
      else 1
    end,
    cu.created_at asc
)
update public.drivers d
set auth_user_id = matched_drivers.user_id
from matched_drivers
where d.id = matched_drivers.driver_id
  and d.auth_user_id is null;

create or replace function public.get_current_driver_id(target_company_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
  from public.company_users cu
  left join public.profiles p on p.id = cu.user_id
  left join auth.users u on u.id = cu.user_id
  join public.drivers d
    on d.company_id = cu.company_id
   and d.is_active = true
  where cu.company_id = target_company_id
    and cu.user_id = auth.uid()
    and cu.is_active = true
    and cu.role = 'driver'
    and (
      d.auth_user_id = cu.user_id
      or lower(coalesce(d.email, '')) = lower(coalesce(u.email, ''))
      or lower(coalesce(d.full_name, '')) = lower(coalesce(p.full_name, ''))
    )
  order by
    case
      when d.auth_user_id = cu.user_id then 0
      when lower(coalesce(d.email, '')) = lower(coalesce(u.email, '')) then 1
      else 2
    end,
    d.created_at asc
  limit 1;
$$;
