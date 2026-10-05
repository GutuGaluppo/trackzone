import { describe, expect, it } from 'vitest';
import { createR2Storage, StorageConfigurationError } from './r2.ts';

const config = {
  accountId: 'test-account',
  accessKeyId: 'test-access-key',
  secretAccessKey: 'test-secret-key',
  bucket: 'trackzone-audio',
};

describe('S3-compatible storage signing', () => {
  it('rejects example credentials before issuing an unusable upload URL', () => {
    expect(() => createR2Storage({ ...config, accessKeyId: 'your-access-key-id' })).toThrow(
      StorageConfigurationError,
    );
    expect(() => createR2Storage({ ...config, secretAccessKey: '' })).toThrow(
      StorageConfigurationError,
    );
  });

  it('signs local Supabase uploads with the local region and the requested content type', async () => {
    const storage = createR2Storage({
      ...config,
      endpoint: 'http://127.0.0.1:54321/storage/v1/s3',
      region: 'local',
    });
    const upload = await storage.createUploadUrl({
      key: 'originals/user/upload.wav',
      contentType: 'audio/wav',
    });
    const url = new URL(upload.url);
    expect(url.pathname).toBe('/storage/v1/s3/trackzone-audio/originals/user/upload.wav');
    expect(url.searchParams.get('X-Amz-Credential')).toContain('/local/s3/aws4_request');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');
    expect(upload.headers).toEqual({ 'content-type': 'audio/wav' });
    expect(upload.method).toBe('PUT');
  });

  it('keeps the default R2 endpoint, region and expiring playback links', async () => {
    const storage = createR2Storage(config);
    const url = new URL(
      await storage.createDownloadUrl({ key: 'originals/user/upload.wav', expiresInSeconds: 300 }),
    );
    expect(url.hostname).toBe('test-account.r2.cloudflarestorage.com');
    expect(url.searchParams.get('X-Amz-Credential')).toContain('/auto/s3/aws4_request');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
  });
});
