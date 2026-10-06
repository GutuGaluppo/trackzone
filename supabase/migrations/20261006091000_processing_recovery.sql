alter table public.audio_files
  add column processing_attempts integer not null default 0 check (processing_attempts between 0 and 5),
  add column processing_token uuid,
  add column processing_lease_expires_at timestamptz,
  add column processing_retryable boolean not null default true;

create function public.claim_audio_processing(p_audio_file_id uuid)
returns setof public.audio_files language plpgsql set search_path = public, pg_temp as $$
begin
  return query update public.audio_files set
    processing_status = 'processing', processing_error = null,
    processing_attempts = processing_attempts + 1, processing_token = gen_random_uuid(),
    processing_lease_expires_at = now() + interval '10 minutes'
  where id = p_audio_file_id and processing_attempts < 5 and (
    processing_status = 'pending'
    or (processing_status = 'failed' and processing_retryable)
    or (processing_status = 'processing' and (processing_lease_expires_at is null or processing_lease_expires_at < now()))
  ) returning *;
end $$;

create function public.retry_audio_processing(p_audio_file_id uuid, p_owner_id uuid)
returns setof public.audio_files language plpgsql set search_path = public, pg_temp as $$
begin
  return query update public.audio_files set processing_status = 'pending', processing_error = null,
    processing_token = null, processing_lease_expires_at = null
  where id = p_audio_file_id and public.track_is_owned_by(track_id, p_owner_id)
    and processing_attempts < 5 and processing_retryable
    and (processing_status = 'failed' or
      (processing_status = 'processing' and (processing_lease_expires_at is null or processing_lease_expires_at < now())))
  returning *;
end $$;

create function public.finish_audio_processing(p_audio_file_id uuid, p_token uuid, p_metadata jsonb)
returns boolean language plpgsql set search_path = public, pg_temp as $$
declare file public.audio_files;
begin
  select * into file from public.audio_files where id = p_audio_file_id and processing_token = p_token
    and processing_status = 'processing' and processing_lease_expires_at > now() for update;
  if not found then return false; end if;
  update public.tracks set duration_ms = (p_metadata->>'duration_ms')::integer,
    artist_name = coalesce(nullif(artist_name, ''), nullif(p_metadata->>'artist_name', '')),
    album_name = coalesce(nullif(album_name, ''), nullif(p_metadata->>'album_name', ''))
    where id = file.track_id;
  update public.audio_files set
    duration_ms = (p_metadata->>'duration_ms')::integer,
    codec = p_metadata->>'codec', sample_rate = (p_metadata->>'sample_rate')::integer,
    bit_depth = (p_metadata->>'bit_depth')::integer, bitrate = (p_metadata->>'bitrate')::integer,
    channels = (p_metadata->>'channels')::smallint,
    processing_status = 'ready', processing_error = null, processing_retryable = false,
    processing_token = null, processing_lease_expires_at = null where id = file.id;
  return true;
end $$;
revoke all on function public.claim_audio_processing(uuid), public.retry_audio_processing(uuid, uuid), public.finish_audio_processing(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.claim_audio_processing(uuid), public.retry_audio_processing(uuid, uuid), public.finish_audio_processing(uuid, uuid, jsonb) to service_role;
