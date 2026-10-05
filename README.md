# TrackZone

Universal audio library and audio asset manager — v0.1 MVP.

> All your audio. Finally yours.

Product and architecture decisions are documented in [`docs/`](docs) — read
`docs/PRODUCT_BRAND_TECHNICAL_DIRECTION.md` and
`docs/MVP_V0.1_DEVELOPMENT_PROMPT.md` before making non-trivial changes.

## Stack

Next.js · TypeScript (strict) · Tailwind CSS · Supabase (Postgres, Auth, RLS)
· Cloudflare R2 · Trigger.dev · Turborepo · pnpm

## Structure

```text
apps/
  web/      Next.js app — UI, API routes, auth
  worker/   Trigger.dev background job: audio metadata extraction
packages/
  audio/       pure metadata extraction (music-metadata), no I/O
  database/    authorization decisions + Supabase service client
  storage/     object-storage interface + R2 (S3-compatible) implementation
  types/       hand-maintained Database type mirroring the schema
  validation/  Zod schemas shared by client and server
  config/      shared tsconfig + eslint flat config
supabase/
  migrations/  every schema/RLS change, in order
```

Track, AudioFile and TrackSource are deliberately separate concepts — see
`docs/MVP_V0.1_DEVELOPMENT_PROMPT.md` §6.1 before conflating them.

## Setup

Requires Node 22.18+, pnpm, Docker (for local Supabase), and accounts for
Supabase, Cloudflare R2, and (optional) Trigger.dev.

```bash
pnpm install

# Local Supabase (Postgres + Auth + PostgREST), applies supabase/migrations
supabase start

cp apps/web/.env.example apps/web/.env.local
# Fill in the values `supabase status` prints, plus your R2 credentials
```

Point `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` at either the local instance (`supabase status`)
or a real Supabase project — migrations apply the same way either way via
`supabase db push` against a linked project.

R2: create a private bucket and an API token with read/write access; there is
no public bucket policy to configure — every URL the app hands out is signed
and short-lived.

For local development without Cloudflare credentials, use the S3-compatible
storage already provided by the local Supabase stack:

```bash
pnpm storage:local
```

This creates or configures a private `trackzone-audio` bucket and writes local
S3 credentials, endpoint, and region into `apps/web/.env.local`. It only runs
when the app points to local Supabase. Restart the web app after running it.
Files remain in the local Supabase Docker volume; this does not configure
Cloudflare R2 or copy files to a hosted project. If Supabase was already running
with the previous 50 MiB storage limit, restart it with `supabase stop` and
`supabase start` to apply the 2 GiB limit. Keep the Docker volumes to retain data.

```bash
pnpm --filter @trackzone/web dev   # apps/web on :3000
pnpm worker:local                # separate process: metadata extraction for local uploads
# Or start both together:
pnpm dev
```

The local worker polls the local database for queued uploads, including those
created before it was started. It extracts duration, technical metadata, and
embedded artist/album tags, and the Library refreshes while processing is active.
It requires local Supabase and local storage and refuses production environments.
Files without artist/album tags keep those fields empty; the UI shows "Unknown
artist" after processing. Originals remain untouched. Interrupted local jobs
can be reclaimed after a ten-minute lease expires.

Hosted processing uses Trigger.dev. Configure a real project in
`apps/worker/trigger.config.ts`, set `TRIGGER_SECRET_KEY` in the web app, and use
`pnpm --filter @trackzone/worker dev:trigger` for Trigger.dev development.
Deploy with `pnpm --filter @trackzone/worker deploy` and configure worker secrets
there. Queueing failures in hosted environments are shown as failed processing.

## Commands

```bash
pnpm --filter @trackzone/web dev   # run the web app
pnpm build                # build every package/app
pnpm lint                 # eslint, all packages
pnpm typecheck             # tsc --noEmit, all packages
pnpm test                  # unit tests, all packages
pnpm format                # prettier --write
```

### Integration tests

`packages/database` has RLS integration tests that run against a real
Postgres instance rather than mocks — the layer unit tests structurally
cannot reach. They skip themselves unless configured:

```bash
supabase start
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_ANON_KEY=$(supabase status -o json | jq -r .ANON_KEY)
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r .SERVICE_ROLE_KEY)
pnpm --filter @trackzone/database test:integration
```

CI runs both the unit-test job and this integration job on every PR (see
`.github/workflows/ci.yml`).

## Security model

Two independent, mutually-reinforcing layers:

1. **Application** — every track-access decision goes through
   `@trackzone/database`'s `canReadTrack` / `canDownloadTrack` /
   `canModifyTrack`, used by the API routes before anything is signed or
   returned.
2. **Database** — Postgres Row Level Security on every table, enforcing the
   same rules independently.

Private audio is never given a permanent public URL — every playback/upload
URL is short-lived and signed by the server after an explicit authorization
check. See `docs/PRODUCT_BRAND_TECHNICAL_DIRECTION.md` §7 for the full
rationale.

## What's not here yet

Deliberately out of v0.1 scope per the development prompt: Google Drive/
SoundCloud/Dropbox providers, waveform rendering, BPM/key/LUFS analysis,
Sentry/PostHog wiring, a Playwright smoke suite (planned once the flow
stabilizes), and Stripe billing UI.
