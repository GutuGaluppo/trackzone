import { afterEach, describe, expect, it, vi } from 'vitest';

/** Re-import the module with the SoundCloud vars stubbed in. */
async function loadConfigured() {
  vi.resetModules();
  vi.stubEnv('SOUNDCLOUD_CLIENT_ID', 'client-123');
  vi.stubEnv('SOUNDCLOUD_CLIENT_SECRET', 'secret-456');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://app.example');
  return import('./soundcloud');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('soundcloudConfig', () => {
  it('is null when the SoundCloud vars are unset', async () => {
    const { soundcloudConfig } = await import('./soundcloud');
    expect(soundcloudConfig()).toBeNull();
  });

  it('returns the config (with derived redirect URI) when fully set', async () => {
    const { soundcloudConfig } = await loadConfigured();
    expect(soundcloudConfig()).toEqual({
      clientId: 'client-123',
      clientSecret: 'secret-456',
      redirectUri: 'https://app.example/api/providers/soundcloud/callback',
    });
  });

  it('is null (partial) when the secret is missing', async () => {
    vi.resetModules();
    vi.stubEnv('SOUNDCLOUD_CLIENT_ID', 'client-123');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { soundcloudConfig } = await import('./soundcloud');

    expect(soundcloudConfig()).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('buildAuthorizeUrl', () => {
  it('targets secure.soundcloud.com with PKCE + state params', async () => {
    const { buildAuthorizeUrl } = await loadConfigured();
    const url = new URL(buildAuthorizeUrl({ state: 'st-1', codeChallenge: 'ch-1' }));

    expect(url.origin + url.pathname).toBe('https://secure.soundcloud.com/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'client-123',
      redirect_uri: 'https://app.example/api/providers/soundcloud/callback',
      response_type: 'code',
      code_challenge: 'ch-1',
      code_challenge_method: 'S256',
      state: 'st-1',
    });
  });
});

describe('exchangeCode', () => {
  it('POSTs the auth-code grant and maps the token response', async () => {
    const { exchangeCode } = await loadConfigured();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'at-1',
          refresh_token: 'rt-1',
          expires_in: 3600,
          scope: '*',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const tokens = await exchangeCode({ code: 'code-1', codeVerifier: 'ver-1' });

    expect(tokens.accessToken).toBe('at-1');
    expect(tokens.refreshToken).toBe('rt-1');
    expect(tokens.scope).toBe('*');
    expect(Date.parse(tokens.expiresAt)).toBeGreaterThan(Date.now());

    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://secure.soundcloud.com/oauth/token');
    const body = new URLSearchParams(init?.body as string);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('code-1');
    expect(body.get('code_verifier')).toBe('ver-1');
    expect(body.get('client_secret')).toBe('secret-456');
  });

  it('throws SoundCloudAuthError on a non-2xx response, without retrying', async () => {
    const { exchangeCode, SoundCloudAuthError } = await loadConfigured();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('bad_verifier', { status: 401 }));

    await expect(exchangeCode({ code: 'c', codeVerifier: 'v' })).rejects.toBeInstanceOf(
      SoundCloudAuthError,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe('refreshTokens', () => {
  it('POSTs the refresh grant', async () => {
    const { refreshTokens } = await loadConfigured();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'at-2', refresh_token: 'rt-2', expires_in: 3600 }),
        {
          status: 200,
        },
      ),
    );

    await refreshTokens({ refreshToken: 'rt-1' });

    const body = new URLSearchParams(fetchMock.mock.calls[0]![1]?.body as string);
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('rt-1');
  });
});

describe('fetchViewer', () => {
  it('calls /me with the OAuth scheme and normalizes the id to a string', async () => {
    const { fetchViewer } = await loadConfigured();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 98765, username: 'gutu' }), { status: 200 }),
      );

    const viewer = await fetchViewer('at-1');

    expect(viewer).toEqual({ id: '98765', username: 'gutu' });
    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://api.soundcloud.com/me');
    expect((init?.headers as Record<string, string>).Authorization).toBe('OAuth at-1');
  });
});
