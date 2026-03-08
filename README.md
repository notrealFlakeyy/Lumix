# Project Overview
This repository is now a transportation ERP MVP adapted directly from an existing production-linked Next.js project. The original app/router structure, Supabase wiring, deployment/security configuration, and reusable UI primitives were preserved where they were useful, then the finance-specific product surface was replaced with a transportation-focused SaaS for client presentations.

The MVP is built for small transportation and logistics companies that need:
- better reporting
- less manual data entry
- connected dispatch, trip, and invoicing workflows
- revenue visibility by customer, vehicle, and driver
- a foundation for driver and document reporting

# Features
- Dashboard
- Customers
- Vehicles
- Drivers
- Transport Orders
- Trips
- Invoices
- Payments
- Reports
- Settings
- Document upload foundation
- Mobile driver workflow
- Multi-company switching
- In-app team invites, access revocation, and driver login linking
- Manual invite-link generation when Auth email delivery is not configured
- Invoice PDF generation and SMTP-backed invoice email delivery
- Company configuration for numbering, VAT defaults, payment terms, and branding hints
- Estimated profitability reporting by customer, vehicle, driver, and trip using editable cost assumptions
- CSV import preview, downloadable templates, and import/export for customers, vehicles, drivers, and invoice exports
- Health endpoint, audit visibility, and release-readiness checks in Settings

# Tech Stack
- Next.js 15
- TypeScript
- Tailwind CSS
- Supabase Auth + SSR helpers
- PostgreSQL via Supabase
- Zod
- `next-intl` for the existing locale-aware routing shell
- `lucide-react` for admin UI iconography
- `pdfkit` for invoice PDF generation
- `nodemailer` for SMTP invoice delivery

# Reused vs Replaced
Reused:
- existing Next.js App Router project and deployment wiring
- existing Supabase browser/server/service-role helper pattern
- existing environment validation structure
- existing middleware + locale-aware routing foundation
- existing Tailwind/shadcn-style UI primitives such as cards, buttons, tables, inputs, badges, and dialogs
- existing `next.config.js` security headers and overall domain-linked project setup

Replaced:
- finance/back-office schema direction with transportation ERP schema and migrations
- old finance dashboard content with transport operations KPIs and revenue breakdowns
- old sales/purchases/accounting navigation with customers, vehicles, drivers, orders, trips, invoices, reports, and settings
- old finance-facing pages/routes with transport ERP pages or redirects to the new routes
- old README and product positioning
- old seed direction with realistic logistics demo seed data in `supabase/seed.sql`

Remaining legacy cleanup tasks:
- old locale alias routes such as `/fi/sales` and `/fi/reporting` still exist only as redirects for compatibility
- old Pages Router redirect files remain to preserve historical entry points and avoid broken links
- database RLS now includes a stricter driver-scoped foundation for trips, invoices, documents, and related lookups, but it still needs production verification against real tenant/user mixes
- driver identity now supports an explicit `drivers.auth_user_id` link, with email/full-name matching retained only as a fallback for existing data

