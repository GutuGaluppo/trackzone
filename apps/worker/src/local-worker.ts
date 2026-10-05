import { setTimeout as sleep } from 'node:timers/promises';
import { serviceClient } from './clients.ts';
import { workerEnv } from './env.ts';
import { isLocalUrl } from './local-environment.ts';
import { processStoredAudioFile } from './process-stored-audio-file.ts';

const env = workerEnv();
if (
  !isLocalUrl(env.NEXT_PUBLIC_SUPABASE_URL) ||
  !isLocalUrl(env.R2_ENDPOINT) ||
  process.env.NODE_ENV === 'production'
) {
  throw new Error(
    'The local audio worker requires local Supabase and storage. Use Trigger.dev in production.',
  );
}

let stopping = false;
process.on('SIGINT', () => {
  stopping = true;
});
process.on('SIGTERM', () => {
  stopping = true;
});

console.log('[worker] local audio processing started');
const db = serviceClient();
while (!stopping) {
  try {
    // Recover work left processing by an interrupted local worker after its lease expires.
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: candidates, error } = await db
      .from('audio_files')
      .select('id, processing_status, updated_at')
      .or(
        `processing_status.eq.pending,and(processing_status.eq.processing,updated_at.lt.${staleBefore})`,
      )
      .order('created_at')
      .limit(10);
    if (error) throw error;
    for (const candidate of candidates) {
      if (stopping) break;
      // Conditional update prevents two local workers from claiming the same file.
      const { data: claimed, error: claimError } = await db
        .from('audio_files')
        .update({ processing_status: 'processing', processing_error: null })
        .eq('id', candidate.id)
        .eq('processing_status', candidate.processing_status)
        .eq('updated_at', candidate.updated_at)
        .select('id')
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) continue;
      await processStoredAudioFile(claimed.id);
      const { data: result } = await db
        .from('audio_files')
        .select('processing_status')
        .eq('id', claimed.id)
        .maybeSingle();
      console.log('[worker] audio processing finished', {
        audioFileId: claimed.id,
        status: result?.processing_status,
      });
    }
  } catch (error) {
    console.error('[worker] local processing unavailable', {
      message: error instanceof Error ? error.message : 'Database request failed.',
    });
  }
  if (!stopping) await sleep(1500);
}
console.log('[worker] local audio processing stopped');
