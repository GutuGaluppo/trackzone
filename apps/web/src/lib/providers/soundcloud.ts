import 'server-only';

import { clientEnv, serverEnv } from '@/env';

/**
 * SoundCloud OAuth 2.1 client (PKCE). Pure HTTP + config — no database.
 *
 * Authoritative sources:
 *   - API Guide:  https://developers.soundcloud.com/docs/api/guide
 *   - Register:   https://developers.soundcloud.com/docs/api/register-app
 *
 * Rules baked in here: token host is `secure.soundcloud.com`, API host is
 * `api.soundcloud.com`, API calls authenticate with `Authorization: OAuth <token>`,
 * and refresh is a single attempt (refresh tokens are single-use — no retry loop).
 */

const AUTHORIZE_URL = 'https://secure.soundcloud.com/authorize';
const TOKEN_URL = 'https://secure.soundcloud.com/oauth/token';
const API_BASE = 'https://api.soundcloud.com';
const CALLBACK_PATH = '/api/providers/soundcloud/callback';
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

export interface SoundCloudConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface SoundCloudTokens {
  accessToken: string;
  refreshToken: string;
  /** ISO timestamp; derived from the response's `expires_in`. */
  expiresAt: string;
  scope?: string;
}

export class SoundCloudAuthError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`SoundCloud auth request failed (${status})`);
    this.name = 'SoundCloudAuthError';
  }
}

let warnedPartial = false;

/**
 * Returns the config only when the integration is fully set up. Absent SC vars
 * mean "not enabled" and return `null` quietly; a half-set configuration warns
 * once so a deployment mistake is visible.
 */
export function soundcloudConfig(): SoundCloudConfig | null {
  const {
    SOUNDCLOUD_CLIENT_ID: clientId,
    SOUNDCLOUD_CLIENT_SECRET: clientSecret,
    PROVIDER_CREDENTIALS_KEY: credentialsKey,
  } = serverEnv();

  if (!clientId && !clientSecret) return null;

  if (!clientId || !clientSecret || !credentialsKey) {
    if (!warnedPartial) {
      warnedPartial = true;
      console.warn(
        '[providers] SoundCloud is partially configured — set SOUNDCLOUD_CLIENT_ID, ' +
          'SOUNDCLOUD_CLIENT_SECRET and PROVIDER_CREDENTIALS_KEY together. Integration stays off.',
      );
    }
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${clientEnv.NEXT_PUBLIC_SITE_URL}${CALLBACK_PATH}`,
  };
}

function requireConfig(): SoundCloudConfig {
  const config = soundcloudConfig();
  if (!config) throw new Error('SoundCloud is not configured on this deployment.');
  return config;
}

export function buildAuthorizeUrl({
  state,
  codeChallenge,
}: {
  state: string;
  codeChallenge: string;
}): string {
  const config = requireConfig();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  return url.toString();
}

async function requestToken(form: Record<string, string>): Promise<SoundCloudTokens> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json; charset=utf-8',
    },
    body: new URLSearchParams(form).toString(),
  });

  if (!response.ok) {
    throw new SoundCloudAuthError(response.status, await response.text().catch(() => ''));
  }

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!json.access_token || !json.refresh_token) {
    throw new SoundCloudAuthError(response.status, 'Token response was missing access/refresh token.');
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(
      Date.now() + (json.expires_in ?? DEFAULT_EXPIRES_IN_SECONDS) * 1000,
    ).toISOString(),
    scope: json.scope,
  };
}

export function exchangeCode({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}): Promise<SoundCloudTokens> {
  const config = requireConfig();
  return requestToken({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
    code,
  });
}

/** Single attempt on purpose — SoundCloud refresh tokens are single-use. */
export function refreshTokens({ refreshToken }: { refreshToken: string }): Promise<SoundCloudTokens> {
  const config = requireConfig();
  return requestToken({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });
}

export async function fetchViewer(
  accessToken: string,
): Promise<{ id: string; username: string | null }> {
  const response = await fetch(`${API_BASE}/me`, {
    headers: {
      Authorization: `OAuth ${accessToken}`,
      Accept: 'application/json; charset=utf-8',
    },
  });

  if (!response.ok) {
    throw new SoundCloudAuthError(response.status, await response.text().catch(() => ''));
  }

  const json = (await response.json()) as { id?: number | string; username?: string };
  return {
    id: String(json.id ?? ''),
    username: json.username ?? null,
  };
}
