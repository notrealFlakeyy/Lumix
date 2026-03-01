-- Lumix MVP: multi-tenant finance back-office schema (Supabase/Postgres)
-- Timezone: Europe/Helsinki (handled at application level; store timestamptz in UTC)

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type org_role as enum ('owner', 'admin', 'accountant', 'sales', 'purchaser', 'employee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_status as enum ('draft', 'sent', 'paid', 'overdue', 'approved', 'rejected', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gl_account_type as enum ('asset', 'liability', 'equity', 'income', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gl_source_type as enum ('manual', 'ar_invoice', 'ap_invoice', 'payroll', 'inventory', 'bank_import');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_action as enum ('create', 'update', 'delete', 'post', 'void', 'approve', 'reject', 'pay', 'allocate', 'import');
exception when duplicate_object then null; end $$;

-- Core: orgs + membership
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null default 'FI',
  base_currency text not null default 'EUR',
  timezone text not null default 'Europe/Helsinki',
  created_at timestamptz not null default now()
);

create table if not exists org_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'employee',
  full_name text,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists org_members_user_id_idx on org_members(user_id);

-- Simple accounting lock (period close)
create table if not exists accounting_locks (
  org_id uuid primary key references organizations(id) on delete cascade,
  locked_until date,
  updated_at timestamptz not null default now()
);

-- Audit log (money/ledger affecting actions + CRUD)
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  org_id uuid references organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action audit_action not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_org_created_idx on audit_log(org_id, created_at desc);
create index if not exists audit_log_table_record_idx on audit_log(table_name, record_id);

-- GL: chart of accounts + journal entries (double-entry)
create table if not exists gl_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  number text not null,
  name text not null,
  type gl_account_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, number)
);

create index if not exists gl_accounts_org_type_idx on gl_accounts(org_id, type);

create table if not exists gl_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  entry_date date not null,
  description text not null,
  source_type gl_source_type not null default 'manual',
  source_id uuid,
  posted_by uuid references auth.users(id) on delete set null,
  posted_at timestamptz,
  is_reversing boolean not null default false,
  reversed_entry_id uuid references gl_entries(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists gl_entries_org_date_idx on gl_entries(org_id, entry_date desc);
create index if not exists gl_entries_source_idx on gl_entries(source_type, source_id);

create table if not exists gl_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  entry_id uuid not null references gl_entries(id) on delete cascade,
  account_id uuid not null references gl_accounts(id) on delete restrict,
  description text,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  dimensions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint gl_lines_debit_credit_check check (
    debit >= 0 and credit >= 0 and not (debit > 0 and credit > 0)
  )
);

create index if not exists gl_lines_entry_idx on gl_lines(entry_id);
create index if not exists gl_lines_org_account_idx on gl_lines(org_id, account_id);

-- AR: customers, products, invoices, payments, reminders
create table if not exists ar_customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ar_customers_org_name_idx on ar_customers(org_id, name);

create table if not exists ar_products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  sku text,
  vat_rate numeric(6,3) not null default 24.000,
  unit_price numeric(14,2) not null default 0,
  revenue_account_no text not null default '3000',
  vat_account_no text not null default '2930',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ar_products_org_name_idx on ar_products(org_id, name);

create table if not exists ar_invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references ar_customers(id) on delete set null,
  invoice_number text not null,
  reference_number text,
  issue_date date not null default (now() at time zone 'utc')::date,
  due_date date,
  currency text not null default 'EUR',
  notes text,
  subtotal numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  status doc_status not null default 'draft',
  posted_entry_id uuid references gl_entries(id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, invoice_number)
);

create index if not exists ar_invoices_org_status_idx on ar_invoices(org_id, status);
create index if not exists ar_invoices_org_due_idx on ar_invoices(org_id, due_date);

