create table if not exists public.sales_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  quote_number text not null,
  title text not null,
  pickup_location text not null,
  delivery_location text not null,
  cargo_description text,
  issue_date date not null default current_date,
  valid_until date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  subtotal numeric(12,2) not null default 0,
  vat_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  converted_order_id uuid references public.transport_orders(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.sales_quotes(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 25.5,
  line_total numeric(12,2) not null default 0
);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'sales_quotes'
      and constraint_name = 'sales_quotes_company_quote_number_unique'
  ) then
    alter table public.sales_quotes
      add constraint sales_quotes_company_quote_number_unique unique (company_id, quote_number);
  end if;
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_sales_quotes_company_id on public.sales_quotes(company_id);
create index if not exists idx_sales_quotes_branch_id on public.sales_quotes(branch_id);
create index if not exists idx_sales_quotes_customer_id on public.sales_quotes(customer_id);
create index if not exists idx_sales_quotes_status on public.sales_quotes(status);
create index if not exists idx_sales_quotes_issue_date on public.sales_quotes(issue_date desc);
create index if not exists idx_sales_quote_items_quote_id on public.sales_quote_items(quote_id);

drop trigger if exists sales_quotes_updated_at on public.sales_quotes;
create trigger sales_quotes_updated_at
before update on public.sales_quotes
for each row
execute function public.set_updated_at();
