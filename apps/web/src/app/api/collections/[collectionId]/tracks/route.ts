import { collectionTrackSchema, uuidSchema } from '@trackzone/validation';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';

export const runtime = 'nodejs';

interface Context {
  params: Promise<{ collectionId: string }>;
}

/**
 * POST /api/collections/:id/tracks
 *
 * Membership cannot widen access: the RLS policy requires the caller to own
 * the collection AND to be allowed to read the track, so a collection can
 * never be used to launder someone else's private audio.
 */
export const POST = route(async (request: Request, { params }: Context) => {
  const { collectionId } = await params;
  const id = uuidSchema.parse(collectionId);

  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  const { trackId } = collectionTrackSchema.parse(await request.json());

  const { data: last } = await supabase
    .from('collection_tracks')
    .select('position')
    .eq('collection_id', id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('collection_tracks').upsert({
    collection_id: id,
    track_id: trackId,
    position: (last?.position ?? -1) + 1,
  });

  if (error) {
    // RLS refused: either the collection is not theirs or the track is not readable.
    if (error.code === '42501') {
      return fail(404, 'not_found', 'Collection or track not found.');
    }
    throw error;
  }

  return ok({ added: true }, { status: 201 });
});

/** DELETE /api/collections/:id/tracks — remove a track from the collection. */
export const DELETE = route(async (request: Request, { params }: Context) => {
  const { collectionId } = await params;
  const id = uuidSchema.parse(collectionId);

  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  const { trackId } = collectionTrackSchema.parse(await request.json());

  const { error } = await supabase
    .from('collection_tracks')
    .delete()
    .eq('collection_id', id)
    .eq('track_id', trackId);

  if (error) throw error;
  return ok({ removed: true });
});
