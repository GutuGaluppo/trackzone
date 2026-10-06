import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';
import { decryptJson, encryptJson } from './crypto';

const COOKIE_NAME = 'gd_oauth';
const PATH = '/api/providers/google-drive';
const options = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: PATH,
  maxAge,
});

export interface GoogleDriveOAuthState {
  state: string;
  verifier: string;
  userId: string;
}

export function attachGoogleDriveFlowCookie(response: NextResponse, flow: GoogleDriveOAuthState) {
  response.cookies.set(COOKIE_NAME, encryptJson(flow), options(600));
}
export function readGoogleDriveFlowCookie(request: NextRequest): GoogleDriveOAuthState | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return decryptJson<GoogleDriveOAuthState>(raw);
  } catch {
    return null;
  }
}
export function clearGoogleDriveFlowCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', options(0));
}
