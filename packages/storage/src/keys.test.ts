import { describe, expect, it } from 'vitest';
import { buildOriginalKey, keyBelongsToUser } from './keys.ts';

describe('buildOriginalKey', () => {
  it('scopes objects under the owning user', () => {
    const key = buildOriginalKey({ userId: 'user-1', uploadId: 'abc', extension: 'wav' });
    expect(key).toBe('originals/user-1/abc.wav');
  });

  it('drops an extension that is not a plain short token', () => {
    const key = buildOriginalKey({
      userId: 'user-1',
      uploadId: 'abc',
      extension: '../../etc/passwd',
    });
    expect(key).toBe('originals/user-1/abc');
  });

  it('never embeds the original filename', () => {
    const key = buildOriginalKey({ userId: 'u', uploadId: 'id', extension: 'flac' });
    expect(key).toBe('originals/u/id.flac');
  });
});

describe('keyBelongsToUser', () => {
  it("rejects another user's key", () => {
    expect(keyBelongsToUser('originals/user-2/abc.wav', 'user-1')).toBe(false);
  });

  it('rejects a prefix-confusion attempt', () => {
    expect(keyBelongsToUser('originals/user-10/abc.wav', 'user-1')).toBe(false);
  });

  it('accepts the owner', () => {
    expect(keyBelongsToUser('originals/user-1/abc.wav', 'user-1')).toBe(true);
  });
});
