-- TrackZone — 0001 — identity foundation
--
-- profiles.id IS auth.users.id (1:1). This deliberately deviates from the
-- "id + user_id" sketch in the product doc: collapsing the two removes an
-- indirection from every authorization predicate (`owner_id = auth.uid()`
-- instead of a sub-select) and therefore removes a class of RLS bugs.

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- Private schema for rows the browser must never reach, regardless of RLS.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     citext not null unique,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint profiles_username_format
    check (username ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 80)
);

comment on table public.profiles is
  'Public-facing identity. username is reserved for future public URLs (/{username}/{track}).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Sharing a track requires finding someone by username, and a public track
-- needs an author name — readable by anyone, including anon: profiles carry
-- no sensitive fields (no email), and library_tracks INNER JOINs profiles, so
-- without anon here a public track would vanish from that view for anonymous
-- readers even though the tracks policy itself allows them.
create policy "profiles are readable by anyone"
  on public.profiles for select
  to authenticated, anon
  using (true);

create policy "users insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Automatic profile creation on signup
-- ---------------------------------------------------------------------------

create or replace function public.generate_unique_username(p_seed text)
returns citext
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base_name text;
  candidate text;
  suffix    int := 0;
begin
  base_name := lower(regexp_replace(coalesce(p_seed, ''), '[^a-zA-Z0-9_-]', '', 'g'));
  base_name := left(base_name, 24);

  if char_length(base_name) < 3 or base_name !~ '^[a-z0-9]' then
    base_name := 'user' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  candidate := base_name;
  while exists (select 1 from public.profiles p where p.username = candidate::citext) loop
    suffix := suffix + 1;
    candidate := left(base_name, 24) || suffix::text;
  end loop;

  return candidate::citext;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    public.generate_unique_username(
      coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
    ),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
