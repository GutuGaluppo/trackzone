import { schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';
import { importGoogleDriveAudio } from '../google-drive-import.ts';
import { processAudioFileTask } from './process-audio-file.ts';

export const importGoogleDriveTask = schemaTask({
  id: 'import-google-drive',
  schema: z.object({ importId: z.string().uuid() }),
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 60000,
    factor: 2,
    randomize: true,
  },
  queue: { concurrencyLimit: 2 },
  run: async ({ importId }) =>
    importGoogleDriveAudio(importId, async (audioFileId) => {
      await processAudioFileTask.trigger({ audioFileId });
    }),
});
