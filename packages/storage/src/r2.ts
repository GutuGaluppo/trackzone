import { AwsClient } from 'aws4fetch';
import {
  DEFAULT_PLAYBACK_URL_TTL_SECONDS,
  DEFAULT_UPLOAD_URL_TTL_SECONDS,
  type CreateDownloadUrlOptions,
  type CreateUploadUrlOptions,
  type ObjectStorage,
  type SignedUploadTarget,
  type StoredObject,
} from './object-storage.ts';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Overrides the derived endpoint; useful for local S3-compatible testing. */
  endpoint?: string;
  /** R2 uses auto; local Supabase S3 uses local. */
  region?: string;
}

export class StorageConfigurationError extends Error {
  constructor() {
    super('Object storage credentials are missing or still contain example values.');
    this.name = 'StorageConfigurationError';
  }
}

/**
 * Cloudflare R2 through its S3-compatible API.
 *
 * `aws4fetch` is used instead of the AWS SDK on purpose: SigV4 query signing is
 * all we need, and it keeps the serverless bundle small enough to stay in free
 * tiers. The bucket itself is private — no object here is ever world-readable.
 */
export function createR2Storage(config: R2Config): ObjectStorage {
  if (
    [config.accountId, config.accessKeyId, config.secretAccessKey, config.bucket].some(
      (value) => !value.trim() || /^(?:your-|placeholder|changeme)/i.test(value),
    )
  ) {
    throw new StorageConfigurationError();
  }
  const endpoint =
    config.endpoint?.replace(/\/+$/, '') ?? `https://${config.accountId}.r2.cloudflarestorage.com`;

  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: config.region ?? 'auto',
  });

  const objectUrl = (key: string) =>
    `${endpoint}/${config.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

  return {
    async createUploadUrl({
      key,
      contentType,
      expiresInSeconds = DEFAULT_UPLOAD_URL_TTL_SECONDS,
    }: CreateUploadUrlOptions): Promise<SignedUploadTarget> {
      const url = new URL(objectUrl(key));
      url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));

      // Content-Type is part of the signature, so the browser cannot upload a
      // different kind of object than the one the server authorized.
      const signed = await client.sign(
        new Request(url, { method: 'PUT', headers: { 'content-type': contentType } }),
        { aws: { signQuery: true, allHeaders: true } },
      );

      return {
        url: signed.url,
        method: 'PUT',
        headers: { 'content-type': contentType },
        expiresInSeconds,
      };
    },

    async createDownloadUrl({
      key,
      expiresInSeconds = DEFAULT_PLAYBACK_URL_TTL_SECONDS,
      downloadFilename,
    }: CreateDownloadUrlOptions): Promise<string> {
      const url = new URL(objectUrl(key));
      url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));

      if (downloadFilename) {
        url.searchParams.set(
          'response-content-disposition',
          `attachment; filename="${downloadFilename.replace(/"/g, '')}"`,
        );
      }

      const signed = await client.sign(new Request(url, { method: 'GET' }), {
        aws: { signQuery: true },
      });

      return signed.url;
    },

    async head(key: string): Promise<StoredObject | null> {
      const response = await client.fetch(objectUrl(key), { method: 'HEAD' });

      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`R2 HEAD failed for object (status ${response.status})`);
      }

      const size = Number(response.headers.get('content-length') ?? '0');

      return {
        size: Number.isFinite(size) ? size : 0,
        contentType: response.headers.get('content-type'),
        etag: response.headers.get('etag'),
      };
    },

    async delete(key: string): Promise<void> {
      const response = await client.fetch(objectUrl(key), { method: 'DELETE' });

      if (!response.ok && response.status !== 404) {
        throw new Error(`R2 DELETE failed for object (status ${response.status})`);
      }
    },
  };
}
