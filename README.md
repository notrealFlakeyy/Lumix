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
- PWA/installation foundation for the driver workflow
- Multi-company switching
- In-app team invites, access revocation, and driver login linking
- Manual invite-link generation when Auth email delivery is not configured
- Invoice PDF generation and SMTP-backed invoice email delivery
- Company configuration for numbering, VAT defaults, payment terms, and branding hints
- Estimated profitability reporting by customer, vehicle, driver, and trip using editable cost assumptions
- CSV import preview, downloadable templates, and import/export for customers, vehicles, drivers, and invoice exports
- Duplicate review, in-app merge remediation, and cleanup queue for customer, vehicle, and driver master data
- Health endpoint, audit visibility, and release-readiness checks in Settings
- Modular platform foundation with company-level module entitlements and branch/location access scaffolding
- Modular onboarding with tenant-specific module bundles and initial branch creation
- Module-aware route enforcement so direct URLs respect the company’s enabled feature set
- Branch-scoped transport operations for orders, trips, invoices, dashboard, and reports
- Branch-aware inventory module with products, stock movements, low-stock watchlists, and stock-value visibility
- Purchases module with vendors, purchase bills, inbound receiving, and supplier payment tracking
- Accounting overview with receivables, payables, cash movement, and working-capital visibility
- Workforce time tracking with employees, self clocking, manual entries, approvals, and payroll-ready status flow
- Payroll module with branch-aware payroll runs, employee totals, and estimated gross pay review
- Live mobile trip checkpoints with geolocation-based arrival/departure stamps
- Mobile proof-of-delivery capture with recipient name, signature, and stored trip signature document

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
- Stripe for subscription billing
- Sentry for external monitoring

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
- the app now has modular-platform scaffolding, but non-transport modules are still foundation/landing-page level until their full workflows are productized

# Environment Variables
Required environment variables:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PORTAL_URL` (optional, recommended for production portal subdomain setups)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_PUBLIC_API_URL` (for `apps/mobile`)
- `EXPO_PUBLIC_SUPABASE_URL` (for `apps/mobile`)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (for `apps/mobile`)
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
3. Run the migrations in `supabase/migrations/`, including `20260306000000_transport_erp_mvp.sql`, `20260307000000_driver_trip_public_ids.sql`, `20260307010000_rls_hardening.sql`, `20260307020000_driver_auth_link.sql`, `20260308010000_billing_foundation.sql`, `20260308020000_company_app_settings.sql`, `20260308030000_profitability_assumptions.sql`, `20260310010000_modular_platform_foundation.sql`, `20260310020000_transport_branch_scope.sql`, `20260310030000_branch_rls_hardening.sql`, `20260310040000_master_data_branch_scope.sql`, `20260310050000_inventory_module_foundation.sql`, `20260310060000_purchases_module_foundation.sql`, `20260310070000_workforce_module_foundation.sql`, `20260310080000_trip_checkpoints.sql`, and `20260310090000_trip_delivery_proof.sql`.
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
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/modular-platform-foundation.sql` to add company modules, branches, and branch access scaffolding before using the new modular settings controls.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/transport-branch-scope.sql` after the modular-platform foundation so orders, trips, and invoices can be assigned and filtered by branch.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/branch-rls-hardening.sql` after `supabase/transport-branch-scope.sql` so branch-restricted users are enforced at the database policy layer for orders, trips, invoices, invoice items, and payments.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/master-data-branch-scope.sql` after `supabase/branch-rls-hardening.sql` so customers, vehicles, drivers, and documents become branch-owned and respect branch scope in both the UI and RLS.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/inventory-module-foundation.sql` after the branch-scope SQL so the inventory module has branch-aware products, stock movements, and inventory-specific RLS.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/purchases-module-foundation.sql` after the inventory SQL so vendors, purchase bills, receiving, and supplier payment tracking are available with branch-aware RLS.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/workforce-module-foundation.sql` after the purchases SQL so employees, time entries, payroll runs, and payroll-review tables are available with branch-aware RLS.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/trip-checkpoints.sql` after the workforce SQL so live arrival/departure location stamps can be captured from the driver mobile workflow.
- If you are updating an existing remote Supabase project manually in SQL Editor, run `supabase/trip-delivery-proof.sql` after the checkpoint SQL so recipient name and signature-based proof of delivery can be stored on trips.
- New-company onboarding now lets you choose a module bundle and create an initial branch during setup, but existing tenants still need their module/branch setup reviewed in `/fi/settings/company`.
- Stripe checkout and the billing portal are wired server-side, but they require valid Stripe price IDs, a webhook endpoint, and production webhook testing before customer rollout.
- `supabase/seed.sql` now also seeds branches, module entitlements, inventory products, stock movements, vendors, purchase bills, workforce employees, time entries, and a payroll run so the modular demo is populated outside the transport routes too.
- If your current remote project already has the transport seed but not the newer modular demo data, run `supabase/modular-demo-seed.sql` to add branches, inventory, purchases, workforce, and accounting-ready sample data without changing auth users.

