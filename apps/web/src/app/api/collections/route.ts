import { createCollectionSchema } from '@trackzone/validation';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';

export const runtime = 'nodejs';

/** GET /api/collections — the caller's collections with track counts. */
export const GET = route(async () => {
  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  const { data, error } = await supabase
    .from('collections')
    .select('id, name, description, visibility, created_at, collection_tracks(count)')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return ok({
    collections: data.map((collection) => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      visibility: collection.visibility,
      createdAt: collection.created_at,
      trackCount: collection.collection_tracks?.[0]?.count ?? 0,
    })),
  });
});

/** POST /api/collections */
export const POST = route(async (request: Request) => {
  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  const body = createCollectionSchema.parse(await request.json());

  const { data, error } = await supabase
    .from('collections')
    .insert({
      owner_id: user.id,
      name: body.name,
      description: body.description ?? null,
      visibility: body.visibility,
    })
    .select('id, name, description, visibility, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return fail(409, 'duplicate_name', 'You already have a collection with that name.');
    }
    throw error;
  }

  return ok({ ...data, trackCount: 0 }, { status: 201 });
});
