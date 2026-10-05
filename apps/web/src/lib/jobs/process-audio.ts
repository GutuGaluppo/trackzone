import 'server-only';

import { tasks } from '@trigger.dev/sdk/v3';
import type { processAudioFileTask } from '@trackzone/worker/trigger/process-audio-file';
import { isLocalUrl } from '@trackzone/worker/local-environment';
import { clientEnv } from '@/env';
import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * In local development the separate local worker claims pending database rows.
 * Hosted environments use Trigger.dev; dispatch errors become a visible failed
 * status instead of leaving an item queued forever.
 */
export async function enqueueAudioProcessing(audioFileId: string): Promise<void> {
  if (
    !process.env.TRIGGER_SECRET_KEY &&
    process.env.NODE_ENV !== 'production' &&
    isLocalUrl(clientEnv.NEXT_PUBLIC_SUPABASE_URL)
  ) {
    return;
  }
  try {
    if (!process.env.TRIGGER_SECRET_KEY)
      throw new Error('Audio processing service is not configured.');
    await tasks.trigger<typeof processAudioFileTask>('process-audio-file', { audioFileId });
  } catch (error) {
    console.error('[jobs] failed to enqueue audio processing', {
      audioFileId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    const { error: updateError } = await createAdminSupabase()
      .from('audio_files')
      .update({
        processing_status: 'failed',
        processing_error: 'Audio processing is temporarily unavailable. Please try again later.',
      })
      .eq('id', audioFileId);
    if (updateError) throw updateError;
  }
}
