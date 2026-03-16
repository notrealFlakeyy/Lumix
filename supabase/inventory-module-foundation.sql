create table if not exists public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  sku text not null,
  name text not null,
  category text,
  unit text not null default 'pcs',
  reorder_level numeric(12,2) not null default 0,
  cost_price numeric(12,2) not null default 0,
  sale_price numeric(12,2),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, sku)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  product_id uuid not null references public.inventory_products(id) on delete cascade,
  movement_type text not null check (movement_type in ('receipt','issue','adjustment_in','adjustment_out','transfer_in','transfer_out')),
  quantity numeric(12,2) not null check (quantity > 0),
  unit_cost numeric(12,2),
  reference text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_products_company_id on public.inventory_products(company_id);
create index if not exists idx_inventory_products_branch_id on public.inventory_products(branch_id);
create index if not exists idx_inventory_movements_company_id on public.inventory_movements(company_id);
create index if not exists idx_inventory_movements_branch_id on public.inventory_movements(branch_id);
create index if not exists idx_inventory_movements_product_id on public.inventory_movements(product_id);
create index if not exists idx_inventory_movements_occurred_at on public.inventory_movements(occurred_at desc);

drop trigger if exists inventory_products_updated_at on public.inventory_products;
create trigger inventory_products_updated_at
before update on public.inventory_products
for each row
execute function public.set_updated_at();

alter table public.inventory_products enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists "inventory_products_select" on public.inventory_products;
create policy "inventory_products_select"
on public.inventory_products
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = inventory_products.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role <> 'driver'
      and public.has_branch_access(inventory_products.company_id, inventory_products.branch_id)
  )
);

drop policy if exists "inventory_products_manage" on public.inventory_products;
create policy "inventory_products_manage"
on public.inventory_products
for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = inventory_products.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher')
      and public.has_branch_access(inventory_products.company_id, inventory_products.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = inventory_products.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher')
      and public.has_branch_access(inventory_products.company_id, inventory_products.branch_id)
  )
);

drop policy if exists "inventory_movements_select" on public.inventory_movements;
create policy "inventory_movements_select"
on public.inventory_movements
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = inventory_movements.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role <> 'driver'
      and public.has_branch_access(inventory_movements.company_id, inventory_movements.branch_id)
  )
);

drop policy if exists "inventory_movements_insert" on public.inventory_movements;
create policy "inventory_movements_insert"
on public.inventory_movements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = inventory_movements.company_id
      and cu.user_id = auth.uid()
      and cu.is_active = true
      and cu.role in ('owner','admin','dispatcher')
      and public.has_branch_access(inventory_movements.company_id, inventory_movements.branch_id)
  )
);
