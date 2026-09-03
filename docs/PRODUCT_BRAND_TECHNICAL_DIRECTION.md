# TrackZone --- Product, Brand & Technical Direction

**Status:** Pre-development / MVP v0.1\
**Purpose:** Consolidated record of the TrackZone rain of thoughts and
decisions made before implementation.

------------------------------------------------------------------------

# 1. Product idea

TrackZone began as a simple platform where users could: - migrate tracks
from SoundCloud and other audio platforms; - upload tracks from a
personal computer; - connect cloud storage; - centralize audio that
currently lives in different places.

The concept evolved beyond a migration utility.

## Current product definition

**TrackZone is a universal audio library and audio asset manager.**

Rather than forcing users to think about where a file physically lives,
TrackZone presents one logical library and keeps track of its sources
and copies.

Core flow:

> **Connect → Import → Organize → Listen → Move / Export**

Primary brand proposition:

> **All your audio. Finally yours.**

Alternative/supporting line:

> **Your audio. Wherever it lives.**

A useful product statement:

> TrackZone is a universal audio library where you control not only
> where your audio lives, but also who can access it.

------------------------------------------------------------------------

# 2. Audience

Initial audience: - DJs; - producers; - musicians; - sound designers; -
podcasters; - collectors; - other professionals who accumulate audio
across multiple platforms and storage locations.

The product is not initially positioned as a general consumer streaming
service.

------------------------------------------------------------------------

# 3. Product principles

## One logical track, multiple physical sources

A track should not be duplicated in the interface simply because it
exists in multiple places.

Example:

``` text
Night Drive
│
├── SoundCloud
├── Google Drive
└── TrackZone Storage
```

The user thinks:

> "Where is my track?"

TrackZone handles:

> "Where are the available copies/sources of this track?"

This led to an important domain decision:

> **Track ≠ AudioFile**

------------------------------------------------------------------------

# 4. Universal Audio Library

The Library is the center of the product.

Conceptual navigation:

``` text
TRACKZONE

LIBRARY
├── All Tracks
├── Recently Added
├── Favorites
└── Unsorted

SOURCES
├── SoundCloud
├── Local Files
├── Google Drive
└── Dropbox

COLLECTIONS
├── DJ Sets
├── Samples
├── Field Recordings
├── Work in Progress
└── Archive
```

The interface should clearly show where each track exists.

Example source rail:

``` text
Night Drive.wav

04:31 · WAV · 24-bit · 48 kHz

SC   GD   DB   TZ
✓    ✓    —    ✓
```

The long-term system can use this model for: - source availability; -
duplicate detection; - missing files; - backups; - migration; - metadata
differences; - future version awareness.

------------------------------------------------------------------------

# 5. Storage philosophy

Three approaches were considered:

### A. Index only

TrackZone stores metadata/references while audio remains with external
providers.

### B. Full storage

TrackZone stores the user's files.

### C. Hybrid

TrackZone indexes external audio and optionally keeps a TrackZone copy.

**Chosen direction: Hybrid.**

Conceptually:

> TrackZone indexes your audio wherever it lives.

Optional:

> Keep a copy in TrackZone.

This also creates a natural future monetization path around
backup/storage rather than making storage mandatory from day one.

------------------------------------------------------------------------

# 6. Public, shared and private audio

An important product requirement was added before MVP definition:

> TrackZone users can access audio belonging to other users.

Tracks therefore need an explicit visibility model:

``` text
private
shared
public
```

## Private

Only the owner can access the track.

## Shared

The owner plus explicitly authorized users can access it.

Initial sharing roles:

``` text
owner
viewer
```

## Public

Accessible according to TrackZone's public-access policy.

Important:

> **Public does not mean downloadable.**

Download permission is modeled separately:

``` text
allow_download: boolean
```

This leaves room for future public profile URLs such as:

``` text
trackzone.com/username/track
```

without forcing TrackZone to become a social network in the MVP.

------------------------------------------------------------------------

# 7. Security philosophy

The introduction of public/private/shared tracks makes authorization a
first-class architectural requirement.

Authentication:

> Who are you?

Authorization:

> Are you allowed to access this specific track?

Both are required.

Audio storage is private by default.

Private/shared files must never rely on permanent public object-storage
URLs.

Playback flow:

``` text
User
  ↓
TrackZone
  ↓
Authentication
  ↓
Authorization
  ↓
Short-lived signed media URL
  ↓
Cloudflare R2
```

