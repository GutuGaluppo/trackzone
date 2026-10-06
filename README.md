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

Requires Node 22.18+, pnpm, a Supabase project (Postgres + Auth), and a private
Cloudflare R2 bucket. Trigger.dev is required for hosted processing in production.
Docker and local Supabase are optional tools for database integration tests.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Fill in Supabase URL/keys and Cloudflare R2 credentials.
```

Supabase stores accounts, permissions and track metadata. R2 stores audio bytes;
configuring R2 does not replace the Supabase database or authentication service.
Point the Supabase variables at your hosted project to run without local Supabase.
Apply migrations through `supabase db push` against the linked project after
reviewing the target and pending changes. Existing local database data and local
files are not automatically copied to the hosted services.

Keep the R2 bucket private and configure browser CORS for the application's
origins. Every media URL issued by the application is signed and short-lived.
For setup details, see [R2 configuration (Português)](docs/R2_CONFIGURATION.md).

```bash
pnpm dev                        # starts web and development worker together
pnpm --filter @trackzone/web dev # web only, on :3000
pnpm worker:dev                 # worker only, using apps/web/.env.local
pnpm storage:check              # verify R2 and CORS; remove temporary probe objects
```

The development worker reads audio from R2 and uses whichever Supabase database
is configured. It polls pending jobs, acquires database leases to avoid concurrent
processing, and recovers interrupted jobs. It refuses `NODE_ENV=production`.
It uses the same extraction adapter as Trigger.dev. Duration, technical metadata
and embedded artist/album tags are extracted; missing tags stay empty. The Library
refreshes while work is outstanding. Originals remain untouched.

Without `TRIGGER_SECRET_KEY` in development, uploads are left for this worker.
In production, dispatch requires Trigger.dev and missing configuration produces a
visible processing failure. Do not use `worker:dev` as a production service.

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
