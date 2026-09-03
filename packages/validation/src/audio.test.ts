import { describe, expect, it } from 'vitest';
import { mimeMatchesExtension, sanitizeFilename, titleFromFilename } from './audio.ts';
import { createUploadSchema } from './upload.ts';

describe('sanitizeFilename', () => {
  it('strips directory traversal attempts', () => {
    expect(sanitizeFilename('../../etc/passwd.wav')).toBe('passwd.wav');
    expect(sanitizeFilename('C:\\Users\\me\\track.wav')).toBe('track.wav');
  });

  it('removes control characters and leading dots', () => {
    expect(sanitizeFilename('..hidden.wav')).toBe('hidden.wav');
    expect(sanitizeFilename('night\u0000drive.wav')).toBe('nightdrive.wav');
  });

  it('never returns an empty name', () => {
    expect(sanitizeFilename('...')).toBe('audio');
  });
});

describe('titleFromFilename', () => {
  it('turns a filename into a readable title', () => {
    expect(titleFromFilename('night-drive_final.wav')).toBe('night drive final');
  });
});

describe('mimeMatchesExtension', () => {
  it('accepts matching pairs', () => {
    expect(mimeMatchesExtension('audio/wav', 'night-drive.wav')).toBe(true);
    expect(mimeMatchesExtension('audio/flac', 'MASTER.FLAC')).toBe(true);
  });

  it('rejects a spoofed extension', () => {
    expect(mimeMatchesExtension('audio/wav', 'payload.exe')).toBe(false);
  });

  it('rejects types outside the allow-list', () => {
    expect(mimeMatchesExtension('application/octet-stream', 'track.wav')).toBe(false);
  });
});

describe('createUploadSchema', () => {
  const valid = { filename: 'night-drive.wav', mimeType: 'audio/wav', fileSize: 1024 };

  it('accepts a well-formed request', () => {
    expect(createUploadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty file', () => {
    expect(createUploadSchema.safeParse({ ...valid, fileSize: 0 }).success).toBe(false);
  });

  it('rejects a file above the upload limit', () => {
    const tooBig = { ...valid, fileSize: 3 * 1024 * 1024 * 1024 };
    expect(createUploadSchema.safeParse(tooBig).success).toBe(false);
  });

  it('rejects a mismatch between MIME type and extension', () => {
    const spoofed = { ...valid, filename: 'night-drive.mp3' };
    expect(createUploadSchema.safeParse(spoofed).success).toBe(false);
  });
});
