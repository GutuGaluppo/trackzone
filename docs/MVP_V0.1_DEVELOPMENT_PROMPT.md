# TrackZone --- MVP v0.1 Development Prompt

## Role

Act as a senior product engineer and technical lead building the first
production-minded MVP of **TrackZone**, a unified audio library and
audio asset manager.

The goal of v0.1 is not to build a complete music platform. Build a
focused, reliable foundation that proves the core workflow while
preserving the architecture required for future provider integrations,
sharing, public tracks, private tracks, storage, and collaboration.

Prioritize: - simple architecture; - strict TypeScript; - security by
default; - excellent desktop UX; - maintainability; - accessibility; -
performance; - zero fixed infrastructure cost during initial
development; - clear separation between track metadata, physical audio
files, sources, permissions, and processing.

Do not introduce infrastructure merely for hypothetical scale.

------------------------------------------------------------------------

## 1. Product definition

TrackZone gives users one place to manage audio that may physically live
in multiple locations.

Core mental model:

**Connect → Import → Organize → Listen → Move / Export**

TrackZone should feel like a combination of: - a modern file/library
manager; - a lightweight audio workspace; - an audio archive; - a
deliberately simplified professional audio tool.

It must **not** feel like a Spotify clone.

Primary positioning:

> **All your audio. Finally yours.**

Supporting concept:

> **Your audio. Wherever it lives.**

The long-term product is a universal audio library where users
control: 1. where their audio lives; 2. how it is organized; 3. who can
access it.

------------------------------------------------------------------------

## 2. Initial audience

Design primarily for: - DJs; - music producers; - musicians; - sound
designers; - podcasters; - audio collectors / professionals with
fragmented libraries.

Avoid consumer-streaming assumptions where they conflict with
professional audio workflows.

------------------------------------------------------------------------

## 3. MVP v0.1 scope

### Required

Implement the following end-to-end happy path:

1.  User opens TrackZone.
2.  User creates an account / signs in.
3.  User reaches an empty Library.
4.  User imports local audio files.
5.  Upload goes directly to private object storage using signed upload
    URLs.
6.  TrackZone creates a Track and associated AudioFile / TrackSource
    records.
7.  A background job extracts basic audio metadata.
8.  The processed track appears in the Library.
9.  User can play/pause and seek through the track.
10. Playback survives navigation inside the application.
11. User can create a Collection.
12. User can add/remove tracks from Collections.
13. User can mark a track as private, shared, or public at the
    data-model level.
14. Private audio must never be exposed through a permanent public
    object-storage URL.
15. Authorized playback must use short-lived signed URLs.
16. The database must enforce access rules in addition to
    application-level checks.

### Provider strategy

For v0.1: - **Local Files is mandatory.** - Architect provider
interfaces so Google Drive can be the first external provider without
rewriting the domain model. - SoundCloud support comes later and must
not be implemented until its API/terms and allowed migration behavior
are validated. - Dropbox is later.

### Sharing scope

The architecture must support:

``` text
private
shared
public
```

For v0.1, prioritize correct authorization and schema over building a
full social network.

Roles for shared access:

``` text
owner
viewer
```

A separate `allow_download` flag must exist so visibility and download
rights are not conflated.

Public does **not** automatically mean downloadable.

------------------------------------------------------------------------

## 4. Explicitly out of scope for v0.1

Do not implement unless required to complete the core architecture:

-   social feed;
-   followers/following;
-   likes;
-   comments;
-   recommendation engine;
-   AI features;
-   marketplace;
-   mobile native application;
-   desktop native application;
-   advanced collaboration;
-   team workspaces;
-   advanced roles/ACL editor;
-   public discovery;
-   BPM detection;
-   musical key detection;
-   advanced LUFS analysis;
-   audio editing;
-   automatic cross-provider synchronization;
-   Elasticsearch;
-   Algolia;
-   Meilisearch;
-   Kubernetes;
-   Kafka;
-   microservice proliferation;
-   complex recommendation/search infrastructure.

------------------------------------------------------------------------

## 5. Technical stack

Use:

### Web

-   Next.js
-   React
-   TypeScript with strict mode
-   Tailwind CSS
-   Radix UI primitives
-   Motion only where animation materially improves UX
-   TanStack Query for server state
-   Zustand for small client/UI state
-   Zod for runtime validation
-   React Hook Form where forms justify it

