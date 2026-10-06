import { uuidSchema } from '@trackzone/validation';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';
import { enqueueAudioProcessing } from '@/lib/jobs/process-audio';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { authorizeTrack } from '@/lib/tracks/authorize';

export const runtime = 'nodejs';

interface Context {
  params: Promise<{ trackId: string }>;
}

/**
 * POST /api/tracks/:id/reprocess
 *
 * A failed (or lease-expired) original can be retried without creating a new
 * track or trusting client-supplied file data. The database RPC performs the
 * conditional state change, so simultaneous requests result in one dispatch.
 */
export const POST = route(async (_request: Request, { params }: Context) => {
  const { trackId } = await params;
  const id = uuidSchema.parse(trackId);

  const { user } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  const track = await authorizeTrack(id, user, 'modify');
  if (!track.audioFile)
    return fail(409, 'no_audio_file', 'This track has no audio file to process.');

  const admin = createAdminSupabase();
  const { data, error } = await admin.rpc('retry_audio_processing', {
    p_audio_file_id: track.audioFile.id,
    p_owner_id: user.id,
  });
  if (error) throw error;

  const audioFile = data?.[0] ?? null;
  if (!audioFile) {
    return fail(
      409,
      'processing_not_retryable',
      'This file cannot be reprocessed. Upload it again if the problem persists.',
    );
  }

  await enqueueAudioProcessing(audioFile.id);
  return ok({ audioFileId: audioFile.id, processingStatus: 'pending' });
});
