import { describe, expect, it } from 'vitest';
import {
  buildOriginalKey,
  buildUploadKey,
  buildDerivativeKey,
  keyBelongsToUser,
  isMediaKeyForUser,
  InvalidStorageKeyError,
} from './keys.ts';
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const key = `originals/${owner}/${id}.wav`;

describe('storage namespaces', () => {
  it('builds distinct staging, original and derivative keys', () => {
    expect(buildOriginalKey({ userId: owner, uploadId: id, extension: 'WAV' })).toBe(key);
    expect(buildUploadKey({ userId: owner, uploadId: id, extension: 'wav' })).toBe(
      `uploads/${owner}/${id}.wav`,
    );
    expect(buildDerivativeKey({ userId: owner, uploadId: id }, 'preview', 'mp3')).toBe(
      `derivatives/${owner}/${id}/preview.mp3`,
    );
  });
  it('rejects invalid generator inputs instead of normalizing a dangerous path', () => {
    expect(() => buildOriginalKey({ userId: owner, uploadId: id, extension: '../wav' })).toThrow(
      InvalidStorageKeyError,
    );
    expect(() => buildOriginalKey({ userId: '../other', uploadId: id, extension: 'wav' })).toThrow(
      InvalidStorageKeyError,
    );
  });
  it('checks ownership and keeps staging out of playback', () => {
    expect(keyBelongsToUser(key, owner)).toBe(true);
    expect(keyBelongsToUser(key, other)).toBe(false);
    expect(isMediaKeyForUser(key, owner)).toBe(true);
    expect(isMediaKeyForUser(`uploads/${owner}/${id}.wav`, owner)).toBe(false);
  });
  it.each([
    `originals/${owner}/../${other}/${id}.wav`,
    `originals/${owner}/%2e%2e/${other}/${id}.wav`,
    `originals/${owner}/%252e%252e/${other}/${id}.wav`,
    `originals/${owner}//${id}.wav`,
    `originals/${owner}/./${id}.wav`,
    `originals/${owner}/${id}.wav/extra`,
    `originals/${owner}/${id}.wav?x=1`,
    `originals/${owner}/${id}.wav#fragment`,
    `originals/${owner}/${id}.wav\n`,
    `originals/${owner}extra/${id}.wav`,
    `originals/${owner}\\${id}.wav`,
    `originals/${owner}/%2F${id}.wav`,
    `originals/${owner}/${id}`,
    '',
  ])('rejects malformed key %s', (value) => {
    expect(keyBelongsToUser(value, owner)).toBe(false);
  });
});
