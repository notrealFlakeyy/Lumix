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

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  client text not null,
  invoice_number text not null,
  due_date date,
  amount numeric not null,
  status text not null check (status in ('pending','overdue','paid')),
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
alter table employees enable row level security;

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
