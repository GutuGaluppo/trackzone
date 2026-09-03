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

Requires Node 20+, pnpm, Docker (for local Supabase), and accounts for
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

```bash
pnpm --filter @trackzone/web dev   # apps/web on :3000
```

Background processing (audio metadata extraction) requires a Trigger.dev
project: `npx trigger.dev@latest init` inside `apps/worker` regenerates
`trigger.config.ts` with a real project ref, then `pnpm --filter
@trackzone/worker dev` runs the task locally. Without `TRIGGER_SECRET_KEY`
configured, uploads still work — tracks just stay in "Queued" instead of
picking up duration/codec/sample-rate metadata.

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
