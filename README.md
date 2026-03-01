# Lumix MVP – Financial Back Office (Next.js + Supabase)

Netvisor-like finance back-office MVP with:
- Next.js **App Router** + TypeScript
- Tailwind CSS + **shadcn/ui**-style components
- Supabase Postgres (Auth + RLS) + SQL migrations
- i18n via `next-intl` (default language: **fi**, also `sv`, `en`)

## Local development

### 1) Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<your-project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
```

Do not commit `.env.local` or any secret keys. If you accidentally committed a key, rotate it in the Supabase dashboard immediately.

### 2) Apply database migrations

Run the migration in Supabase:
- via CLI (recommended) or SQL editor
- migration file: `supabase/migrations/20260224000000_init.sql`

#### Supabase CLI (recommended)

Prereqs:
- Supabase CLI installed (`supabase --version`)
- You know your **Project Ref** and **Database password** (Supabase Dashboard → Project Settings)

Commands:

```bash
supabase login
supabase init
supabase link --project-ref <your_project_ref>
supabase db push
```

### 3) Install and run

```bash
npm install
npm run dev
```

Open:
- `http://localhost:3000/fi`

## Demo seed (optional)

Creates:
- a demo user
- an org + membership
- default Finnish chart of accounts
- a sample AR invoice + AP invoice (draft)

```bash
npm run seed:demo -- --email demo@example.com --password "demo-demo-demo" --org "Demo Oy"
```

Then log in at `http://localhost:3000/fi/login`.

## Background jobs (MVP)

Mark overdue invoices (run via cron / Supabase Scheduled Functions):

```bash
npm run job:mark-overdue
```

## Modules (MVP slices)

- Sales (AR): customers, invoices, post (send), record payment + allocation + audit + GL posting
- Purchases (AP): vendors, purchase invoices, approve (post), mark paid + audit + GL posting
- Accounting (GL): chart of accounts, journal entries (read-only UI for MVP)
- Reporting/Payroll/Inventory/Settings: UI stubs (expand iteratively)

## Accounting rules (explicit postings)

AR invoice posting (`post_ar_invoice`):
- **Debit** `1700` Accounts receivable = invoice total
- **Credit** `3000` Revenue = subtotal
- **Credit** `2930` VAT payable = VAT

AR payment (`record_ar_payment`):
- **Debit** `1910` Bank
- **Credit** `1700` Accounts receivable

AP invoice posting (`post_ap_invoice`):
- **Credit** `2400` Accounts payable = invoice total
- **Debit** `4000` Expense = subtotal
- **Debit** `1570` VAT receivable = VAT

AP payment (`record_ap_payment`):
- **Debit** `2400` Accounts payable
- **Credit** `1910` Bank

## Tests

### Unit tests (Vitest)
```bash
npm test
```

### E2E smoke tests (Playwright)

Requires a real running app + Supabase env (test user must exist):

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_EMAIL=demo@example.com PLAYWRIGHT_PASSWORD=demo-demo-demo npm run test:e2e
```

Flows:
1) Customer → invoice → send → record payment → invoice becomes paid
2) Vendor → purchase invoice → approve → mark paid → invoice becomes paid

## Extending integrations

MVP avoids paid integrations. Add adapters behind module services (e.g. invoice delivery) and keep route handlers thin:
- `app/api/**/route.ts` = validation + auth + call domain services
- `modules/**` = domain logic and algorithms (testable)
