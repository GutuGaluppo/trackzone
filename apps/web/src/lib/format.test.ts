import { describe, expect, it } from 'vitest';
import {
  formatBitDepth,
  formatContainer,
  formatDuration,
  formatFileSize,
  formatSampleRate,
} from './format';

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(271_000)).toBe('4:31');
  });

  it('adds an hours segment when needed', () => {
    expect(formatDuration(3_871_000)).toBe('1:04:31');
  });

  it('degrades to a placeholder instead of NaN', () => {
    expect(formatDuration(null)).toBe('--:--');
    expect(formatDuration(Number.NaN)).toBe('--:--');
    expect(formatDuration(-5)).toBe('--:--');
  });
});

describe('formatFileSize', () => {
  it('scales to a readable unit', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024 * 1024 * 44)).toBe('44 MB');
    expect(formatFileSize(1024 * 1024 * 1024 * 1.5)).toBe('1.5 GB');
  });
});

describe('audio readouts', () => {
  it('formats sample rate and bit depth', () => {
    expect(formatSampleRate(48_000)).toBe('48 kHz');
    expect(formatSampleRate(44_100)).toBe('44.1 kHz');
    expect(formatBitDepth(24)).toBe('24-bit');
  });

  it('derives the container from the filename', () => {
    expect(formatContainer('night-drive.wav', null)).toBe('WAV');
    expect(formatContainer(null, 'flac')).toBe('FLAC');
    expect(formatContainer(null, null)).toBe('—');
  });
});
