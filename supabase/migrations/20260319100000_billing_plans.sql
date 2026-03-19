-- ──────────────────────────────────────────────────────────────────────────────
-- Billing plans catalogue + plan selection tracking
-- Extends the billing foundation (20260308010000_billing_foundation.sql)
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. Plan catalogue ─────────────────────────────────────────────────────────
-- Stores the three fixed plan tiers. This is a read-mostly table maintained by
-- the platform team. Companies reference it when choosing or upgrading a plan.

create table if not exists public.billing_plans (
  key          text        primary key,            -- 'starter' | 'growth' | 'enterprise'
  label        text        not null,
  description  text        not null,
  price_eur    numeric(10,2),                      -- null = custom / contact sales
  billing_period text      not null default 'monthly'
                           check (billing_period in ('monthly','annual')),
  max_branches integer,                            -- null = unlimited
  max_seats    integer,                            -- null = unlimited
  features     jsonb       not null default '[]',  -- array of feature strings
  stripe_price_id_monthly   text,                  -- set when Stripe products are configured
  stripe_price_id_annual    text,
  is_active    boolean     not null default true,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Seed the three plan tiers
insert into public.billing_plans
  (key, label, description, price_eur, max_branches, max_seats, features, sort_order)
values
  (
    'starter',
    'Starter',
    'Everything a small transport team needs to go paperless and stay organised.',
    49.00,
    1,
    5,
    '["1 branch / depot","Up to 5 team members","Transport ERP (orders, trips, fleet, drivers)","Invoicing & basic reporting","Time tracking","Driver mobile app","Email support"]'::jsonb,
    1
  ),
  (
    'growth',
    'Growth',
    'Multi-branch operations with purchasing, inventory, payroll and full finance.',
    149.00,
    5,
    20,
    '["Up to 5 branches","Up to 20 team members","Everything in Starter","Warehouse & inventory","Purchasing & vendors","Payroll preparation","Accounting-lite module","Expenses & task management","Priority support"]'::jsonb,
    2
  ),
  (
    'enterprise',
    'Enterprise',
    'Unlimited scale, custom integrations, and a dedicated implementation partner.',
    null,
    null,
    null,
    '["Unlimited branches","Unlimited team members","Everything in Growth","Custom module configuration","API & webhook access","SSO / SAML authentication","Dedicated account manager","SLA-backed uptime guarantee","On-premise option available"]'::jsonb,
    3
  )
on conflict (key) do update set
  label            = excluded.label,
  description      = excluded.description,
  price_eur        = excluded.price_eur,
  max_branches     = excluded.max_branches,
  max_seats        = excluded.max_seats,
  features         = excluded.features,
  sort_order       = excluded.sort_order,
  updated_at       = now();

drop trigger if exists set_billing_plans_updated_at on public.billing_plans;
create trigger set_billing_plans_updated_at
  before update on public.billing_plans
  for each row execute function public.set_updated_at();

-- RLS: everyone can read the plan catalogue; only service_role may write
alter table public.billing_plans enable row level security;

drop policy if exists billing_plans_public_read on public.billing_plans;
create policy billing_plans_public_read
  on public.billing_plans
  for select
  using (true);

-- ── 2. Plan selection log ────────────────────────────────────────────────────
-- Records which plan a company owner selected during or after onboarding.
-- Used as the source of truth until a Stripe subscription is active.
-- Once Stripe confirms payment, company_subscriptions takes over.

create table if not exists public.company_plan_selections (
  id             uuid        primary key default gen_random_uuid(),
  company_id     uuid        not null references public.companies(id) on delete cascade,
  plan_key       text        not null references public.billing_plans(key),
  selected_by    uuid        not null references auth.users(id),
  status         text        not null default 'pending'
                             check (status in ('pending','checkout_started','active','cancelled')),
  -- Stripe checkout session — populated when the user clicks "pay"
  stripe_checkout_session_id text unique,
  -- Trial window
  trial_starts_at  timestamptz not null default now(),
  trial_ends_at    timestamptz not null default (now() + interval '14 days'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Only one active or pending selection per company at a time
  constraint one_active_selection_per_company unique (company_id)
);

create index if not exists idx_company_plan_selections_company
  on public.company_plan_selections(company_id);

create index if not exists idx_company_plan_selections_selected_by
  on public.company_plan_selections(selected_by);

drop trigger if exists set_company_plan_selections_updated_at on public.company_plan_selections;
create trigger set_company_plan_selections_updated_at
  before update on public.company_plan_selections
  for each row execute function public.set_updated_at();

alter table public.company_plan_selections enable row level security;

-- Owner / admin can read their own company's selection
drop policy if exists company_plan_selections_member_read on public.company_plan_selections;
create policy company_plan_selections_member_read
  on public.company_plan_selections
  for select
  using (public.has_company_role(company_id, array['owner','admin']));

-- Only owners can insert or update a plan selection
drop policy if exists company_plan_selections_owner_insert on public.company_plan_selections;
create policy company_plan_selections_owner_insert
  on public.company_plan_selections
  for insert
  with check (public.has_company_role(company_id, array['owner']));

drop policy if exists company_plan_selections_owner_update on public.company_plan_selections;
create policy company_plan_selections_owner_update
  on public.company_plan_selections
  for update
  using  (public.has_company_role(company_id, array['owner']))
  with check (public.has_company_role(company_id, array['owner']));

-- ── 3. Add plan_key column to companies table ─────────────────────────────────
-- Denormalised shortcut so middleware and server components can read the active
-- plan in a single join without going through the subscriptions table.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'companies'
      and column_name  = 'active_plan_key'
  ) then
    alter table public.companies
      add column active_plan_key text
        references public.billing_plans(key)
        default 'starter';
  end if;
end $$;

-- ── 4. Extend company_subscriptions check constraint to stay in sync ──────────
-- The check constraint on company_subscriptions.plan_key already covers the
-- three values; this is a no-op safety re-assertion in case it was ever altered.
-- (Supabase does not support "create constraint if not exists" so we use DO block)

do $$
begin
  -- Re-add the constraint only if it is missing (idempotent)
  if not exists (
    select 1
    from   pg_constraint
    where  conrelid = 'public.company_subscriptions'::regclass
      and  conname  = 'company_subscriptions_plan_key_check'
  ) then
    alter table public.company_subscriptions
      add constraint company_subscriptions_plan_key_check
        check (plan_key in ('starter','growth','enterprise'));
  end if;
end $$;
