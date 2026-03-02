-- Add per-member module visibility and link HR employees to auth users for self time stamping.

-- 1) org_members: allowed modules (UI visibility + route gating)
alter table org_members
  add column if not exists allowed_modules text[] not null default '{}'::text[];

create index if not exists org_members_allowed_modules_gin on org_members using gin (allowed_modules);

-- 2) hr_employees: link to auth user (optional for contractors etc.)
alter table hr_employees
  add column if not exists user_id uuid references auth.users(id) on delete set null;

do $$ begin
  alter table hr_employees add constraint hr_employees_org_user_unique unique (org_id, user_id);
exception when duplicate_object then null; end $$;

create index if not exists hr_employees_user_id_idx on hr_employees(user_id);

-- 3) Tighten RLS for HR + time entries: employees can only see/manage their own.
drop policy if exists "hr_emp_select_member" on hr_employees;
drop policy if exists "hr_emp_manage_admin" on hr_employees;
drop policy if exists "time_select_member" on pay_time_entries;
drop policy if exists "time_manage_member" on pay_time_entries;

create policy "hr_emp_select_self_or_admin"
  on hr_employees for select
  using (
    (user_id = auth.uid())
    or has_org_role(org_id, array['owner','admin']::org_role[])
  );

create policy "hr_emp_manage_admin"
  on hr_employees for all
  using (has_org_role(org_id, array['owner','admin']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin']::org_role[]));

create policy "time_select_self_or_admin"
  on pay_time_entries for select
  using (
    has_org_role(org_id, array['owner','admin']::org_role[])
    or exists (
      select 1
      from hr_employees e
      where e.id = pay_time_entries.employee_id
        and e.user_id = auth.uid()
    )
  );

create policy "time_insert_self_or_admin"
  on pay_time_entries for insert
  with check (
    has_org_role(org_id, array['owner','admin']::org_role[])
    or exists (
      select 1
      from hr_employees e
      where e.id = pay_time_entries.employee_id
        and e.user_id = auth.uid()
    )
  );

create policy "time_update_self_or_admin"
  on pay_time_entries for update
  using (
    has_org_role(org_id, array['owner','admin']::org_role[])
    or exists (
      select 1
      from hr_employees e
      where e.id = pay_time_entries.employee_id
        and e.user_id = auth.uid()
    )
  )
  with check (
    has_org_role(org_id, array['owner','admin']::org_role[])
    or exists (
      select 1
      from hr_employees e
      where e.id = pay_time_entries.employee_id
        and e.user_id = auth.uid()
    )
  );

create policy "time_delete_self_or_admin"
  on pay_time_entries for delete
  using (
    has_org_role(org_id, array['owner','admin']::org_role[])
    or exists (
      select 1
      from hr_employees e
      where e.id = pay_time_entries.employee_id
        and e.user_id = auth.uid()
    )
  );