PostgreSQL Row Level Security provides an additional enforcement layer.

------------------------------------------------------------------------

# 8. Visual identity

## Direction

The approved aesthetic is based on premium retro-futuristic
audio/industrial devices.

Core descriptors:

-   warm;
-   editorial;
-   archival;
-   tactile;
-   industrial;
-   precise;
-   professional audio;
-   retro-futuristic without nostalgia cosplay;
-   modern software without generic SaaS styling.

A useful shorthand:

> **Finder + Linear + a deliberately simplified DAW.**

The visual language should borrow from: - hardware faceplates; -
industrial labeling; - physical controls; - equipment displays; -
precision markings; - restrained status lights; - audio equipment rather
than consumer music apps.

------------------------------------------------------------------------

# 9. What the visual identity should avoid

Avoid: - Spotify imitation; - music-note logos; - headphone logos; -
play-button logos as the main identity; - waveform logos; - neon
purple/blue; - generic startup gradients; - excessive glassmorphism; -
cyberpunk UI; - overly glossy skeuomorphism.

Waveforms belong to the product interface, not the brand mark.

------------------------------------------------------------------------

# 10. Color study

Approved base palette:

  Role                          Color            Hex
  ----------------------------- ---------------- -----------
  Primary / Ink                 Charcoal Black   `#171717`
  Background                    Warm Off-white   `#F4F1EA`
  Signal / Primary Accent       Signal Orange    `#FF4D24`
  Functional Secondary Accent   Olive            `#8DA52A`
  Secondary Text / Neutral      Warm Gray        `#77736B`

## Charcoal --- `#171717`

Used for: - primary typography; - dark app surfaces; - iconography; -
borders; - strong contrast.

It is deliberately softer than pure `#000000`.

## Warm Off-white --- `#F4F1EA`

Primary light surface.

It gives TrackZone a more physical/editorial quality than pure white and
supports the hardware-inspired direction.

## Signal Orange --- `#FF4D24`

The strongest identity accent.

Use for: - primary CTA; - active/important status; - brand dot; - key
interaction moments; - progress/accent states.

It should be used sparingly enough to retain its signal value.

## Olive --- `#8DA52A`

Secondary functional accent.

Inspired by the green hardware reference.

Use for: - ready/active states; - playback accents; - source
availability; - success/status; - selected secondary controls.

It should not compete with Signal Orange as the primary brand accent.

## Warm Gray --- `#77736B`

Use for: - secondary copy; - metadata; - disabled/quiet information; -
subtle labels.

------------------------------------------------------------------------

# 11. Typography

Primary pairing:

## Instrument Sans

Use for: - brand wordmark direction; - headings; - body text; -
buttons; - navigation; - application UI.

Character: - modern; - neutral without being sterile; - editorial; -
highly legible.

## DM Mono

Use for: - technical metadata; - durations; - bitrate; - sample rate; -
bit depth; - status labels; - timestamps; - compact hardware-like
readouts.

Example:

``` text
04:31   WAV   48 kHz   24-bit
```

Alternative previously considered: - IBM Plex Sans - IBM Plex Mono

The approved primary direction remains **Instrument Sans + DM Mono**.

------------------------------------------------------------------------

# 12. Logo direction

Eight initial directions were explored:

1.  TZ Monogram
2.  Track Slot
3.  Audio Archive
4.  Zone Mark
5.  Signal Mark
6.  TZ Cursor
7.  Track Stack
8.  Wordmark

The selected direction is:

> **TZ Cursor**

The later boxed variation was explored and rejected in favor of the
earlier, freer TZ Cursor composition.

## TZ Cursor concept

The mark combines: - `T`; - `Z`; - the visual suggestion of a
cursor/directional movement; - a small Signal Orange point.

It communicates: - movement; - selection; - precision; - digital
interaction; - tracks moving into/through TrackZone.

The `T` and `Z` should feel related and layered while retaining a
distinctive silhouette.

## Brand dot

The orange dot is a recurring identity element.

It can represent: - active; - connected; - stored; - selected; -
online; - processing completed; - a point/location within a "zone".

It can appear in the logo and selectively throughout the interface.

## Wordmark

Primary wordmark:

``` text
TRACKZONE
```

Uppercase, clean, controlled spacing, using the approved
geometric/editorial direction.

