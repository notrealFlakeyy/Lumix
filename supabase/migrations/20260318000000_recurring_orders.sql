-- Recurring order templates
create table if not exists public.recurring_order_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  pickup_location text not null,
  delivery_location text not null,
  cargo_description text,
  notes text,
  recurrence_rule text not null check (recurrence_rule in ('daily', 'weekly', 'biweekly', 'monthly')),
  recurrence_day_of_week smallint check (recurrence_day_of_week between 0 and 6),
  recurrence_day_of_month smallint check (recurrence_day_of_month between 1 and 31),
  next_occurrence_date date not null,
  is_active boolean not null default true,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recurring_order_templates_company_id on public.recurring_order_templates(company_id);

-- RLS
alter table public.recurring_order_templates enable row level security;

create policy "company_members_can_read_recurring_templates"
  on public.recurring_order_templates for select
  using (company_id in (select company_id from public.company_users where user_id = auth.uid() and is_active = true));

create policy "company_members_can_insert_recurring_templates"
  on public.recurring_order_templates for insert
  with check (company_id in (select company_id from public.company_users where user_id = auth.uid() and is_active = true));

create policy "company_members_can_update_recurring_templates"
  on public.recurring_order_templates for update
  using (company_id in (select company_id from public.company_users where user_id = auth.uid() and is_active = true));

create policy "company_members_can_delete_recurring_templates"
  on public.recurring_order_templates for delete
  using (company_id in (select company_id from public.company_users where user_id = auth.uid() and is_active = true));

-- Updated at trigger
drop trigger if exists set_recurring_order_templates_updated_at on public.recurring_order_templates;
create trigger set_recurring_order_templates_updated_at before update on public.recurring_order_templates
  for each row execute function public.set_updated_at();
