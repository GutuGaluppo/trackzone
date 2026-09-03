import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/admin';
import { encryptJson } from './crypto';
import type { SoundCloudTokens } from './soundcloud';

/**
 * Writes to `public.provider_connections` + `private.provider_credentials`.
 *
 * Both use the service-role client: the credentials table has RLS enabled with
 * **no policy**, so it is unreachable by the user's own client. Every caller
 * must already have authenticated the user — these functions do not.
 */

interface UpsertSoundCloudConnectionArgs {
  userId: string;
  viewerId: string;
  username: string | null;
  tokens: SoundCloudTokens;
}

export async function upsertSoundCloudConnection({
  userId,
  viewerId,
  username,
  tokens,
}: UpsertSoundCloudConnectionArgs): Promise<void> {
  const admin = createAdminSupabase();

  // One SoundCloud connection per user: drop any prior one (cascade removes its
  // credentials row) so re-connecting a different account can't leave two.
  const { error: clearError } = await admin
    .from('provider_connections')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'soundcloud');
  if (clearError) throw clearError;

  const { data: connection, error: connectionError } = await admin
    .from('provider_connections')
    .insert({
      user_id: userId,
      provider: 'soundcloud',
      provider_account_id: viewerId,
      display_name: username,
      status: 'active',
      last_synced_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (connectionError) throw connectionError;

  const { error: credentialsError } = await admin
    .schema('private')
    .from('provider_credentials')
    .insert({
      connection_id: connection.id,
      encrypted_credentials: encryptJson(tokens),
      expires_at: tokens.expiresAt,
    });
  if (credentialsError) {
    // Don't leave a connection row with no usable credentials behind.
    await admin.from('provider_connections').delete().eq('id', connection.id);
    throw credentialsError;
  }
}

export async function deleteConnection({
  userId,
  connectionId,
}: {
  userId: string;
  connectionId: string;
}): Promise<void> {
  const admin = createAdminSupabase();
  const { error } = await admin
    .from('provider_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', userId);
  if (error) throw error;
}
