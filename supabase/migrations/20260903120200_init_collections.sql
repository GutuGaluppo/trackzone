-- TrackZone — 0003 — collections

create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  description text,
  visibility  public.track_visibility not null default 'private',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint collections_name_length check (char_length(name) between 1 and 120),
  constraint collections_name_unique_per_owner unique (owner_id, name)
);

create index collections_owner_idx on public.collections (owner_id, created_at desc);

create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

create table public.collection_tracks (
  collection_id uuid not null references public.collections (id) on delete cascade,
  track_id      uuid not null references public.tracks (id) on delete cascade,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),

  primary key (collection_id, track_id)
);

create index collection_tracks_track_idx on public.collection_tracks (track_id);
create index collection_tracks_order_idx on public.collection_tracks (collection_id, position);

-- ---------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER — see 0002 for the rationale)
-- ---------------------------------------------------------------------------

create or replace function public.collection_is_owned_by(p_collection_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.collections c
    where c.id = p_collection_id and c.owner_id = p_user_id
  );
$$;

create or replace function public.collection_is_readable_by(p_collection_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.collections c
    where c.id = p_collection_id
      and (c.owner_id = p_user_id or c.visibility = 'public')
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.collections       enable row level security;
alter table public.collection_tracks enable row level security;

create policy "collections readable by owner or when public"
  on public.collections for select
  to authenticated
  using (owner_id = (select auth.uid()) or visibility = 'public');

create policy "collections insertable by owner"
  on public.collections for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "collections updatable by owner"
  on public.collections for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "collections deletable by owner"
  on public.collections for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- Membership is readable with the collection, but a row never widens track
-- access: reading the track itself still goes through track_is_readable_by.
create policy "collection membership readable with the collection"
  on public.collection_tracks for select
  to authenticated
  using (public.collection_is_readable_by(collection_id, (select auth.uid())));

-- Adding a track requires owning the collection AND being allowed to read the
-- track, so a collection can never be used to launder access to someone's audio.
create policy "collection membership added by the collection owner"
  on public.collection_tracks for insert
  to authenticated
  with check (
    public.collection_is_owned_by(collection_id, (select auth.uid()))
    and public.track_is_readable_by(track_id, (select auth.uid()))
  );

create policy "collection membership reordered by the collection owner"
  on public.collection_tracks for update
  to authenticated
  using (public.collection_is_owned_by(collection_id, (select auth.uid())))
  with check (public.collection_is_owned_by(collection_id, (select auth.uid())));

create policy "collection membership removed by the collection owner"
  on public.collection_tracks for delete
  to authenticated
  using (public.collection_is_owned_by(collection_id, (select auth.uid())));
