create or replace function public.has_branch_access(target_company_id uuid, target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.company_user_branches cub
      where cub.company_id = target_company_id
        and cub.user_id = auth.uid()
    ) then (
      target_branch_id is not null
      and exists (
        select 1
        from public.company_user_branches cub
        join public.branches b on b.id = cub.branch_id
        where cub.company_id = target_company_id
          and cub.user_id = auth.uid()
          and cub.branch_id = target_branch_id
          and b.company_id = target_company_id
          and b.is_active = true
      )
    )
    else true
  end;
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
      and public.has_branch_access(t.company_id, t.branch_id)
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
      and public.has_branch_access(o.company_id, o.branch_id)
      and (
        o.assigned_driver_id = public.get_current_driver_id(o.company_id)
        or exists (
          select 1
          from public.trips t
          where t.company_id = o.company_id
            and t.transport_order_id = o.id
            and t.driver_id = public.get_current_driver_id(o.company_id)
            and public.has_branch_access(t.company_id, t.branch_id)
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
      and public.can_driver_access_trip(t.id)
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
      and public.can_driver_access_trip(t.id)
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
      and public.has_branch_access(i.company_id, i.branch_id)
      and t.driver_id = public.get_current_driver_id(i.company_id)
  );
$$;

create or replace function public.can_access_transport_order(target_order_id uuid)
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
      and public.has_branch_access(o.company_id, o.branch_id)
      and (
        public.has_company_role(o.company_id, array['owner','admin','dispatcher','accountant','viewer'])
        or public.can_driver_access_transport_order(o.id)
      )
  );
$$;

create or replace function public.can_access_trip(target_trip_id uuid)
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
      and public.has_branch_access(t.company_id, t.branch_id)
      and (
        public.has_company_role(t.company_id, array['owner','admin','dispatcher','accountant','viewer'])
        or public.can_driver_access_trip(t.id)
      )
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
      and public.has_branch_access(i.company_id, i.branch_id)
      and (
        public.has_company_role(i.company_id, array['owner','admin','dispatcher','accountant','viewer'])
        or public.can_driver_access_invoice(i.id)
      )
  );
$$;

revoke all on function public.has_branch_access(uuid, uuid) from public;
revoke all on function public.can_driver_access_trip(uuid) from public;
revoke all on function public.can_driver_access_transport_order(uuid) from public;
revoke all on function public.can_driver_access_customer(uuid, uuid) from public;
revoke all on function public.can_driver_access_vehicle(uuid, uuid) from public;
revoke all on function public.can_driver_access_invoice(uuid) from public;
revoke all on function public.can_access_transport_order(uuid) from public;
revoke all on function public.can_access_trip(uuid) from public;
revoke all on function public.can_access_invoice(uuid) from public;

grant execute on function public.has_branch_access(uuid, uuid) to authenticated;
grant execute on function public.can_driver_access_trip(uuid) to authenticated;
grant execute on function public.can_driver_access_transport_order(uuid) to authenticated;
grant execute on function public.can_driver_access_customer(uuid, uuid) to authenticated;
grant execute on function public.can_driver_access_vehicle(uuid, uuid) to authenticated;
grant execute on function public.can_driver_access_invoice(uuid) to authenticated;
grant execute on function public.can_access_transport_order(uuid) to authenticated;
grant execute on function public.can_access_trip(uuid) to authenticated;
grant execute on function public.can_access_invoice(uuid) to authenticated;

drop policy if exists transport_orders_non_driver_select on public.transport_orders;
create policy transport_orders_non_driver_select
on public.transport_orders
for select
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists transport_orders_driver_select on public.transport_orders;
create policy transport_orders_driver_select
on public.transport_orders
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_transport_order(id)
);

drop policy if exists transport_orders_manage on public.transport_orders;
create policy transport_orders_manage
on public.transport_orders
for all
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
)
with check (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists trips_non_driver_select on public.trips;
create policy trips_non_driver_select
on public.trips
for select
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists trips_driver_select on public.trips;
create policy trips_driver_select
on public.trips
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_trip(id)
);

drop policy if exists trips_operations_manage on public.trips;
create policy trips_operations_manage
on public.trips
for all
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
)
with check (
  public.has_company_role(company_id, array['owner','admin','dispatcher'])
  and public.has_branch_access(company_id, branch_id)
);

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

drop policy if exists invoices_non_driver_select on public.invoices;
create policy invoices_non_driver_select
on public.invoices
for select
using (
  public.has_company_role(company_id, array['owner','admin','dispatcher','accountant','viewer'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists invoices_driver_select on public.invoices;
create policy invoices_driver_select
on public.invoices
for select
using (
  public.has_company_role(company_id, array['driver'])
  and public.can_driver_access_invoice(id)
);

drop policy if exists invoices_manage on public.invoices;
create policy invoices_manage
on public.invoices
for all
using (
  public.has_company_role(company_id, array['owner','admin','accountant'])
  and public.has_branch_access(company_id, branch_id)
)
with check (
  public.has_company_role(company_id, array['owner','admin','accountant'])
  and public.has_branch_access(company_id, branch_id)
);

drop policy if exists invoice_items_member_select on public.invoice_items;
create policy invoice_items_member_select
on public.invoice_items
for select
using (public.can_access_invoice(invoice_id));

drop policy if exists invoice_items_manage on public.invoice_items;
create policy invoice_items_manage
on public.invoice_items
for all
using (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and public.has_company_role(i.company_id, array['owner','admin','accountant'])
      and public.has_branch_access(i.company_id, i.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.invoices i
    where i.id = invoice_items.invoice_id
      and public.has_company_role(i.company_id, array['owner','admin','accountant'])
      and public.has_branch_access(i.company_id, i.branch_id)
  )
);

drop policy if exists payments_non_driver_select on public.payments;
create policy payments_non_driver_select
on public.payments
for select
using (
  public.has_company_role(company_id, array['owner','admin','accountant','viewer'])
  and exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and i.company_id = payments.company_id
      and public.has_branch_access(i.company_id, i.branch_id)
  )
);

drop policy if exists payments_manage on public.payments;
create policy payments_manage
on public.payments
for all
using (
  public.has_company_role(company_id, array['owner','admin','accountant'])
  and exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and i.company_id = payments.company_id
      and public.has_branch_access(i.company_id, i.branch_id)
  )
)
with check (
  public.has_company_role(company_id, array['owner','admin','accountant'])
  and exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and i.company_id = payments.company_id
      and public.has_branch_access(i.company_id, i.branch_id)
  )
);

comment on function public.has_branch_access(uuid, uuid) is 'Returns true when the current user can access the target branch for a company. Users without explicit branch assignments keep full-company access.';
comment on policy transport_orders_manage on public.transport_orders is 'Operations users can only manage transport orders inside their permitted branch scope.';
comment on policy trips_operations_manage on public.trips is 'Operations users can only manage trips inside their permitted branch scope.';
comment on policy invoices_manage on public.invoices is 'Finance users can only manage invoices inside their permitted branch scope.';
comment on policy payments_manage on public.payments is 'Finance users can only manage payments when the linked invoice is inside their permitted branch scope.';
