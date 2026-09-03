import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';
import { decryptJson, encryptJson } from './crypto';

/**
 * The in-flight OAuth authorization request, parked in a short-lived encrypted
 * cookie between `/connect` and `/callback`. It carries the PKCE `verifier`
 * (never sent to the browser in the clear) and the `state` + `userId` the
 * callback checks to reject CSRF / cross-user replays.
 */

const COOKIE_NAME = 'sc_oauth';
const COOKIE_PATH = '/api/providers/soundcloud';
const MAX_AGE_SECONDS = 600;

export interface OAuthFlowState {
  state: string;
  verifier: string;
  userId: string;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: COOKIE_PATH,
    maxAge,
  };
}

export function attachFlowCookie(response: NextResponse, flow: OAuthFlowState): void {
  response.cookies.set(COOKIE_NAME, encryptJson(flow), cookieOptions(MAX_AGE_SECONDS));
}

export function readFlowCookie(request: NextRequest): OAuthFlowState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return decryptJson<OAuthFlowState>(raw);
  } catch {
    return null;
  }
}

export function clearFlowCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', cookieOptions(0));
}
