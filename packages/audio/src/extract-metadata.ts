import { parseBuffer, parseWebStream, type IAudioMetadata } from 'music-metadata';

/**
 * Basic metadata pipeline (docs §9): duration, codec, sample rate, bit depth,
 * bitrate, channels. Deliberately pure JS (`music-metadata`) rather than a
 * system FFmpeg binary — no binary to bundle, works the same in any
 * serverless/worker runtime, and covers everything v0.1 needs. Swap the
 * implementation behind this function if a future milestone needs more
 * (waveform generation, format conversion) than header-level parsing gives.
 */
export interface ExtractedAudioMetadata {
  durationMs: number | null;
  codec: string | null;
  sampleRate: number | null;
  bitDepth: number | null;
  bitrate: number | null;
  channels: number | null;
  artistName: string | null;
  albumName: string | null;
}

export class UnsupportedAudioError extends Error {
  constructor(cause: unknown) {
    super('The file could not be read as audio.', { cause });
    this.name = 'UnsupportedAudioError';
  }
}

export async function extractAudioMetadata(
  bytes: Uint8Array,
  mimeType: string,
): Promise<ExtractedAudioMetadata> {
  try {
    return normalizeMetadata(
      await parseBuffer(bytes, mimeType, { duration: true, skipCovers: true }),
    );
  } catch (error) {
    if (error instanceof UnsupportedAudioError) throw error;
    throw new UnsupportedAudioError(error);
  }
}

/** Parse large originals without buffering the entire file in worker memory. */
export async function extractAudioMetadataFromStream(
  stream: ReadableStream<Uint8Array>,
  mimeType: string,
  fileSize?: number,
): Promise<ExtractedAudioMetadata> {
  try {
    return normalizeMetadata(
      await parseWebStream(
        stream,
        { mimeType, size: fileSize },
        { duration: true, skipCovers: true },
      ),
    );
  } catch (error) {
    if (error instanceof UnsupportedAudioError) throw error;
    throw new UnsupportedAudioError(error);
  }
}

function normalizeMetadata({ format, common }: IAudioMetadata): ExtractedAudioMetadata {
  if (!format.hasAudio) {
    throw new UnsupportedAudioError(new Error('No audio stream was found in the file.'));
  }

  return {
    durationMs: format.duration != null ? Math.round(format.duration * 1000) : null,
    codec: format.codec ?? format.container ?? null,
    sampleRate: format.sampleRate ?? null,
    bitDepth: format.bitsPerSample ?? null,
    bitrate: format.bitrate != null ? Math.round(format.bitrate) : null,
    channels: format.numberOfChannels ?? null,
    artistName: common.artist?.trim() || null,
    albumName: common.album?.trim() || null,
  };
}
