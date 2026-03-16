create table if not exists public.vehicle_maintenance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  type text not null,
  description text,
  performed_at date not null default current_date,
  km_at_service integer,
  next_service_km integer,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_maintenance_company_id_idx on public.vehicle_maintenance(company_id);
create index if not exists vehicle_maintenance_vehicle_id_idx on public.vehicle_maintenance(vehicle_id);

alter table public.vehicle_maintenance enable row level security;

create policy "company members can read own vehicle maintenance"
  on public.vehicle_maintenance for select
  using (
    exists (
      select 1 from public.company_users
      where company_users.company_id = vehicle_maintenance.company_id
        and company_users.user_id = auth.uid()
        and company_users.is_active = true
    )
  );

create policy "company members can insert own vehicle maintenance"
  on public.vehicle_maintenance for insert
  with check (
    exists (
      select 1 from public.company_users
      where company_users.company_id = vehicle_maintenance.company_id
        and company_users.user_id = auth.uid()
        and company_users.is_active = true
    )
  );

create policy "company members can update own vehicle maintenance"
  on public.vehicle_maintenance for update
  using (
    exists (
      select 1 from public.company_users
      where company_users.company_id = vehicle_maintenance.company_id
        and company_users.user_id = auth.uid()
        and company_users.is_active = true
    )
  );

create policy "company members can delete own vehicle maintenance"
  on public.vehicle_maintenance for delete
  using (
    exists (
      select 1 from public.company_users
      where company_users.company_id = vehicle_maintenance.company_id
        and company_users.user_id = auth.uid()
        and company_users.is_active = true
    )
  );