# Environment Variables
Required environment variables:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SENTRY_DSN` (optional, for external monitoring)
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` (optional)
- `SENTRY_ENVIRONMENT` (optional)
- `SENTRY_RELEASE` (optional but recommended)
- `SENTRY_ORG` (optional, for source maps)
- `SENTRY_PROJECT` (optional, for source maps)
- `SENTRY_AUTH_TOKEN` (optional, for source maps)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_REPLY_TO` (optional)
- `STRIPE_SECRET_KEY` (optional, required for Stripe billing flows)
- `STRIPE_WEBHOOK_SECRET` (optional, required for Stripe webhook sync)
- `STRIPE_PRICE_STARTER` (optional, required for Starter checkout)
- `STRIPE_PRICE_GROWTH` (optional, required for Growth checkout)

Optional test environment variables:
- `PLAYWRIGHT_EMAIL`
- `PLAYWRIGHT_PASSWORD`
- `PLAYWRIGHT_LOCALE` (defaults to `fi`)

Example values are in `.env.example`.

# Supabase Setup
1. Create or use the existing Supabase project connected to this deployment.
2. Add the environment variables listed above to `.env.local` and the deployment platform.
3. Run the migrations in `supabase/migrations/`, including `20260306000000_transport_erp_mvp.sql`, `20260307000000_driver_trip_public_ids.sql`, `20260307010000_rls_hardening.sql`, `20260307020000_driver_auth_link.sql`, `20260308010000_billing_foundation.sql`, `20260308020000_company_app_settings.sql`, and `20260308030000_profitability_assumptions.sql`.
4. Run the seed in `supabase/seed.sql`.
5. Configure a Storage bucket named `transport-documents` if you want real driver uploads.
6. Create at least one Auth user in Supabase Auth.
7. Link that user to a company through `company_users` if the seed did not auto-attach the first available user.

Important notes:
- `supabase/seed.sql` seeds the transport demo data and will attach the first existing `auth.users` record as the owner if one exists.
- If you are updating an existing remote Supabase project manually in SQL Editor, you can run `supabase/driver-trip-public-ids.sql` to add short public route IDs for drivers and trips without exposing UUIDs in URLs.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/driver-auth-link.sql` and then `supabase/rls-hardening.sql` to add `drivers.auth_user_id`, backfill existing matches, and apply the stricter driver-scoped RLS policies.
- Driver and trip public IDs are now assigned by a retrying database trigger rather than a one-shot default, which reduces collision risk on insert.
- The app now ships with a stronger driver-scoped RLS foundation and explicit driver auth-link support, but storage object policies and any service-role upload/download paths still need review before broad production rollout.
- Settings now supports in-app team invites, invite resends, manual invite-link generation, access revocation, manual account creation fallback, and explicit driver-login linking without needing SQL.
- Invoice detail pages now generate real PDFs and can send invoice emails through SMTP when the mail env vars are configured.
- Sentry setup is now surfaced in Settings, including DSN/release/source-map readiness and manual client/server monitoring tests.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/billing-foundation.sql` to add the Stripe billing tables before using the billing section in Settings.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/company-app-settings.sql` to add the company defaults table before using company configuration and CSV onboarding features.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/profitability-assumptions.sql` to add the editable cost assumptions used by the profitability reports.
- Stripe checkout and the billing portal are wired server-side, but they require valid Stripe price IDs, a webhook endpoint, and production webhook testing before customer rollout.

# Local Development
Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Run the unit/integration test suite:

```bash
npm test
```

Run the Playwright browser suite:

```bash
npm run test:e2e
```

Run migrations locally and apply the seed in one reset:

```bash
npx supabase db reset
```

Push migrations to a linked remote Supabase project:

```bash
npx supabase db push
```

If you need to seed a remote environment after pushing migrations, run the contents of `supabase/seed.sql` in the Supabase SQL editor.

# Running the App
Primary entry points:
- Login page: `http://localhost:3000/fi/login`
- Dashboard: `http://localhost:3000/fi/dashboard`
- Customers: `http://localhost:3000/fi/customers`
- Vehicles: `http://localhost:3000/fi/vehicles`
- Drivers: `http://localhost:3000/fi/drivers`
- Orders: `http://localhost:3000/fi/orders`
- Trips: `http://localhost:3000/fi/trips`
- Invoices: `http://localhost:3000/fi/invoices`
- Invoice PDF route: `http://localhost:3000/fi/invoices/[invoice-id]/pdf`
- Reports: `http://localhost:3000/fi/reports`
- Settings: `http://localhost:3000/fi/settings`
- Health endpoint: `http://localhost:3000/api/health`
- Driver mobile home: `http://localhost:3000/fi/driver`
- Driver mobile trips: `http://localhost:3000/fi/driver/trips`
- Driver mobile documents: `http://localhost:3000/fi/driver/documents`
- CSV export endpoints: `http://localhost:3000/api/exports/customers`, `http://localhost:3000/api/exports/vehicles`, `http://localhost:3000/api/exports/drivers`, `http://localhost:3000/api/exports/invoices`
- CSV template endpoints: `http://localhost:3000/api/templates/customers`, `http://localhost:3000/api/templates/vehicles`, `http://localhost:3000/api/templates/drivers`

The project still uses the existing locale-prefixed shell. Legacy entry points like `/login`, `/dashboard`, and older finance URLs redirect into the active ERP routes.
Driver and trip detail URLs now use short public IDs while UUIDs remain internal database keys.

Browser test coverage now includes:
- ERP flow: create order -> trip -> invoice -> payment
- Driver mobile preview flow: open assigned trip -> start trip -> complete trip

