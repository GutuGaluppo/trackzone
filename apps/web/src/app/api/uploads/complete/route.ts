import type { NextRequest } from 'next/server';
import { completeUploadSchema } from '@trackzone/validation';
import { getOptionalUser } from '@/lib/auth/require-user';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { fail, ok, route } from '@/lib/api/responses';
import { storage } from '@/lib/storage';
import { enqueueAudioProcessing } from '@/lib/jobs/process-audio';
import { finalizeUpload, UploadError } from '@/lib/uploads/finalize';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = route(async (request: NextRequest) => {
  const { user } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to upload audio.');
  const { uploadId } = completeUploadSchema.parse(await request.json());
  const db = createAdminSupabase();
  const load = async () => {
    const { data, error } = await db
      .from('upload_sessions')
      .select('*')
      .eq('id', uploadId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  };
  try {
    const result = await finalizeUpload(user.id, {
      load,
      storage: storage(),
      claim: async () => {
        const { data, error } = await db.rpc('claim_upload', {
          p_upload_id: uploadId,
          p_owner_id: user.id,
        });
        if (error) throw error;
        return data?.[0] ?? null;
      },
      publish: async (claim) => {
        const { data, error } = await db.rpc('complete_upload', {
          p_upload_id: uploadId,
          p_owner_id: user.id,
          p_claim_token: claim.claim_token!,
        });
        if (error) throw error;
        const result = data?.[0];
        if (!result) throw new Error('Upload transaction did not return records.');
        return { trackId: result.track_id, audioFileId: result.audio_file_id };
      },
      release: async (claim) => {
        const { error } = await db
          .from('upload_sessions')
          .update({ status: 'issued', claim_token: null, claim_expires_at: null })
          .eq('id', uploadId)
          .eq('claim_token', claim.claim_token!)
          .eq('status', 'finalizing');
        if (error) throw error;
      },
    });
    // Idempotent dispatch also recovers a web request interrupted after the DB commit.
    await enqueueAudioProcessing(result.audioFileId);
    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof UploadError) return fail(error.status, error.code, error.message);
    throw error;
  }
});
