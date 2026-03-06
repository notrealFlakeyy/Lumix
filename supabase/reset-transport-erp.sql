-- Reset transport ERP demo schema objects in public.
-- This keeps Supabase Auth users intact:
-- - auth.users is NOT dropped
-- - auth.identities is NOT dropped
-- - any existing signed-in users remain available
--
-- What this removes:
-- - public transport ERP tables
-- - public helper functions used by the ERP RLS foundation
-- - public profiles and company memberships
-- What this does not remove:
-- - shared helper functions that may still be referenced by legacy tables,
--   including public.set_updated_at()
--
-- Run this first, then run supabase/schema-and-seed.sql.

drop table if exists public.audit_logs cascade;
drop table if exists public.documents cascade;
drop table if exists public.payments cascade;
drop table if exists public.invoice_items cascade;
drop table if exists public.invoices cascade;
drop table if exists public.trips cascade;
drop table if exists public.transport_orders cascade;
drop table if exists public.drivers cascade;
drop table if exists public.vehicles cascade;
drop table if exists public.customers cascade;
drop table if exists public.company_users cascade;
drop table if exists public.profiles cascade;
drop table if exists public.companies cascade;

drop function if exists public.can_access_invoice(uuid);
drop function if exists public.has_company_role(uuid, text[]);
drop function if exists public.is_company_member(uuid);