# Local Development
Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Install the Expo mobile app dependencies:

```bash
npm install --prefix apps/mobile
```

Run the Expo mobile app:

```bash
npm run mobile:start
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

Type-check the Expo mobile app separately:

```bash
npm run mobile:type-check
```

# Running the App
Primary entry points:
- Login page: `http://localhost:3000/fi/login`
- Dashboard: `http://localhost:3000/fi/dashboard`
- Customers: `http://localhost:3000/fi/customers`
- Vehicles: `http://localhost:3000/fi/vehicles`
- Drivers: `http://localhost:3000/fi/drivers`
- Orders: `http://localhost:3000/fi/orders`
- Trips: `http://localhost:3000/fi/trips`
- Inventory: `http://localhost:3000/fi/inventory`
- Inventory products: `http://localhost:3000/fi/inventory/products`
- New inventory product: `http://localhost:3000/fi/inventory/products/new`
- Purchases: `http://localhost:3000/fi/purchases`
- Purchase vendors: `http://localhost:3000/fi/purchases/vendors`
- Purchase bills: `http://localhost:3000/fi/purchases/invoices`
- New purchase bill: `http://localhost:3000/fi/purchases/invoices/new`
- Time Tracking: `http://localhost:3000/fi/time`
- Payroll: `http://localhost:3000/fi/payroll`
- Payroll run detail: `http://localhost:3000/fi/payroll/runs/[run-id]`
- Invoices: `http://localhost:3000/fi/invoices`
- Invoice PDF route: `http://localhost:3000/fi/invoices/[invoice-id]/pdf`
- Reports: `http://localhost:3000/fi/reports`
- Settings: `http://localhost:3000/fi/settings`
- Company Settings: `http://localhost:3000/fi/settings/company`
- Team Settings: `http://localhost:3000/fi/settings/team`
- Billing Settings: `http://localhost:3000/fi/settings/billing`
- Operations Settings: `http://localhost:3000/fi/settings/operations`
- Data Settings: `http://localhost:3000/fi/settings/data`
- Health endpoint: `http://localhost:3000/api/health`
- Driver mobile home: `http://localhost:3000/fi/driver`
- Driver mobile trips: `http://localhost:3000/fi/driver/trips`
- Driver mobile time: `http://localhost:3000/fi/driver/time`
- Driver mobile documents: `http://localhost:3000/fi/driver/documents`
- Driver context API: `http://localhost:3000/api/driver/me`
- Driver home API: `http://localhost:3000/api/driver/home`
- Driver trips API: `http://localhost:3000/api/driver/trips`
- Driver trip detail API: `http://localhost:3000/api/driver/trips/[trip-id]`
- Driver documents API: `http://localhost:3000/api/driver/documents`
- Driver time summary API: `http://localhost:3000/api/driver/time/summary`
- Versioned mobile context API: `http://localhost:3000/api/mobile/v1/me`
- Versioned mobile home API: `http://localhost:3000/api/mobile/v1/home`
- Versioned mobile trips API: `http://localhost:3000/api/mobile/v1/trips`
- Versioned mobile trip detail API: `http://localhost:3000/api/mobile/v1/trips/[trip-id]`
- Versioned mobile documents API: `http://localhost:3000/api/mobile/v1/documents`
- Versioned mobile time summary API: `http://localhost:3000/api/mobile/v1/time/summary`
- Versioned mobile OpenAPI spec: `http://localhost:3000/api/mobile/v1/openapi`
- Native Expo app root: `apps/mobile`
- Web manifest: `http://localhost:3000/manifest.webmanifest`
- CSV export endpoints: `http://localhost:3000/api/exports/customers`, `http://localhost:3000/api/exports/vehicles`, `http://localhost:3000/api/exports/drivers`, `http://localhost:3000/api/exports/invoices`
- CSV template endpoints: `http://localhost:3000/api/templates/customers`, `http://localhost:3000/api/templates/vehicles`, `http://localhost:3000/api/templates/drivers`