The TZ Cursor can work independently as: - app icon; - favicon; -
avatar; - compact navigation mark; - social identity.

------------------------------------------------------------------------

# 13. Landing page direction

The approved landing-page exploration established the broader product
aesthetic.

## Hero

Primary copy:

> **All your audio. Finally yours.**

Supporting message:

> TrackZone brings every track, sample and idea from every platform into
> one place. Organize. Listen. Move. Backup. Yours.

Primary CTA direction:

> **Get Started Free**

Secondary CTA:

> **See How It Works**

The hero visually references the industrial audio-device aesthetic
rather than conventional streaming imagery.

------------------------------------------------------------------------

# 14. Landing page structure

Initial structure:

``` text
Navigation
↓
Hero
↓
Connected-source indicators
↓
Audience/trust strip
↓
Dark TrackZone Library product preview
↓
Core benefits
↓
Pricing
```

Core benefit vocabulary:

``` text
Connect
Organize
Listen
Move
Backup
```

Library section concept:

> **One library. Everywhere.**

Product benefit section:

> **Your audio. Your rules.**

Pricing direction:

> **Simple pricing. Powerful value.**

------------------------------------------------------------------------

# 15. Application visual direction

Unlike the warm landing page, the core Library can use a dark
professional workspace.

This creates a useful contrast:

``` text
Marketing / editorial
Warm Off-white
        ↓
Product workspace
Charcoal / dark
```

The app should remain calm, information-dense and professional.

The Library should prioritize rows/table layouts over large album cards.

Audio metadata is part of the visual texture.

------------------------------------------------------------------------

# 16. Player direction

The player is persistent across application navigation.

Visual characteristics: - compact; - precise; - waveform optional; -
clear play/pause; - timeline; - current time/duration; - volume; -
queue-aware when needed.

Avoid reproducing Spotify's player visually.

Hardware-inspired details can appear in moderation.

------------------------------------------------------------------------

# 17. Technology direction

Approved initial stack:

  Layer                   Technology
  ----------------------- -------------------------------------
  Frontend                Next.js + React + TypeScript
  Styling                 Tailwind CSS
  Accessible primitives   Radix UI
  Server state            TanStack Query
  Client state            Zustand
  Validation              Zod
  Forms                   React Hook Form
  Database                PostgreSQL / Supabase
  Authentication          Supabase Auth
  Authorization           Application checks + PostgreSQL RLS
  Object storage          Cloudflare R2
  Audio processing        FFmpeg
  Background jobs         Trigger.dev
  Billing                 Stripe
  Monitoring              Sentry
  Analytics               PostHog
  Frontend deployment     Vercel
  Package manager         pnpm
  Monorepo                Turborepo
  Repository / CI         GitHub + GitHub Actions

------------------------------------------------------------------------

# 18. Infrastructure philosophy

Initial fixed-cost target:

> **€0/month**

Use free tiers while developing and validating the product.

The architecture should scale by usage rather than introducing fixed
infrastructure costs prematurely.

Important architectural decisions: - Supabase for control/data plane; -
R2 for audio objects; - browser uploads directly to R2; - workers for
heavy processing; - Next.js should not transport huge audio payloads; -
avoid unnecessary infrastructure.

------------------------------------------------------------------------

# 19. Why Cloudflare R2

R2 is the intended primary object-storage layer because TrackZone may
eventually handle: - large lossless audio files; - repeated playback; -
downloads; - backups.

The architecture must keep object storage replaceable through clear
interfaces, but R2 is the initial target.

Original media is private by default.

------------------------------------------------------------------------

# 20. Import architecture

Large provider imports must not be implemented as long-running browser
requests.

Conceptual flow:

``` text
IMPORT_CREATED
      ↓
DISCOVER_FILES
      ↓
QUEUE
      ↓
COPY / INDEX
      ↓
ANALYZE
      ↓
CREATE / MATCH TRACK
      ↓
READY
```

Local upload:

``` text
Browser
   ↓
Signed upload request
   ↓
TrackZone API
   ↓
Signed R2 URL
   ↓
Browser → R2
```

External provider:

``` text
Provider
   ↓
TrackZone import worker
   ↓
R2 and/or indexed source
```

depending on provider rules and user intent.

------------------------------------------------------------------------

# 21. Provider order

Current direction:

### v0.1

-   Local Files

### First external integration

