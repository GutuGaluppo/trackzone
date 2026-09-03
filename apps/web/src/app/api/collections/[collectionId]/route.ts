import { updateCollectionSchema } from '@trackzone/validation';
import { uuidSchema } from '@trackzone/validation';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';

export const runtime = 'nodejs';

interface Context {
  params: Promise<{ collectionId: string }>;
}

/**
 * PATCH /api/collections/:id
 *
 * Ownership is enforced by RLS: the update simply matches no row for anyone
 * else, which surfaces as 404.
 */
export const PATCH = route(async (request: Request, { params }: Context) => {
  const { collectionId } = await params;
  const id = uuidSchema.parse(collectionId);

  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  const body = updateCollectionSchema.parse(await request.json());

  const { data, error } = await supabase
    .from('collections')
    .update({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description ?? null } : {}),
      ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
    })
    .eq('id', id)
    .select('id, name, description, visibility')
    .maybeSingle();

  if (error) throw error;
  if (!data) return fail(404, 'not_found', 'Collection not found.');

  return ok(data);
});

/** DELETE /api/collections/:id — removes the collection, never its tracks. */
export const DELETE = route(async (_request: Request, { params }: Context) => {
  const { collectionId } = await params;
  const id = uuidSchema.parse(collectionId);

  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  const { error, count } = await supabase
    .from('collections')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) throw error;
  if (!count) return fail(404, 'not_found', 'Collection not found.');

  return ok({ deleted: true });
});