create table if not exists ar_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references ar_invoices(id) on delete cascade,
  product_id uuid references ar_products(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  vat_rate numeric(6,3) not null default 0,
  line_subtotal numeric(14,2) not null default 0,
  line_vat numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ar_invoice_lines_invoice_idx on ar_invoice_lines(invoice_id);

create table if not exists ar_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  payment_date date not null,
  amount numeric(14,2) not null,
  currency text not null default 'EUR',
  reference_number text,
  method text not null default 'manual',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ar_payments_org_date_idx on ar_payments(org_id, payment_date desc);

create table if not exists ar_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  payment_id uuid not null references ar_payments(id) on delete cascade,
  invoice_id uuid not null references ar_invoices(id) on delete restrict,
  amount numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique (payment_id, invoice_id)
);

create index if not exists ar_payment_allocations_invoice_idx on ar_payment_allocations(invoice_id);

create table if not exists ar_reminders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references ar_invoices(id) on delete cascade,
  reminder_no integer not null default 1,
  document_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- AP: vendors + purchase invoices + approvals + payments
create table if not exists ap_vendors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ap_vendors_org_name_idx on ap_vendors(org_id, name);

create table if not exists ap_invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  vendor_id uuid references ap_vendors(id) on delete set null,
  vendor_invoice_number text,
  issue_date date not null default (now() at time zone 'utc')::date,
  due_date date,
  currency text not null default 'EUR',
  notes text,
  subtotal numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  status doc_status not null default 'draft',
  posted_entry_id uuid references gl_entries(id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ap_invoices_org_status_idx on ap_invoices(org_id, status);
create index if not exists ap_invoices_org_due_idx on ap_invoices(org_id, due_date);

create table if not exists ap_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references ap_invoices(id) on delete cascade,
  description text not null,
  quantity numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  vat_rate numeric(6,3) not null default 0,
  expense_account_no text not null default '4000',
  vat_account_no text not null default '1570',
  line_subtotal numeric(14,2) not null default 0,
  line_vat numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ap_invoice_lines_invoice_idx on ap_invoice_lines(invoice_id);

create table if not exists ap_approval_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  min_amount numeric(14,2) not null default 0,
  required_role org_role not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists ap_approval_steps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references ap_invoices(id) on delete cascade,
  approver_user_id uuid not null references auth.users(id) on delete cascade,
  status doc_status not null default 'draft', -- approved/rejected used here; draft = pending
  decided_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (invoice_id, approver_user_id)
);

create table if not exists ap_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references ap_invoices(id) on delete restrict,
  payment_date date not null,
  amount numeric(14,2) not null,
  currency text not null default 'EUR',
  method text not null default 'manual',
  exported_payment_file boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Inventory (basic)
create table if not exists inv_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  sku text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inv_warehouses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists inv_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  item_id uuid not null references inv_items(id) on delete restrict,
  warehouse_id uuid references inv_warehouses(id) on delete set null,
  movement_date date not null,
  qty numeric(14,3) not null,
  unit_cost numeric(14,2),
  reason text not null default 'manual',
  source_type gl_source_type not null default 'inventory',
  source_id uuid,
  created_at timestamptz not null default now()
);

