create table if not exists public.company_billing_accounts (
  company_id uuid primary key references public.companies(id) on delete cascade,
  stripe_customer_id text not null unique,
  billing_email text,
  billing_name text,
  stripe_default_payment_method_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  plan_key text not null check (plan_key in ('starter','growth','enterprise')),
  status text not null check (status in ('trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  stripe_price_id text,
  seats integer not null default 1 check (seats > 0),
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_billing_accounts_customer_id
on public.company_billing_accounts(stripe_customer_id);

create index if not exists idx_company_subscriptions_company_id
on public.company_subscriptions(company_id);

create index if not exists idx_company_subscriptions_customer_id
on public.company_subscriptions(stripe_customer_id);

drop trigger if exists set_company_billing_accounts_updated_at on public.company_billing_accounts;
create trigger set_company_billing_accounts_updated_at
before update on public.company_billing_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_company_subscriptions_updated_at on public.company_subscriptions;
create trigger set_company_subscriptions_updated_at
before update on public.company_subscriptions
for each row execute function public.set_updated_at();

alter table public.company_billing_accounts enable row level security;
alter table public.company_subscriptions enable row level security;

drop policy if exists company_billing_accounts_admin_select on public.company_billing_accounts;
create policy company_billing_accounts_admin_select
on public.company_billing_accounts
for select
using (public.has_company_role(company_id, array['owner','admin']));

drop policy if exists company_subscriptions_admin_select on public.company_subscriptions;
create policy company_subscriptions_admin_select
on public.company_subscriptions
for select
using (public.has_company_role(company_id, array['owner','admin']));
