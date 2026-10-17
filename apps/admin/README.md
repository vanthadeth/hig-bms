# HIG Admin

Users, roles and permissions for the HIG system. Next.js 16 (App Router) + Supabase (`core` schema).

## Setup
1. `pnpm install` (from the repo root)
2. Copy `.env.example` to `.env.local` and fill it in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard -> Project Settings -> API Keys). **Server only.**
     Without it, existing users can be managed but new users cannot be created.
3. In Supabase, the `core` schema must be exposed to the Data API (see `../../supabase/README.md`).
4. `pnpm dev:admin` from the repo root.

## How access control works
- The database is the source of truth: RLS policies call `core.has_permission()`.
- The app re-checks in every page (`requirePermission`) and server action (`authorize`) in `src/lib/auth.ts`.
  Hiding menu items is only convenience.
- Permission grid: click a cell to cycle *not set -> allowed -> denied*. For users this creates an override
  that beats roles in both directions.
- Anti-lockout: you cannot deactivate yourself, drop your own system role, or deny yourself an Admin module.

## Languages
Khmer (default) and English, switchable in the UI. Strings live in `src/i18n/messages.ts`.