-   Google Drive

### Later

-   SoundCloud
-   Dropbox
-   additional providers

SoundCloud requires explicit validation of API capabilities, platform
terms and what forms of copying/migration are permitted before
implementation.

------------------------------------------------------------------------

# 22. Audio processing

FFmpeg/ffprobe runs outside the normal web request lifecycle.

Initial useful metadata: - duration; - codec; - file size; - sample
rate; - bit depth; - bitrate; - channels.

Possible derivatives: - compact waveform data; - lightweight playback
preview where necessary.

Original files remain unchanged.

Future analysis can include: - BPM; - musical key; - LUFS.

These are not MVP requirements.

------------------------------------------------------------------------

# 23. Duplicate detection

TrackZone should calculate file checksums.

This allows the system to recognize that differently named files may be
byte-identical.

Long-term UX:

> **Already in your library.**

The first version only needs the architectural/data foundation and
sensible duplicate prevention.

------------------------------------------------------------------------

# 24. Search

Start with PostgreSQL search.

Do not introduce: - Elasticsearch; - Algolia; - Typesense; - Meilisearch

until actual scale/use cases justify them.

------------------------------------------------------------------------

# 25. Product state management

Use:

### TanStack Query

For server state: - tracks; - collections; - sources; - imports; -
permissions; - profiles.

### Zustand

For lightweight client state: - player; - queue; - selection; -
layout; - filters; - upload UI state where appropriate.

Avoid Redux unless future requirements clearly justify it.

------------------------------------------------------------------------

# 26. Monetization direction

Storage creates a natural future paid feature.

Early conceptual tiers explored:

### Free

-   connect sources;
-   organize Library;
-   basic metadata;
-   playback.

### Pro

Possible: - TrackZone storage; - automatic backup; - duplicate
detection; - lossless transfer; - advanced metadata; - batch operations.

### Studio

Possible: - larger storage allocation; - collaboration; - professional
workflows.

Exact pricing and limits are **not final**.

The important product principle is:

> Let users experience the unified Library before asking them to pay for
> storage.

Potential upsell:

``` text
486 tracks found
21 duplicates
16.8 GB audio

Protect your library.

Keep a backup in TrackZone →
```

------------------------------------------------------------------------

# 27. MVP philosophy

TrackZone v0.1 should prove one thing extremely well:

> A user can bring audio into TrackZone, see it represented correctly in
> one Library, organize it, play it securely, and retain explicit
> control over access.

Do not attempt to build: - Spotify; - Dropbox; - Rekordbox; -
SoundCloud; - a DAW

simultaneously.

The foundation should allow the product to grow toward those adjacent
capabilities without making the MVP responsible for them.

------------------------------------------------------------------------

# 28. Key architectural decisions already made

These should not be reopened casually during implementation:

1.  **Track is separate from AudioFile.**
2.  **TrackSource models where audio exists.**
3.  **Storage is private by default.**
4.  **Visibility supports private/shared/public.**
5.  **Public and downloadable are separate concepts.**
6.  **Authorization is server-side.**
7.  **RLS is part of the security model.**
8.  **Large uploads bypass Vercel.**
9.  **Heavy audio work runs asynchronously.**
10. **The web product is desktop-first.**
11. **The Library is the center of the application.**
12. **The visual identity is warm editorial + industrial audio.**
13. **TZ Cursor is the selected logo direction.**
14. **Signal Orange is the main accent.**
15. **Initial fixed operating target is €0/month.**
16. **Local upload comes before external provider complexity.**
17. **Google Drive is the preferred first external provider.**
18. **SoundCloud migration requires policy/API validation first.**

------------------------------------------------------------------------

# 29. Open questions after v0.1 planning

These remain intentionally open for later product rounds: - exact
public-profile behavior; - whether public playback requires
authentication; - share-link support for non-users; - granular ACL roles
beyond viewer; - public collections; - follows/likes/comments; -
automatic provider synchronization; - TrackZone storage quotas; - final
pricing; - exact mobile experience; - native apps; - team/workspace
collaboration; - audio versioning; - advanced duplicate resolution; -
audio fingerprinting beyond file checksum; - public discovery/search.

------------------------------------------------------------------------

# 30. North-star feeling

TrackZone should give the user the feeling:

> **"My audio is finally under control."**

The interface should make a fragmented audio library feel organized,
safe, portable and owned by the user.
