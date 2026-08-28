# Northstar Budget

A production-ready personal budget tracker built with React, TypeScript, Vite, and Supabase. Northstar tracks income, expenses, savings accounts, goals, and an immutable activity ledger in a responsive light/dark interface.

[Open the live app](https://northstar-budget-ali-ahmed.netlify.app) · [View the Supabase schema](supabase/migrations/20260827122103_initial_budget_schema.sql) · [Review the financial tests](src/lib/finance.test.ts)

## Live deployment

- Website: [northstar-budget-ali-ahmed.netlify.app](https://northstar-budget-ali-ahmed.netlify.app)
- Netlify project: [northstar-budget-ali-ahmed](https://app.netlify.com/projects/northstar-budget-ali-ahmed)

## What is included

- Email/password registration and login through Supabase Auth, persistent browser sessions, automatic token refresh, email confirmation, password recovery, protected routes, and logout.
- Per-user PostgreSQL records protected by Row Level Security on every exposed table.
- Dashboard totals, current-month comparison, six-month cash-flow chart, category chart, and recent activity.
- Full create, edit, delete, search, sort, and filter workflows for income, expenses, savings accounts, goals, sources, and categories.
- Atomic deposits, withdrawals, savings transfers, and goal contributions through guarded PostgreSQL functions.
- Responsive desktop sidebar, tablet drawer, mobile navigation, accessible dialogs, toasts, empty states, loaders, validation, confirmation dialogs, and light/dark/system themes.
- JSON backup and filtered transaction CSV export.
- Netlify and Vercel SPA routing configuration.

## Financial rules

Northstar calculates:

```text
Available Balance = Total Income − Total Expenses − Savings Account Balances − Goal Balances
```

The source tables—not transaction sums—drive balance cards. A transfer updates two savings balances and creates exactly one neutral `savings_transfer` ledger row, so it cannot change Total Savings or Available Balance. Savings and goal withdrawals use conditional, atomic database updates and fail if the requested amount exceeds the current account/goal balance.

## Architecture

```text
React + TypeScript UI
        │
        ├── Supabase Auth ── persistent email/password sessions
        │
        └── Supabase Data API ── authenticated RPCs
                         │
                         └── PostgreSQL
                              ├── per-user relational records
                              ├── atomic balance + ledger mutations
                              └── Row Level Security on every table
```

Supabase is the source of truth. The frontend does not use `localStorage` as a financial database. TanStack Query owns server-state caching and invalidation, while PostgreSQL functions keep multi-table money operations atomic.

## 1. Create and configure Supabase

1. Create a project at [supabase.com](https://supabase.com/).
2. From this folder, sign in and link the CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   The migrations in `supabase/migrations/` create all tables, indexes, constraints, RLS policies, profile/default-category trigger, explicit Data API grants, privileged financial function bodies, and public security-invoker RPC wrappers.

   Alternatively, copy the migration into the Supabase SQL Editor and run it once.

3. In **Project Settings → API**, copy the Project URL and the publishable key. Never use the secret or `service_role` key in this frontend.

## 2. Configure email and password authentication

In **Supabase Dashboard → Authentication → Sign In / Providers → Email**:

1. Keep email/password signups enabled.
2. Enable email confirmation so a user verifies ownership of their personal email before the first login.
3. Keep the minimum password length at 8 characters or higher.

In **Authentication → URL Configuration**:

- Set **Site URL** to your production origin.
- Add these Redirect URLs:

  ```text
  http://localhost:5173/auth/callback
  http://127.0.0.1:5173/auth/callback
  https://YOUR_PRODUCTION_DOMAIN/auth/callback
  http://localhost:5173/auth/reset
  http://127.0.0.1:5173/auth/reset
  https://YOUR_PRODUCTION_DOMAIN/auth/reset
  ```

The signup form passes the user’s name as non-authoritative profile metadata. A database trigger creates the matching `profiles` row with the new Auth UUID. Authorization never trusts user metadata: every financial table uses the Auth UUID and RLS ownership checks.

Supabase owns password hashing and the session lifecycle. The browser client persists only Auth access/refresh tokens and automatically refreshes them; all financial records remain in PostgreSQL as the source of truth. Forgot Password calls Supabase’s recovery-email API and the recovery link opens `/auth/reset`, where the signed recovery session can securely set a new password.

For production delivery to arbitrary personal email addresses, configure a custom SMTP provider under **Authentication → Email → SMTP Settings**. Supabase's built-in development mail service is rate-limited and is intended primarily for project-team addresses.

## 3. Environment and local development

Copy the example file:

```powershell
Copy-Item .env.example .env.local
```

Fill in:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Then run:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Quality checks

```bash
npm run lint
npm test
npm run build
```

The unit tests explicitly verify the Available Balance formula, savings/goal allocation totals, withdrawal/deposit net flow, transfer exclusion, and modal focus retention during controlled-input rerenders.

Local database linting requires Docker Desktop:

```bash
npx supabase start
npx supabase db reset
npx supabase db lint --local --level warning --fail-on error
```

For a linked hosted project, run the migration first and use:

```bash
npx supabase db lint --linked --level warning --fail-on error
npx supabase db advisors --linked
```

## Deploy to Netlify

The repository includes `netlify.toml` with the build command, `dist` publish directory, security/cache headers, and SPA fallback.

1. Import the repository into Netlify.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under **Site configuration → Environment variables**.
3. Deploy. Netlify runs `npm run build` automatically.
4. Add the deployed `/auth/callback` URL to the Supabase redirect allow list and update the Supabase Site URL.

## Deploy to Vercel

The included `vercel.json` sends client-side routes to `index.html`.

1. Import the repository into Vercel and keep the detected Vite settings (`npm run build`, output `dist`).
2. Add both `VITE_` environment variables to Production and Preview environments.
3. Deploy, then allow the deployed `/auth/callback` URL in Supabase Auth.

## Security model

- Every financial table has RLS enabled and ownership policies based on `(select auth.uid()) = user_id`.
- `anon` has no table or money-function access.
- Protected financial tables are read-only through the Data API; all mutations that affect balances or the ledger use authenticated RPC functions.
- Public RPCs are security-invoker wrappers. Their privileged bodies live in the non-exposed `private` schema, use a fixed empty `search_path`, verify `auth.uid()`, scope every lookup/update to that user, and have `PUBLIC`/`anon` execution revoked.
- The `service_role` key is never used or exposed.
- Transactions cannot be edited from the client. Income/expense changes update their single linked ledger row atomically; transfers create one row only.

## Project structure

```text
src/
  components/       Shared layout, navigation, dialogs, tables, icons
  context/          Auth, theme, and toast providers
  hooks/            Supabase query refresh and mutation helpers
  lib/              Supabase client, API, calculations, formatting, tests
  pages/            Dashboard, Income, Expenses, Savings, Goals, Transactions, Settings
supabase/
  migrations/       Complete PostgreSQL schema, RLS, triggers, and RPCs
netlify.toml         Netlify build, headers, and SPA fallback
vercel.json          Vercel SPA rewrite
```
