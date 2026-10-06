import { extractAudioMetadataFromStream, UnsupportedAudioError } from '@trackzone/audio';
import type { Tables } from '@trackzone/types';
import { isMediaKeyForUser } from '@trackzone/storage';
import { serviceClient, storage } from './clients.ts';
import { processAudioFile } from './process-audio-file.ts';

/** R2 and Supabase are independent; the configured DB may be local or hosted. */
export async function processStoredAudioFile(audioFileId: string): Promise<void> {
  const db = serviceClient();
  const store = storage();
  let claimed: Tables<'audio_files'> | null = null;

  await processAudioFile(audioFileId, {
    loadAudioFile: async (id) => {
      const { data, error } = await db.rpc('claim_audio_processing', { p_audio_file_id: id });
      if (error) throw error;
      claimed = data?.[0] ?? null;
      return claimed;
    },
    // claim_audio_processing already changes status and acquires the exclusive lease.
    markProcessing: async () => {},
    loadMetadata: async (record) => {
      const { data: track, error } = await db
        .from('tracks')
        .select('owner_id')
        .eq('id', record.track_id)
        .maybeSingle();
      if (error) throw error;
      if (!track || !isMediaKeyForUser(record.storage_key, track.owner_id))
        throw new UnsupportedAudioError(new Error('Invalid storage ownership.'));
      const url = await store.createDownloadUrl({ key: record.storage_key, expiresInSeconds: 600 });
      const response = await fetch(url, { signal: AbortSignal.timeout(300_000) });
      if (response.status === 404)
        throw new UnsupportedAudioError(new Error('Original audio is missing.'));
      if (!response.ok || !response.body)
        throw new Error(`Audio storage could not be read (HTTP ${response.status}).`);
      return extractAudioMetadataFromStream(
        response.body,
        record.mime_type ?? 'application/octet-stream',
        record.file_size ?? undefined,
      );
    },
    applyReadyPatch: async (patch, id) => {
      const { error } = await db.rpc('finish_audio_processing', {
        p_audio_file_id: id,
        p_token: claimed!.processing_token!,
        p_metadata: { ...patch.audioFile, ...patch.track },
      });
      if (error) throw error;
    },
    applyFailedPatch: async (patch, id, retryable) => {
      const { error } = await db
        .from('audio_files')
        .update({
          ...patch.audioFile,
          processing_retryable: retryable,
          processing_token: null,
          processing_lease_expires_at: null,
        })
        .eq('id', id)
        .eq('processing_token', claimed!.processing_token!);
      if (error) throw error;
    },
  });
}
