create table if not exists public.purchase_vendors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  name text not null,
  business_id text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text not null default 'FI',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  vendor_id uuid not null references public.purchase_vendors(id) on delete restrict,
  invoice_number text not null,
  invoice_date date not null,
  due_date date,
  status text not null check (status in ('draft','approved','partially_paid','paid','cancelled')),
  reference_number text,
  subtotal numeric(12,2) not null default 0,
  vat_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  received_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, invoice_number)
);

create table if not exists public.purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  purchase_invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  inventory_product_id uuid references public.inventory_products(id) on delete set null,
  description text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 25.50,
  line_total numeric(12,2) not null default 0,
  received_to_stock boolean not null default false
);

create table if not exists public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  purchase_invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  payment_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_purchase_vendors_company_id on public.purchase_vendors(company_id);
create index if not exists idx_purchase_vendors_branch_id on public.purchase_vendors(branch_id);
create index if not exists idx_purchase_invoices_company_id on public.purchase_invoices(company_id);
create index if not exists idx_purchase_invoices_branch_id on public.purchase_invoices(branch_id);
create index if not exists idx_purchase_invoices_vendor_id on public.purchase_invoices(vendor_id);
create index if not exists idx_purchase_invoice_items_invoice_id on public.purchase_invoice_items(purchase_invoice_id);
create index if not exists idx_purchase_invoice_items_product_id on public.purchase_invoice_items(inventory_product_id);
create index if not exists idx_purchase_payments_company_id on public.purchase_payments(company_id);
create index if not exists idx_purchase_payments_invoice_id on public.purchase_payments(purchase_invoice_id);

drop trigger if exists purchase_vendors_updated_at on public.purchase_vendors;
create trigger purchase_vendors_updated_at
before update on public.purchase_vendors
for each row
execute function public.set_updated_at();

drop trigger if exists purchase_invoices_updated_at on public.purchase_invoices;
create trigger purchase_invoices_updated_at
before update on public.purchase_invoices
for each row
execute function public.set_updated_at();

alter table public.purchase_vendors enable row level security;
alter table public.purchase_invoices enable row level security;
alter table public.purchase_invoice_items enable row level security;
alter table public.purchase_payments enable row level security;

drop policy if exists "purchase_vendors_select" on public.purchase_vendors;
create policy "purchase_vendors_select"
on public.purchase_vendors
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = purchase_vendors.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role <> 'driver'
      and public.has_branch_access(purchase_vendors.company_id, purchase_vendors.branch_id)
  )
);

drop policy if exists "purchase_vendors_manage" on public.purchase_vendors;
create policy "purchase_vendors_manage"
on public.purchase_vendors
for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = purchase_vendors.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher','accountant')
      and public.has_branch_access(purchase_vendors.company_id, purchase_vendors.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = purchase_vendors.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher','accountant')
      and public.has_branch_access(purchase_vendors.company_id, purchase_vendors.branch_id)
  )
);

drop policy if exists "purchase_invoices_select" on public.purchase_invoices;
create policy "purchase_invoices_select"
on public.purchase_invoices
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = purchase_invoices.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role <> 'driver'
      and public.has_branch_access(purchase_invoices.company_id, purchase_invoices.branch_id)
  )
);

drop policy if exists "purchase_invoices_manage" on public.purchase_invoices;
create policy "purchase_invoices_manage"
on public.purchase_invoices
for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = purchase_invoices.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher','accountant')
      and public.has_branch_access(purchase_invoices.company_id, purchase_invoices.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = purchase_invoices.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher','accountant')
      and public.has_branch_access(purchase_invoices.company_id, purchase_invoices.branch_id)
  )
);

drop policy if exists "purchase_invoice_items_select" on public.purchase_invoice_items;
create policy "purchase_invoice_items_select"
on public.purchase_invoice_items
for select
to authenticated
using (
  exists (
    select 1
    from public.purchase_invoices pi
    join public.company_users cu on cu.company_id = pi.company_id
    where pi.id = purchase_invoice_items.purchase_invoice_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role <> 'driver'
      and public.has_branch_access(pi.company_id, pi.branch_id)
  )
);

drop policy if exists "purchase_invoice_items_manage" on public.purchase_invoice_items;
create policy "purchase_invoice_items_manage"
on public.purchase_invoice_items
for all
to authenticated
using (
  exists (
    select 1
    from public.purchase_invoices pi
    join public.company_users cu on cu.company_id = pi.company_id
    where pi.id = purchase_invoice_items.purchase_invoice_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher','accountant')
      and public.has_branch_access(pi.company_id, pi.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.purchase_invoices pi
    join public.company_users cu on cu.company_id = pi.company_id
    where pi.id = purchase_invoice_items.purchase_invoice_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher','accountant')
      and public.has_branch_access(pi.company_id, pi.branch_id)
  )
);

drop policy if exists "purchase_payments_select" on public.purchase_payments;
create policy "purchase_payments_select"
on public.purchase_payments
for select
to authenticated
using (
  exists (
    select 1
    from public.purchase_invoices pi
    join public.company_users cu on cu.company_id = pi.company_id
    where pi.id = purchase_payments.purchase_invoice_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role <> 'driver'
      and public.has_branch_access(pi.company_id, pi.branch_id)
  )
);

drop policy if exists "purchase_payments_manage" on public.purchase_payments;
create policy "purchase_payments_manage"
on public.purchase_payments
for all
to authenticated
using (
  exists (
    select 1
    from public.purchase_invoices pi
    join public.company_users cu on cu.company_id = pi.company_id
    where pi.id = purchase_payments.purchase_invoice_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher','accountant')
      and public.has_branch_access(pi.company_id, pi.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.purchase_invoices pi
    join public.company_users cu on cu.company_id = pi.company_id
    where pi.id = purchase_payments.purchase_invoice_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher','accountant')
      and public.has_branch_access(pi.company_id, pi.branch_id)
  )
);
