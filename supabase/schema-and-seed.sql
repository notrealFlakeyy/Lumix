-- Lumix Transport ERP MVP schema + demo seed
-- Paste this file into the Supabase SQL editor to create the transport ERP foundation
-- and load presentation-ready demo data in one run.
--
-- Notes:
-- - This script creates the schema, starter RLS policies, and demo records.
-- - If at least one auth user already exists, the earliest user is attached to the
--   demo company as an owner in public.company_users.
-- - Storage bucket rules and invoice PDF generation still require manual setup.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Demo seed
-- ---------------------------------------------------------------------------

do $$
declare
  demo_company uuid := '11111111-1111-1111-1111-111111111111';
  customer_1 uuid := '22222222-2222-2222-2222-222222222221';
  customer_2 uuid := '22222222-2222-2222-2222-222222222222';
  customer_3 uuid := '22222222-2222-2222-2222-222222222223';
  vehicle_1 uuid := '33333333-3333-3333-3333-333333333331';
  vehicle_2 uuid := '33333333-3333-3333-3333-333333333332';
  vehicle_3 uuid := '33333333-3333-3333-3333-333333333333';
  driver_1 uuid := '44444444-4444-4444-4444-444444444441';
  driver_2 uuid := '44444444-4444-4444-4444-444444444442';
  driver_3 uuid := '44444444-4444-4444-4444-444444444443';
  order_1 uuid := '55555555-5555-5555-5555-555555555551';
  order_2 uuid := '55555555-5555-5555-5555-555555555552';
  order_3 uuid := '55555555-5555-5555-5555-555555555553';
  order_4 uuid := '55555555-5555-5555-5555-555555555554';
  order_5 uuid := '55555555-5555-5555-5555-555555555555';
  trip_1 uuid := '66666666-6666-6666-6666-666666666661';
  trip_2 uuid := '66666666-6666-6666-6666-666666666662';
  trip_3 uuid := '66666666-6666-6666-6666-666666666663';
  trip_4 uuid := '66666666-6666-6666-6666-666666666664';
  trip_5 uuid := '66666666-6666-6666-6666-666666666665';
  invoice_1 uuid := '77777777-7777-7777-7777-777777777771';
  invoice_2 uuid := '77777777-7777-7777-7777-777777777772';
  invoice_3 uuid := '77777777-7777-7777-7777-777777777773';
  first_user uuid;
