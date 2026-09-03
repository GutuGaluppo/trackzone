-- TrackZone — 0002 — library core
--
-- Domain rule (non-negotiable, see docs/PRODUCT_BRAND_TECHNICAL_DIRECTION.md §28):
--   Track      = the logical audio entity a user thinks about
--   AudioFile  = one physical/canonical file or generated derivative
--   TrackSource= where a track is available (provider-level)

create type public.track_visibility as enum ('private', 'shared', 'public');
create type public.track_role       as enum ('owner', 'viewer');
create type public.provider         as enum ('trackzone', 'local', 'google_drive', 'soundcloud', 'dropbox');
create type public.processing_status as enum ('pending', 'processing', 'ready', 'failed');
create type public.source_status     as enum ('available', 'missing', 'error');

-- ---------------------------------------------------------------------------
-- tracks
-- ---------------------------------------------------------------------------

create table public.tracks (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  title          text not null,
  artist_name    text,
  album_name     text,
  artwork_url    text,
  duration_ms    integer,
  visibility     public.track_visibility not null default 'private',
  allow_download boolean not null default false,
  favorite       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint tracks_title_length check (char_length(title) between 1 and 300),
  constraint tracks_duration_positive check (duration_ms is null or duration_ms >= 0)
);

comment on column public.tracks.allow_download is
  'Download rights are modeled separately from visibility: public does not mean downloadable.';

-- Full-text search over user-facing metadata (Postgres only — no search service in v0.1).
alter table public.tracks
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(artist_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(album_name, '')), 'C')
  ) stored;

create index tracks_owner_created_idx on public.tracks (owner_id, created_at desc);
create index tracks_visibility_idx    on public.tracks (visibility) where visibility <> 'private';
create index tracks_search_idx        on public.tracks using gin (search_vector);
create index tracks_favorite_idx      on public.tracks (owner_id) where favorite;

create trigger tracks_set_updated_at
  before update on public.tracks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- track_access — explicit grants for `shared` tracks
-- ---------------------------------------------------------------------------

create table public.track_access (
  track_id   uuid not null references public.tracks (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.track_role not null default 'viewer',
  created_at timestamptz not null default now(),

  primary key (track_id, user_id),
  -- Owner access derives from tracks.owner_id; never duplicate it here.
  constraint track_access_role_not_owner check (role <> 'owner')
);

create index track_access_user_idx on public.track_access (user_id);

-- ---------------------------------------------------------------------------
-- Authorization helpers
--
-- SECURITY DEFINER on purpose: these are called from RLS policies on other
-- tables. Running them as the definer bypasses RLS on `tracks`/`track_access`
-- and breaks what would otherwise be mutually recursive policy evaluation.
-- For this to hold, `tracks` and `track_access` must never use FORCE RLS.
-- ---------------------------------------------------------------------------

create or replace function public.track_is_owned_by(p_track_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tracks t
    where t.id = p_track_id and t.owner_id = p_user_id
  );
$$;

create or replace function public.track_is_readable_by(p_track_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.tracks t
    where t.id = p_track_id
      and (
        t.owner_id = p_user_id
        or t.visibility = 'public'
        or (
          t.visibility = 'shared'
          and p_user_id is not null
          and exists (
            select 1 from public.track_access ta
            where ta.track_id = t.id and ta.user_id = p_user_id
          )
        )
      )
  );
$$;

comment on function public.track_is_readable_by is
  'Single source of truth for read authorization. The API layer must call the same rule.';

-- ---------------------------------------------------------------------------
-- audio_files — physical bytes
-- ---------------------------------------------------------------------------

create table public.audio_files (
  id                uuid primary key default gen_random_uuid(),
  track_id          uuid not null references public.tracks (id) on delete cascade,
  storage_provider  public.provider not null default 'trackzone',
  storage_key       text not null,
  original_filename text not null,
  mime_type         text,
  codec             text,
  file_size         bigint,
  checksum          text,
  duration_ms       integer,
  sample_rate       integer,
  bit_depth         integer,
  bitrate           integer,
  channels          smallint,
  is_original       boolean not null default true,
  processing_status public.processing_status not null default 'pending',
  processing_error  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint audio_files_file_size_positive check (file_size is null or file_size >= 0),
  constraint audio_files_storage_key_unique unique (storage_provider, storage_key)
);

comment on column public.audio_files.checksum is
  'SHA-256 of the original bytes. Foundation for duplicate detection; filenames never identify a file.';

create index audio_files_track_idx    on public.audio_files (track_id);
create index audio_files_checksum_idx on public.audio_files (checksum) where checksum is not null;
create index audio_files_filename_idx on public.audio_files using gin (original_filename gin_trgm_ops);
create index audio_files_status_idx   on public.audio_files (processing_status)
  where processing_status in ('pending', 'processing');

-- One original per track keeps "the canonical file" unambiguous; derivatives
-- (previews, waveform sources) are inserted with is_original = false.
create unique index audio_files_one_original_per_track
  on public.audio_files (track_id) where is_original;

create trigger audio_files_set_updated_at
  before update on public.audio_files
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- track_sources — where a track is available
-- ---------------------------------------------------------------------------

create table public.track_sources (
  id               uuid primary key default gen_random_uuid(),
  track_id         uuid not null references public.tracks (id) on delete cascade,
  provider         public.provider not null,
  provider_file_id text,
  audio_file_id    uuid references public.audio_files (id) on delete set null,
  source_metadata  jsonb not null default '{}'::jsonb,
  status           public.source_status not null default 'available',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint track_sources_unique_per_provider unique (track_id, provider, provider_file_id)
);

create index track_sources_track_idx on public.track_sources (track_id);

create trigger track_sources_set_updated_at
  before update on public.track_sources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.tracks        enable row level security;
alter table public.track_access  enable row level security;
alter table public.audio_files   enable row level security;
alter table public.track_sources enable row level security;

-- tracks -------------------------------------------------------------------
create policy "tracks readable by owner, grantees and everyone when public"
  on public.tracks for select
  to authenticated
  using (public.track_is_readable_by(id, (select auth.uid())));

create policy "tracks insertable by owner"
  on public.tracks for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "tracks updatable by owner"
  on public.tracks for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "tracks deletable by owner"
  on public.tracks for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- track_access -------------------------------------------------------------
create policy "grants visible to the track owner and the grantee"
  on public.track_access for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.track_is_owned_by(track_id, (select auth.uid()))
  );

