-- Lumix Transport ERP MVP schema
-- Paste this file into the Supabase SQL editor to create the transport ERP foundation.
-- Includes:
-- - company-based multi-tenancy
-- - core transport ERP tables
-- - updated_at trigger function
-- - starter RLS policy foundation
-- - notes for production hardening

create extension if not exists "pgcrypto";

create or replace function public.generate_public_id(target_length integer default 10)
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  output text := '';
  index_value integer;
begin
  if target_length is null or target_length < 8 then
    target_length := 8;
  end if;

  while length(output) < target_length loop
    index_value := floor(random() * length(chars) + 1)::integer;
    output := output || substr(chars, index_value, 1);
  end loop;

  return output;
end;
$$;

create or replace function public.assign_public_id()
returns trigger
language plpgsql
as $$
declare
  candidate text;
  exists_match boolean;
  attempt_count integer := 0;
  target_length integer := greatest(coalesce(nullif(TG_ARGV[0], '')::integer, 10), 8);
begin
  if new.public_id is not null and btrim(new.public_id) <> '' then
    return new;
  end if;

  loop
    attempt_count := attempt_count + 1;

    if attempt_count > 25 then
      raise exception 'Unable to generate unique public_id for %.%', TG_TABLE_SCHEMA, TG_TABLE_NAME;
    end if;

    candidate := public.generate_public_id(target_length);

    execute format(
      'select exists (select 1 from %I.%I where public_id = $1)',
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME
    )
      into exists_match
      using candidate;

    if not exists_match then
      new.public_id := candidate;
      return new;
    end if;
  end loop;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_id text,
  vat_number text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text not null default 'FI',
  timezone text not null default 'Europe/Helsinki',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','dispatcher','accountant','driver','viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  business_id text,
  vat_number text,
  email text,
  phone text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_postal_code text,
  billing_city text,
  billing_country text not null default 'FI',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_company_id on public.customers(company_id);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  registration_number text not null,
  make text,
  model text,
  year integer,
  fuel_type text,
  current_km numeric(12,2) not null default 0,
  next_service_km numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vehicles_company_id on public.vehicles(company_id);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  public_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  license_type text,
  employment_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_drivers_company_id on public.drivers(company_id);
create unique index if not exists idx_drivers_public_id on public.drivers(public_id);
create unique index if not exists idx_drivers_company_auth_user_id on public.drivers(company_id, auth_user_id) where auth_user_id is not null;

