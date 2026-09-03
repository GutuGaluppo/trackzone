import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getOptionalUser } from '@/lib/auth/require-user';
import { exchangeCode, fetchViewer, soundcloudConfig } from '@/lib/providers/soundcloud';
import { clearFlowCookie, readFlowCookie } from '@/lib/providers/oauth-state';
import { upsertSoundCloudConnection } from '@/lib/providers/connection-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
});

/**
 * GET /api/providers/soundcloud/callback
 *
 * SoundCloud redirects here with `?code&state` (or `?error`). Verify state
 * against the `sc_oauth` cookie, exchange the code for tokens, look up the
 * account, persist the connection, and bounce back to Settings. The cookie is
 * always cleared on the way out.
 */
export async function GET(request: NextRequest) {
  const { user } = await getOptionalUser();
  if (!user) {
    return NextResponse.redirect(new URL('/sign-in?next=/settings', request.url));
  }

  const flow = readFlowCookie(request);
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  const finish = (params: string) => {
    const response = NextResponse.redirect(new URL(`/settings?${params}`, request.url));
    clearFlowCookie(response);
    return response;
  };

  if (!parsed.success) return finish('error=soundcloud_failed');
  const { code, state, error } = parsed.data;

  if (error) return finish(`error=${encodeURIComponent(error)}`);
  if (!code || !state) return finish('error=soundcloud_failed');
  if (!flow || flow.state !== state || flow.userId !== user.id) {
    return finish('error=soundcloud_state');
  }
  if (!soundcloudConfig()) return finish('error=soundcloud_unconfigured');

  try {
    const tokens = await exchangeCode({ code, codeVerifier: flow.verifier });
    const viewer = await fetchViewer(tokens.accessToken);
    await upsertSoundCloudConnection({
      userId: user.id,
      viewerId: viewer.id,
      username: viewer.username,
      tokens,
    });
  } catch (err) {
    console.error('[providers] SoundCloud connect failed', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return finish('error=soundcloud_failed');
  }

  return finish('connected=soundcloud');
}
