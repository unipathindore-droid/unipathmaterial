# UniPath SupplyOS

Production-oriented SaaS starter for pathology material supply management using Next.js App Router, Supabase, Supabase Auth, and Vercel.

## What’s Included

- Role-aware workspace for `admin`, `branch_admin`, `sales`, `material_team`, and `dispatch`
- Branch-based filtering model designed around Supabase Row Level Security
- Modules for clients, materials, requests, approvals, dispatch, delivery, expiry tracking, consumption, and notifications
- Dispatch and seven-day expiry email events for clients only
- Internal notifications inside the app for operational teams
- Auto reorder recommendations when stock is low or expiry risk is near
- Supabase migration with constraints, triggers, views, and policies
- Clean dashboard UI with App Router pages and Supabase data access helpers

## Folder Structure

```text
.
|-- .env.example
|-- middleware.ts
|-- package.json
|-- src
|   |-- app
|   |   |-- (auth)/login
|   |   |   |-- actions.ts
|   |   |   `-- page.tsx
|   |   |-- (app)
|   |   |   |-- approval/page.tsx
|   |   |   |-- clients/page.tsx
|   |   |   |-- dashboard/page.tsx
|   |   |   |-- dispatch/page.tsx
|   |   |   |-- layout.tsx
|   |   |   |-- materials/page.tsx
|   |   |   `-- requests/page.tsx
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components
|   |   |-- dashboard/metric-card.tsx
|   |   |-- forms/login-form.tsx
|   |   |-- layout/app-shell.tsx
|   |   |-- layout/empty-state.tsx
|   |   |-- layout/page-header.tsx
|   |   |-- layout/status-pill.tsx
|   |   `-- tables/data-table.tsx
|   |-- lib
|   |   |-- auth.ts
|   |   |-- constants.ts
|   |   |-- data/app-data.ts
|   |   |-- demo-data.ts
|   |   |-- env.ts
|   |   |-- supabase
|   |   |   |-- client.ts
|   |   |   |-- middleware.ts
|   |   |   `-- server.ts
|   |   `-- utils.ts
|   `-- types/domain.ts
`-- supabase
    |-- migrations/0001_unipath_supplyos.sql
    `-- seed/demo.sql
```

## Database Design Highlights

- `branches`: master branch records
- `profiles`: Supabase Auth users mapped to app roles and branch ownership
- `clients`: pathology clients tied to branches and account owners
- `materials`: material master with expiry and reorder rules
- `branch_inventory`: branch-level stock, reserved stock, reorder thresholds, nearest expiry
- `material_requests`: request headers
- `material_request_items`: line items with partial approval reason enforcement
- `dispatches` and `dispatch_items`: packing and shipment records
- `deliveries`: proof of delivery state
- `consumption_logs`: downstream usage tracking
- `notifications`: internal in-app alerts
- `email_events`: client-only email queue for dispatch and expiry notices
- `reorder_recommendations`: auto-generated reorder suggestions
- Views:
  - `request_summary`
  - `approval_queue`
  - `dispatch_overview`
  - `inventory_overview`

## Business Rules Covered

- Client emails are only queued for:
  - dispatch notices
  - seven-day expiry warnings
- Internal notifications remain inside the app
- Materials flagged with `requires_expiry_before_dispatch = true` cannot be dispatched without an expiry date
- Partial approvals require a non-empty reason
- Reorder recommendations are created automatically for low stock and near-expiry inventory

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. Create a Supabase project and run the SQL migration from:
   - `supabase/migrations/0001_unipath_supplyos.sql`

5. Optional: load sample inventory seed from:
   - `supabase/seed/demo.sql`

6. Create users in Supabase Auth and corresponding `profiles` rows with branch and role assignments.

7. Start the app:

```bash
npm run dev
```

## Supabase Auth Setup

1. Enable Email/Password provider in Supabase Auth.
2. Create users in Auth.
3. Insert matching rows into `public.profiles`.
4. Assign:
   - `admin`
   - `branch_admin`
   - `sales`
   - `material_team`
   - `dispatch`

Because RLS uses `auth.uid()` joined to `profiles`, users only see branch data allowed by policy.

## Vercel Deployment

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Add the same environment variables from `.env.local`.
4. Deploy.
5. In Supabase, add the Vercel production URL to the Auth redirect and site URL settings.

## Useful Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Notes

- The app supports a demo fallback when Supabase env vars are missing, which helps preview the UI before wiring production services.
- For production, wire an email worker or Supabase Edge Function to process rows from `email_events`.
- For recurring expiry checks, schedule `public.queue_expiry_warning_emails()` with Supabase cron or an Edge Function trigger.