create table if not exists public.transport_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  assigned_vehicle_id uuid references public.vehicles(id) on delete set null,
  assigned_driver_id uuid references public.drivers(id) on delete set null,
  order_number text not null,
  pickup_location text not null,
  delivery_location text not null,
  cargo_description text,
  scheduled_at timestamptz,
  status text not null check (status in ('draft','planned','assigned','in_progress','completed','invoiced','cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, order_number)
);

create index if not exists idx_transport_orders_company_id on public.transport_orders(company_id);
create index if not exists idx_transport_orders_customer_id on public.transport_orders(customer_id);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  public_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  transport_order_id uuid references public.transport_orders(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  start_time timestamptz,
  end_time timestamptz,
  start_km numeric(12,2),
  end_km numeric(12,2),
  distance_km numeric(12,2),
  waiting_time_minutes integer not null default 0,
  notes text,
  delivery_confirmation text,
  status text not null check (status in ('planned','started','completed','invoiced')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trips_company_id on public.trips(company_id);
create index if not exists idx_trips_transport_order_id on public.trips(transport_order_id);
create unique index if not exists idx_trips_public_id on public.trips(public_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  trip_id uuid references public.trips(id) on delete set null,
  invoice_number text not null,
  issue_date date not null,
  due_date date not null,
  reference_number text,
  status text not null check (status in ('draft','sent','paid','partially_paid','overdue','cancelled')),
  subtotal numeric(12,2) not null default 0,
  vat_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  pdf_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, invoice_number)
);

create index if not exists idx_invoices_company_id on public.invoices(company_id);
create index if not exists idx_invoices_customer_id on public.invoices(customer_id);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  vat_rate numeric(5,2) not null default 25.50,
  line_total numeric(12,2) not null
);

create index if not exists idx_invoice_items_invoice_id on public.invoice_items(invoice_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_date date not null,
  amount numeric(12,2) not null,
  payment_method text,
  reference text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_company_id on public.payments(company_id);
create index if not exists idx_payments_invoice_id on public.payments(invoice_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  related_type text,
  related_id uuid,
  file_name text not null,
  file_path text not null,
  mime_type text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_company_id on public.documents(company_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_company_id on public.audit_logs(company_id);

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists set_drivers_updated_at on public.drivers;
create trigger set_drivers_updated_at
before update on public.drivers
for each row execute function public.set_updated_at();

drop trigger if exists set_drivers_public_id on public.drivers;
create trigger set_drivers_public_id
before insert on public.drivers
for each row execute function public.assign_public_id('10');

drop trigger if exists set_transport_orders_updated_at on public.transport_orders;
create trigger set_transport_orders_updated_at
before update on public.transport_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_trips_updated_at on public.trips;
create trigger set_trips_updated_at
before update on public.trips
for each row execute function public.set_updated_at();

drop trigger if exists set_trips_public_id on public.trips;
create trigger set_trips_public_id
before insert on public.trips
for each row execute function public.assign_public_id('10');

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_users cu
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
  );
$$;

create or replace function public.has_company_role(target_company_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_users cu
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role = any(allowed_roles)
  );
$$;

create or replace function public.can_access_invoice(target_invoice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invoices i
    where i.id = target_invoice_id
      and public.is_company_member(i.company_id)
  );
$$;

revoke all on function public.is_company_member(uuid) from public;
revoke all on function public.has_company_role(uuid, text[]) from public;
revoke all on function public.can_access_invoice(uuid) from public;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.has_company_role(uuid, text[]) to authenticated;
grant execute on function public.can_access_invoice(uuid) to authenticated;

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.transport_orders enable row level security;
alter table public.trips enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists companies_member_select on public.companies;
create policy companies_member_select
on public.companies
for select
using (public.is_company_member(id));

drop policy if exists companies_admin_update on public.companies;
create policy companies_admin_update
on public.companies
for update
using (public.has_company_role(id, array['owner','admin']))
with check (public.has_company_role(id, array['owner','admin']));

drop policy if exists company_users_member_select on public.company_users;
create policy company_users_member_select
on public.company_users
for select
using (public.is_company_member(company_id));

drop policy if exists company_users_owner_admin_insert on public.company_users;
create policy company_users_owner_admin_insert
on public.company_users
for insert
with check (public.has_company_role(company_id, array['owner','admin']));

drop policy if exists company_users_owner_admin_update on public.company_users;
create policy company_users_owner_admin_update
on public.company_users
for update
using (public.has_company_role(company_id, array['owner','admin']))
with check (public.has_company_role(company_id, array['owner','admin']));

drop policy if exists company_users_owner_admin_delete on public.company_users;
create policy company_users_owner_admin_delete
on public.company_users
for delete
using (public.has_company_role(company_id, array['owner','admin']));

drop policy if exists customers_member_select on public.customers;
create policy customers_member_select
on public.customers
for select
using (public.is_company_member(company_id));

drop policy if exists customers_manage on public.customers;
create policy customers_manage
on public.customers
for all
using (public.has_company_role(company_id, array['owner','admin','dispatcher']))
with check (public.has_company_role(company_id, array['owner','admin','dispatcher']));

drop policy if exists vehicles_member_select on public.vehicles;
create policy vehicles_member_select
on public.vehicles
for select
using (public.is_company_member(company_id));

drop policy if exists vehicles_manage on public.vehicles;
create policy vehicles_manage
on public.vehicles
for all
using (public.has_company_role(company_id, array['owner','admin','dispatcher']))
with check (public.has_company_role(company_id, array['owner','admin','dispatcher']));

drop policy if exists drivers_member_select on public.drivers;
create policy drivers_member_select
on public.drivers
for select
using (public.is_company_member(company_id));

drop policy if exists drivers_manage on public.drivers;
create policy drivers_manage
on public.drivers
for all
using (public.has_company_role(company_id, array['owner','admin','dispatcher']))
with check (public.has_company_role(company_id, array['owner','admin','dispatcher']));

drop policy if exists transport_orders_member_select on public.transport_orders;
create policy transport_orders_member_select
on public.transport_orders
for select
using (public.is_company_member(company_id));

drop policy if exists transport_orders_manage on public.transport_orders;
create policy transport_orders_manage
on public.transport_orders
for all
using (public.has_company_role(company_id, array['owner','admin','dispatcher']))
with check (public.has_company_role(company_id, array['owner','admin','dispatcher']));

drop policy if exists trips_member_select on public.trips;
create policy trips_member_select
on public.trips
for select
using (public.is_company_member(company_id));

drop policy if exists trips_manage on public.trips;
create policy trips_manage
on public.trips
for all
using (public.has_company_role(company_id, array['owner','admin','dispatcher','driver']))
with check (public.has_company_role(company_id, array['owner','admin','dispatcher','driver']));

drop policy if exists invoices_member_select on public.invoices;
create policy invoices_member_select
on public.invoices
for select
using (public.is_company_member(company_id));

drop policy if exists invoices_manage on public.invoices;
create policy invoices_manage
on public.invoices
for all
using (public.has_company_role(company_id, array['owner','admin','accountant']))
with check (public.has_company_role(company_id, array['owner','admin','accountant']));

drop policy if exists invoice_items_member_select on public.invoice_items;
create policy invoice_items_member_select
on public.invoice_items
for select
using (public.can_access_invoice(invoice_id));

drop policy if exists invoice_items_manage on public.invoice_items;
create policy invoice_items_manage
on public.invoice_items
for all
using (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and public.has_company_role(i.company_id, array['owner','admin','accountant'])
  )
)
with check (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and public.has_company_role(i.company_id, array['owner','admin','accountant'])
  )
);

drop policy if exists payments_member_select on public.payments;
create policy payments_member_select
on public.payments
for select
using (public.is_company_member(company_id));

drop policy if exists payments_manage on public.payments;
create policy payments_manage
on public.payments
for all
using (public.has_company_role(company_id, array['owner','admin','accountant']))
with check (public.has_company_role(company_id, array['owner','admin','accountant']));

drop policy if exists documents_member_select on public.documents;
create policy documents_member_select
on public.documents
for select
using (public.is_company_member(company_id));

drop policy if exists documents_manage on public.documents;
create policy documents_manage
on public.documents
for all
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant']))
with check (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant']));

drop policy if exists audit_logs_member_select on public.audit_logs;
create policy audit_logs_member_select
on public.audit_logs
for select
using (public.is_company_member(company_id));

drop policy if exists audit_logs_manage on public.audit_logs;
create policy audit_logs_manage
on public.audit_logs
for insert
with check (public.is_company_member(company_id));

comment on policy trips_manage on public.trips is 'Starter policy. Tighten driver-specific write access before production.';
comment on table public.documents is 'Storage metadata only. Add bucket policies and signed upload flow before production.';

-- Hardened driver-scoped RLS overrides.
create or replace function public.get_company_role(target_company_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select cu.role
  from public.company_users cu
  where cu.company_id = target_company_id
    and cu.user_id = auth.uid()
    and cu.is_active = true
  order by cu.created_at asc
  limit 1;
$$;

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

create or replace function public.can_driver_access_trip(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = target_trip_id
      and public.has_company_role(t.company_id, array['driver'])
      and t.driver_id = public.get_current_driver_id(t.company_id)
  );
$$;

create or replace function public.can_driver_access_transport_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.transport_orders o
    where o.id = target_order_id
      and public.has_company_role(o.company_id, array['driver'])
      and (
        o.assigned_driver_id = public.get_current_driver_id(o.company_id)
        or exists (
          select 1
          from public.trips t
          where t.company_id = o.company_id
            and t.transport_order_id = o.id
            and t.driver_id = public.get_current_driver_id(o.company_id)
        )
      )
  );
$$;

create or replace function public.can_driver_access_customer(target_company_id uuid, target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.company_id = target_company_id
      and t.customer_id = target_customer_id
      and public.has_company_role(t.company_id, array['driver'])
      and t.driver_id = public.get_current_driver_id(t.company_id)
  );
$$;

create or replace function public.can_driver_access_vehicle(target_company_id uuid, target_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.company_id = target_company_id
      and t.vehicle_id = target_vehicle_id
      and public.has_company_role(t.company_id, array['driver'])
      and t.driver_id = public.get_current_driver_id(t.company_id)
  );
$$;

create or replace function public.can_driver_access_invoice(target_invoice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invoices i
    join public.trips t on t.id = i.trip_id
    where i.id = target_invoice_id
      and public.has_company_role(i.company_id, array['driver'])
      and t.driver_id = public.get_current_driver_id(i.company_id)
  );
$$;

create or replace function public.can_driver_access_document(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.documents d
    where d.id = target_document_id
      and d.related_type = 'trip'
      and d.related_id is not null
      and public.can_driver_access_trip(d.related_id)
  );
$$;

create or replace function public.can_access_invoice(target_invoice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invoices i
    where i.id = target_invoice_id
      and (
        public.has_company_role(i.company_id, array['owner','admin','dispatcher','accountant','viewer'])
        or public.can_driver_access_invoice(i.id)
      )
  );
$$;

revoke all on function public.get_company_role(uuid) from public;
revoke all on function public.get_current_driver_id(uuid) from public;
revoke all on function public.can_driver_access_trip(uuid) from public;
revoke all on function public.can_driver_access_transport_order(uuid) from public;
revoke all on function public.can_driver_access_customer(uuid, uuid) from public;
revoke all on function public.can_driver_access_vehicle(uuid, uuid) from public;
revoke all on function public.can_driver_access_invoice(uuid) from public;
revoke all on function public.can_driver_access_document(uuid) from public;
revoke all on function public.can_access_invoice(uuid) from public;

grant execute on function public.get_company_role(uuid) to authenticated;
grant execute on function public.get_current_driver_id(uuid) to authenticated;
grant execute on function public.can_driver_access_trip(uuid) to authenticated;
grant execute on function public.can_driver_access_transport_order(uuid) to authenticated;
grant execute on function public.can_driver_access_customer(uuid, uuid) to authenticated;
grant execute on function public.can_driver_access_vehicle(uuid, uuid) to authenticated;
grant execute on function public.can_driver_access_invoice(uuid) to authenticated;
grant execute on function public.can_driver_access_document(uuid) to authenticated;
grant execute on function public.can_access_invoice(uuid) to authenticated;

drop policy if exists company_users_member_select on public.company_users;
drop policy if exists company_users_self_select on public.company_users;
create policy company_users_self_select
on public.company_users
for select
using (user_id = auth.uid());

drop policy if exists company_users_admin_select on public.company_users;
create policy company_users_admin_select
on public.company_users
for select
using (public.has_company_role(company_id, array['owner','admin']));

drop policy if exists customers_member_select on public.customers;
drop policy if exists customers_non_driver_select on public.customers;
create policy customers_non_driver_select
on public.customers
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists customers_driver_select on public.customers;
create policy customers_driver_select
on public.customers
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_customer(company_id, id)
);

drop policy if exists vehicles_member_select on public.vehicles;
drop policy if exists vehicles_non_driver_select on public.vehicles;
create policy vehicles_non_driver_select
on public.vehicles
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists vehicles_driver_select on public.vehicles;
create policy vehicles_driver_select
on public.vehicles
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_vehicle(company_id, id)
);

