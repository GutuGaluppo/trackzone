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
 * GET /api/tracks/:id/download
 *
 * Separate from playback because download is a separate right: `public` does
 * not imply downloadable, and the `download` intent enforces that.
 */
export const GET = route(async (_request: Request, { params }: Context) => {
  const { trackId } = await params;
  const id = uuidSchema.parse(trackId);

  const { user } = await getOptionalUser();

  const limit = rateLimit(
    `download:${user?.id ?? 'anon'}`,
    LIMITS.download.limit,
    LIMITS.download.windowMs,
  );
  if (!limit.allowed) {
    return fail(429, 'rate_limited', 'Too many downloads. Try again shortly.');
  }

  const track = await authorizeTrack(id, user, 'download');

  if (!track.audioFile) {
    return fail(409, 'no_audio_file', 'This track has no file to download.');
  }

  const url = await storage().createDownloadUrl({
    key: track.audioFile.storageKey,
    expiresInSeconds: 60,
    downloadFilename: track.audioFile.originalFilename,
  });

  return ok({ url });
});
