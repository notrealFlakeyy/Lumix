-- Harden RLS for driver-scoped access in an existing transport ERP project.
-- Safe to run in Supabase SQL Editor after the base transport ERP schema exists.

alter table public.drivers
add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists idx_drivers_company_auth_user_id
on public.drivers(company_id, auth_user_id)
where auth_user_id is not null;

create or replace function public.get_company_role(target_company_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select cu.role
  from public.company_users cu
  where cu.company_id = target_company_id
    and cu.user_id = auth.uid()
    and cu.is_active = true
  order by cu.created_at asc
  limit 1;
$$;

create or replace function public.get_current_driver_id(target_company_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
  from public.company_users cu
  left join public.profiles p on p.id = cu.user_id
  left join auth.users u on u.id = cu.user_id
  join public.drivers d
    on d.company_id = cu.company_id
   and d.is_active = true
  where cu.company_id = target_company_id
    and cu.user_id = auth.uid()
    and cu.is_active = true
    and cu.role = 'driver'
    and (
      d.auth_user_id = cu.user_id
      or lower(coalesce(d.email, '')) = lower(coalesce(u.email, ''))
      or lower(coalesce(d.full_name, '')) = lower(coalesce(p.full_name, ''))
    )
  order by
    case
      when d.auth_user_id = cu.user_id then 0
      when lower(coalesce(d.email, '')) = lower(coalesce(u.email, '')) then 1
      else 2
    end,
    d.created_at asc
  limit 1;
$$;

create or replace function public.can_driver_access_trip(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = target_trip_id
      and public.has_company_role(t.company_id, array['driver'])
      and t.driver_id = public.get_current_driver_id(t.company_id)
  );
$$;

create or replace function public.can_driver_access_transport_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.transport_orders o
    where o.id = target_order_id
      and public.has_company_role(o.company_id, array['driver'])
      and (
        o.assigned_driver_id = public.get_current_driver_id(o.company_id)
        or exists (
          select 1
          from public.trips t
          where t.company_id = o.company_id
            and t.transport_order_id = o.id
            and t.driver_id = public.get_current_driver_id(o.company_id)
        )
      )
  );
$$;

create or replace function public.can_driver_access_customer(target_company_id uuid, target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.company_id = target_company_id
      and t.customer_id = target_customer_id
      and public.has_company_role(t.company_id, array['driver'])
      and t.driver_id = public.get_current_driver_id(t.company_id)
  );
$$;

create or replace function public.can_driver_access_vehicle(target_company_id uuid, target_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.company_id = target_company_id
      and t.vehicle_id = target_vehicle_id
      and public.has_company_role(t.company_id, array['driver'])
      and t.driver_id = public.get_current_driver_id(t.company_id)
  );
$$;

create or replace function public.can_driver_access_invoice(target_invoice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invoices i
    join public.trips t on t.id = i.trip_id
    where i.id = target_invoice_id
      and public.has_company_role(i.company_id, array['driver'])
      and t.driver_id = public.get_current_driver_id(i.company_id)
  );
$$;

create or replace function public.can_driver_access_document(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.documents d
    where d.id = target_document_id
      and d.related_type = 'trip'
      and d.related_id is not null
      and public.can_driver_access_trip(d.related_id)
  );
$$;

create or replace function public.can_access_invoice(target_invoice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invoices i
    where i.id = target_invoice_id
      and (
        public.has_company_role(i.company_id, array['owner','admin','dispatcher','accountant','viewer'])
        or public.can_driver_access_invoice(i.id)
      )
  );
$$;

revoke all on function public.get_company_role(uuid) from public;
revoke all on function public.get_current_driver_id(uuid) from public;
revoke all on function public.can_driver_access_trip(uuid) from public;
revoke all on function public.can_driver_access_transport_order(uuid) from public;
revoke all on function public.can_driver_access_customer(uuid, uuid) from public;
revoke all on function public.can_driver_access_vehicle(uuid, uuid) from public;
revoke all on function public.can_driver_access_invoice(uuid) from public;
revoke all on function public.can_driver_access_document(uuid) from public;
revoke all on function public.can_access_invoice(uuid) from public;

grant execute on function public.get_company_role(uuid) to authenticated;
grant execute on function public.get_current_driver_id(uuid) to authenticated;
grant execute on function public.can_driver_access_trip(uuid) to authenticated;
grant execute on function public.can_driver_access_transport_order(uuid) to authenticated;
grant execute on function public.can_driver_access_customer(uuid, uuid) to authenticated;
grant execute on function public.can_driver_access_vehicle(uuid, uuid) to authenticated;
grant execute on function public.can_driver_access_invoice(uuid) to authenticated;
grant execute on function public.can_driver_access_document(uuid) to authenticated;
grant execute on function public.can_access_invoice(uuid) to authenticated;

drop policy if exists company_users_member_select on public.company_users;
drop policy if exists company_users_self_select on public.company_users;
create policy company_users_self_select
on public.company_users
for select
using (user_id = auth.uid());

drop policy if exists company_users_admin_select on public.company_users;
create policy company_users_admin_select
on public.company_users
for select
using (public.has_company_role(company_id, array['owner','admin']));

drop policy if exists customers_member_select on public.customers;
drop policy if exists customers_non_driver_select on public.customers;
create policy customers_non_driver_select
on public.customers
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists customers_driver_select on public.customers;
create policy customers_driver_select
on public.customers
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_customer(company_id, id)
);

