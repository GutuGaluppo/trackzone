import { extractAudioMetadata, toFailedPatch, toReadyPatch } from '@trackzone/audio';

/**
 * The processing pipeline (docs §9), with I/O injected so it's testable
 * without a live Supabase project, R2 bucket, or Trigger.dev run:
 *   UPLOAD_COMPLETED → extract metadata → update DB → READY (or FAILED)
 */

export interface AudioFileRecord {
  id: string;
  track_id: string;
  storage_key: string;
  mime_type: string | null;
}

export interface ProcessAudioFileDeps {
  loadAudioFile: (audioFileId: string) => Promise<AudioFileRecord | null>;
  markProcessing: (audioFileId: string) => Promise<void>;
  downloadBytes: (storageKey: string) => Promise<Uint8Array>;
  applyReadyPatch: (
    patch: ReturnType<typeof toReadyPatch>,
    audioFileId: string,
    trackId: string,
  ) => Promise<void>;
  applyFailedPatch: (patch: ReturnType<typeof toFailedPatch>, audioFileId: string) => Promise<void>;
}

export async function processAudioFile(
  audioFileId: string,
  deps: ProcessAudioFileDeps,
): Promise<void> {
  const record = await deps.loadAudioFile(audioFileId);

  // The track/file may have been deleted before the job ran — that is a
  // legitimate race, not a failure to report.
  if (!record) return;

  await deps.markProcessing(audioFileId);

  try {
    const bytes = await deps.downloadBytes(record.storage_key);
    const metadata = await extractAudioMetadata(
      bytes,
      record.mime_type ?? 'application/octet-stream',
    );
    await deps.applyReadyPatch(toReadyPatch(metadata), audioFileId, record.track_id);
  } catch (error) {
    await deps.applyFailedPatch(toFailedPatch(error), audioFileId);
  }
}
