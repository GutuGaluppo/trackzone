const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const ID = new RegExp(`^${UUID}$`);
const FILE = new RegExp(`^(uploads|originals)/(${UUID})/(${UUID})\\.([a-z0-9]{1,8})$`);
const DERIVATIVE = new RegExp(
  `^derivatives/(${UUID})/(${UUID})/(preview|waveform)\\.([a-z0-9]{1,8})$`,
);

export class InvalidStorageKeyError extends Error {
  constructor() {
    super('Invalid object storage key.');
    this.name = 'InvalidStorageKeyError';
  }
}

export interface StorageKeyParts {
  userId: string;
  uploadId: string;
  extension: string;
}

export function parseStorageKey(key: string): { ownerId: string; kind: string } | null {
  const file = FILE.exec(key);
  if (file?.[0] === key) return { ownerId: file[2]!, kind: file[1]! };
  const derivative = DERIVATIVE.exec(key);
  return derivative?.[0] === key ? { ownerId: derivative[1]!, kind: 'derivatives' } : null;
}

export function assertStorageKey(key: string): void {
  if (!parseStorageKey(key)) throw new InvalidStorageKeyError();
}

function buildFileKey(prefix: 'uploads' | 'originals', parts: StorageKeyParts): string {
  if (!ID.test(parts.userId) || !ID.test(parts.uploadId)) throw new InvalidStorageKeyError();
  const key = `${prefix}/${parts.userId}/${parts.uploadId}.${parts.extension.toLowerCase()}`;
  assertStorageKey(key);
  return key;
}

/** Only staging objects receive browser PUT URLs. */
export function buildUploadKey(parts: StorageKeyParts): string {
  return buildFileKey('uploads', parts);
}
export function buildOriginalKey(parts: StorageKeyParts): string {
  return buildFileKey('originals', parts);
}

export function buildDerivativeKey(
  { userId, uploadId }: Omit<StorageKeyParts, 'extension'>,
  kind: 'preview' | 'waveform',
  extension: string,
): string {
  const key = `derivatives/${userId}/${uploadId}/${kind}.${extension.toLowerCase()}`;
  assertStorageKey(key);
  return key;
}

export function keyBelongsToUser(key: string, userId: string): boolean {
  return parseStorageKey(key)?.ownerId === userId;
}

/** Staging files must never be served as validated media. */
export function isMediaKeyForUser(key: string, userId: string): boolean {
  const parsed = parseStorageKey(key);
  return parsed?.ownerId === userId && parsed.kind !== 'uploads';
}