-- Payroll (simplified)
create table if not exists hr_employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  email text,
  hourly_rate numeric(14,2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pay_time_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references hr_employees(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz,
  minutes integer not null default 0,
  status doc_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists pay_expense_claims (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references hr_employees(id) on delete cascade,
  claim_date date not null,
  description text not null,
  amount numeric(14,2) not null,
  currency text not null default 'EUR',
  status doc_status not null default 'draft',
  receipt_path text,
  created_at timestamptz not null default now()
);

create table if not exists pay_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  pay_date date not null,
  currency text not null default 'EUR',
  status doc_status not null default 'draft',
  total_gross numeric(14,2) not null default 0,
  total_net numeric(14,2) not null default 0,
  posted_entry_id uuid references gl_entries(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists pay_payslips (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  run_id uuid not null references pay_runs(id) on delete cascade,
  employee_id uuid not null references hr_employees(id) on delete cascade,
  gross numeric(14,2) not null default 0,
  net numeric(14,2) not null default 0,
  document_path text,
  created_at timestamptz not null default now()
);

-- Budgets (basic)
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  year integer not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, year, name)
);

create table if not exists budget_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  budget_id uuid not null references budgets(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  account_no text not null,
  amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Storage metadata (Supabase Storage is the blob store; paths are stored here)
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  bucket text not null,
  path text not null,
  mime_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

-- Helper functions for RLS
create or replace function is_org_member(p_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from org_members m
    where m.org_id = p_org_id and m.user_id = auth.uid()
  );
$$;

create or replace function has_org_role(p_org_id uuid, p_roles org_role[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from org_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role = any(p_roles)
  );
$$;

-- RLS enable
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table accounting_locks enable row level security;
alter table audit_log enable row level security;
alter table gl_accounts enable row level security;
alter table gl_entries enable row level security;
alter table gl_lines enable row level security;
alter table ar_customers enable row level security;
alter table ar_products enable row level security;
alter table ar_invoices enable row level security;
alter table ar_invoice_lines enable row level security;
alter table ar_payments enable row level security;
alter table ar_payment_allocations enable row level security;
alter table ar_reminders enable row level security;
alter table ap_vendors enable row level security;
alter table ap_invoices enable row level security;
alter table ap_invoice_lines enable row level security;
alter table ap_approval_rules enable row level security;
alter table ap_approval_steps enable row level security;
alter table ap_payments enable row level security;
alter table inv_items enable row level security;
alter table inv_warehouses enable row level security;
alter table inv_movements enable row level security;
alter table hr_employees enable row level security;
alter table pay_time_entries enable row level security;
alter table pay_expense_claims enable row level security;
alter table pay_runs enable row level security;
alter table pay_payslips enable row level security;
alter table budgets enable row level security;
alter table budget_lines enable row level security;
alter table files enable row level security;

-- Organizations + memberships policies
create policy "org_select_member"
  on organizations for select
  using (is_org_member(id));

create policy "org_insert_disabled"
  on organizations for insert
  with check (false);

create policy "org_update_owner_admin"
  on organizations for update
  using (has_org_role(id, array['owner','admin']::org_role[]))
  with check (has_org_role(id, array['owner','admin']::org_role[]));

create policy "org_members_select_member"
  on org_members for select
  using (is_org_member(org_id));

create policy "org_members_manage_owner_admin"
  on org_members for all
  using (has_org_role(org_id, array['owner','admin']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin']::org_role[]));

-- Accounting lock
create policy "locks_select_member" on accounting_locks for select using (is_org_member(org_id));
create policy "locks_manage_accountant" on accounting_locks for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

-- Audit log
create policy "audit_select_member" on audit_log for select using (is_org_member(org_id));
create policy "audit_insert_member" on audit_log for insert with check (is_org_member(org_id));

-- GL
create policy "gl_accounts_select_member" on gl_accounts for select using (is_org_member(org_id));
create policy "gl_accounts_manage_accountant" on gl_accounts for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

create policy "gl_entries_select_member" on gl_entries for select using (is_org_member(org_id));
create policy "gl_entries_manage_accountant" on gl_entries for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

create policy "gl_lines_select_member" on gl_lines for select using (is_org_member(org_id));
create policy "gl_lines_manage_accountant" on gl_lines for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

-- Sales (AR)
create policy "ar_customers_select_member" on ar_customers for select using (is_org_member(org_id));
create policy "ar_customers_manage_sales" on ar_customers for all
  using (has_org_role(org_id, array['owner','admin','sales','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','sales','accountant']::org_role[]));

create policy "ar_products_select_member" on ar_products for select using (is_org_member(org_id));
create policy "ar_products_manage_sales" on ar_products for all
  using (has_org_role(org_id, array['owner','admin','sales','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','sales','accountant']::org_role[]));

create policy "ar_invoices_select_member" on ar_invoices for select using (is_org_member(org_id));
create policy "ar_invoices_manage_sales" on ar_invoices for all
  using (has_org_role(org_id, array['owner','admin','sales','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','sales','accountant']::org_role[]));

create policy "ar_invoice_lines_select_member" on ar_invoice_lines for select using (is_org_member(org_id));
create policy "ar_invoice_lines_manage_sales" on ar_invoice_lines for all
  using (has_org_role(org_id, array['owner','admin','sales','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','sales','accountant']::org_role[]));

create policy "ar_payments_select_member" on ar_payments for select using (is_org_member(org_id));
create policy "ar_payments_manage_accountant" on ar_payments for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

create policy "ar_payment_allocations_select_member" on ar_payment_allocations for select using (is_org_member(org_id));
create policy "ar_payment_allocations_manage_accountant" on ar_payment_allocations for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

create policy "ar_reminders_select_member" on ar_reminders for select using (is_org_member(org_id));
create policy "ar_reminders_manage_sales" on ar_reminders for all
  using (has_org_role(org_id, array['owner','admin','sales','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','sales','accountant']::org_role[]));

-- Purchases (AP)
create policy "ap_vendors_select_member" on ap_vendors for select using (is_org_member(org_id));
create policy "ap_vendors_manage_purchaser" on ap_vendors for all
  using (has_org_role(org_id, array['owner','admin','purchaser','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','purchaser','accountant']::org_role[]));

create policy "ap_invoices_select_member" on ap_invoices for select using (is_org_member(org_id));
create policy "ap_invoices_manage_purchaser" on ap_invoices for all
  using (has_org_role(org_id, array['owner','admin','purchaser','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','purchaser','accountant']::org_role[]));

create policy "ap_invoice_lines_select_member" on ap_invoice_lines for select using (is_org_member(org_id));
create policy "ap_invoice_lines_manage_purchaser" on ap_invoice_lines for all
  using (has_org_role(org_id, array['owner','admin','purchaser','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','purchaser','accountant']::org_role[]));

create policy "ap_rules_select_member" on ap_approval_rules for select using (is_org_member(org_id));
create policy "ap_rules_manage_admin" on ap_approval_rules for all
  using (has_org_role(org_id, array['owner','admin']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin']::org_role[]));

create policy "ap_steps_select_member" on ap_approval_steps for select using (is_org_member(org_id));
create policy "ap_steps_manage_admin" on ap_approval_steps for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

create policy "ap_payments_select_member" on ap_payments for select using (is_org_member(org_id));
create policy "ap_payments_manage_accountant" on ap_payments for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

-- Inventory
create policy "inv_items_select_member" on inv_items for select using (is_org_member(org_id));
create policy "inv_items_manage_admin" on inv_items for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

create policy "inv_wh_select_member" on inv_warehouses for select using (is_org_member(org_id));
create policy "inv_wh_manage_admin" on inv_warehouses for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

create policy "inv_mov_select_member" on inv_movements for select using (is_org_member(org_id));
create policy "inv_mov_manage_admin" on inv_movements for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

-- Payroll + time + expenses
create policy "hr_emp_select_member" on hr_employees for select using (is_org_member(org_id));
create policy "hr_emp_manage_admin" on hr_employees for all
  using (has_org_role(org_id, array['owner','admin']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin']::org_role[]));

create policy "time_select_member" on pay_time_entries for select using (is_org_member(org_id));
create policy "time_manage_member" on pay_time_entries for all
  using (has_org_role(org_id, array['owner','admin','employee']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','employee']::org_role[]));

create policy "expense_select_member" on pay_expense_claims for select using (is_org_member(org_id));
create policy "expense_manage_member" on pay_expense_claims for all
  using (has_org_role(org_id, array['owner','admin','employee']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','employee']::org_role[]));

create policy "pay_runs_select_member" on pay_runs for select using (is_org_member(org_id));
create policy "pay_runs_manage_admin" on pay_runs for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

create policy "payslips_select_member" on pay_payslips for select using (is_org_member(org_id));
create policy "payslips_manage_admin" on pay_payslips for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

-- Reporting/budgeting
create policy "budgets_select_member" on budgets for select using (is_org_member(org_id));
create policy "budgets_manage_accountant" on budgets for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

create policy "budget_lines_select_member" on budget_lines for select using (is_org_member(org_id));
create policy "budget_lines_manage_accountant" on budget_lines for all
  using (has_org_role(org_id, array['owner','admin','accountant']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','accountant']::org_role[]));

-- Storage metadata
create policy "files_select_member" on files for select using (is_org_member(org_id));
create policy "files_manage_member" on files for all
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- Audit trigger helper
create or replace function audit_write()
returns trigger
language plpgsql
as $$
declare
  v_org_id uuid;
  v_action audit_action;
  v_record_id uuid;
begin
  if (tg_op = 'INSERT') then
    v_action := 'create';
    v_record_id := new.id;
    v_org_id := new.org_id;
    insert into audit_log(org_id, actor_user_id, action, table_name, record_id, new_data)
    values (v_org_id, auth.uid(), v_action, tg_table_name, v_record_id, to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    v_action := 'update';
    v_record_id := new.id;
    v_org_id := new.org_id;
    insert into audit_log(org_id, actor_user_id, action, table_name, record_id, old_data, new_data)
    values (v_org_id, auth.uid(), v_action, tg_table_name, v_record_id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    v_action := 'delete';
    v_record_id := old.id;
    v_org_id := old.org_id;
    insert into audit_log(org_id, actor_user_id, action, table_name, record_id, old_data)
    values (v_org_id, auth.uid(), v_action, tg_table_name, v_record_id, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

-- Updated_at helper
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Prevent deletes of posted docs (void instead)
create or replace function prevent_delete_posted()
returns trigger
language plpgsql
as $$
begin
  if old.posted_entry_id is not null then
    raise exception 'Posted documents cannot be deleted. Use void and reversing entries instead.';
  end if;
  return old;
end;
$$;

-- Triggers (timestamps + delete guards + audit for ledger-affecting tables)
do $$ begin
  create trigger ar_customers_updated_at before update on ar_customers for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger ar_products_updated_at before update on ar_products for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger ar_invoices_updated_at before update on ar_invoices for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger ap_vendors_updated_at before update on ap_vendors for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger ap_invoices_updated_at before update on ap_invoices for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger inv_items_updated_at before update on inv_items for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger hr_employees_updated_at before update on hr_employees for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger ar_invoices_prevent_delete before delete on ar_invoices for each row execute function prevent_delete_posted();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger ap_invoices_prevent_delete before delete on ap_invoices for each row execute function prevent_delete_posted();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger ar_invoices_audit after insert or update or delete on ar_invoices for each row execute function audit_write();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger ap_invoices_audit after insert or update or delete on ap_invoices for each row execute function audit_write();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger gl_entries_audit after insert or update or delete on gl_entries for each row execute function audit_write();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger gl_lines_audit after insert or update or delete on gl_lines for each row execute function audit_write();
exception when duplicate_object then null; end $$;

-- Posting helpers (transactional; call via supabase.rpc)
create or replace function gl_account_id_by_no(p_org_id uuid, p_no text)
returns uuid
language sql
stable
as $$
  select id from gl_accounts where org_id = p_org_id and number = p_no and is_active = true limit 1;
$$;

create or replace function assert_unlocked(p_org_id uuid, p_entry_date date)
returns void
language plpgsql
as $$
declare
  v_locked_until date;
begin
  select locked_until into v_locked_until from accounting_locks where org_id = p_org_id;
  if v_locked_until is not null and p_entry_date <= v_locked_until then
    raise exception 'Accounting period is locked until %', v_locked_until;
  end if;
end;
$$;

create or replace function assert_entry_balanced(p_entry_id uuid)
returns void
language plpgsql
as $$
declare
  v_debit numeric(14,2);
  v_credit numeric(14,2);
begin
  select coalesce(sum(debit),0), coalesce(sum(credit),0)
    into v_debit, v_credit
  from gl_lines
  where entry_id = p_entry_id;

  if round(v_debit, 2) <> round(v_credit, 2) then
    raise exception 'Entry % is not balanced (debit %, credit %)', p_entry_id, v_debit, v_credit;
  end if;
end;
$$;

-- Post AR invoice:
-- Debit: 1700 (Accounts Receivable) total
-- Credit: revenue (line revenue_account_no) subtotal
-- Credit: VAT payable (line vat_account_no) VAT total
create or replace function post_ar_invoice(p_invoice_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_org_id uuid;
  v_issue_date date;
  v_total numeric(14,2);
  v_entry_id uuid;
  v_ar_account_id uuid;
begin
  select org_id, issue_date, total into v_org_id, v_issue_date, v_total
  from ar_invoices
  where id = p_invoice_id
  for update;

  if v_org_id is null then
    raise exception 'Invoice not found';
  end if;

  perform assert_unlocked(v_org_id, v_issue_date);

  if not is_org_member(v_org_id) then
    raise exception 'Not allowed';
  end if;

  if v_total <= 0 then
    raise exception 'Invoice total must be > 0';
  end if;

  v_ar_account_id := gl_account_id_by_no(v_org_id, '1700');
  if v_ar_account_id is null then
    raise exception 'Missing AR account 1700 for org %', v_org_id;
  end if;

  insert into gl_entries(org_id, entry_date, description, source_type, source_id, posted_by, posted_at)
  values (v_org_id, v_issue_date, 'AR invoice', 'ar_invoice', p_invoice_id, auth.uid(), now())
  returning id into v_entry_id;

  -- Debit AR (total)
  insert into gl_lines(org_id, entry_id, account_id, description, debit, credit)
  values (v_org_id, v_entry_id, v_ar_account_id, 'Accounts receivable', v_total, 0);

  -- Credit revenue per account
  insert into gl_lines(org_id, entry_id, account_id, description, debit, credit)
  select
    v_org_id,
    v_entry_id,
    gl_account_id_by_no(v_org_id, coalesce(p.revenue_account_no, '3000')),
    'Revenue',
    0,
    round(sum(l.line_subtotal), 2)
  from ar_invoice_lines l
  left join ar_products p on p.id = l.product_id
  where l.invoice_id = p_invoice_id
  group by coalesce(p.revenue_account_no, '3000');

  -- Credit VAT payable per account
  insert into gl_lines(org_id, entry_id, account_id, description, debit, credit)
  select
    v_org_id,
    v_entry_id,
    gl_account_id_by_no(v_org_id, coalesce(p.vat_account_no, '2930')),
    'VAT payable',
    0,
    round(sum(l.line_vat), 2)
  from ar_invoice_lines l
  left join ar_products p on p.id = l.product_id
  where l.invoice_id = p_invoice_id
  group by coalesce(p.vat_account_no, '2930');

  perform assert_entry_balanced(v_entry_id);

  update ar_invoices
    set posted_entry_id = v_entry_id,
        status = case when status = 'draft' then 'sent' else status end
  where id = p_invoice_id;

  insert into audit_log(org_id, actor_user_id, action, table_name, record_id, metadata)
  values (v_org_id, auth.uid(), 'post', 'ar_invoices', p_invoice_id, jsonb_build_object('gl_entry_id', v_entry_id));

  return v_entry_id;
end;
$$;

-- Post AP invoice:
-- Debit: expense (line expense_account_no) subtotal
-- Debit: VAT receivable (line vat_account_no) VAT total
-- Credit: 2400 (Accounts Payable) total
create or replace function post_ap_invoice(p_invoice_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_org_id uuid;
  v_issue_date date;
  v_total numeric(14,2);
  v_entry_id uuid;
  v_ap_account_id uuid;
begin
  select org_id, issue_date, total into v_org_id, v_issue_date, v_total
  from ap_invoices
  where id = p_invoice_id
  for update;

  if v_org_id is null then
    raise exception 'Invoice not found';
  end if;

  perform assert_unlocked(v_org_id, v_issue_date);

  if not is_org_member(v_org_id) then
    raise exception 'Not allowed';
  end if;

  if v_total <= 0 then
    raise exception 'Invoice total must be > 0';
  end if;

  v_ap_account_id := gl_account_id_by_no(v_org_id, '2400');
  if v_ap_account_id is null then
    raise exception 'Missing AP account 2400 for org %', v_org_id;
  end if;

  insert into gl_entries(org_id, entry_date, description, source_type, source_id, posted_by, posted_at)
  values (v_org_id, v_issue_date, 'AP invoice', 'ap_invoice', p_invoice_id, auth.uid(), now())
  returning id into v_entry_id;

  -- Credit AP (total)
  insert into gl_lines(org_id, entry_id, account_id, description, debit, credit)
  values (v_org_id, v_entry_id, v_ap_account_id, 'Accounts payable', 0, v_total);

  -- Debit expense per account
  insert into gl_lines(org_id, entry_id, account_id, description, debit, credit)
  select
    v_org_id,
    v_entry_id,
    gl_account_id_by_no(v_org_id, l.expense_account_no),
    'Expense',
    round(sum(l.line_subtotal), 2),
    0
  from ap_invoice_lines l
  where l.invoice_id = p_invoice_id
  group by l.expense_account_no;

  -- Debit VAT receivable per account
  insert into gl_lines(org_id, entry_id, account_id, description, debit, credit)
  select
    v_org_id,
    v_entry_id,
    gl_account_id_by_no(v_org_id, l.vat_account_no),
    'VAT receivable',
    round(sum(l.line_vat), 2),
    0
  from ap_invoice_lines l
  where l.invoice_id = p_invoice_id
  group by l.vat_account_no;

  perform assert_entry_balanced(v_entry_id);

  update ap_invoices
    set posted_entry_id = v_entry_id,
        status = case when status = 'draft' then 'approved' else status end
  where id = p_invoice_id;

  insert into audit_log(org_id, actor_user_id, action, table_name, record_id, metadata)
  values (v_org_id, auth.uid(), 'post', 'ap_invoices', p_invoice_id, jsonb_build_object('gl_entry_id', v_entry_id));

  return v_entry_id;
end;
$$;

-- Record an AR payment, allocate to a single invoice, and post to GL.
-- Debit: 1910 (Bank) amount
-- Credit: 1700 (AR) amount
create or replace function record_ar_payment(p_invoice_id uuid, p_payment_date date, p_amount numeric, p_reference_number text default null)
returns uuid
language plpgsql
as $$
declare
  v_org_id uuid;
  v_invoice_total numeric(14,2);
  v_payment_id uuid;
  v_entry_id uuid;
  v_bank_account_id uuid;
  v_ar_account_id uuid;
  v_allocated numeric(14,2);
begin
  select org_id, total into v_org_id, v_invoice_total
  from ar_invoices
  where id = p_invoice_id
  for update;

  if v_org_id is null then
    raise exception 'Invoice not found';
  end if;

  perform assert_unlocked(v_org_id, p_payment_date);

  if not has_org_role(v_org_id, array['owner','admin','accountant']::org_role[]) then
    raise exception 'Not allowed';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be > 0';
  end if;

  v_bank_account_id := gl_account_id_by_no(v_org_id, '1910');
  v_ar_account_id := gl_account_id_by_no(v_org_id, '1700');
  if v_bank_account_id is null then
    raise exception 'Missing Bank account 1910 for org %', v_org_id;
  end if;
  if v_ar_account_id is null then
    raise exception 'Missing AR account 1700 for org %', v_org_id;
  end if;

  insert into ar_payments(org_id, payment_date, amount, currency, reference_number, method, created_by)
  values (v_org_id, p_payment_date, round(p_amount,2), 'EUR', p_reference_number, 'manual', auth.uid())
  returning id into v_payment_id;

  insert into ar_payment_allocations(org_id, payment_id, invoice_id, amount)
  values (v_org_id, v_payment_id, p_invoice_id, round(p_amount,2));

  insert into gl_entries(org_id, entry_date, description, source_type, source_id, posted_by, posted_at)
  values (v_org_id, p_payment_date, 'AR payment', 'ar_invoice', p_invoice_id, auth.uid(), now())
  returning id into v_entry_id;

  insert into gl_lines(org_id, entry_id, account_id, description, debit, credit)
  values
    (v_org_id, v_entry_id, v_bank_account_id, 'Bank', round(p_amount,2), 0),
    (v_org_id, v_entry_id, v_ar_account_id, 'Accounts receivable', 0, round(p_amount,2));

  perform assert_entry_balanced(v_entry_id);

  select coalesce(sum(amount),0) into v_allocated
  from ar_payment_allocations
  where invoice_id = p_invoice_id;

  update ar_invoices
    set status = case
      when v_allocated >= v_invoice_total then 'paid'::doc_status
      else status
    end
  where id = p_invoice_id;

  insert into audit_log(org_id, actor_user_id, action, table_name, record_id, metadata)
  values (v_org_id, auth.uid(), 'pay', 'ar_invoices', p_invoice_id, jsonb_build_object('payment_id', v_payment_id, 'gl_entry_id', v_entry_id, 'amount', round(p_amount,2)));

  return v_payment_id;
end;
$$;

-- Record an AP payment and post to GL.
-- Debit: 2400 (AP) amount
-- Credit: 1910 (Bank) amount
create or replace function record_ap_payment(p_invoice_id uuid, p_payment_date date, p_amount numeric)
returns uuid
language plpgsql
as $$
declare
  v_org_id uuid;
  v_payment_id uuid;
  v_entry_id uuid;
  v_bank_account_id uuid;
  v_ap_account_id uuid;
  v_total numeric(14,2);
begin
  select org_id, total into v_org_id, v_total
  from ap_invoices
  where id = p_invoice_id
  for update;

  if v_org_id is null then
    raise exception 'Invoice not found';
  end if;

  perform assert_unlocked(v_org_id, p_payment_date);

  if not has_org_role(v_org_id, array['owner','admin','accountant']::org_role[]) then
    raise exception 'Not allowed';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be > 0';
  end if;

  v_bank_account_id := gl_account_id_by_no(v_org_id, '1910');
  v_ap_account_id := gl_account_id_by_no(v_org_id, '2400');
  if v_bank_account_id is null then
    raise exception 'Missing Bank account 1910 for org %', v_org_id;
  end if;
  if v_ap_account_id is null then
    raise exception 'Missing AP account 2400 for org %', v_org_id;
  end if;

  insert into ap_payments(org_id, invoice_id, payment_date, amount, currency, method, created_by)
  values (v_org_id, p_invoice_id, p_payment_date, round(p_amount,2), 'EUR', 'manual', auth.uid())
  returning id into v_payment_id;

  insert into gl_entries(org_id, entry_date, description, source_type, source_id, posted_by, posted_at)
  values (v_org_id, p_payment_date, 'AP payment', 'ap_invoice', p_invoice_id, auth.uid(), now())
  returning id into v_entry_id;

  insert into gl_lines(org_id, entry_id, account_id, description, debit, credit)
  values
    (v_org_id, v_entry_id, v_ap_account_id, 'Accounts payable', round(p_amount,2), 0),
    (v_org_id, v_entry_id, v_bank_account_id, 'Bank', 0, round(p_amount,2));

  perform assert_entry_balanced(v_entry_id);

  if round(p_amount,2) >= v_total then
    update ap_invoices set status = 'paid'::doc_status where id = p_invoice_id;
  end if;

  insert into audit_log(org_id, actor_user_id, action, table_name, record_id, metadata)
  values (v_org_id, auth.uid(), 'pay', 'ap_invoices', p_invoice_id, jsonb_build_object('payment_id', v_payment_id, 'gl_entry_id', v_entry_id, 'amount', round(p_amount,2)));

  return v_payment_id;
end;
$$;
