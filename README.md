# APEX F1 — Every Lap. Every Detail. Live.

[![CI](https://github.com/hyderoo/apex-f1/actions/workflows/ci.yml/badge.svg)](https://github.com/hyderoo/apex-f1/actions/workflows/ci.yml)

A live Formula 1 intelligence dashboard for the **2026 FIA Formula One World Championship**.
Timing tower, telemetry lab, tyre strategy, race control, weather, standings,
season calendar, a data health monitor and race analysis — built on real, attributable data with every panel labelled by
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

## Imagery & asset credits

| Asset | Source | Terms |
| --- | --- | --- |
| Driver portraits, circuit imagery, host-country flags | F1 media CDN, URLs supplied by the OpenF1 API (`headshot_url`, `circuit_image`, `country_flag`) | Hotlinked from the provider-supplied URL only — never re-hosted, never constructed or guessed. Every image has a designed fallback (typographic monogram or code badge). |
| Driver nationality flags | [flagcdn.com](https://flagpedia.net/download/api) | Free for embedding; credit link appreciated — flag images served by [Flagpedia](https://flagpedia.net). |
| Team identities | Typographic word-marks rendered in CSS | No licensed programmatic source of team logos exists; intentional text marks instead of unofficial files. |

Sourcing rules live in `src/lib/assets/manifest.ts`. No AI-generated or
fabricated imagery; no scraped logos.

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

`GET /api/session-extras?session=<key>` returns the official classification
(OpenF1 `session_result`), starting grid (`starting_grid`, or the qualifying
classification when the beta endpoint has no rows — labelled as such),
overtakes (`overtakes`) and team radio clips (`team_radio`, audio hosted by
formula1.com) for a session. The live timing page renders all four panels.
Qualifying segment arrays (Q1/Q2/Q3) are reduced to each driver's best time.

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

### CI & test report

Every push to `main` and every pull request runs the full gate in
[GitHub Actions](.github/workflows/ci.yml): ESLint, strict `tsc`, the vitest
unit suite, a production build, and the Playwright end-to-end suite against
the built app (Chromium). The badge above reflects the latest `main` run.

Latest local verification on `main`:

| Suite | Result |
| --- | --- |
| ESLint | clean, 0 warnings |
| `tsc --noEmit` (strict) | clean |
| vitest | 53/53 passed |
| `pnpm build` | succeeded |
| Playwright e2e | 10/10 passed (Chromium) |

The e2e suite covers the critical flows: dashboard render, season calendar,
standings, driver and team pages with image fallbacks, telemetry lab,
strategy, live/historical/demo labelling, the search palette, favorites, and
the app running without optional provider credentials.

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
  and is labelled as such; it never fabricates positions. The delta readout
  during replay is interpolated from recorded lap timing, not simulated.
- The race story summary on Race Analysis is derived only from the recorded
  classification (positions, grid, status, fastest-lap flag); it contains no
  inferred events or editorialising.
- The Data Health page (`/health`) reports live probe results (OpenF1,
  Jolpica, Supabase) and configuration state; raw JSON at `/api/health`.
- Corner numbers on the circuit map are derived from recorded GPS curvature
  and are approximate; sector boundaries come from recorded sector times.
  Both appear only when the underlying recorded data is reliable enough.
- Tyre degradation shows recorded lap times only — no fitted trend and no
  prediction; pit-in/pit-out laps are excluded and that is stated.
- Teammate head-to-head scores are computed from recorded classifications
  only, with the scoring rules stated under the table.
- A service worker caches the Race Analysis page so the latest results stay
  readable offline; the page says when it is showing the cached copy.
- Telemetry and Strategy selections are encoded in the URL, so any driver /
  GP / lap view is shareable as a plain link.
