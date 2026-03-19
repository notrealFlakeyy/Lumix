-- ============================================================
-- Migration: Expenses, Tasks & Vehicle Maintenance extension
-- 2026-03-19
--
-- Adds three new ERP modules:
--   1. expenses            — employee expense claims & approval
--   2. tasks               — internal task management / kanban
--   3. vehicle_maintenance — extended with status, scheduling,
--                            cost, workshop, and tighter RLS
-- ============================================================


-- ============================================================
-- 1. EXPENSES
-- ============================================================

create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  branch_id     uuid references public.branches(id) on delete set null,

  -- who submitted
  submitted_by  uuid references auth.users(id) on delete set null,

  -- claim details
  expense_date  date not null default current_date,
  category      text not null default 'other'
                  check (category in ('fuel','accommodation','meals','tolls','equipment','repairs','other')),
  description   text not null,
  amount        numeric(12,2) not null check (amount > 0),
  currency      char(3) not null default 'EUR',

  -- receipt
  receipt_url   text,

  -- workflow
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected','reimbursed')),
  reviewed_by   uuid references auth.users(id) on delete set null,
  reviewed_at   timestamptz,
  notes         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_expenses_company_id    on public.expenses(company_id);
create index if not exists idx_expenses_branch_id     on public.expenses(branch_id);
create index if not exists idx_expenses_submitted_by  on public.expenses(submitted_by);
create index if not exists idx_expenses_status        on public.expenses(status);
create index if not exists idx_expenses_expense_date  on public.expenses(expense_date desc);

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

-- read: company members with branch access (staff), or the submitter themselves
drop policy if exists "expenses_select_staff" on public.expenses;
create policy "expenses_select_staff"
  on public.expenses for select
  to authenticated
  using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = expenses.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and cu.role in ('owner','admin','dispatcher','accountant','viewer')
        and public.has_branch_access(expenses.company_id, expenses.branch_id)
    )
  );

drop policy if exists "expenses_select_self" on public.expenses;
create policy "expenses_select_self"
  on public.expenses for select
  to authenticated
  using (submitted_by = auth.uid());

-- insert: any active company member for their own branch
drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert"
  on public.expenses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = expenses.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and public.has_branch_access(expenses.company_id, expenses.branch_id)
    )
    and submitted_by = auth.uid()
  );

-- update own pending claim (submitter) or any claim (approver roles)
drop policy if exists "expenses_update_approver" on public.expenses;
create policy "expenses_update_approver"
  on public.expenses for update
  to authenticated
  using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = expenses.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and cu.role in ('owner','admin','accountant')
        and public.has_branch_access(expenses.company_id, expenses.branch_id)
    )
  )
  with check (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = expenses.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and cu.role in ('owner','admin','accountant')
        and public.has_branch_access(expenses.company_id, expenses.branch_id)
    )
  );

drop policy if exists "expenses_update_self" on public.expenses;
create policy "expenses_update_self"
  on public.expenses for update
  to authenticated
  using  (submitted_by = auth.uid() and status = 'pending')
  with check (submitted_by = auth.uid() and status = 'pending');

-- delete: owner/admin only
drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete"
  on public.expenses for delete
  to authenticated
  using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = expenses.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and cu.role in ('owner','admin')
    )
  );


-- ============================================================
-- 2. TASKS
-- ============================================================

create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  branch_id     uuid references public.branches(id) on delete set null,

  title         text not null,
  description   text,

  status        text not null default 'todo'
                  check (status in ('todo','in_progress','review','done')),
  priority      text not null default 'medium'
                  check (priority in ('low','medium','high','urgent')),

  -- who owns & works on it
  created_by    uuid references auth.users(id) on delete set null,
  assignee_id   uuid references auth.users(id) on delete set null,

  due_date      date,
  completed_at  timestamptz,
  tags          text[] not null default '{}',

  -- optional link to related objects
  related_vehicle_id uuid references public.vehicles(id) on delete set null,
  related_order_id   uuid references public.transport_orders(id) on delete set null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_tasks_company_id    on public.tasks(company_id);
create index if not exists idx_tasks_branch_id     on public.tasks(branch_id);
create index if not exists idx_tasks_assignee_id   on public.tasks(assignee_id);
create index if not exists idx_tasks_status        on public.tasks(status);
create index if not exists idx_tasks_due_date      on public.tasks(due_date);
create index if not exists idx_tasks_created_by    on public.tasks(created_by);

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- auto-set completed_at when status transitions to 'done'
create or replace function public.set_task_completed_at()
  returns trigger
  language plpgsql
as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_completed_at on public.tasks;
create trigger tasks_completed_at
  before update on public.tasks
  for each row execute function public.set_task_completed_at();

alter table public.tasks enable row level security;

-- read: all active company members with branch access
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select"
  on public.tasks for select
  to authenticated
  using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = tasks.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and public.has_branch_access(tasks.company_id, tasks.branch_id)
    )
  );

