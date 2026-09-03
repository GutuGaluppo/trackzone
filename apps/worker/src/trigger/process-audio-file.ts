import { task } from '@trigger.dev/sdk/v3';
import { serviceClient, storage } from '../clients.ts';
import { processAudioFile, type AudioFileRecord } from '../process-audio-file.ts';

export interface ProcessAudioFilePayload {
  audioFileId: string;
}

export const processAudioFileTask = task({
  id: 'process-audio-file',
  maxDuration: 300,
  run: async ({ audioFileId }: ProcessAudioFilePayload) => {
    const db = serviceClient();
    const store = storage();

    await processAudioFile(audioFileId, {
      loadAudioFile: async (id): Promise<AudioFileRecord | null> => {
        const { data, error } = await db
          .from('audio_files')
          .select('id, track_id, storage_key, mime_type')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        return data;
      },

      markProcessing: async (id) => {
        const { error } = await db
          .from('audio_files')
          .update({ processing_status: 'processing' })
          .eq('id', id);
        if (error) throw error;
      },

      // Buffered rather than streamed: simpler, and fine at v0.1 upload sizes.
      // Revisit with parseStream() if lossless masters make this a bottleneck.
      downloadBytes: async (storageKey) => {
        const url = await store.createDownloadUrl({ key: storageKey, expiresInSeconds: 300 });
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Could not download the object from storage (status ${response.status}).`,
          );
        }
        return new Uint8Array(await response.arrayBuffer());
      },

      applyReadyPatch: async (patch, audioFileId, trackId) => {
        const { error: audioError } = await db
          .from('audio_files')
          .update(patch.audioFile)
          .eq('id', audioFileId);
        if (audioError) throw audioError;

        const { error: trackError } = await db.from('tracks').update(patch.track).eq('id', trackId);
        if (trackError) throw trackError;
      },

      applyFailedPatch: async (patch, audioFileId) => {
        const { error } = await db
          .from('audio_files')
          .update(patch.audioFile)
          .eq('id', audioFileId);
        if (error) throw error;
      },
    });
  },
});
