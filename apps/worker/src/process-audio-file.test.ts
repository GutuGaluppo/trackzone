import { describe, expect, it, vi } from 'vitest';
import { extractAudioMetadata } from '@trackzone/audio';
import { processAudioFile, type AudioFileRecord } from './process-audio-file.ts';

function buildTestWav(): Uint8Array {
  const sampleRate = 44_100;
  const bitDepth = 16;
  const channels = 2;
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = sampleRate * blockAlign; // 1 second

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i);
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  return bytes;
}

const RECORD: AudioFileRecord = {
  id: 'audio-1',
  track_id: 'track-1',
  storage_key: 'originals/user-1/audio-1.wav',
  mime_type: 'audio/wav',
  file_size: 176444,
};

describe('processAudioFile', () => {
  it('does nothing if the audio file record is gone', async () => {
    const deps = {
      loadAudioFile: vi.fn().mockResolvedValue(null),
      markProcessing: vi.fn(),
      loadMetadata: vi.fn(),
      applyReadyPatch: vi.fn(),
      applyFailedPatch: vi.fn(),
    };

    await processAudioFile('missing', deps);

    expect(deps.markProcessing).not.toHaveBeenCalled();
    expect(deps.loadMetadata).not.toHaveBeenCalled();
  });

  it('marks the file processing, extracts metadata, and applies the ready patch', async () => {
    const deps = {
      loadAudioFile: vi.fn().mockResolvedValue(RECORD),
      markProcessing: vi.fn().mockResolvedValue(undefined),
      loadMetadata: vi
        .fn()
        .mockImplementation(() => extractAudioMetadata(buildTestWav(), 'audio/wav')),
      applyReadyPatch: vi.fn().mockResolvedValue(undefined),
      applyFailedPatch: vi.fn(),
    };

    await processAudioFile('audio-1', deps);

    expect(deps.markProcessing).toHaveBeenCalledWith('audio-1');
    expect(deps.loadMetadata).toHaveBeenCalledWith(RECORD);
    expect(deps.applyFailedPatch).not.toHaveBeenCalled();

    expect(deps.applyReadyPatch).toHaveBeenCalledTimes(1);
    const [patch, audioFileId, trackId] = deps.applyReadyPatch.mock.calls[0]!;
    expect(audioFileId).toBe('audio-1');
    expect(trackId).toBe('track-1');
    expect(patch.audioFile.processing_status).toBe('ready');
    expect(patch.audioFile.duration_ms).toBe(1000);
    expect(patch.audioFile.sample_rate).toBe(44_100);
    expect(patch.track.duration_ms).toBe(1000);
  });

  it('marks transient failures and throws so Trigger.dev can retry', async () => {
    const deps = {
      loadAudioFile: vi.fn().mockResolvedValue(RECORD),
      markProcessing: vi.fn().mockResolvedValue(undefined),
      loadMetadata: vi.fn().mockRejectedValue(new Error('object not found')),
      applyReadyPatch: vi.fn(),
      applyFailedPatch: vi.fn().mockResolvedValue(undefined),
    };

    await expect(processAudioFile('audio-1', deps)).rejects.toThrow('object not found');

    expect(deps.applyReadyPatch).not.toHaveBeenCalled();
    expect(deps.applyFailedPatch).toHaveBeenCalledTimes(1);
    const [patch, audioFileId] = deps.applyFailedPatch.mock.calls[0]!;
    expect(audioFileId).toBe('audio-1');
    expect(patch.audioFile.processing_status).toBe('failed');
    expect(patch.audioFile.processing_error).toContain('temporarily unavailable');
    expect(deps.applyFailedPatch.mock.calls[0]![2]).toBe(true);
  });

  it('applies the failed patch when the bytes are not valid audio', async () => {
    const deps = {
      loadAudioFile: vi.fn().mockResolvedValue(RECORD),
      markProcessing: vi.fn().mockResolvedValue(undefined),
      loadMetadata: vi
        .fn()
        .mockImplementation(() => extractAudioMetadata(new Uint8Array([1, 2, 3]), 'audio/wav')),
      applyReadyPatch: vi.fn(),
      applyFailedPatch: vi.fn().mockResolvedValue(undefined),
    };

    await processAudioFile('audio-1', deps);

    expect(deps.applyFailedPatch).toHaveBeenCalledTimes(1);
    const [patch] = deps.applyFailedPatch.mock.calls[0]!;
    expect(patch.audioFile.processing_status).toBe('failed');
    expect(deps.applyFailedPatch.mock.calls[0]![2]).toBe(false);
  });
});
