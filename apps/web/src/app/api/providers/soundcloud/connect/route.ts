import { NextResponse, type NextRequest } from 'next/server';
import { getOptionalUser } from '@/lib/auth/require-user';
import { buildAuthorizeUrl, soundcloudConfig } from '@/lib/providers/soundcloud';
import { createPkcePair, randomState } from '@/lib/providers/pkce';
import { attachFlowCookie } from '@/lib/providers/oauth-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/providers/soundcloud/connect
 *
 * Starts the OAuth 2.1 + PKCE authorization-code flow: mint state + PKCE,
 * stash them in the encrypted `sc_oauth` cookie, and 302 to SoundCloud.
 */
export async function GET(request: NextRequest) {
  const { user } = await getOptionalUser();
  if (!user) {
    return NextResponse.redirect(new URL('/sign-in?next=/settings', request.url));
  }

  if (!soundcloudConfig()) {
    return NextResponse.redirect(new URL('/settings?error=soundcloud_unconfigured', request.url));
  }

  const state = randomState();
  const { verifier, challenge } = createPkcePair();

  const response = NextResponse.redirect(buildAuthorizeUrl({ state, codeChallenge: challenge }));
  attachFlowCookie(response, { state, verifier, userId: user.id });
  return response;
}