### Data / auth

-   Supabase
-   PostgreSQL
-   Supabase Auth
-   Row Level Security

### Audio/object storage

-   Cloudflare R2
-   private buckets
-   S3-compatible API
-   signed upload/download/playback URLs

### Processing

-   FFmpeg
-   separate worker/background processing boundary

### Jobs

-   Trigger.dev initially

### Billing

-   Stripe, but billing UI/payment collection may remain disabled until
    needed

### Observability

-   Sentry

### Product analytics

-   PostHog

### Deployment

-   Vercel for the web application
-   Cloudflare services where appropriate

### Repository

-   GitHub
-   pnpm
-   Turborepo
-   GitHub Actions

The initial fixed operating target is **€0/month**. Stay within free
tiers during development whenever possible.

------------------------------------------------------------------------

## 6. Architecture principles

### 6.1 Track is not AudioFile

Never model a Track as synonymous with one physical file.

A Track is the logical audio entity.

An AudioFile represents a physical/canonical file or generated
derivative.

A TrackSource represents where a track/file is available.

Example:

``` text
Night Drive
│
├── SoundCloud
│   └── remote source
├── Google Drive
│   └── Night Drive.wav
└── TrackZone
    └── Night Drive.wav
```

This separation is non-negotiable.

### 6.2 Storage is private by default

Original audio must not be stored in a publicly enumerable bucket.

Never persist a permanent public R2 URL for private/shared audio.

Access flow:

``` text
Browser
   ↓
TrackZone authorization endpoint
   ↓
authenticate user
   ↓
authorize track access
   ↓
generate short-lived signed URL
   ↓
R2
```

### 6.3 Authorization is server-controlled

Authentication answers "who is this user?"

Authorization answers "may this user access this track?"

Implement both.

Do not rely on hidden UI controls for security.

### 6.4 Database is a second authorization boundary

Use PostgreSQL/Supabase Row Level Security for user-owned and shared
records.

Application checks and RLS should reinforce each other.

### 6.5 Heavy processing does not belong in the web request lifecycle

FFmpeg, large imports, waveform generation and similar operations must
execute asynchronously.

The web application should enqueue work and display progress/status.

### 6.6 Files should bypass Vercel

Local upload:

``` text
Browser
   ↓ request signed URL
TrackZone API
   ↓
signed R2 upload URL

Browser ───────────────→ R2
```

Do not proxy large audio files through the Next.js/Vercel server.

------------------------------------------------------------------------

## 7. Initial domain model

Start with a schema along these lines and refine through migrations.

### profiles

``` text
id
user_id
username
display_name
avatar_url
created_at
updated_at
```

`username` should be designed to support future public URLs.

### tracks

``` text
id
owner_id
title
artist_name
album_name
artwork_url
duration_ms
visibility       // private | shared | public
allow_download
created_at
updated_at
```

Default visibility: `private`.

### audio_files

``` text
id
track_id
storage_provider
storage_key
original_filename
mime_type
codec
file_size
checksum
duration_ms
sample_rate
bit_depth
bitrate
channels
is_original
processing_status
created_at
```

### track_sources

``` text
id
track_id
provider
provider_file_id
audio_file_id nullable
source_metadata jsonb
status
created_at
updated_at
```

### track_access

``` text
track_id
user_id
role             // viewer initially
created_at
```

Owner access comes from `tracks.owner_id`.

### collections

``` text
id
owner_id
name
description
visibility
created_at
updated_at
```

### collection_tracks

``` text
collection_id
track_id
position
created_at
```

### provider_connections

``` text
id
user_id
provider
provider_account_id
encrypted_credentials/reference
status
created_at
updated_at
```

Never expose provider credentials to the browser.

### imports

``` text
id
user_id
provider
status
total_items
processed_items
failed_items
created_at
completed_at
```

### import_items

``` text
id
import_id
provider_file_id
track_id nullable
status
error_code nullable
created_at
updated_at
```

------------------------------------------------------------------------

## 8. Duplicate strategy

Calculate a checksum for original uploaded files.

The checksum is part of the future duplicate-detection strategy.

Do not assume filenames identify files.

Examples such as:

``` text
night-drive.wav
night-drive-final.wav
MASTER_FINAL_02.wav
```

