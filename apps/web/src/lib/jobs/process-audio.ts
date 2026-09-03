import 'server-only';

import { tasks } from '@trigger.dev/sdk/v3';
import type { processAudioFileTask } from '@trackzone/worker/trigger/process-audio-file';

/**
 * Enqueues background metadata extraction (docs §6.5, §9). Best-effort: an
 * upload has already succeeded and its records already exist by the time
 * this runs, so a queueing failure (e.g. Trigger.dev not configured yet in
 * this environment) must not fail the request — the track simply stays
 * `pending` until it is retried or processed manually.
 */
export async function enqueueAudioProcessing(audioFileId: string): Promise<void> {
  try {
    await tasks.trigger<typeof processAudioFileTask>('process-audio-file', { audioFileId });
  } catch (error) {
    console.error('[jobs] failed to enqueue audio processing', {
      audioFileId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}
