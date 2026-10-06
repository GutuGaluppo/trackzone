import {
  toFailedPatch,
  toReadyPatch,
  UnsupportedAudioError,
  type ExtractedAudioMetadata,
} from '@trackzone/audio';

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
  file_size: number | null;
}

export interface ProcessAudioFileDeps {
  loadAudioFile: (audioFileId: string) => Promise<AudioFileRecord | null>;
  markProcessing: (audioFileId: string) => Promise<void>;
  loadMetadata: (record: AudioFileRecord) => Promise<ExtractedAudioMetadata>;
  applyReadyPatch: (
    patch: ReturnType<typeof toReadyPatch>,
    audioFileId: string,
    trackId: string,
  ) => Promise<void>;
  applyFailedPatch: (
    patch: ReturnType<typeof toFailedPatch>,
    audioFileId: string,
    retryable: boolean,
  ) => Promise<void>;
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
    const metadata = await deps.loadMetadata(record);
    await deps.applyReadyPatch(toReadyPatch(metadata), audioFileId, record.track_id);
  } catch (error) {
    const retryable = !(error instanceof UnsupportedAudioError);
    await deps.applyFailedPatch(
      toFailedPatch(
        retryable ? new Error('Audio processing is temporarily unavailable. Try again.') : error,
      ),
      audioFileId,
      retryable,
    );
    if (retryable) throw error;
  }
}
