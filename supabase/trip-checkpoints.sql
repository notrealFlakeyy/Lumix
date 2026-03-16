create table if not exists public.trip_checkpoints (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  trip_id uuid not null references public.trips(id) on delete cascade,
  checkpoint_type text not null check (checkpoint_type in ('arrived_pickup','departed_pickup','arrived_delivery','delivered')),
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  accuracy_meters numeric(8,2),
  notes text,
  captured_at timestamptz not null default now(),
  captured_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_trip_checkpoints_company_id on public.trip_checkpoints(company_id);
create index if not exists idx_trip_checkpoints_trip_id on public.trip_checkpoints(trip_id);
create index if not exists idx_trip_checkpoints_branch_id on public.trip_checkpoints(branch_id);
create index if not exists idx_trip_checkpoints_captured_at on public.trip_checkpoints(captured_at desc);

alter table public.trip_checkpoints enable row level security;

drop policy if exists trip_checkpoints_select on public.trip_checkpoints;
create policy trip_checkpoints_select
on public.trip_checkpoints
for select
using (public.can_access_trip(trip_id));

drop policy if exists trip_checkpoints_driver_insert on public.trip_checkpoints;
create policy trip_checkpoints_driver_insert
on public.trip_checkpoints
for insert
with check (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_trip(trip_id)
);

drop policy if exists trip_checkpoints_operations_manage on public.trip_checkpoints;
create policy trip_checkpoints_operations_manage
on public.trip_checkpoints
for all
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
)
with check (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
);
