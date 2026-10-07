import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('googleDriveConfig', () => {
  it('is disabled when the credentials key cannot encrypt OAuth state', async () => {
    vi.stubEnv('GOOGLE_DRIVE_CLIENT_ID', 'client-123');
    vi.stubEnv('GOOGLE_DRIVE_CLIENT_SECRET', 'secret-456');
    vi.stubEnv('PROVIDER_CREDENTIALS_KEY', 'too-short');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { googleDriveConfig } = await import('./google-drive');

    expect(googleDriveConfig()).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('builds its callback URL when credentials are complete', async () => {
    vi.stubEnv('GOOGLE_DRIVE_CLIENT_ID', 'client-123');
    vi.stubEnv('GOOGLE_DRIVE_CLIENT_SECRET', 'secret-456');
    vi.stubEnv('PROVIDER_CREDENTIALS_KEY', Buffer.alloc(32, 2).toString('base64'));
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://app.example');
    const { googleDriveConfig } = await import('./google-drive');

    expect(googleDriveConfig()).toEqual({
      clientId: 'client-123',
      clientSecret: 'secret-456',
      redirectUri: 'https://app.example/api/providers/google-drive/callback',
    });
  });
});
