import { DEFAULT_PLAYBACK_URL_TTL_SECONDS } from '@trackzone/storage';
import { uuidSchema } from '@trackzone/validation';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';
import { LIMITS, rateLimit } from '@/lib/api/rate-limit';
import { authorizeTrack } from '@/lib/tracks/authorize';
import { storage } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ trackId: string }>;
}

/**
 * GET /api/tracks/:id/playback
 *
 * The only door to private audio:
 *   authenticate → authorize → sign → short-lived R2 URL
 *
 * The returned URL expires in minutes, so it cannot become a durable public
 * link to private audio (docs §6.2).
 */
export const GET = route(async (_request: Request, { params }: Context) => {
  const { trackId } = await params;
  const id = uuidSchema.parse(trackId);

  const { user } = await getOptionalUser();

  const limit = rateLimit(
    `playback:${user?.id ?? 'anon'}`,
    LIMITS.playback.limit,
    LIMITS.playback.windowMs,
  );
  if (!limit.allowed) {
    return fail(429, 'rate_limited', 'Too many playback requests. Try again shortly.');
  }

  const track = await authorizeTrack(id, user, 'read');

  if (!track.audioFile) {
    return fail(409, 'no_audio_file', 'This track has no playable file yet.');
  }
  if (track.audioFile.processingStatus === 'failed') {
    return fail(409, 'processing_failed', 'This track could not be processed.');
  }

  const url = await storage().createDownloadUrl({
    key: track.audioFile.storageKey,
    expiresInSeconds: DEFAULT_PLAYBACK_URL_TTL_SECONDS,
  });

  return ok({
    url,
    expiresAt: new Date(Date.now() + DEFAULT_PLAYBACK_URL_TTL_SECONDS * 1000).toISOString(),
    allowDownload: track.allowDownload || track.decision.as === 'owner',
  });
});
