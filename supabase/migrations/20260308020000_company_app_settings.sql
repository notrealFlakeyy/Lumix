create table if not exists public.company_app_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  order_prefix text not null default 'ORD',
  order_next_number integer not null default 1 check (order_next_number > 0),
  invoice_prefix text not null default 'INV',
  invoice_next_number integer not null default 1 check (invoice_next_number > 0),
  default_payment_terms_days integer not null default 14 check (default_payment_terms_days >= 0),
  default_vat_rate numeric(5,2) not null default 25.50 check (default_vat_rate >= 0),
  fuel_cost_per_km numeric(8,2) not null default 0.42,
  maintenance_cost_per_km numeric(8,2) not null default 0.18,
  driver_cost_per_hour numeric(8,2) not null default 32.00,
  waiting_cost_per_hour numeric(8,2) not null default 24.00,
  default_currency text not null default 'EUR',
  invoice_footer text,
  brand_accent text not null default '#0f172a',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.company_app_settings (
  company_id,
  order_next_number,
  invoice_next_number
)
select
  c.id,
  greatest(
    1,
    coalesce((
      select max(
        nullif(regexp_replace(o.order_number, '\D', '', 'g'), '')::integer
      )
      from public.transport_orders o
      where o.company_id = c.id
    ), 0) + 1
  ),
  greatest(
    1,
    coalesce((
      select max(
        nullif(regexp_replace(i.invoice_number, '\D', '', 'g'), '')::integer
      )
      from public.invoices i
      where i.company_id = c.id
    ), 0) + 1
  )
from public.companies c
on conflict (company_id) do update
set
  order_next_number = excluded.order_next_number,
  invoice_next_number = excluded.invoice_next_number;

drop trigger if exists set_company_app_settings_updated_at on public.company_app_settings;
create trigger set_company_app_settings_updated_at
before update on public.company_app_settings
for each row execute function public.set_updated_at();

alter table public.company_app_settings enable row level security;

drop policy if exists company_app_settings_select on public.company_app_settings;
create policy company_app_settings_select
on public.company_app_settings
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant']));

drop policy if exists company_app_settings_manage on public.company_app_settings;
create policy company_app_settings_manage
on public.company_app_settings
for all
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant']))
with check (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant']));
