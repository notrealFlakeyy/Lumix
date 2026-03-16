alter table if exists public.customers
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table if exists public.vehicles
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table if exists public.drivers
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table if exists public.documents
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

create index if not exists idx_customers_branch_id on public.customers(branch_id);
create index if not exists idx_vehicles_branch_id on public.vehicles(branch_id);
create index if not exists idx_drivers_branch_id on public.drivers(branch_id);
create index if not exists idx_documents_branch_id on public.documents(branch_id);

with single_branch_companies as (
  select company_id, (array_agg(id order by id))[1] as branch_id
  from public.branches
  where is_active = true
  group by company_id
  having count(*) = 1
)
update public.customers c
set branch_id = sbc.branch_id
from single_branch_companies sbc
where c.company_id = sbc.company_id
  and c.branch_id is null;

with single_branch_companies as (
  select company_id, (array_agg(id order by id))[1] as branch_id
  from public.branches
  where is_active = true
  group by company_id
  having count(*) = 1
)
update public.vehicles v
set branch_id = sbc.branch_id
from single_branch_companies sbc
where v.company_id = sbc.company_id
  and v.branch_id is null;

with single_branch_companies as (
  select company_id, (array_agg(id order by id))[1] as branch_id
  from public.branches
  where is_active = true
  group by company_id
  having count(*) = 1
)
update public.drivers d
set branch_id = sbc.branch_id
from single_branch_companies sbc
where d.company_id = sbc.company_id
  and d.branch_id is null;

update public.documents d
set branch_id = t.branch_id
from public.trips t
where d.related_type = 'trip'
  and d.related_id = t.id
  and d.company_id = t.company_id
  and d.branch_id is null
  and t.branch_id is not null;

update public.documents d
set branch_id = i.branch_id
from public.invoices i
where d.related_type = 'invoice'
  and d.related_id = i.id
  and d.company_id = i.company_id
  and d.branch_id is null
  and i.branch_id is not null;

update public.documents d
set branch_id = o.branch_id
from public.transport_orders o
where d.related_type = 'order'
  and d.related_id = o.id
  and d.company_id = o.company_id
  and d.branch_id is null
  and o.branch_id is not null;

with single_branch_companies as (
  select company_id, (array_agg(id order by id))[1] as branch_id
  from public.branches
  where is_active = true
  group by company_id
  having count(*) = 1
)
update public.documents d
set branch_id = sbc.branch_id
from single_branch_companies sbc
where d.company_id = sbc.company_id
  and d.branch_id is null;

drop policy if exists customers_non_driver_select on public.customers;
create policy customers_non_driver_select
on public.customers
for select
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists customers_manage on public.customers;
create policy customers_manage
on public.customers
for all
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
)
with check (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists vehicles_non_driver_select on public.vehicles;
create policy vehicles_non_driver_select
on public.vehicles
for select
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists vehicles_manage on public.vehicles;
create policy vehicles_manage
on public.vehicles
for all
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
)
with check (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists drivers_non_driver_select on public.drivers;
create policy drivers_non_driver_select
on public.drivers
for select
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists drivers_self_select on public.drivers;
create policy drivers_self_select
on public.drivers
for select
using (
  public.has_company_role(company_id, array['driver'])
  and id = public.get_current_driver_id(company_id)
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists drivers_manage on public.drivers;
create policy drivers_manage
on public.drivers
for all
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
)
with check (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists documents_non_driver_select on public.documents;
create policy documents_non_driver_select
on public.documents
for select
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists documents_ops_manage on public.documents;
create policy documents_ops_manage
on public.documents
for all
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher','accountant'])
  and public.has_branch_access(company_id, branch_id)
)
with check (
  public.has_company_role(company_id, array['owner','admin','dispatcher','accountant'])
  and public.has_branch_access(company_id, branch_id)
);

comment on policy customers_manage on public.customers is 'Operations users can only manage customers inside their permitted branch scope.';
comment on policy vehicles_manage on public.vehicles is 'Operations users can only manage vehicles inside their permitted branch scope.';
comment on policy drivers_manage on public.drivers is 'Operations users can only manage drivers inside their permitted branch scope.';
comment on policy documents_ops_manage on public.documents is 'Operations users can only manage documents inside their permitted branch scope.';
