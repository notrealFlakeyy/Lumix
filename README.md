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

# Tech Stack
- Next.js 15
- TypeScript
- Tailwind CSS
- Supabase Auth + SSR helpers
- PostgreSQL via Supabase
- Zod
- `next-intl` for the existing locale-aware routing shell
- `lucide-react` for admin UI iconography

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
- RLS is a solid starter foundation, but still needs production hardening for strict driver-scoped updates and storage access rules
- the mobile driver portal currently resolves drivers by matching the signed-in user email or profile full name to an active `drivers` row

# Environment Variables
Required environment variables:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Example values are in `.env.example`.

# Supabase Setup
1. Create or use the existing Supabase project connected to this deployment.
2. Add the environment variables listed above to `.env.local` and the deployment platform.
3. Run the migrations in `supabase/migrations/`, including `20260306000000_transport_erp_mvp.sql` and `20260307000000_driver_trip_public_ids.sql`.
4. Run the seed in `supabase/seed.sql`.
5. Configure a Storage bucket named `transport-documents` if you want real driver uploads.
6. Create at least one Auth user in Supabase Auth.
7. Link that user to a company through `company_users` if the seed did not auto-attach the first available user.

Important notes:
- `supabase/seed.sql` seeds the transport demo data and will attach the first existing `auth.users` record as the owner if one exists.
- If you are updating an existing remote Supabase project manually in SQL Editor, you can run `supabase/driver-trip-public-ids.sql` to add short public route IDs for drivers and trips without exposing UUIDs in URLs.
- Driver and trip public IDs are now assigned by a retrying database trigger rather than a one-shot default, which reduces collision risk on insert.
- The driver portal now includes trip document upload UI, but production bucket policies and object access rules still need to be finalized.
- PDF export is intentionally left as a placeholder button and printable invoice layout rather than a full document generator.

# Local Development
Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
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
- Reports: `http://localhost:3000/fi/reports`
- Settings: `http://localhost:3000/fi/settings`
- Driver mobile home: `http://localhost:3000/fi/driver`
- Driver mobile trips: `http://localhost:3000/fi/driver/trips`
- Driver mobile documents: `http://localhost:3000/fi/driver/documents`

The project still uses the existing locale-prefixed shell. Legacy entry points like `/login`, `/dashboard`, and older finance URLs redirect into the active ERP routes.
Driver and trip detail URLs now use short public IDs while UUIDs remain internal database keys.

# Production / Existing Domain Notes
This project is already linked to the intended domain and deployment. The transportation ERP MVP was adapted inside the current codebase and should continue using the existing deployment wiring, domain configuration, environment management, and Next.js project setup rather than creating a second app or second deployment.

# Next Steps
- Replace demo data with real customers, fleet, drivers, orders, trips, invoices, and payments
- Configure real users and company memberships in Supabase Auth + `company_users`
- Harden RLS policies, especially around driver-scoped actions and write permissions
- Complete invoice PDF generation
- Finish Supabase Storage bucket rules and signed upload flow
- Remove any remaining legacy content and compatibility redirects that are no longer needed
- Verify metadata, locale behavior, and final domain config in production
- Test with real transportation workflows and user feedback
- Extend the mobile driver workflow with offline capture or PWA behavior if field usage becomes daily-critical
