create table if not exists public.workforce_employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  job_title text,
  employment_type text,
  pay_type text not null default 'hourly' check (pay_type in ('hourly','salary')),
  hourly_rate numeric(12,2) not null default 0,
  overtime_rate numeric(12,2),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  employee_id uuid not null references public.workforce_employees(id) on delete cascade,
  payroll_run_id uuid,
  work_date date not null,
  start_time timestamptz not null,
  end_time timestamptz,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  regular_minutes integer not null default 0 check (regular_minutes >= 0),
  overtime_minutes integer not null default 0 check (overtime_minutes >= 0),
  status text not null default 'open' check (status in ('open','submitted','approved','exported')),
  source text not null default 'manual' check (source in ('manual','clock','driver')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft','reviewed','exported','finalized')),
  notes text,
  total_regular_minutes integer not null default 0,
  total_overtime_minutes integer not null default 0,
  total_estimated_gross numeric(12,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payroll_run_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.workforce_employees(id) on delete restrict,
  regular_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  hourly_rate numeric(12,2) not null default 0,
  overtime_rate numeric(12,2) not null default 0,
  estimated_gross numeric(12,2) not null default 0,
  notes text
);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'workforce_employees'
      and constraint_name = 'workforce_employees_company_auth_user_id_unique'
  ) then
    alter table public.workforce_employees
      add constraint workforce_employees_company_auth_user_id_unique unique (company_id, auth_user_id);
  end if;
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'time_entries'
      and constraint_name = 'time_entries_payroll_run_id_fkey'
  ) then
    alter table public.time_entries
      add constraint time_entries_payroll_run_id_fkey
      foreign key (payroll_run_id) references public.payroll_runs(id) on delete set null;
  end if;
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_workforce_employees_company_id on public.workforce_employees(company_id);
create index if not exists idx_workforce_employees_branch_id on public.workforce_employees(branch_id);
create index if not exists idx_workforce_employees_auth_user_id on public.workforce_employees(auth_user_id);
create index if not exists idx_time_entries_company_id on public.time_entries(company_id);
create index if not exists idx_time_entries_branch_id on public.time_entries(branch_id);
create index if not exists idx_time_entries_employee_id on public.time_entries(employee_id);
create index if not exists idx_time_entries_work_date on public.time_entries(work_date desc);
create index if not exists idx_time_entries_payroll_run_id on public.time_entries(payroll_run_id);
create index if not exists idx_payroll_runs_company_id on public.payroll_runs(company_id);
create index if not exists idx_payroll_runs_branch_id on public.payroll_runs(branch_id);
create index if not exists idx_payroll_runs_period on public.payroll_runs(period_start desc, period_end desc);
create index if not exists idx_payroll_run_items_run_id on public.payroll_run_items(payroll_run_id);
create index if not exists idx_payroll_run_items_employee_id on public.payroll_run_items(employee_id);

drop trigger if exists workforce_employees_updated_at on public.workforce_employees;
create trigger workforce_employees_updated_at
before update on public.workforce_employees
for each row
execute function public.set_updated_at();

drop trigger if exists time_entries_updated_at on public.time_entries;
create trigger time_entries_updated_at
before update on public.time_entries
for each row
execute function public.set_updated_at();

drop trigger if exists payroll_runs_updated_at on public.payroll_runs;
create trigger payroll_runs_updated_at
before update on public.payroll_runs
for each row
execute function public.set_updated_at();

alter table public.workforce_employees enable row level security;
alter table public.time_entries enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_run_items enable row level security;

drop policy if exists "workforce_employees_select" on public.workforce_employees;
create policy "workforce_employees_select"
on public.workforce_employees
for select
to authenticated
using (
  (
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = workforce_employees.company_id
        and cu.user_id = auth.uid()
        and cu.is_active = true
        and cu.role in ('owner','admin','dispatcher','accountant','viewer')
        and public.has_branch_access(workforce_employees.company_id, workforce_employees.branch_id)
    )
  )
  or auth_user_id = auth.uid()
);

