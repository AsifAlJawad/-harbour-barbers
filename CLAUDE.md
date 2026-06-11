# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Setup (Remote Sessions)

This project runs in ephemeral cloud containers. The `.git` directory and all changes are lost on container restart. Always re-sync at the start of a session:

```bash
git init
git remote add origin https://github.com/AsifAlJawad/-harbour-barbers.git
git fetch origin main && git reset --hard origin/main
git config user.email noreply@anthropic.com && git config user.name Claude
```

The `.claude/hooks/session-start.sh` hook automates this using an embedded PAT, but only works after the first manual sync.

To push changes:
```bash
git remote set-url origin https://AsifAlJawad:<PAT>@github.com/AsifAlJawad/-harbour-barbers.git
git push -u origin main
git remote set-url origin https://github.com/AsifAlJawad/-harbour-barbers.git
```

Always use `git -c commit.gpgsign=false commit` — GPG signing is not available.

## Development

```bash
npm install       # install dependencies
npm run dev       # local dev server with --watch on port 3000
npm start         # production mode
```

No linter or test suite is configured.

Required `.env`:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
RESEND_API_KEY=      # optional — emails silently skipped if absent
```

## Architecture

**Multi-page app**: four standalone HTML files served as static files by Express. No build step — React is loaded from CDN with Babel transpiling JSX in-browser.

| File | Role |
|------|------|
| `index.html` | Public landing page (vanilla JS) |
| `portal.html` | Customer portal (React, requires auth) |
| `staff.html` | Staff dashboard (React, requires staff/owner role) |
| `owner.html` | Owner analytics dashboard (React, requires owner role) |

**Backend**: Express app at `server/index.js`, deployed as a Vercel serverless function via `api/index.js`. All routes use the `/backend/` prefix (not `/api/`) to avoid Vercel's own `/api/` directory interception. `vercel.json` rewrites `/backend/*` and `/config.js` to the serverless handler.

**Frontend API client** (`api.js`): IIFE that creates a Supabase client from `window.HARBOUR_CONFIG` and exposes `window.API`. All fetch calls go to `/backend{path}` with the Supabase JWT as a Bearer token. Every HTML page loads `/config.js` (server-generated script that injects Supabase credentials from env vars) before `api.js`.

**Auth flow**: Supabase handles auth. JWT tokens are stored in `localStorage` by the Supabase client and automatically retrieved by `api.js`'s `token()` function on each request. The Express middleware verifies JWTs via `supabase.auth.getUser()`. Role checks (`requireStaff`, `requireOwner`) query the `profiles` table.

**Database**: All server-side queries use `@supabase/supabase-js` with the service role key (`server/lib/supabase.js`), which bypasses Row Level Security. No direct postgres client in active use.

**Loyalty points**: Awarded/deducted automatically on appointment booking/cancellation in `server/routes/appointments.js`. Points = `floor(price_in_cents / 100)`. Tiers: bronze → silver (200) → gold (500) → platinum (1000).

**Emails**: Booking confirmations and cancellation notices sent via Resend from `server/email/index.js`. Failures are silently swallowed (`.catch(() => {})`).

**Prices**: Always stored in cents in the database. Divide by 100 for display.

## Frontend Templates (`templates/`)

`templates/starter/` is a minimal working baseline for practicing new frontend designs against the live backend. Copy it to a new folder, build any UI you want — all `API.*` calls and auth work automatically. See `templates/README.md` for the full API reference.
