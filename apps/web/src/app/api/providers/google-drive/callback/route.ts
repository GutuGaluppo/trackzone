import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getOptionalUser } from '@/lib/auth/require-user';
import {
  exchangeGoogleDriveCode,
  fetchGoogleDriveAccount,
  googleDriveConfig,
} from '@/lib/providers/google-drive';
import {
  clearGoogleDriveFlowCookie,
  readGoogleDriveFlowCookie,
} from '@/lib/providers/google-drive-oauth-state';
import { upsertGoogleDriveConnection } from '@/lib/providers/connection-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const querySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  const { user } = await getOptionalUser();
  if (!user) return NextResponse.redirect(new URL('/sign-in?next=/settings', request.url));
  const flow = readGoogleDriveFlowCookie(request);
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  const finish = (params: string) => {
    const response = NextResponse.redirect(new URL(`/settings?${params}`, request.url));
    clearGoogleDriveFlowCookie(response);
    return response;
  };
  if (!parsed.success) return finish('error=google_drive_failed');
  const { code, state, error } = parsed.data;
  if (error) return finish(`error=${encodeURIComponent(error)}`);
  if (!code || !state || !flow || flow.state !== state || flow.userId !== user.id)
    return finish('error=google_drive_state');
  if (!googleDriveConfig()) return finish('error=google_drive_unconfigured');
  try {
    const tokens = await exchangeGoogleDriveCode({ code, codeVerifier: flow.verifier });
    const account = await fetchGoogleDriveAccount(tokens.accessToken);
    await upsertGoogleDriveConnection({
      userId: user.id,
      accountId: account.id,
      email: account.email,
      tokens,
    });
  } catch (error) {
    console.error('[providers] Google Drive connect failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return finish('error=google_drive_failed');
  }
  return finish('connected=google_drive');
}