may contain identical bytes.

For v0.1, record the checksum and prevent accidental duplicate physical
storage where safely possible. Do not build an elaborate
duplicate-resolution UI yet.

------------------------------------------------------------------------

## 9. Audio processing pipeline

Initial pipeline:

``` text
UPLOAD_COMPLETED
      ↓
CREATE_PROCESSING_JOB
      ↓
FFMPEG / FFPROBE
      ↓
EXTRACT METADATA
      ↓
GENERATE LIGHTWEIGHT PLAYBACK ASSET if required
      ↓
GENERATE WAVEFORM DATA if included in the current milestone
      ↓
UPDATE DATABASE
      ↓
READY
```

Original files must remain untouched.

Basic metadata: - duration; - codec; - MIME type; - file size; - sample
rate; - bit depth when available; - bitrate; - channels.

BPM/key/LUFS are not required in v0.1.

------------------------------------------------------------------------

## 10. Player

Create a persistent global player.

Zustand may hold lightweight player state:

``` text
currentTrack
queue
playing
currentTime
duration
volume
repeat
shuffle
```

The MVP requires: - play; - pause; - seek; - duration/current time; -
volume; - previous/next only if a queue exists naturally; - persistent
playback while navigating.

Use native browser audio capabilities where possible.

Do not introduce a heavy audio engine without a demonstrated need.

------------------------------------------------------------------------

## 11. Waveform

Do not render enormous raw waveform datasets in the DOM.

If waveform is enabled in the milestone: 1. generate downsampled
waveform data asynchronously; 2. store a compact representation; 3.
render efficiently, preferably Canvas or another lightweight approach.

The waveform is a UI representation, not the source of truth.

------------------------------------------------------------------------

## 12. Library UX

Desktop-first.

Core shell:

``` text
TRACKZONE

LIBRARY
├── All Tracks
├── Recently Added
├── Favorites
└── Unsorted

SOURCES
├── Local Files
└── future providers

COLLECTIONS
├── ...
└── + New Collection
```

Main Library should favor a dense, professional table/list over
streaming-service cards.

Suggested columns: - track; - artist; - duration; - format; - source
indicators; - visibility; - actions.

Support: - search; - sort; - selection; - empty state; - loading
state; - processing state; - failed processing state.

Do not overcrowd the first iteration.

------------------------------------------------------------------------

## 13. Source indicators

The UI should make physical/source availability understandable without
requiring the user to think about storage internals.

Concept:

``` text
SOURCES
LOCAL   GD   SC   TZ
  ✓     ✓    —    ✓
```

Provider/source status should be subtle and compact.

------------------------------------------------------------------------

## 14. Search

Use PostgreSQL capabilities initially.

Searchable fields can include: - title; - artist; - album; - original
filename; - tags later; - source/provider metadata where appropriate.

Do not add a dedicated search service in v0.1.

------------------------------------------------------------------------

## 15. Design direction

Implement the approved TrackZone visual language.

Keywords:

**warm editorial / archive / retro-futuristic professional audio /
industrial hardware / precision / tactile controls / modern software**

Avoid: - generic SaaS gradients; - purple/blue neon music aesthetics; -
Spotify-like cards; - excessive glassmorphism; - decorative waveforms
everywhere; - cyberpunk clichés.

The interface should feel like:

> Finder + Linear + a deliberately simplified DAW, filtered through the
> visual language of premium industrial audio hardware.

Refer to the separate TrackZone Product & Visual Direction document for
tokens and identity rules.

------------------------------------------------------------------------

## 16. Accessibility

Build accessibility into components rather than treating it as a cleanup
task.

Minimum: - semantic HTML; - keyboard navigation; - visible focus; -
accessible dialogs/menus; - proper labels; - sufficient contrast; -
reduced-motion consideration; - player controls accessible by keyboard
and screen readers.

Use Radix primitives where useful, but validate the resulting UI.

------------------------------------------------------------------------

## 17. Quality baseline

Configure from the beginning: - strict TypeScript; - ESLint; -
formatting; - environment validation; - migration-based database
changes; - unit tests for domain/authorization logic; - integration
tests for critical server flows; - a small Playwright smoke suite for
the happy path when the flow stabilizes; - CI on pull requests.

