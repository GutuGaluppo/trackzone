import type { NextRequest } from 'next/server';
import { completeUploadSchema, titleFromFilename, sanitizeFilename } from '@trackzone/validation';
import { keyBelongsToUser } from '@trackzone/storage';
import { z } from 'zod';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';
import { storage } from '@/lib/storage';
import { enqueueAudioProcessing } from '@/lib/jobs/process-audio';

export const runtime = 'nodejs';

const bodySchema = completeUploadSchema.extend({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
});

/**
 * POST /api/uploads/complete
 *
 * Turns a finished R2 object into domain records:
 *   Track (logical) → AudioFile (physical) → TrackSource (where it lives)
 *
 * The object is verified against storage first. A client claiming an upload
 * finished is not evidence that it did, nor that it is the size it claimed.
 */
export const POST = route(async (request: NextRequest) => {
  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to upload audio.');

  const body = bodySchema.parse(await request.json());

  // A user may only ever finalize an object inside their own key prefix.
  if (!keyBelongsToUser(body.storageKey, user.id)) {
    return fail(403, 'forbidden_key', 'That storage location does not belong to you.');
  }

  const object = await storage().head(body.storageKey);
  if (!object) {
    return fail(409, 'upload_missing', 'The uploaded file could not be found in storage.');
  }
  if (object.size <= 0) {
    return fail(409, 'upload_empty', 'The uploaded file is empty.');
  }

  const filename = sanitizeFilename(body.filename);

  // Written through the user's own client, so RLS re-checks ownership.
  const { data: track, error: trackError } = await supabase
    .from('tracks')
    .insert({
      owner_id: user.id,
      title: titleFromFilename(filename),
      visibility: 'private',
      allow_download: false,
    })
    .select('id')
    .single();

  if (trackError) throw trackError;

  const { data: audioFile, error: audioError } = await supabase
    .from('audio_files')
    .insert({
      track_id: track.id,
      storage_provider: 'trackzone',
      storage_key: body.storageKey,
      original_filename: filename,
      mime_type: body.mimeType,
      file_size: object.size,
      checksum: body.checksum ?? null,
      is_original: true,
      processing_status: 'pending',
    })
    .select('id')
    .single();

  if (audioError) {
    // Leave no half-built track behind if the physical row cannot be written.
    await supabase.from('tracks').delete().eq('id', track.id);
    throw audioError;
  }

  const { error: sourceError } = await supabase.from('track_sources').insert([
    { track_id: track.id, provider: 'trackzone', audio_file_id: audioFile.id, status: 'available' },
    {
      track_id: track.id,
      provider: 'local',
      provider_file_id: null,
      status: 'available',
      source_metadata: { original_filename: filename },
    },
  ]);

  if (sourceError) throw sourceError;

  await enqueueAudioProcessing(audioFile.id);

  return ok({ trackId: track.id, audioFileId: audioFile.id }, { status: 201 });
});