drop policy if exists vehicles_member_select on public.vehicles;
drop policy if exists vehicles_non_driver_select on public.vehicles;
create policy vehicles_non_driver_select
on public.vehicles
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists vehicles_driver_select on public.vehicles;
create policy vehicles_driver_select
on public.vehicles
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_vehicle(company_id, id)
);

drop policy if exists drivers_member_select on public.drivers;
drop policy if exists drivers_non_driver_select on public.drivers;
create policy drivers_non_driver_select
on public.drivers
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists drivers_self_select on public.drivers;
create policy drivers_self_select
on public.drivers
for select
using (
  public.has_company_role(company_id, array['driver'])
  and id = public.get_current_driver_id(company_id)
);

drop policy if exists transport_orders_member_select on public.transport_orders;
drop policy if exists transport_orders_non_driver_select on public.transport_orders;
create policy transport_orders_non_driver_select
on public.transport_orders
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists transport_orders_driver_select on public.transport_orders;
create policy transport_orders_driver_select
on public.transport_orders
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_transport_order(id)
);

drop policy if exists trips_member_select on public.trips;
drop policy if exists trips_non_driver_select on public.trips;
create policy trips_non_driver_select
on public.trips
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists trips_driver_select on public.trips;
create policy trips_driver_select
on public.trips
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_trip(id)
);

drop policy if exists trips_manage on public.trips;
drop policy if exists trips_operations_manage on public.trips;
create policy trips_operations_manage
on public.trips
for all
using (public.has_company_role(company_id, array['owner','admin','dispatcher']))
with check (public.has_company_role(company_id, array['owner','admin','dispatcher']));

drop policy if exists trips_driver_update on public.trips;
create policy trips_driver_update
on public.trips
for update
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_trip(id)
)
with check (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_trip(id)
);

drop policy if exists invoices_member_select on public.invoices;
drop policy if exists invoices_non_driver_select on public.invoices;
create policy invoices_non_driver_select
on public.invoices
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists invoices_driver_select on public.invoices;
create policy invoices_driver_select
on public.invoices
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_invoice(id)
);

drop policy if exists payments_member_select on public.payments;
drop policy if exists payments_non_driver_select on public.payments;
create policy payments_non_driver_select
on public.payments
for select
using (public.has_company_role(company_id, array['owner','admin','accountant','viewer']));

drop policy if exists documents_member_select on public.documents;
drop policy if exists documents_non_driver_select on public.documents;
create policy documents_non_driver_select
on public.documents
for select
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer']));

drop policy if exists documents_driver_select on public.documents;
create policy documents_driver_select
on public.documents
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_document(id)
);

drop policy if exists documents_manage on public.documents;
drop policy if exists documents_ops_manage on public.documents;
create policy documents_ops_manage
on public.documents
for all
using (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant']))
with check (public.has_company_role(company_id, array['owner','admin','dispatcher','accountant']));

drop policy if exists documents_driver_insert on public.documents;
create policy documents_driver_insert
on public.documents
for insert
with check (
  public.has_company_role(company_id, array['driver'])
  and related_type = 'trip'
  and related_id is not null
  and public.can_driver_access_trip(related_id)
);

drop policy if exists audit_logs_member_select on public.audit_logs;
drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select
on public.audit_logs
for select
using (public.has_company_role(company_id, array['owner','admin']));

comment on policy trips_driver_update on public.trips is 'Drivers can only update trips assigned to their matched driver row.';
comment on policy documents_driver_insert on public.documents is 'Drivers can only upload documents for their own assigned trips.';
