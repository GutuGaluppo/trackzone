import type { TablesUpdate } from '@trackzone/types';
import type { ExtractedAudioMetadata } from './extract-metadata.ts';

/**
 * Maps a successful extraction to the two row patches the worker writes.
 * Pure and DB-client-free so the mapping is unit-testable on its own.
 */
export function toReadyPatch(metadata: ExtractedAudioMetadata): {
  audioFile: TablesUpdate<'audio_files'>;
  track: TablesUpdate<'tracks'>;
} {
  return {
    audioFile: {
      processing_status: 'ready',
      processing_error: null,
      duration_ms: metadata.durationMs,
      codec: metadata.codec,
      sample_rate: metadata.sampleRate,
      bit_depth: metadata.bitDepth,
      bitrate: metadata.bitrate,
      channels: metadata.channels,
    },
    track: {
      duration_ms: metadata.durationMs,
    },
  };
}

const MAX_ERROR_MESSAGE_LENGTH = 500;

export function toFailedPatch(error: unknown): { audioFile: TablesUpdate<'audio_files'> } {
  const message = error instanceof Error ? error.message : 'Processing failed.';

  return {
    audioFile: {
      processing_status: 'failed',
      processing_error: message.slice(0, MAX_ERROR_MESSAGE_LENGTH),
    },
  };
}
