import { grantAccessSchema, uuidSchema } from '@trackzone/validation';
import { z } from 'zod';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';
import { authorizeTrack } from '@/lib/tracks/authorize';

export const runtime = 'nodejs';

interface Context {
  params: Promise<{ trackId: string }>;
}

/** GET /api/tracks/:id/access — who the owner has shared this track with. */
export const GET = route(async (_request: Request, { params }: Context) => {
  const { trackId } = await params;
  const id = uuidSchema.parse(trackId);

  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  await authorizeTrack(id, user, 'modify');

  const { data, error } = await supabase
    .from('track_access')
    .select('user_id, role, created_at, profiles:user_id(username, display_name)')
    .eq('track_id', id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ok({ grants: data });
});

/** POST /api/tracks/:id/access — grant viewer access by username. */
export const POST = route(async (request: Request, { params }: Context) => {
  const { trackId } = await params;
  const id = uuidSchema.parse(trackId);

  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  await authorizeTrack(id, user, 'modify');
  const body = grantAccessSchema.parse(await request.json());

  const { data: recipient, error: lookupError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', body.username)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!recipient) return fail(404, 'user_not_found', 'No TrackZone user with that username.');
  if (recipient.id === user.id) {
    return fail(400, 'cannot_share_with_self', 'You already own this track.');
  }

  const { error: grantError } = await supabase
    .from('track_access')
    .upsert({ track_id: id, user_id: recipient.id, role: 'viewer' });

  if (grantError) throw grantError;

  // Sharing with someone is meaningless while the track stays private.
  const { error: visibilityError } = await supabase
    .from('tracks')
    .update({ visibility: 'shared' })
    .eq('id', id)
    .eq('visibility', 'private');

  if (visibilityError) throw visibilityError;

  return ok({ granted: recipient.username }, { status: 201 });
});

/** DELETE /api/tracks/:id/access — revoke a grant. */
export const DELETE = route(async (request: Request, { params }: Context) => {
  const { trackId } = await params;
  const id = uuidSchema.parse(trackId);

  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  await authorizeTrack(id, user, 'modify');

  const { userId } = z.object({ userId: uuidSchema }).parse(await request.json());

  const { error } = await supabase
    .from('track_access')
    .delete()
    .eq('track_id', id)
    .eq('user_id', userId);

  if (error) throw error;
  return ok({ revoked: true });
});
