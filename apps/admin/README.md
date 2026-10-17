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

## Mobile first, installable (PWA)
- Phone layout is the base: bottom tab bar, floating "new" button, list rows instead of tables, 44px+ touch targets,
  a bottom sheet for the account menu. From 768px up it becomes a sidebar layout.
- Install: Chrome / Edge / Android show "Install app" in the account sheet; on iPhone use Share, then Add to Home Screen.
- **No zoom:** viewport `maximum-scale=1, user-scalable=no`, `touch-action: manipulation`, 16px inputs, and iOS
  gesture events are blocked.
- **Offline shell:** `public/sw.js` caches static build assets, icons and an offline page. It deliberately never caches pages,
  data or anything from Supabase, so personal data is not left on a shared phone. Offline navigation shows `/offline`.
  After a deploy, open apps show "A new version is ready. Refresh". Bump `VERSION` in `sw.js` to drop old caches.
- **Loading:** every route has a skeleton (`loading.tsx`), detail pages stream their header and tab panel behind
  skeletons, tabs are URL driven so only the open tab loads, and the permission grid is code-split and lazy-loaded.

## Brand
Logo files and colors come from the HIG brand pack (`public/brand`, `public/icons`). Use the logo uncropped on a plain
surface at 32px or larger. Typeface is Arial (system) with bundled Noto Sans Khmer for Khmer text.

## Deploying to Vercel
- Import the repo; set **Root Directory** to `apps/admin`.
- Environment variables (Production, Preview, Development):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (mark **Sensitive**).
- `NEXT_PUBLIC_*` values are baked in at build time: after changing them, trigger a new deployment.
- Check a deployment at `/api/health`: it reports which settings are present and whether the
  Supabase `core` schema is exposed to the Data API.
