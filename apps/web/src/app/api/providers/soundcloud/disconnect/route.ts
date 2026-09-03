import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';
import { deleteConnection } from '@/lib/providers/connection-store';

export const runtime = 'nodejs';

/**
 * POST /api/providers/soundcloud/disconnect
 *
 * Removes the user's SoundCloud connection. Deleting the `provider_connections`
 * row cascades to `private.provider_credentials`, so the stored tokens go with it.
 */
export const POST = route(async () => {
  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to manage connections.');

  const { data: connection, error } = await supabase
    .from('provider_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'soundcloud')
    .maybeSingle();
  if (error) throw error;

  if (connection) {
    await deleteConnection({ userId: user.id, connectionId: connection.id });
  }

  return ok({ disconnected: true });
});