The project still uses the existing locale-prefixed shell. Legacy entry points like `/login`, `/dashboard`, and older finance URLs redirect into the active ERP routes.
Driver and trip detail URLs now use short public IDs while UUIDs remain internal database keys.
New tenants can be provisioned from `/fi/onboarding` with a transport, warehouse, hybrid, or workforce-oriented module bundle.

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
- driver install prompt and web-manifest foundation for mobile home-screen installation
- Driver mobile now includes field shift clocking and recent shift history when the Time module is enabled for the tenant
- Driver mobile home now acts as a task-driven “today” board with next actions, trip timeline, route brief, and phone-first POD capture
- Driver mobile now has offline-aware queued actions for shift clocking and trip start/completion, with automatic sync when connectivity returns
- Document uploads remain online-only for now; proof photos and PDFs are not yet queued offline
- Driver trip detail now includes geolocation-based arrival/departure checkpoints with a live location history per trip
- Driver trip detail now supports recipient name capture, signature-based proof of delivery, and stored signature documents for dispatch follow-through
- Driver mobile now exposes stable read/write route handlers for context, home summary, trips, trip detail, documents, time summary, checkpoints, trip execution, and proof of delivery so a future native app can reuse the same backend contract
- `/api/mobile/v1/*` now mirrors the driver mobile contract and should be treated as the forward-looking native integration surface instead of binding a future app directly to the locale-rendered pages
- Shared Zod-backed mobile request/response contracts now live in `lib/mobile/contracts.ts`, which should be the reference point when wiring a future native client
- A lightweight OpenAPI 3.1 spec for the versioned mobile surface now lives at `/api/mobile/v1/openapi`, generated from `lib/mobile/openapi.ts`
- `/api/mobile/v1/*` now supports either the existing Supabase SSR session cookie or `Authorization: Bearer <supabase access token>` for native clients, plus optional `x-company-id` when one user belongs to multiple companies
- `apps/mobile` is now an Expo-based separate native client scaffold that signs into the same Supabase project and targets `/api/mobile/v1/*`
- The native client setup notes live in `apps/mobile/README.md`
- In-app CSV onboarding tools and company defaults in Settings
- CSV file preview, branch validation, and duplicate/update signals before customer, vehicle, and driver imports are committed
- CSV templates/exports now include `branch_code` so master data can be onboarded into the correct branch scope
- Duplicate review groups and a cleanup queue in Settings with direct links to fix problematic master data
- In-app duplicate merge actions in Settings for customer, vehicle, and driver records, with dependency reassignment before the duplicate is removed
- Bulk driver auth auto-linking in Settings using exact email match first and unique full-name fallback for active driver-role users
- Estimated profitability reporting in Reports and monthly margin visibility on the dashboard
- Company-level module entitlements and branch scaffolding so each client can be sold a tailored module mix without forking the app
- Middleware and app entry redirects now respect both company switching and enabled module entitlements instead of assuming every tenant is transport-only
- Transport orders, trips, invoices, dashboard KPIs, and reports now honor branch scope when a user is restricted to one or more branches
- Inventory now has a real adjacent-module workflow with branch-owned products, movement capture, stock watchlists, and per-SKU movement history
- Purchasing now has a real adjacent-module workflow with branch-owned vendors, purchase bills, stock receiving, and supplier payment registration
- Accounting now gives a live control view over branch-scoped receivables and payables without requiring a separate finance product
- Time Tracking now has a real adjacent-module workflow with branch-owned employees, self clocking, manual entries, approvals, and payroll-ready statuses
- Payroll now has a real adjacent-module workflow with payroll runs, employee rollups, linked time entries, and estimated gross pay review

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
- [ ] Run `20260310010000_modular_platform_foundation.sql`
- [ ] Run `20260310020000_transport_branch_scope.sql`
- [ ] Run `20260310030000_branch_rls_hardening.sql`
- [ ] Run `20260310040000_master_data_branch_scope.sql`
- [ ] Run `20260310050000_inventory_module_foundation.sql`
- [ ] Run `20260310060000_purchases_module_foundation.sql`
- [ ] Run `20260310070000_workforce_module_foundation.sql`
- [ ] Run `20260310080000_trip_checkpoints.sql`
- [ ] Run `20260310090000_trip_delivery_proof.sql`
- [ ] Run any earlier transport ERP migrations not yet applied on the target project
- [ ] Seed demo data only where you want presentation/demo content
- [ ] Optionally run `supabase/modular-demo-seed.sql` on older demo projects to backfill branches, inventory, purchases, workforce, and payroll demo data

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
- [ ] Review each tenant’s enabled modules and branch setup in `/fi/settings/company`

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
