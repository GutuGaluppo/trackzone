import { task } from '@trigger.dev/sdk';
import { processStoredAudioFile } from '../process-stored-audio-file.ts';

export interface ProcessAudioFilePayload {
  audioFileId: string;
}

export const processAudioFileTask = task({
  id: 'process-audio-file',
  maxDuration: 300,
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 60000,
    factor: 2,
    randomize: true,
  },
  run: async ({ audioFileId }: ProcessAudioFilePayload) => processStoredAudioFile(audioFileId),
});
