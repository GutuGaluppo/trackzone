import { afterEach, describe, expect, it, vi } from 'vitest';
import { decryptJson, encryptJson } from './crypto';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('encryptJson / decryptJson', () => {
  it('round-trips an arbitrary JSON value', () => {
    const value = { accessToken: 'a.b.c', refreshToken: 'r-1', expiresAt: '2026-01-01T00:00:00Z' };
    const token = encryptJson(value);

    expect(token.startsWith('v1.')).toBe(true);
    expect(token.split('.')).toHaveLength(4);
    expect(decryptJson(token)).toEqual(value);
  });

  it('produces a different ciphertext each call (random IV)', () => {
    expect(encryptJson('same')).not.toBe(encryptJson('same'));
  });

  it('rejects a tampered ciphertext', () => {
    const token = encryptJson({ secret: 'x' });
    const parts = token.split('.');
    const flipped = Buffer.from(parts[3]!, 'base64url');
    flipped[0]! ^= 0x01;
    parts[3] = flipped.toString('base64url');

    expect(() => decryptJson(parts.join('.'))).toThrow();
  });

  it('rejects a malformed payload', () => {
    expect(() => decryptJson('not-a-token')).toThrow('Malformed');
    expect(() => decryptJson('v2.a.b.c')).toThrow('Malformed');
  });

  it('cannot be decrypted with a different key', async () => {
    const token = encryptJson({ secret: 'x' });

    vi.resetModules();
    vi.stubEnv('PROVIDER_CREDENTIALS_KEY', Buffer.alloc(32, 9).toString('base64'));
    const other = await import('./crypto');

    expect(() => other.decryptJson(token)).toThrow();
  });
});
