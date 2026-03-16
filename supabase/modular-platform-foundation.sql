create table if not exists public.company_modules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  module_key text not null check (module_key in ('core','transport','inventory','purchases','time','payroll','accounting')),
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, module_key)
);

create index if not exists idx_company_modules_company_id on public.company_modules(company_id);
create index if not exists idx_company_modules_module_key on public.company_modules(module_key);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  branch_type text not null default 'branch' check (branch_type in ('branch','depot','terminal','warehouse','office')),
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text not null default 'FI',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_branches_company_id on public.branches(company_id);
create index if not exists idx_branches_company_active on public.branches(company_id, is_active);

create table if not exists public.company_user_branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(company_id, user_id, branch_id)
);

create index if not exists idx_company_user_branches_company_id on public.company_user_branches(company_id);
create index if not exists idx_company_user_branches_user_id on public.company_user_branches(user_id);
create index if not exists idx_company_user_branches_branch_id on public.company_user_branches(branch_id);

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'set_updated_at'
      and pg_function_is_visible(oid)
  ) then
    if not exists (
      select 1 from pg_trigger
      where tgname = 'company_modules_updated_at'
    ) then
      create trigger company_modules_updated_at
      before update on public.company_modules
      for each row execute function public.set_updated_at();
    end if;

    if not exists (
      select 1 from pg_trigger
      where tgname = 'branches_updated_at'
    ) then
      create trigger branches_updated_at
      before update on public.branches
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

insert into public.company_modules (company_id, module_key, is_enabled)
select c.id, modules.module_key, true
from public.companies c
cross join (values ('core'), ('transport')) as modules(module_key)
on conflict (company_id, module_key) do nothing;

alter table public.company_modules enable row level security;
alter table public.branches enable row level security;
alter table public.company_user_branches enable row level security;

drop policy if exists "company_modules_select_members" on public.company_modules;
create policy "company_modules_select_members"
on public.company_modules
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_modules.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
  )
);

drop policy if exists "company_modules_manage_admins" on public.company_modules;
create policy "company_modules_manage_admins"
on public.company_modules
for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_modules.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_modules.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin')
  )
);

drop policy if exists "branches_select_members" on public.branches;
create policy "branches_select_members"
on public.branches
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = branches.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
  )
);

drop policy if exists "branches_manage_admins" on public.branches;
create policy "branches_manage_admins"
on public.branches
for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = branches.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = branches.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin')
  )
);

drop policy if exists "company_user_branches_select_scoped" on public.company_user_branches;
create policy "company_user_branches_select_scoped"
on public.company_user_branches
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_user_branches.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin')
  )
);

drop policy if exists "company_user_branches_manage_admins" on public.company_user_branches;
create policy "company_user_branches_manage_admins"
on public.company_user_branches
for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_user_branches.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_user_branches.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin')
  )
);