Prioritize tests around: 1. authorization; 2. ownership; 3. signed URL
issuance; 4. uploads; 5. track creation; 6. collection membership.

------------------------------------------------------------------------

## 18. Security requirements

Treat these as MVP requirements, not future hardening:

-   private storage by default;
-   no permanent private-media URLs;
-   short-lived signed URLs;
-   authorization before signing;
-   RLS;
-   server-side validation with Zod or equivalent;
-   secrets only server-side;
-   no provider OAuth tokens in client storage;
-   least-privilege credentials;
-   sanitize/normalize filenames;
-   validate allowed audio types;
-   enforce upload limits;
-   do not trust MIME type supplied only by the browser;
-   rate-limit security-sensitive endpoints where appropriate;
-   log authorization/processing failures without leaking secrets.

------------------------------------------------------------------------

## 19. Monorepo target

Use a structure similar to:

``` text
trackzone/
├── apps/
│   ├── web/
│   └── worker/
│
├── packages/
│   ├── ui/
│   ├── database/
│   ├── auth/
│   ├── audio/
│   ├── providers/
│   ├── validation/
│   ├── config/
│   └── types/
│
├── docs/
├── supabase/
│   └── migrations/
│
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

Do not create packages without a concrete boundary/use.

------------------------------------------------------------------------

## 20. Implementation sequence

Work incrementally.

### Phase 0 --- Foundation

-   monorepo;
-   Next.js;
-   TypeScript;
-   lint/format;
-   environment schema;
-   CI;
-   base design tokens;
-   Supabase project configuration.

### Phase 1 --- Identity/Auth

-   signup/signin;
-   profile creation;
-   protected app shell;
-   RLS baseline.

### Phase 2 --- Library foundation

-   Track/AudioFile/TrackSource schema;
-   Library page;
-   empty states;
-   collection schema/UI.

### Phase 3 --- Local upload

-   signed R2 upload;
-   upload queue UI;
-   direct browser → R2;
-   create records;
-   background processing;
-   processing status.

### Phase 4 --- Playback

-   authorized signed playback URLs;
-   persistent global player;
-   seek/volume;
-   basic waveform if justified.

### Phase 5 --- Visibility/security

-   private/shared/public domain model;
-   `track_access`;
-   owner/viewer authorization;
-   `allow_download`;
-   tests for every access path.

### Phase 6 --- Polish

-   search/sort;
-   loading/error states;
-   responsive minimum;
-   accessibility audit;
-   Sentry;
-   PostHog core events.

### Phase 7 --- External-provider preparation

-   provider interface/contracts;
-   Google Drive integration plan;
-   do not implement SoundCloud migration before validating its
    constraints.

------------------------------------------------------------------------

## 21. Core analytics events

Keep analytics minimal:

``` text
signup_completed
first_upload_started
first_upload_completed
track_processing_failed
first_track_played
collection_created
track_visibility_changed
```

Never send private audio content or sensitive metadata unnecessarily to
analytics.

------------------------------------------------------------------------

## 22. Definition of done for MVP v0.1

The MVP is successful when a new user can:

1.  create an account;
2.  upload supported local audio directly to private storage;
3.  see processing progress;
4.  find the processed track in a unified Library;
5.  inspect useful basic metadata;
6.  play it securely;
7.  navigate without interrupting playback;
8.  organize it into a Collection;
9.  have visibility represented as private/shared/public;
10. share access safely where the v0.1 UI exposes that capability;
11. never gain access to another user's private track without explicit
    authorization.

All critical authorization tests must pass.

The system should remain deployable using free tiers with an initial
fixed infrastructure target of **€0/month**.

------------------------------------------------------------------------

## 23. Engineering behavior for the coding agent

Before implementing a major feature: 1. inspect the existing
architecture; 2. state the smallest change required; 3. identify
security/data-model implications; 4. reuse existing patterns; 5. avoid
speculative abstractions.

For database changes: - always create migrations; - include RLS/policy
implications; - do not silently mutate production schemas.

For security-sensitive flows: - add tests before considering the task
complete.

For UI: - preserve the approved visual system; - use reusable
primitives; - keep the interface dense but calm; - favor clarity over
decorative effects.

When uncertain between a simpler implementation and a more scalable but
substantially more complex implementation, choose the simpler
implementation unless it violates one of the architectural boundaries
defined above.