create policy "grants managed by the track owner"
  on public.track_access for insert
  to authenticated
  with check (public.track_is_owned_by(track_id, (select auth.uid())));

create policy "grants updatable by the track owner"
  on public.track_access for update
  to authenticated
  using (public.track_is_owned_by(track_id, (select auth.uid())))
  with check (public.track_is_owned_by(track_id, (select auth.uid())));

create policy "grants revocable by the track owner or the grantee"
  on public.track_access for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.track_is_owned_by(track_id, (select auth.uid()))
  );

-- audio_files --------------------------------------------------------------
-- Reading the row reveals metadata only. storage_key is never a usable URL:
-- bytes require a short-lived signed URL issued after an authorization check.
create policy "audio files readable with the track"
  on public.audio_files for select
  to authenticated
  using (public.track_is_readable_by(track_id, (select auth.uid())));

create policy "audio files writable by the track owner"
  on public.audio_files for insert
  to authenticated
  with check (public.track_is_owned_by(track_id, (select auth.uid())));

create policy "audio files updatable by the track owner"
  on public.audio_files for update
  to authenticated
  using (public.track_is_owned_by(track_id, (select auth.uid())))
  with check (public.track_is_owned_by(track_id, (select auth.uid())));

create policy "audio files deletable by the track owner"
  on public.audio_files for delete
  to authenticated
  using (public.track_is_owned_by(track_id, (select auth.uid())));

-- track_sources ------------------------------------------------------------
create policy "sources readable with the track"
  on public.track_sources for select
  to authenticated
  using (public.track_is_readable_by(track_id, (select auth.uid())));

create policy "sources writable by the track owner"
  on public.track_sources for insert
  to authenticated
  with check (public.track_is_owned_by(track_id, (select auth.uid())));

create policy "sources updatable by the track owner"
  on public.track_sources for update
  to authenticated
  using (public.track_is_owned_by(track_id, (select auth.uid())))
  with check (public.track_is_owned_by(track_id, (select auth.uid())));

create policy "sources deletable by the track owner"
  on public.track_sources for delete
  to authenticated
  using (public.track_is_owned_by(track_id, (select auth.uid())));
