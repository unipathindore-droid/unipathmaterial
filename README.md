# UniPath SupplyOS

Production-oriented SaaS starter for pathology material supply management using Next.js App Router, InsForge authentication/database services, PostgreSQL migrations, and Vercel.

## What’s Included

- Role-aware workspace for `superadmin`, `admin`, `branch_admin`, `sales`, `phlebotomist`, `material_team`, and `dispatch_manager`
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
    |-- migrations
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

3. Fill in the InsForge variables:
   - `NEXT_PUBLIC_INSFORGE_URL`
   - `NEXT_PUBLIC_INSFORGE_ANON_KEY`
   - `INSFORGE_API_KEY` for server-side operational tooling

4. Create the production database and run every SQL migration in order from:
   - `supabase/migrations/*.sql`

5. Optional: load sample inventory seed from:
   - `supabase/seed/demo.sql`

6. Configure InsForge auth redirects for every deployed environment:
   - `http://localhost:3000/api/auth/callback`
   - `https://<production-host>/api/auth/callback`
   - matching login URLs for local, staging, and production

7. Create users through the app or InsForge Auth and ensure matching `profiles` rows with branch and role assignments.

8. Start the app:

```bash
npm run dev
```

## InsForge Auth Setup

1. Enable Email/Password and Google providers in InsForge Auth as needed.
2. Configure allowed callback URLs for each environment.
3. Create users in Auth through the app or provider console.
4. Insert or approve matching rows in `public.profiles`.
4. Assign:
   - `superadmin`
   - `admin`
   - `branch_admin`
   - `sales`
   - `phlebotomist`
   - `material_team`
   - `dispatch_manager`

Because RLS uses the authenticated user id joined to `profiles`, users only see branch data allowed by policy.

## Vercel Deployment

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Add the same environment variables from `.env.local`.
4. Deploy.
5. In InsForge, add the Vercel production URL to the Auth redirect and site URL settings.

## Production Checklist

- Rotate any secrets that were shared outside the secret manager before deployment.
- Run `npm audit` and address high-severity production dependency findings.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in CI.
- Verify a fresh database can be created from `supabase/migrations/*.sql`.
- Configure monitoring, error tracking, database backups, and restore drills.
- Replace the in-memory auth rate limiter with a shared Redis/edge-backed limiter for multi-instance deployments.

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