drop policy if exists drivers_member_select on public.drivers;
drop policy if exists drivers_non_driver_select on public.drivers;
create policy drivers_non_driver_select
on public.drivers
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists drivers_self_select on public.drivers;
create policy drivers_self_select
on public.drivers
for select
using (
  public.has_company_role(company_id, array['driver'])
  and id = public.get_current_driver_id(company_id)
);

drop policy if exists transport_orders_member_select on public.transport_orders;
drop policy if exists transport_orders_non_driver_select on public.transport_orders;
create policy transport_orders_non_driver_select
on public.transport_orders
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists transport_orders_driver_select on public.transport_orders;
create policy transport_orders_driver_select
on public.transport_orders
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_transport_order(id)
);

drop policy if exists trips_member_select on public.trips;
drop policy if exists trips_non_driver_select on public.trips;
create policy trips_non_driver_select
on public.trips
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists trips_driver_select on public.trips;
create policy trips_driver_select
on public.trips
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_trip(id)
);

drop policy if exists trips_manage on public.trips;
drop policy if exists trips_operations_manage on public.trips;
create policy trips_operations_manage
on public.trips
for all
using (public.has_company_role(company_id, array['owner','admin','dispatcher']))
with check (public.has_company_role(company_id, array['owner','admin','dispatcher']));