Operational visibility now includes:
- `/api/health` for app/database/email readiness
- recent company audit activity in Settings
- release workflow guidance and readiness checks in Settings
- tenant diagnostics in Settings for data quality, latest activity, and company-level support triage
- Sentry monitoring readiness and manual server/client test triggers in Settings
- Stripe billing readiness and current subscription state in Settings
- In-app CSV onboarding tools and company defaults in Settings
- CSV file preview and duplicate/update signals before customer, vehicle, and driver imports are committed
- Estimated profitability reporting in Reports and monthly margin visibility on the dashboard

Stripe billing setup:
- Create Stripe recurring prices for the Starter and Growth plans, then set `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_GROWTH`.
- Set `STRIPE_SECRET_KEY` on the app host so server actions can create checkout and billing-portal sessions.
- Expose the webhook endpoint at `/api/stripe/webhook` and configure Stripe to send `checkout.session.completed`, `customer.created`, `customer.updated`, and `customer.subscription.*` events.
- Set `STRIPE_WEBHOOK_SECRET` from that webhook endpoint in the app environment.
- Use the billing section in `/fi/settings` to launch checkout and the Stripe billing portal.

Sentry deployment checklist:
- Create a Sentry project for this Next.js app and set `NEXT_PUBLIC_SENTRY_DSN`.
- Set `SENTRY_ENVIRONMENT` and `SENTRY_RELEASE` in each environment so events are tagged consistently.
- If you want source maps uploaded during `npm run build`, also set `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN`.
- Deploy, open `/fi/settings`, and use the monitoring test buttons to send one server event and one client event.
- Configure alert rules in Sentry itself. The app can emit events, but notification routing is managed in Sentry.

# Manual Setup Checklist
Use this as the remaining external/manual setup list after the in-app MVP features are in place.

Supabase / database:
- [ ] Run `20260308010000_billing_foundation.sql`
- [ ] Run `20260308020000_company_app_settings.sql`
- [ ] Run `20260308030000_profitability_assumptions.sql`
- [ ] Run any earlier transport ERP migrations not yet applied on the target project
- [ ] Seed demo data only where you want presentation/demo content

Storage:
- [ ] Create the `transport-documents` bucket
- [ ] Apply the storage policies you chose for trip/company access
- [ ] Test signed document upload and access in the driver workflow

Email:
- [ ] Add SMTP env vars on the deployment platform
- [ ] Verify sender identity and invoice email delivery with a real inbox

Stripe:
- [ ] Add `STRIPE_SECRET_KEY`
- [ ] Add `STRIPE_WEBHOOK_SECRET`
- [ ] Create recurring Stripe prices and set `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_GROWTH`
- [ ] Configure the `/api/stripe/webhook` endpoint in Stripe
- [ ] Complete one live or test checkout and verify subscription sync in Settings

Sentry:
- [ ] Add `NEXT_PUBLIC_SENTRY_DSN`
- [ ] Add `SENTRY_ENVIRONMENT` and `SENTRY_RELEASE`
- [ ] Add `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` if you want source maps
- [ ] Send one server event and one client event from `/fi/settings`
- [ ] Configure alert rules in Sentry

Production rollout:
- [ ] Add the final env vars on the hosting platform
- [ ] Verify `/api/health` in the deployed environment
- [ ] Confirm company switching, billing, invoice email, and driver document upload in production-like conditions
- [ ] Replace demo data with customer-specific records before go-live

# Production / Existing Domain Notes
This project is already linked to the intended domain and deployment. The transportation ERP MVP was adapted inside the current codebase and should continue using the existing deployment wiring, domain configuration, environment management, and Next.js project setup rather than creating a second app or second deployment.

# Next Steps
- Replace demo data with real customers, fleet, drivers, orders, trips, invoices, and payments
- Configure real users and company memberships in Supabase Auth + `company_users`
- Verify hardened RLS and storage rules against real users, tenants, and driver assignments
- Verify SMTP delivery, sender identity, and invoice attachment rendering against real recipients
- Finish Supabase Storage bucket rules and signed upload flow
- Remove any remaining legacy content and compatibility redirects that are no longer needed
- Verify metadata, locale behavior, and final domain config in production
- Test with real transportation workflows and user feedback
- Extend the mobile driver workflow with offline capture or PWA behavior if field usage becomes daily-critical
