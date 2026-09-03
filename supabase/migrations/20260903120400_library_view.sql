-- TrackZone — 0005 — flattened read model for the Library table
--
-- security_invoker = on is essential: the view is evaluated with the calling
-- user's permissions, so every RLS policy from 0002/0003 still applies.

create view public.library_tracks
with (security_invoker = on) as
select
  t.id,
  t.owner_id,
  t.title,
  t.artist_name,
  t.album_name,
  t.artwork_url,
  t.duration_ms,
  t.visibility,
  t.allow_download,
  t.favorite,
  t.created_at,
  t.updated_at,
  t.search_vector,
  p.username        as owner_username,
  p.display_name    as owner_display_name,
  af.id             as audio_file_id,
  af.original_filename,
  af.mime_type,
  af.codec,
  af.file_size,
  af.sample_rate,
  af.bit_depth,
  af.bitrate,
  af.channels,
  af.processing_status,
  af.processing_error,
  coalesce(
    (
      select array_agg(distinct ts.provider order by ts.provider)
      from public.track_sources ts
      where ts.track_id = t.id and ts.status = 'available'
    ),
    array[]::public.provider[]
  ) as source_providers
from public.tracks t
join public.profiles p on p.id = t.owner_id
left join public.audio_files af on af.track_id = t.id and af.is_original;

comment on view public.library_tracks is
  'Read model for the Library list. Never exposes storage_key: bytes are only reachable through a signed URL issued by the API after an authorization check.';

grant select on public.library_tracks to authenticated;
