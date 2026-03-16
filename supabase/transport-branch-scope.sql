alter table if exists public.transport_orders
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table if exists public.trips
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table if exists public.invoices
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

create index if not exists idx_transport_orders_branch_id on public.transport_orders(branch_id);
create index if not exists idx_trips_branch_id on public.trips(branch_id);
create index if not exists idx_invoices_branch_id on public.invoices(branch_id);

with single_branch_companies as (
  select company_id, (array_agg(id order by id))[1] as branch_id
  from public.branches
  where is_active = true
  group by company_id
  having count(*) = 1
)
update public.transport_orders o
set branch_id = sbc.branch_id
from single_branch_companies sbc
where o.company_id = sbc.company_id
  and o.branch_id is null;

update public.trips t
set branch_id = o.branch_id
from public.transport_orders o
where t.transport_order_id = o.id
  and t.company_id = o.company_id
  and t.branch_id is null
  and o.branch_id is not null;

with single_branch_companies as (
  select company_id, (array_agg(id order by id))[1] as branch_id
  from public.branches
  where is_active = true
  group by company_id
  having count(*) = 1
)
update public.trips t
set branch_id = sbc.branch_id
from single_branch_companies sbc
where t.company_id = sbc.company_id
  and t.branch_id is null;

update public.invoices i
set branch_id = t.branch_id
from public.trips t
where i.trip_id = t.id
  and i.company_id = t.company_id
  and i.branch_id is null
  and t.branch_id is not null;

with single_branch_companies as (
  select company_id, (array_agg(id order by id))[1] as branch_id
  from public.branches
  where is_active = true
  group by company_id
  having count(*) = 1
)
update public.invoices i
set branch_id = sbc.branch_id
from single_branch_companies sbc
where i.company_id = sbc.company_id
  and i.branch_id is null;
