alter table public.company_app_settings
  add column if not exists fuel_cost_per_km numeric(8,2) not null default 0.42,
  add column if not exists maintenance_cost_per_km numeric(8,2) not null default 0.18,
  add column if not exists driver_cost_per_hour numeric(8,2) not null default 32.00,
  add column if not exists waiting_cost_per_hour numeric(8,2) not null default 24.00;
