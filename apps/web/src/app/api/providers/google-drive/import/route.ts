import { tasks } from '@trigger.dev/sdk';
import type { importGoogleDriveTask } from '@trackzone/worker/trigger/import-google-drive';
import { getOptionalUser } from '@/lib/auth/require-user';
import { fail, ok, route } from '@/lib/api/responses';

export const runtime = 'nodejs';

/** Starts an asynchronous, owner-scoped copy from Google Drive to private R2. */
export const POST = route(async () => {
  const { user, supabase } = await getOptionalUser();
  if (!user) return fail(401, 'not_authenticated', 'Sign in to import from Google Drive.');
  if (!process.env.TRIGGER_SECRET_KEY)
    return fail(
      503,
      'import_unavailable',
      'Google Drive imports are not configured on this deployment.',
    );
  const { data: connection, error: connectionError } = await supabase
    .from('provider_connections')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('provider', 'google_drive')
    .maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection || connection.status !== 'active')
    return fail(409, 'google_drive_not_connected', 'Connect Google Drive before importing audio.');
  const { data: job, error: jobError } = await supabase
    .from('imports')
    .insert({ user_id: user.id, provider: 'google_drive', connection_id: connection.id })
    .select('id')
    .single();
  if (jobError) throw jobError;
  try {
    await tasks.trigger<typeof importGoogleDriveTask>('import-google-drive', { importId: job.id });
  } catch (error) {
    await supabase
      .from('imports')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', job.id);
    throw error;
  }
  return ok({ importId: job.id, status: 'pending' }, { status: 202 });
});
