import { updateProfileSchema } from '@trackzone/validation';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';

export const runtime = 'nodejs';

/** PATCH /api/profile — the caller's own profile, enforced by RLS. */
export const PATCH = route(async (request: Request) => {
  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to continue.');

  const body = updateProfileSchema.parse(await request.json());

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...(body.username !== undefined ? { username: body.username } : {}),
      ...(body.displayName !== undefined ? { display_name: body.displayName || null } : {}),
    })
    .eq('id', user.id)
    .select('username, display_name')
    .single();

  if (error) {
    if (error.code === '23505') {
      return fail(409, 'username_taken', 'That username is already taken.');
    }
    throw error;
  }

  return ok(data);
});