drop policy if exists trips_driver_update on public.trips;
create policy trips_driver_update
on public.trips
for update
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_trip(id)
)
with check (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_trip(id)
);

drop policy if exists invoices_member_select on public.invoices;
drop policy if exists invoices_non_driver_select on public.invoices;
create policy invoices_non_driver_select
on public.invoices
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists invoices_driver_select on public.invoices;
create policy invoices_driver_select
on public.invoices
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_invoice(id)
);

drop policy if exists payments_member_select on public.payments;
drop policy if exists payments_non_driver_select on public.payments;
create policy payments_non_driver_select
on public.payments
for select
using (public.has_company_role(company_id, array['owner','admin','accountant','viewer']));

drop policy if exists documents_member_select on public.documents;
drop policy if exists documents_non_driver_select on public.documents;
create policy documents_non_driver_select
on public.documents
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists documents_driver_select on public.documents;
create policy documents_driver_select
on public.documents
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_document(id)
);

drop policy if exists documents_manage on public.documents;
drop policy if exists documents_ops_manage on public.documents;
create policy documents_ops_manage
on public.documents
for all
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant']))
with check (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant']));

drop policy if exists documents_driver_insert on public.documents;
create policy documents_driver_insert
on public.documents
for insert
with check (
  public.has_company_role(company_id, array['driver'])
  and related_type = 'trip'
  and related_id is not null
  and public.can_driver_access_trip(related_id)
);

drop policy if exists audit_logs_member_select on public.audit_logs;
drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select
on public.audit_logs
for select
using (public.has_company_role(company_id, array['owner','admin']));

comment on policy trips_driver_update on public.trips is 'Drivers can only update trips assigned to their matched driver row.';
comment on policy documents_driver_insert on public.documents is 'Drivers can only upload documents for their own assigned trips.';
