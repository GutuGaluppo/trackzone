import { updateTrackSchema, uuidSchema } from '@trackzone/validation';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';
import { authorizeTrack } from '@/lib/tracks/authorize';
import { storage } from '@/lib/storage';

export const runtime = 'nodejs';

interface Context {
  params: Promise<{ trackId: string }>;
}

/** PATCH /api/tracks/:id — owner-only metadata edits. */
export const PATCH = route(async (request: Request, { params }: Context) => {
  const { trackId } = await params;
  const id = uuidSchema.parse(trackId);

  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  await authorizeTrack(id, user, 'modify');
  const body = updateTrackSchema.parse(await request.json());

  const { data, error } = await supabase
    .from('tracks')
    .update({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.artistName !== undefined ? { artist_name: body.artistName } : {}),
      ...(body.albumName !== undefined ? { album_name: body.albumName } : {}),
      ...(body.favorite !== undefined ? { favorite: body.favorite } : {}),
    })
    .eq('id', id)
    .select('id, title, artist_name, album_name, favorite')
    .single();

  if (error) throw error;
  return ok(data);
});

/**
 * DELETE /api/tracks/:id
 *
 * Removes the record first (cascades to audio_files/sources/grants), then the
 * bytes. A storage failure must not leave a track pointing at nothing, so the
 * object delete is best-effort and logged.
 */
export const DELETE = route(async (_request: Request, { params }: Context) => {
  const { trackId } = await params;
  const id = uuidSchema.parse(trackId);

  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  const track = await authorizeTrack(id, user, 'modify');

  const { error } = await supabase.from('tracks').delete().eq('id', id);
  if (error) throw error;

  if (track.audioFile) {
    try {
      await storage().delete(track.audioFile.storageKey);
    } catch (storageError) {
      console.error('[storage] orphaned object after track delete', {
        trackId: id,
        error: storageError instanceof Error ? storageError.message : 'unknown',
      });
    }
  }

  return ok({ deleted: true });
});
