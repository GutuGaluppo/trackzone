import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';
import { deleteConnection } from '@/lib/providers/connection-store';

export const runtime = 'nodejs';
export const POST = route(async () => {
  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to manage connections.');
  const { data, error } = await supabase
    .from('provider_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google_drive')
    .maybeSingle();
  if (error) throw error;
  if (data) await deleteConnection({ userId: user.id, connectionId: data.id });
  return ok({ disconnected: true });
});
