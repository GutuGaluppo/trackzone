import { describe, expect, it } from 'vitest';
import {
  extractAudioMetadata,
  extractAudioMetadataFromStream,
  UnsupportedAudioError,
} from './extract-metadata.ts';
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

  it('extracts technical metadata from a streamed original without requiring a buffer', async () => {
    const wav = buildTestWav({ durationSeconds: 2 });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let offset = 0; offset < wav.length; offset += 4096)
          controller.enqueue(wav.subarray(offset, offset + 4096));
        controller.close();
      },
    });
    const metadata = await extractAudioMetadataFromStream(stream, 'audio/wav', wav.length);
    expect(metadata.durationMs).toBe(2000);
    expect(metadata.sampleRate).toBe(44100);
    expect(metadata.artistName).toBeNull();
    expect(metadata.albumName).toBeNull();
  });

  it('reads artist and album embedded in WAV INFO chunks', async () => {
    const wav = buildTestWav({});
    const encoder = new TextEncoder();
    const chunks = [
      ['IART', 'Test artist'],
      ['IPRD', 'Test album'],
    ].map(([tag, text]) => {
      const value = encoder.encode(text + '\0');
      const chunk = new Uint8Array(8 + value.length + (value.length % 2));
      chunk.set(encoder.encode(tag));
      new DataView(chunk.buffer).setUint32(4, value.length, true);
      chunk.set(value, 8);
      return chunk;
    });
    const infoSize = 4 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const tagged = new Uint8Array(wav.length + 8 + infoSize);
    tagged.set(wav);
    const view = new DataView(tagged.buffer);
    view.setUint32(4, tagged.length - 8, true);
    tagged.set(encoder.encode('LIST'), wav.length);
    view.setUint32(wav.length + 4, infoSize, true);
    tagged.set(encoder.encode('INFO'), wav.length + 8);
    let offset = wav.length + 12;
    for (const chunk of chunks) {
      tagged.set(chunk, offset);
      offset += chunk.length;
    }
    const metadata = await extractAudioMetadata(tagged, 'audio/wav');
    expect(metadata.artistName).toBe('Test artist');
    expect(metadata.albumName).toBe('Test album');
  });
});