-- insert: any active member
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert"
  on public.tasks for insert
  to authenticated
  with check (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = tasks.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and public.has_branch_access(tasks.company_id, tasks.branch_id)
    )
    and created_by = auth.uid()
  );

-- update: creator, assignee, or staff roles
drop policy if exists "tasks_update_staff" on public.tasks;
create policy "tasks_update_staff"
  on public.tasks for update
  to authenticated
  using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = tasks.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and cu.role in ('owner','admin','dispatcher')
        and public.has_branch_access(tasks.company_id, tasks.branch_id)
    )
  )
  with check (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = tasks.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and cu.role in ('owner','admin','dispatcher')
        and public.has_branch_access(tasks.company_id, tasks.branch_id)
    )
  );

drop policy if exists "tasks_update_self" on public.tasks;
create policy "tasks_update_self"
  on public.tasks for update
  to authenticated
  using  (created_by = auth.uid() or assignee_id = auth.uid())
  with check (created_by = auth.uid() or assignee_id = auth.uid());

-- delete: owner/admin or creator
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete"
  on public.tasks for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.company_users cu
      where cu.company_id  = tasks.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and cu.role in ('owner','admin')
    )
  );


-- ============================================================
-- 3. VEHICLE MAINTENANCE — extend existing table
-- ============================================================
-- The 20260316000000 migration created a basic vehicle_maintenance
-- table. We add the columns needed by the new Maintenance module.
-- Each ALTER is wrapped in a DO block so re-runs are safe.
-- ============================================================

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicle_maintenance' and column_name = 'status'
  ) then
    alter table public.vehicle_maintenance
      add column status text not null default 'scheduled'
        check (status in ('scheduled','in_progress','completed','overdue'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicle_maintenance' and column_name = 'scheduled_date'
  ) then
    alter table public.vehicle_maintenance
      add column scheduled_date date;
    -- back-fill from performed_at for existing rows
    update public.vehicle_maintenance set scheduled_date = performed_at where scheduled_date is null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicle_maintenance' and column_name = 'completed_date'
  ) then
    alter table public.vehicle_maintenance
      add column completed_date date;
    -- existing rows were recorded as completed
    update public.vehicle_maintenance set completed_date = performed_at, status = 'completed';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicle_maintenance' and column_name = 'cost'
  ) then
    alter table public.vehicle_maintenance add column cost numeric(12,2);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicle_maintenance' and column_name = 'workshop'
  ) then
    alter table public.vehicle_maintenance add column workshop text;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicle_maintenance' and column_name = 'notes'
  ) then
    alter table public.vehicle_maintenance add column notes text;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicle_maintenance' and column_name = 'created_by'
  ) then
    alter table public.vehicle_maintenance
      add column created_by uuid references auth.users(id) on delete set null;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicle_maintenance' and column_name = 'updated_at'
  ) then
    alter table public.vehicle_maintenance
      add column updated_at timestamptz not null default now();
  end if;
end $$;

-- Updated-at trigger for maintenance
drop trigger if exists vehicle_maintenance_updated_at on public.vehicle_maintenance;
create trigger vehicle_maintenance_updated_at
  before update on public.vehicle_maintenance
  for each row execute function public.set_updated_at();

-- Tighten RLS on vehicle_maintenance — replace the broad original policies
drop policy if exists "company members can read own vehicle maintenance"    on public.vehicle_maintenance;
drop policy if exists "company members can insert own vehicle maintenance"  on public.vehicle_maintenance;
drop policy if exists "company members can update own vehicle maintenance"  on public.vehicle_maintenance;
drop policy if exists "company members can delete own vehicle maintenance"  on public.vehicle_maintenance;

-- read: all active company members with branch access
drop policy if exists "vehicle_maintenance_select" on public.vehicle_maintenance;
create policy "vehicle_maintenance_select"
  on public.vehicle_maintenance for select
  to authenticated
  using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = vehicle_maintenance.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and public.has_branch_access(vehicle_maintenance.company_id, vehicle_maintenance.branch_id)
    )
  );

-- manage (insert/update/delete): owner, admin, dispatcher
drop policy if exists "vehicle_maintenance_manage" on public.vehicle_maintenance;
create policy "vehicle_maintenance_manage"
  on public.vehicle_maintenance for all
  to authenticated
  using (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = vehicle_maintenance.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and cu.role in ('owner','admin','dispatcher')
        and public.has_branch_access(vehicle_maintenance.company_id, vehicle_maintenance.branch_id)
    )
  )
  with check (
    exists (
      select 1 from public.company_users cu
      where cu.company_id  = vehicle_maintenance.company_id
        and cu.user_id     = auth.uid()
        and cu.is_active   = true
        and cu.role in ('owner','admin','dispatcher')
        and public.has_branch_access(vehicle_maintenance.company_id, vehicle_maintenance.branch_id)
    )
  );
