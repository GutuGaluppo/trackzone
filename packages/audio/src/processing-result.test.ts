import { describe, expect, it } from 'vitest';
import { toFailedPatch, toReadyPatch } from './processing-result.ts';
import type { ExtractedAudioMetadata } from './extract-metadata.ts';
import { UnsupportedAudioError } from './extract-metadata.ts';

const METADATA: ExtractedAudioMetadata = {
  durationMs: 271_000,
  codec: 'PCM',
  sampleRate: 48_000,
  bitDepth: 24,
  bitrate: 2_304_000,
  channels: 2,
  artistName: null,
  albumName: null,
};

describe('toReadyPatch', () => {
  it('marks the audio file ready and clears any prior error', () => {
    const { audioFile } = toReadyPatch(METADATA);
    expect(audioFile.processing_status).toBe('ready');
    expect(audioFile.processing_error).toBeNull();
    expect(audioFile.duration_ms).toBe(271_000);
    expect(audioFile.sample_rate).toBe(48_000);
  });

  it('mirrors duration onto the track so the Library can sort/display it', () => {
    const { track } = toReadyPatch(METADATA);
    expect(track.duration_ms).toBe(271_000);
  });

  it('copies available artist and album tags without inventing missing tags', () => {
    const { track } = toReadyPatch({
      ...METADATA,
      artistName: 'Tagged artist',
      albumName: 'Tagged album',
    });
    expect(track.artist_name).toBe('Tagged artist');
    expect(track.album_name).toBe('Tagged album');
    expect(toReadyPatch(METADATA).track).not.toHaveProperty('artist_name');
  });
});

describe('toFailedPatch', () => {
  it('marks the audio file failed with the error message', () => {
    const { audioFile } = toFailedPatch(new UnsupportedAudioError(new Error('bad header')));
    expect(audioFile.processing_status).toBe('failed');
    expect(audioFile.processing_error).toContain('could not be read as audio');
  });

  it('falls back to a generic message for a non-Error throw', () => {
    const { audioFile } = toFailedPatch('a string was thrown');
    expect(audioFile.processing_status).toBe('failed');
    expect(audioFile.processing_error).toBe('Processing failed.');
  });

  it('truncates an excessively long error message', () => {
    const { audioFile } = toFailedPatch(new Error('x'.repeat(1000)));
    expect(audioFile.processing_error).toHaveLength(500);
  });
});
