alter table public.company_app_settings
  add column if not exists invoice_payment_instructions text,
  add column if not exists invoice_logo_url text;
