import 'server-only';

import { clientEnv, serverEnv } from '@/env';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const CALLBACK_PATH = '/api/providers/google-drive/callback';
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

export interface GoogleDriveTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope?: string;
}

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class GoogleDriveAuthError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Google Drive auth request failed (${status})`);
    this.name = 'GoogleDriveAuthError';
  }
}

let warnedPartial = false;

export function googleDriveConfig(): GoogleDriveConfig | null {
  const {
    GOOGLE_DRIVE_CLIENT_ID: clientId,
    GOOGLE_DRIVE_CLIENT_SECRET: clientSecret,
    PROVIDER_CREDENTIALS_KEY: key,
  } = serverEnv();
  if (!clientId && !clientSecret) return null;
  if (!clientId || !clientSecret || !key) {
    if (!warnedPartial) {
      warnedPartial = true;
      console.warn(
        '[providers] Google Drive is partially configured — set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET and PROVIDER_CREDENTIALS_KEY together.',
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

function requireConfig(): GoogleDriveConfig {
  const config = googleDriveConfig();
  if (!config) throw new Error('Google Drive is not configured on this deployment.');
  return config;
}

export function buildGoogleDriveAuthorizeUrl({
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
  url.searchParams.set('scope', GOOGLE_DRIVE_SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  return url.toString();
}

async function requestToken(form: Record<string, string>): Promise<GoogleDriveTokens> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  });
  if (!response.ok)
    throw new GoogleDriveAuthError(response.status, await response.text().catch(() => ''));
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!json.access_token || !json.refresh_token)
    throw new GoogleDriveAuthError(
      response.status,
      'Token response was missing access/refresh token.',
    );
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
    scope: json.scope,
  };
}

export function exchangeGoogleDriveCode({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}) {
  const config = requireConfig();
  return requestToken({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
    code_verifier: codeVerifier,
  });
}

export function fetchGoogleDriveAccount(
  accessToken: string,
): Promise<{ id: string; email: string | null }> {
  return fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } }).then(
    async (response) => {
      if (!response.ok)
        throw new GoogleDriveAuthError(response.status, await response.text().catch(() => ''));
      const json = (await response.json()) as { sub?: string; email?: string };
      if (!json.sub)
        throw new GoogleDriveAuthError(response.status, 'Userinfo response was missing subject.');
      return { id: json.sub, email: json.email ?? null };
    },
  );
}
