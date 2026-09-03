/**
 * The contract every object-storage backend must satisfy.
 *
 * R2 is the v0.1 implementation. Keeping the surface this small is what makes
 * the storage layer replaceable, and it is the only place in the codebase that
 * knows how to turn a storage key into something a browser can fetch.
 */

export interface SignedUploadTarget {
  url: string;
  method: 'PUT';
  /** Headers the browser MUST send verbatim, or the signature will not match. */
  headers: Record<string, string>;
  expiresInSeconds: number;
}

export interface StoredObject {
  size: number;
  contentType: string | null;
  etag: string | null;
}

export interface CreateUploadUrlOptions {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}

export interface CreateDownloadUrlOptions {
  key: string;
  expiresInSeconds?: number;
  /** When set, the response is delivered as an attachment with this filename. */
  downloadFilename?: string;
}

export interface ObjectStorage {
  createUploadUrl(options: CreateUploadUrlOptions): Promise<SignedUploadTarget>;
  createDownloadUrl(options: CreateDownloadUrlOptions): Promise<string>;
  head(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

/** Upload links are short-lived: long enough to start a large PUT, no longer. */
export const DEFAULT_UPLOAD_URL_TTL_SECONDS = 15 * 60;

/**
 * Playback links are very short-lived. A leaked URL should stop working before
 * it can be meaningfully shared; the player re-requests one as needed.
 */
export const DEFAULT_PLAYBACK_URL_TTL_SECONDS = 5 * 60;
