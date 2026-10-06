import { NextResponse, type NextRequest } from 'next/server';
import { getOptionalUser } from '@/lib/auth/require-user';
import { buildGoogleDriveAuthorizeUrl, googleDriveConfig } from '@/lib/providers/google-drive';
import { attachGoogleDriveFlowCookie } from '@/lib/providers/google-drive-oauth-state';
import { createPkcePair, randomState } from '@/lib/providers/pkce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user } = await getOptionalUser();
  if (!user) return NextResponse.redirect(new URL('/sign-in?next=/settings', request.url));
  if (!googleDriveConfig())
    return NextResponse.redirect(new URL('/settings?error=google_drive_unconfigured', request.url));
  const state = randomState();
  const { verifier, challenge } = createPkcePair();
  const response = NextResponse.redirect(
    buildGoogleDriveAuthorizeUrl({ state, codeChallenge: challenge }),
  );
  attachGoogleDriveFlowCookie(response, { state, verifier, userId: user.id });
  return response;
}
