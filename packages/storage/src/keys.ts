/**
 * Storage keys are opaque and server-generated.
 *
 * They never contain user-supplied text: a leaked or guessed key must not
 * reveal anything, and it must never be usable as a path fragment. The
 * human-readable filename lives in `audio_files.original_filename`, not here.
 */

const SAFE_EXTENSION = /^[a-z0-9]{1,8}$/;

export interface StorageKeyParts {
  userId: string;
  /** Random, unique per upload. */
  uploadId: string;
  extension: string;
}

export function buildOriginalKey({ userId, uploadId, extension }: StorageKeyParts): string {
  const ext = extension.toLowerCase();
  const suffix = SAFE_EXTENSION.test(ext) ? `.${ext}` : '';
  return `originals/${userId}/${uploadId}${suffix}`;
}

/** Derivatives (previews, waveform data) live beside the original, never over it. */
export function buildDerivativeKey(
  { userId, uploadId }: Omit<StorageKeyParts, 'extension'>,
  kind: 'preview' | 'waveform',
  extension: string,
): string {
  const ext = extension.toLowerCase();
  const suffix = SAFE_EXTENSION.test(ext) ? `.${ext}` : '';
  return `derivatives/${userId}/${uploadId}/${kind}${suffix}`;
}

/** Guards against a caller signing a key that does not belong to the user. */
export function keyBelongsToUser(key: string, userId: string): boolean {
  return key.startsWith(`originals/${userId}/`) || key.startsWith(`derivatives/${userId}/`);
}
