alter table if exists public.trips
  add column if not exists delivery_recipient_name text,
  add column if not exists delivery_received_at timestamptz;
