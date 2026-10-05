import { extractAudioMetadataFromStream } from '@trackzone/audio';
import { serviceClient, storage } from './clients.ts';
import { processAudioFile, type AudioFileRecord } from './process-audio-file.ts';

/** The same processing adapter is used by Trigger.dev and the local worker. */
export async function processStoredAudioFile(audioFileId: string): Promise<void> {
  const db = serviceClient();
  const store = storage();

  await processAudioFile(audioFileId, {
    loadAudioFile: async (id): Promise<AudioFileRecord | null> => {
      const { data, error } = await db
        .from('audio_files')
        .select('id, track_id, storage_key, mime_type, file_size, processing_status')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data?.processing_status === 'ready' ? null : data;
    },
    markProcessing: async (id) => {
      const { error } = await db
        .from('audio_files')
        .update({ processing_status: 'processing', processing_error: null })
        .eq('id', id);
      if (error) throw error;
    },
    loadMetadata: async (record) => {
      const url = await store.createDownloadUrl({ key: record.storage_key, expiresInSeconds: 600 });
      const response = await fetch(url, { signal: AbortSignal.timeout(300_000) });
      if (response.status === 404)
        throw new Error('The original audio file is missing from storage. Import the file again.');
      if (!response.ok || !response.body)
        throw new Error(`Audio storage could not be read (HTTP ${response.status}).`);
      return extractAudioMetadataFromStream(
        response.body,
        record.mime_type ?? 'application/octet-stream',
        record.file_size ?? undefined,
      );
    },
    applyReadyPatch: async (patch, audioFileId, trackId) => {
      const { data: current, error: readError } = await db
        .from('tracks')
        .select('artist_name, album_name')
        .eq('id', trackId)
        .single();
      if (readError) throw readError;
      // Keep metadata the user already provided; enrich only empty fields.
      const { error: trackError } = await db
        .from('tracks')
        .update({
          ...patch.track,
          ...(current.artist_name ? { artist_name: current.artist_name } : {}),
          ...(current.album_name ? { album_name: current.album_name } : {}),
        })
        .eq('id', trackId);
      if (trackError) throw trackError;
      // Publish ready last so readers cannot see an incomplete track patch.
      const { error } = await db.from('audio_files').update(patch.audioFile).eq('id', audioFileId);
      if (error) throw error;
    },
    applyFailedPatch: async (patch, id) => {
      const { error } = await db.from('audio_files').update(patch.audioFile).eq('id', id);
      if (error) throw error;
    },
  });
}
