-- Server-owned uploads and media. Existing metadata remains readable through RLS.
-- No original can be referenced outside the track owner's namespace.
revoke insert, update, delete on public.audio_files, public.track_sources from anon, authenticated;
drop policy "audio files writable by the track owner" on public.audio_files;
drop policy "audio files updatable by the track owner" on public.audio_files;
drop policy "audio files deletable by the track owner" on public.audio_files;
drop policy "sources writable by the track owner" on public.track_sources;
drop policy "sources updatable by the track owner" on public.track_sources;
drop policy "sources deletable by the track owner" on public.track_sources;

create function public.enforce_audio_storage_owner() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare owner uuid; pattern text;
begin
  if new.storage_provider = 'trackzone' then
    select owner_id into owner from public.tracks where id = new.track_id;
    pattern := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
    if owner is null or not (
      new.storage_key ~ ('^originals/' || owner::text || '/' || pattern || '\.[a-z0-9]{1,8}$')
      or new.storage_key ~ ('^derivatives/' || owner::text || '/' || pattern || '/(preview|waveform)\.[a-z0-9]{1,8}$')
    ) then raise exception 'Audio storage key does not match the track owner' using errcode = '23514'; end if;
    if tg_op = 'UPDATE' and (new.storage_key <> old.storage_key or new.track_id <> old.track_id or new.storage_provider <> old.storage_provider) then
      raise exception 'Audio storage identity is immutable' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger audio_storage_owner before insert or update on public.audio_files
for each row execute function public.enforce_audio_storage_owner();

-- Also prevent a track owner transfer from invalidating its storage identity.
create function public.enforce_track_owner_immutable() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'Track ownership is immutable' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger track_owner_immutable before update on public.tracks
for each row execute function public.enforce_track_owner_immutable();

create table public.upload_sessions (
  id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_key text not null unique,
  filename text not null,
  mime_type text not null,
  file_size bigint not null check (file_size between 1 and 2147483648),
  title text not null,
  status text not null default 'issued' check (status in ('issued', 'finalizing', 'completed', 'expired')),
  expires_at timestamptz not null default now() + interval '24 hours',
  claim_token uuid,
  claim_expires_at timestamptz,
  final_key text,
  candidate_keys text[] not null default '{}',
  track_id uuid references public.tracks(id) on delete set null,
  audio_file_id uuid references public.audio_files(id) on delete set null,
  cleaned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_key = 'uploads/' || owner_id::text || '/' || id::text || '.' || lower(split_part(filename, '.', array_length(string_to_array(filename, '.'), 1))))
);
alter table public.upload_sessions enable row level security;
revoke all on public.upload_sessions from anon, authenticated;
grant all on public.upload_sessions to service_role;
create index upload_sessions_cleanup_idx on public.upload_sessions(expires_at) where cleaned_at is null;
create trigger upload_sessions_updated before update on public.upload_sessions
for each row execute function public.set_updated_at();

-- Every claim has a fresh final key. An old copy cannot overwrite a newer claim's media.
create function public.claim_upload(p_upload_id uuid, p_owner_id uuid)
returns setof public.upload_sessions language plpgsql set search_path = public, pg_temp as $$
declare row public.upload_sessions; token uuid;
begin
  select * into row from public.upload_sessions where id = p_upload_id and owner_id = p_owner_id for update;
  if not found or row.status in ('completed', 'expired') or row.expires_at <= now()
    or (row.status = 'finalizing' and row.claim_expires_at > now()) then return; end if;
  token := gen_random_uuid();
  return query update public.upload_sessions set
    status = 'finalizing', claim_token = token,
    claim_expires_at = least(now() + interval '5 minutes', row.expires_at),
    final_key = 'originals/' || row.owner_id::text || '/' || token::text || '.' || split_part(row.storage_key, '.', 2),
    candidate_keys = array_append(candidate_keys, 'originals/' || row.owner_id::text || '/' || token::text || '.' || split_part(row.storage_key, '.', 2))
    where id = row.id returning *;
end $$;

-- One transaction publishes all domain records, or none of them.
create function public.complete_upload(p_upload_id uuid, p_owner_id uuid, p_claim_token uuid)
returns table(track_id uuid, audio_file_id uuid) language plpgsql set search_path = public, pg_temp as $$
declare row public.upload_sessions; new_track uuid; new_audio uuid;
begin
  select * into row from public.upload_sessions where id = p_upload_id and owner_id = p_owner_id for update;
  if not found then raise exception 'Upload not found'; end if;
  if row.status = 'completed' then return query select row.track_id, row.audio_file_id; return; end if;
  if row.status <> 'finalizing' or row.claim_token is distinct from p_claim_token or row.claim_expires_at <= now() then
    raise exception 'Upload claim expired';
  end if;
  insert into public.tracks(owner_id, title) values(row.owner_id, row.title) returning id into new_track;
  insert into public.audio_files(track_id, storage_key, original_filename, mime_type, file_size)
    values(new_track, row.final_key, row.filename, row.mime_type, row.file_size) returning id into new_audio;
  insert into public.track_sources(track_id, provider, audio_file_id, source_metadata) values
    (new_track, 'trackzone', new_audio, '{}'),
    (new_track, 'local', null, jsonb_build_object('original_filename', row.filename));
  update public.upload_sessions set status = 'completed', track_id = new_track, audio_file_id = new_audio,
    claim_token = null, claim_expires_at = null where id = row.id;
  return query select new_track, new_audio;
end $$;

revoke all on function public.claim_upload(uuid, uuid), public.complete_upload(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_upload(uuid, uuid), public.complete_upload(uuid, uuid, uuid) to service_role;
