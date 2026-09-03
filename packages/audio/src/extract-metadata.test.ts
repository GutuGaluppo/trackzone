import { describe, expect, it } from 'vitest';
import { extractAudioMetadata, UnsupportedAudioError } from './extract-metadata.ts';
import { buildTestWav } from './test-fixtures.ts';

describe('extractAudioMetadata', () => {
  it('reads duration, sample rate, bit depth and channels from a WAV file', async () => {
    const wav = buildTestWav({ sampleRate: 48_000, bitDepth: 24, channels: 2, durationSeconds: 2 });

    const metadata = await extractAudioMetadata(wav, 'audio/wav');

    expect(metadata.durationMs).toBe(2000);
    expect(metadata.sampleRate).toBe(48_000);
    expect(metadata.bitDepth).toBe(24);
    expect(metadata.channels).toBe(2);
    expect(metadata.bitrate).toBeGreaterThan(0);
    expect(metadata.codec).toBeTruthy();
  });

  it('reads mono files correctly', async () => {
    const wav = buildTestWav({
      sampleRate: 44_100,
      bitDepth: 16,
      channels: 1,
      durationSeconds: 0.5,
    });
    const metadata = await extractAudioMetadata(wav, 'audio/wav');

    expect(metadata.channels).toBe(1);
    expect(metadata.durationMs).toBe(500);
  });

  it('rejects bytes that are not a recognizable audio file', async () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(extractAudioMetadata(garbage, 'audio/wav')).rejects.toThrow(UnsupportedAudioError);
  });
});
