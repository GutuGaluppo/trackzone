import { task } from '@trigger.dev/sdk/v3';
import { processStoredAudioFile } from '../process-stored-audio-file.ts';

export interface ProcessAudioFilePayload {
  audioFileId: string;
}

export const processAudioFileTask = task({
  id: 'process-audio-file',
  maxDuration: 300,
  run: async ({ audioFileId }: ProcessAudioFilePayload) => processStoredAudioFile(audioFileId),
});
