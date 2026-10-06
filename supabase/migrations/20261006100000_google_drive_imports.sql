-- Google Drive imports are created and completed only by trusted server code.
-- A unique provider file per import makes task retries idempotent.
create unique index import_items_provider_file_unique
  on public.import_items(import_id, provider_file_id);

create function public.complete_google_drive_import_item(
  p_import_item_id uuid,
  p_storage_key text,
  p_filename text,
  p_mime_type text,
  p_file_size bigint,
  p_source_metadata jsonb
)
returns table(track_id uuid, audio_file_id uuid)
language plpgsql set search_path = public, pg_temp as $$
declare item public.import_items; job public.imports; new_track uuid; new_audio uuid;
begin
  select * into item from public.import_items where id = p_import_item_id for update;
  if not found then raise exception 'Import item not found'; end if;
  select * into job from public.imports where id = item.import_id for update;
  if not found or job.provider <> 'google_drive' then raise exception 'Invalid Google Drive import'; end if;

  if item.status = 'completed' then
    return query select item.track_id, af.id from public.audio_files af where af.track_id = item.track_id and af.is_original;
    return;
  end if;
  if p_storage_key !~ ('^originals/' || job.user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$') then
    raise exception 'Storage key does not match import owner' using errcode = '23514';
  end if;

  insert into public.tracks(owner_id, title)
    values(job.user_id, regexp_replace(p_filename, '\.[^.]+$', '')) returning id into new_track;
  insert into public.audio_files(track_id, storage_key, original_filename, mime_type, file_size)
    values(new_track, p_storage_key, p_filename, p_mime_type, p_file_size) returning id into new_audio;
  insert into public.track_sources(track_id, provider, audio_file_id, source_metadata) values
    (new_track, 'trackzone', new_audio, '{}'),
    (new_track, 'google_drive', null, p_source_metadata);
  update public.import_items set track_id = new_track, status = 'completed', error_code = null, error_message = null
    where id = item.id;
  update public.imports set processed_items = processed_items + 1 where id = job.id;
  return query select new_track, new_audio;
end $$;

revoke all on function public.complete_google_drive_import_item(uuid, text, text, text, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_google_drive_import_item(uuid, text, text, text, bigint, jsonb)
  to service_role;
