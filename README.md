# APEX F1 — Every Lap. Every Detail. Live.

A live Formula 1 intelligence dashboard for the **2026 FIA Formula One World Championship**.
Timing tower, telemetry lab, tyre strategy, race control, weather, standings and
season calendar — built on real, attributable data with every panel labelled by
its provenance: **LIVE · DELAYED · HISTORICAL · DEMO DATA · UNAVAILABLE**.

## Data sources & honesty model

| Source | Used for | Access |
| --- | --- | --- |
| [OpenF1](https://openf1.org) | meetings, sessions, drivers, laps, stints, pits, positions, intervals, car telemetry, GPS traces, weather, race control | Historical data (2023+) is free without a key. **True live data requires a paid OpenF1 subscription** (`OPENF1_API_KEY`). Without it, in-progress sessions are labelled DELAYED. |
| [Jolpica F1 API](https://api.jolpi.ca) (Ergast-compatible) | official-style schedule, race results, qualifying, driver/constructor standings | Free, rate-limited. |
| Bundled snapshot | Demo mode fallback (real recorded data from the 2026 Singapore GP, captured 2026-10-17) | Ships with the repo, clearly labelled DEMO DATA. |

The app never invents timing, telemetry, results or session status. Where a
provider lacks a capability, the UI says so instead of faking it. Distances on
telemetry charts are documented approximations derived from recorded GPS points
(`src/lib/telemetry/lap.ts`). Brake is a boolean pedal signal, not pressure.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # everything is optional — the app runs without it
pnpm dev
```

Without any credentials the app serves real historical data from OpenF1 and
Jolpica, and falls back to the bundled snapshot in labelled demo mode.

### Environment variables

See `.env.example`. Summary:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — enable accounts, synced favorites/preferences.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; used by the ingestion cron. **Never** exposed to the browser.
- `OPENF1_API_KEY` — optional; enables true live data during sessions.
- `CRON_SECRET` — protects `/api/cron/sync`.
- `NEXT_PUBLIC_SITE_URL` — used for share links / ICS metadata.

Configuration is validated with Zod at startup (`src/lib/env.ts`).

### Supabase setup

1. Create a project at supabase.com.
2. Run the migration: `supabase db push` or paste `supabase/migrations/0001_init.sql` into the SQL editor.
3. Copy the URL + anon key into `.env.local` (and Vercel env vars for deploys).
4. The service-role key goes into `SUPABASE_SERVICE_ROLE_KEY` (server only).

Row Level Security: public motorsport data is read-only for everyone; only the
service role writes it. Users can only read/write their own profile, favorites,
preferences and reminders.

### Ingestion & sync

`GET /api/cron/sync` (Authorization: `Bearer $CRON_SECRET`) upserts seasons,
circuits, meetings, sessions and standings into Supabase and records a
`data_sync_runs` row. `vercel.json` schedules it once per day (00:00 UTC),
which fits the Vercel Hobby plan's daily-cron limit.

The dashboard does not depend on this cron: every page reads OpenF1/Jolpica
directly and labels freshness, so live viewing works even if the sync never
runs. The cron only persists data into Supabase for fast repeat reads and
historical snapshots.

**On-demand sync**: trigger the same ingestion at any time (e.g. right after a
session ends, or from an external scheduler such as cron-job.org or GitHub
Actions on a tighter cadence than Vercel Hobby allows):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-deployment>/api/cron/sync
```

**Historical backfill**: run the cron endpoint once per deploy, or call the
provider services from a script. Backfills are idempotent (natural-key upserts)
and resumable; high-frequency telemetry is not bulk-archived by default — see
the schema comments for the retention rationale.

## Architecture

```
app/                Next.js App Router pages + API routes
  api/              leaderboard, weather, race-control, standings, telemetry,
                    strategy, ics, health, search-index, cron/sync, analysis
components/         layout, dashboard, timing, telemetry, charts, drivers, ui
lib/
  domain/           shared TypeScript models + provenance envelope
  providers/        F1DataProvider interface; openf1, jolpica, demo
  f1/               season/calendar services, leaderboard assembly
  telemetry/        lap windows, GPS distance, telemetry join, delta, track fit
  supabase/         browser/server/service-role clients, middleware
  cache/            fetch with timeout, retry + jitter, rate limiter
supabase/migrations PostgreSQL schema + RLS
tests/unit          vitest suite
docs/               design documentation (user stories, diagrams, wireframes)
```

Design docs: [docs/DESIGN.md](docs/DESIGN.md).

## Testing

```bash
pnpm test         # unit tests (vitest)
pnpm typecheck    # strict TypeScript
pnpm lint
pnpm build        # production build
pnpm test:e2e     # Playwright (requires `pnpm playwright install chromium`)
```

## Deployment (Vercel)

1. Push this repo to GitHub.
2. In Vercel: Add New → Project → import the repo (defaults work; Next.js is auto-detected).
3. Add environment variables from `.env.example` as needed, then **Redeploy**.
4. Set `CRON_SECRET`; Vercel Cron calls `/api/cron/sync` with it automatically
   once daily (Hobby plan limit). For more frequent syncs, use an external
   scheduler against the same endpoint (see Ingestion & sync).

## Known limitations

- True live (real-time) timing requires a paid OpenF1 subscription; otherwise
  in-progress sessions poll the free tier and are labelled DELAYED.
- Pre-2026 historical seasons are not in scope.
- Driver headshots link to formula1.com media URLs provided by OpenF1; missing
  images render a monogram fallback.
- Race replay reconstructs motion by interpolating between recorded GPS points
  and is labelled as such; it never fabricates positions.