begin
  insert into public.companies (id, name, business_id, vat_number, email, phone, address_line1, postal_code, city, country, timezone)
  values (
    demo_company,
    'Northern Route Logistics Oy',
    '3245567-8',
    'FI32455678',
    'ops@northernroute.fi',
    '+358401234567',
    'Satamatie 18',
    '20100',
    'Turku',
    'FI',
    'Europe/Helsinki'
  )
  on conflict (id) do update set
    name = excluded.name,
    business_id = excluded.business_id,
    vat_number = excluded.vat_number,
    email = excluded.email,
    phone = excluded.phone,
    address_line1 = excluded.address_line1,
    postal_code = excluded.postal_code,
    city = excluded.city,
    country = excluded.country,
    timezone = excluded.timezone;

  insert into public.customers (id, company_id, name, business_id, vat_number, email, phone, billing_address_line1, billing_postal_code, billing_city, notes)
  values
    (customer_1, demo_company, 'Arctic Timber Solutions', '2431001-4', 'FI24310014', 'traffic@arctictimber.fi', '+358401112223', 'Sahakatu 9', '90100', 'Oulu', 'High-volume timber transport account with recurring northern routes.'),
    (customer_2, demo_company, 'Baltic Retail Cargo', '2788202-5', 'FI27882025', 'logistics@balticretail.fi', '+358501234890', 'Varastokuja 3', '00940', 'Helsinki', 'Retail replenishment loads with tight delivery windows.'),
    (customer_3, demo_company, 'Polar Construction Group', '3019987-1', 'FI30199871', 'dispatch@polarconstruction.fi', '+358442229955', 'Tyomaantie 12', '15110', 'Lahti', 'Construction materials and site transfers.')
  on conflict (id) do update set
    name = excluded.name,
    business_id = excluded.business_id,
    vat_number = excluded.vat_number,
    email = excluded.email,
    phone = excluded.phone,
    billing_address_line1 = excluded.billing_address_line1,
    billing_postal_code = excluded.billing_postal_code,
    billing_city = excluded.billing_city,
    notes = excluded.notes;

  insert into public.vehicles (id, company_id, registration_number, make, model, year, fuel_type, current_km, next_service_km, is_active)
  values
    (vehicle_1, demo_company, 'ABC-123', 'Volvo', 'FH16', 2021, 'Diesel', 182450, 195000, true),
    (vehicle_2, demo_company, 'DEF-456', 'Scania', 'R500', 2020, 'Diesel', 245300, 255000, true),
    (vehicle_3, demo_company, 'GHI-789', 'Mercedes', 'Actros', 2022, 'Diesel', 98420, 112000, true)
  on conflict (id) do update set
    registration_number = excluded.registration_number,
    make = excluded.make,
    model = excluded.model,
    year = excluded.year,
    fuel_type = excluded.fuel_type,
    current_km = excluded.current_km,
    next_service_km = excluded.next_service_km,
    is_active = excluded.is_active;

  insert into public.drivers (id, public_id, company_id, full_name, phone, email, license_type, employment_type, is_active)
  values
    (driver_1, 'Mk7Lp2Qa9X', demo_company, 'Mika Lehtinen', '+358401009900', 'mika.lehtinen@northernroute.fi', 'CE', 'Full-time', true),
    (driver_2, 'Jr4Ns8Wd1K', demo_company, 'Jari Koskela', '+358401009901', 'jari.koskela@northernroute.fi', 'CE', 'Full-time', true),
    (driver_3, 'An6Rb3Ty5M', demo_company, 'Antti Niemi', '+358401009902', 'antti.niemi@northernroute.fi', 'CE', 'Contract', true)
  on conflict (id) do update set
    public_id = excluded.public_id,
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    license_type = excluded.license_type,
    employment_type = excluded.employment_type,
    is_active = excluded.is_active;

  insert into public.transport_orders (id, company_id, customer_id, assigned_vehicle_id, assigned_driver_id, order_number, pickup_location, delivery_location, cargo_description, scheduled_at, status, notes)
  values
    (order_1, demo_company, customer_1, vehicle_1, driver_1, 'ORD-0001', 'Turku', 'Helsinki', 'Processed timber bundles', now() - interval '8 days', 'completed', 'Unload at Vuosaari terminal gate B.'),
    (order_2, demo_company, customer_2, vehicle_2, driver_2, 'ORD-0002', 'Tampere', 'Oulu', 'Retail pallet distribution', now() - interval '5 days', 'invoiced', 'Priority shelves for weekend campaign.'),
    (order_3, demo_company, customer_3, vehicle_3, driver_3, 'ORD-0003', 'Vaasa', 'Jyvaskyla', 'Steel beams and site fencing', now() - interval '1 day', 'in_progress', 'Site contact requires 30 min notice.'),
    (order_4, demo_company, customer_2, vehicle_1, driver_1, 'ORD-0004', 'Espoo', 'Lahti', 'Retail fixtures', now() + interval '1 day', 'assigned', 'Reverse route with return packaging.'),
    (order_5, demo_company, customer_1, null, null, 'ORD-0005', 'Salo', 'Vantaa', 'Lumber reload transfer', now() + interval '3 days', 'planned', 'Awaiting final equipment assignment.')
  on conflict (company_id, order_number) do update set
    customer_id = excluded.customer_id,
    assigned_vehicle_id = excluded.assigned_vehicle_id,
    assigned_driver_id = excluded.assigned_driver_id,
    pickup_location = excluded.pickup_location,
    delivery_location = excluded.delivery_location,
    cargo_description = excluded.cargo_description,
    scheduled_at = excluded.scheduled_at,
    status = excluded.status,
    notes = excluded.notes;

  insert into public.trips (id, public_id, company_id, transport_order_id, customer_id, vehicle_id, driver_id, start_time, end_time, start_km, end_km, distance_km, waiting_time_minutes, notes, delivery_confirmation, status)
  values
    (trip_1, 'Tp9Xk2Lm4Q', demo_company, order_1, customer_1, vehicle_1, driver_1, now() - interval '8 days', now() - interval '8 days' + interval '4 hours', 181920, 182340, 420, 35, 'Delivered on schedule with terminal queue.', 'Signed by H. Virtanen', 'completed'),
    (trip_2, 'Tr7Pd5Ns8V', demo_company, order_2, customer_2, vehicle_2, driver_2, now() - interval '5 days', now() - interval '5 days' + interval '8 hours', 244610, 245180, 570, 50, 'Long-haul replenishment completed overnight.', 'Dock receipt confirmed', 'invoiced'),
    (trip_3, 'Tx4Qw9Er2L', demo_company, order_3, customer_3, vehicle_3, driver_3, now() - interval '4 hours', null, 98210, null, null, 20, 'Driver reported crane-site congestion.', null, 'started'),
    (trip_4, 'Ty6Mn3Kp8R', demo_company, order_4, customer_2, vehicle_1, driver_1, now() + interval '1 day', null, null, null, null, 0, 'Pre-dispatched for morning departure.', null, 'planned'),
    (trip_5, 'Tz2Hv7Lc5B', demo_company, order_5, customer_1, null, null, now() + interval '3 days', null, null, null, null, 15, 'Placeholder trip created before final assignment.', null, 'planned')
  on conflict (id) do update set
    public_id = excluded.public_id,
    transport_order_id = excluded.transport_order_id,
    customer_id = excluded.customer_id,
    vehicle_id = excluded.vehicle_id,
    driver_id = excluded.driver_id,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    start_km = excluded.start_km,
    end_km = excluded.end_km,
    distance_km = excluded.distance_km,
    waiting_time_minutes = excluded.waiting_time_minutes,
    notes = excluded.notes,
    delivery_confirmation = excluded.delivery_confirmation,
    status = excluded.status;

  insert into public.invoices (id, company_id, customer_id, trip_id, invoice_number, issue_date, due_date, reference_number, status, subtotal, vat_total, total, notes)
  values
    (invoice_1, demo_company, customer_2, trip_2, 'INV-0001', current_date - 5, current_date - 1, '1200456', 'paid', 1050.00, 267.75, 1317.75, 'Retail replenishment route billed from completed trip.'),
    (invoice_2, demo_company, customer_1, trip_1, 'INV-0002', current_date - 8, current_date + 6, '1200457', 'partially_paid', 860.00, 219.30, 1079.30, 'Timber delivery including waiting time at terminal.'),
    (invoice_3, demo_company, customer_3, null, 'INV-0003', current_date - 12, current_date - 2, '1200458', 'overdue', 720.00, 183.60, 903.60, 'Advance mobilisation fee for construction site haulage.')
  on conflict (company_id, invoice_number) do update set
    customer_id = excluded.customer_id,
    trip_id = excluded.trip_id,
    issue_date = excluded.issue_date,
    due_date = excluded.due_date,
    reference_number = excluded.reference_number,
    status = excluded.status,
    subtotal = excluded.subtotal,
    vat_total = excluded.vat_total,
    total = excluded.total,
    notes = excluded.notes;

  delete from public.invoice_items where invoice_id in (invoice_1, invoice_2, invoice_3);

  insert into public.invoice_items (invoice_id, description, quantity, unit_price, vat_rate, line_total)
  values
    (invoice_1, 'Transport service', 1, 1050.00, 25.50, 1050.00),
    (invoice_2, 'Transport service', 1, 800.00, 25.50, 800.00),
    (invoice_2, 'Waiting time', 1, 60.00, 25.50, 60.00),
    (invoice_3, 'Mobilisation and route planning', 1, 720.00, 25.50, 720.00);

  delete from public.payments where invoice_id in (invoice_1, invoice_2, invoice_3);

  insert into public.payments (company_id, invoice_id, payment_date, amount, payment_method, reference)
  values
    (demo_company, invoice_1, current_date - 1, 1317.75, 'Bank transfer', 'NRL-AR-0001'),
    (demo_company, invoice_2, current_date - 2, 540.00, 'Bank transfer', 'NRL-AR-0002');

  insert into public.documents (company_id, related_type, related_id, file_name, file_path, mime_type)
  values
    (demo_company, 'trip', trip_1, 'delivery-note-trip-1.pdf', 'demo/trips/delivery-note-trip-1.pdf', 'application/pdf')
  on conflict do nothing;

  insert into public.audit_logs (company_id, entity_type, entity_id, action, new_values)
  values
    (demo_company, 'seed', demo_company, 'seed_demo_dataset', jsonb_build_object('company', 'Northern Route Logistics Oy'))
  on conflict do nothing;

  select id into first_user from auth.users order by created_at asc limit 1;

  if first_user is not null then
    insert into public.profiles (id, full_name, phone)
    values (first_user, 'Demo Owner', '+358400000001')
    on conflict (id) do update set
      full_name = excluded.full_name,
      phone = excluded.phone;

    insert into public.company_users (company_id, user_id, role, is_active)
    values (demo_company, first_user, 'owner', true)
    on conflict (company_id, user_id) do update set
      role = excluded.role,
      is_active = excluded.is_active;
  end if;

  update public.drivers d
  set auth_user_id = matched.user_id
  from (
    select distinct on (driver_row.id)
      driver_row.id,
      cu.user_id
    from public.drivers driver_row
    join public.company_users cu
      on cu.company_id = driver_row.company_id
     and cu.is_active = true
     and cu.role = 'driver'
    left join public.profiles p
      on p.id = cu.user_id
    left join auth.users u
      on u.id = cu.user_id
    where driver_row.company_id = demo_company
      and driver_row.auth_user_id is null
      and (
        lower(coalesce(driver_row.email, '')) = lower(coalesce(u.email, ''))
        or lower(coalesce(driver_row.full_name, '')) = lower(coalesce(p.full_name, ''))
      )
    order by
      driver_row.id,
      case
        when lower(coalesce(driver_row.email, '')) = lower(coalesce(u.email, '')) then 0
        else 1
      end,
      cu.created_at asc
  ) as matched
  where d.id = matched.id
    and d.auth_user_id is null;
end $$;
