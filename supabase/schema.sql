create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size text,
  region text,
  features text[] default '{}',
  cash_balance numeric default 0,
  next_payroll_total numeric default 0,
  next_payroll_date date,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  role text not null default 'admin',
  full_name text,
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text,
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  client text not null,
  client_email text,
  invoice_number text not null,
  due_date date,
  subtotal numeric not null default 0,
  tax_total numeric not null default 0,
  discount_total numeric not null default 0,
  amount numeric not null,
  currency text not null default 'EUR',
  status text not null check (status in ('pending','overdue','paid')),
  created_at timestamptz default now()
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  tax_rate numeric not null default 0,
  discount_rate numeric not null default 0,
  line_total numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  full_name text not null,
  team text,
  role text,
  status text not null default 'active',
  created_at timestamptz default now()
);

alter table companies enable row level security;
alter table profiles enable row level security;
alter table invoices enable row level security;
alter table clients enable row level security;
alter table invoice_items enable row level security;
alter table employees enable row level security;

drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "companies_read_by_member" on companies;
drop policy if exists "invoices_read_by_company" on invoices;
drop policy if exists "invoices_manage_by_admin" on invoices;
drop policy if exists "clients_read_by_company" on clients;
drop policy if exists "clients_manage_by_admin" on clients;
drop policy if exists "invoice_items_read_by_company" on invoice_items;
drop policy if exists "invoice_items_manage_by_admin" on invoice_items;
drop policy if exists "employees_read_by_company" on employees;
drop policy if exists "employees_manage_by_admin" on employees;

create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);

create policy "companies_read_by_member"
  on companies for select
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = companies.id
    )
  );

create policy "invoices_read_by_company"
  on invoices for select
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = invoices.company_id
    )
  );

create policy "invoices_manage_by_admin"
  on invoices for all
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = invoices.company_id
      and profiles.role in ('admin', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = invoices.company_id
      and profiles.role in ('admin', 'manager')
    )
  );

create policy "clients_read_by_company"
  on clients for select
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = clients.company_id
    )
  );

create policy "clients_manage_by_admin"
  on clients for all
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = clients.company_id
      and profiles.role in ('admin', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = clients.company_id
      and profiles.role in ('admin', 'manager')
    )
  );

create policy "invoice_items_read_by_company"
  on invoice_items for select
  using (
    exists (
      select 1
      from invoices
      where invoices.id = invoice_items.invoice_id
      and exists (
        select 1
        from profiles
        where profiles.id = auth.uid()
        and profiles.company_id = invoices.company_id
      )
    )
  );

create policy "invoice_items_manage_by_admin"
  on invoice_items for all
  using (
    exists (
      select 1
      from invoices
      where invoices.id = invoice_items.invoice_id
      and exists (
        select 1
        from profiles
        where profiles.id = auth.uid()
        and profiles.company_id = invoices.company_id
        and profiles.role in ('admin', 'manager')
      )
    )
  )
  with check (
    exists (
      select 1
      from invoices
      where invoices.id = invoice_items.invoice_id
      and exists (
        select 1
        from profiles
        where profiles.id = auth.uid()
        and profiles.company_id = invoices.company_id
        and profiles.role in ('admin', 'manager')
      )
    )
  );

create policy "employees_read_by_company"
  on employees for select
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = employees.company_id
    )
  );

create policy "employees_manage_by_admin"
  on employees for all
  using (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = employees.company_id
      and profiles.role in ('admin', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from profiles
      where profiles.id = auth.uid()
      and profiles.company_id = employees.company_id
      and profiles.role in ('admin', 'manager')
    )
  );