drop policy if exists "workforce_employees_manage" on public.workforce_employees;
create policy "workforce_employees_manage"
on public.workforce_employees
for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = workforce_employees.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher')
      and public.has_branch_access(workforce_employees.company_id, workforce_employees.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = workforce_employees.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher')
      and public.has_branch_access(workforce_employees.company_id, workforce_employees.branch_id)
  )
);

drop policy if exists "time_entries_select_staff" on public.time_entries;
create policy "time_entries_select_staff"
on public.time_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = time_entries.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher','accountant','viewer')
      and public.has_branch_access(time_entries.company_id, time_entries.branch_id)
  )
);

drop policy if exists "time_entries_select_self" on public.time_entries;
create policy "time_entries_select_self"
on public.time_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.workforce_employees employee
    where employee.id = time_entries.employee_id
      and employee.auth_user_id = auth.uid()
      and employee.is_active = true
  )
);

drop policy if exists "time_entries_manage_staff" on public.time_entries;
create policy "time_entries_manage_staff"
on public.time_entries
for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = time_entries.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher')
      and public.has_branch_access(time_entries.company_id, time_entries.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = time_entries.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher')
      and public.has_branch_access(time_entries.company_id, time_entries.branch_id)
  )
);

drop policy if exists "time_entries_self_insert" on public.time_entries;
create policy "time_entries_self_insert"
on public.time_entries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workforce_employees employee
    where employee.id = time_entries.employee_id
      and employee.company_id = time_entries.company_id
      and employee.branch_id = time_entries.branch_id
      and employee.auth_user_id = auth.uid()
      and employee.is_active = true
  )
);

drop policy if exists "time_entries_self_update" on public.time_entries;
create policy "time_entries_self_update"
on public.time_entries
for update
to authenticated
using (
  status in ('open','submitted')
  and exists (
    select 1
    from public.workforce_employees employee
    where employee.id = time_entries.employee_id
      and employee.auth_user_id = auth.uid()
      and employee.is_active = true
  )
)
with check (
  status in ('open','submitted')
  and exists (
    select 1
    from public.workforce_employees employee
    where employee.id = time_entries.employee_id
      and employee.auth_user_id = auth.uid()
      and employee.is_active = true
  )
);

drop policy if exists "payroll_runs_select" on public.payroll_runs;
create policy "payroll_runs_select"
on public.payroll_runs
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = payroll_runs.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','accountant','viewer')
      and public.has_branch_access(payroll_runs.company_id, payroll_runs.branch_id)
  )
);

drop policy if exists "payroll_runs_manage" on public.payroll_runs;
create policy "payroll_runs_manage"
on public.payroll_runs
for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = payroll_runs.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','accountant')
      and public.has_branch_access(payroll_runs.company_id, payroll_runs.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = payroll_runs.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','accountant')
      and public.has_branch_access(payroll_runs.company_id, payroll_runs.branch_id)
  )
);

drop policy if exists "payroll_run_items_select" on public.payroll_run_items;
create policy "payroll_run_items_select"
on public.payroll_run_items
for select
to authenticated
using (
  exists (
    select 1
    from public.payroll_runs payroll_run
    join public.company_users cu on cu.company_id = payroll_run.company_id
    where payroll_run.id = payroll_run_items.payroll_run_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','accountant','viewer')
      and public.has_branch_access(payroll_run.company_id, payroll_run.branch_id)
  )
);

drop policy if exists "payroll_run_items_manage" on public.payroll_run_items;
create policy "payroll_run_items_manage"
on public.payroll_run_items
for all
to authenticated
using (
  exists (
    select 1
    from public.payroll_runs payroll_run
    join public.company_users cu on cu.company_id = payroll_run.company_id
    where payroll_run.id = payroll_run_items.payroll_run_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','accountant')
      and public.has_branch_access(payroll_run.company_id, payroll_run.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.payroll_runs payroll_run
    join public.company_users cu on cu.company_id = payroll_run.company_id
    where payroll_run.id = payroll_run_items.payroll_run_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','accountant')
      and public.has_branch_access(payroll_run.company_id, payroll_run.branch_id)
  )
);
