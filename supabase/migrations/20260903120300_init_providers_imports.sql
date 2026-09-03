-- TrackZone — 0004 — provider connections and imports
--
-- v0.1 only ships the `local` provider, but the contracts below are the ones
-- Google Drive will use, so adding it does not require a domain-model rewrite.

create type public.connection_status as enum ('active', 'expired', 'revoked', 'error');
create type public.import_status     as enum ('pending', 'discovering', 'running', 'completed', 'failed', 'cancelled');
create type public.import_item_status as enum ('pending', 'running', 'completed', 'failed', 'skipped');

-- ---------------------------------------------------------------------------
-- provider_connections
--
-- The row in `public` carries only non-sensitive connection state. OAuth
-- tokens live in `private.provider_credentials`, which has RLS enabled and no
-- policies at all: reachable by the service role (workers) and nothing else.
-- ---------------------------------------------------------------------------

create table public.provider_connections (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  provider            public.provider not null,
  provider_account_id text,
  display_name        text,
  status              public.connection_status not null default 'active',
  last_synced_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint provider_connections_unique unique (user_id, provider, provider_account_id)
);

create trigger provider_connections_set_updated_at
  before update on public.provider_connections
  for each row execute function public.set_updated_at();

create table private.provider_credentials (
  connection_id         uuid primary key
                        references public.provider_connections (id) on delete cascade,
  encrypted_credentials text not null,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table private.provider_credentials is
  'Server-only. No RLS policy exists, so anon/authenticated can never read it.';

alter table private.provider_credentials enable row level security;
revoke all on private.provider_credentials from anon, authenticated;

-- ---------------------------------------------------------------------------
-- imports
-- ---------------------------------------------------------------------------

create table public.imports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  provider        public.provider not null,
  connection_id   uuid references public.provider_connections (id) on delete set null,
  status          public.import_status not null default 'pending',
  total_items     integer not null default 0,
  processed_items integer not null default 0,
  failed_items    integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index imports_user_idx on public.imports (user_id, created_at desc);

create trigger imports_set_updated_at
  before update on public.imports
  for each row execute function public.set_updated_at();

create table public.import_items (
  id               uuid primary key default gen_random_uuid(),
  import_id        uuid not null references public.imports (id) on delete cascade,
  provider_file_id text not null,
  filename         text,
  track_id         uuid references public.tracks (id) on delete set null,
  status           public.import_item_status not null default 'pending',
  error_code       text,
  error_message    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index import_items_import_idx on public.import_items (import_id, status);

create trigger import_items_set_updated_at
  before update on public.import_items
  for each row execute function public.set_updated_at();

create or replace function public.import_is_owned_by(p_import_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.imports i
    where i.id = p_import_id and i.user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security — everything here is strictly owner-scoped
-- ---------------------------------------------------------------------------

alter table public.provider_connections enable row level security;
alter table public.imports              enable row level security;
alter table public.import_items         enable row level security;

create policy "connections are private to their user"
  on public.provider_connections for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "imports are private to their user"
  on public.imports for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "import items are private to the import owner"
  on public.import_items for all
  to authenticated
  using (public.import_is_owned_by(import_id, (select auth.uid())))
  with check (public.import_is_owned_by(import_id, (select auth.uid())));
