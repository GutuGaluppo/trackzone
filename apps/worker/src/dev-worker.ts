import { setTimeout as sleep } from 'node:timers/promises';
import { serviceClient } from './clients.ts';
import { processStoredAudioFile } from './process-stored-audio-file.ts';

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'The development worker is disabled in production. Deploy the Trigger.dev task instead.',
  );
}

let stopping = false;
process.on('SIGINT', () => {
  stopping = true;
});
process.on('SIGTERM', () => {
  stopping = true;
});

console.log('[worker] development audio processing started');
const db = serviceClient();
while (!stopping) {
  try {
    // Recover interrupted work through the same leases used by Trigger.dev.
    const now = new Date().toISOString();
    const retryBefore = new Date(Date.now() - 30_000).toISOString();
    const { data: candidates, error } = await db
      .from('audio_files')
      .select('id, processing_status, updated_at')
      .or(
        `processing_status.eq.pending,and(processing_status.eq.processing,processing_lease_expires_at.lt.${now}),and(processing_status.eq.processing,processing_lease_expires_at.is.null),and(processing_status.eq.failed,processing_retryable.eq.true,updated_at.lt.${retryBefore})`,
      )
      .lt('processing_attempts', 5)
      .order('created_at')
      .limit(10);
    if (error) throw error;
    for (const candidate of candidates) {
      if (stopping) break;
      // The shared adapter claims atomically in the DB, including with multiple workers.
      await processStoredAudioFile(candidate.id);
      const { data: result } = await db
        .from('audio_files')
        .select('processing_status')
        .eq('id', candidate.id)
        .maybeSingle();
      console.log('[worker] audio processing finished', {
        audioFileId: candidate.id,
        status: result?.processing_status,
      });
    }
  } catch (error) {
    console.error('[worker] development processing unavailable', {
      message: error instanceof Error ? error.message : 'Database request failed.',
    });
  }
  if (!stopping) await sleep(1500);
}
console.log('[worker] development audio processing stopped');
