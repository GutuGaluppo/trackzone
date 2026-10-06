import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { soundcloudConfig } from '@/lib/providers/soundcloud';
import { googleDriveConfig } from '@/lib/providers/google-drive';
import { ProfileForm } from '@/components/settings/profile-form';
import { ConnectionsPanel, type ConnectionNotice } from '@/components/settings/connections-panel';

export const metadata: Metadata = { title: 'Settings' };

interface SettingsPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { connected, error } = await searchParams;
  const { user, supabase } = await requireUser('/settings');

  const [{ data: profile, error: profileError }, { data: connections, error: connectionError }] =
    await Promise.all([
      supabase.from('profiles').select('username, display_name').eq('id', user.id).single(),
      supabase
        .from('provider_connections')
        .select(
          'id, provider, provider_account_id, display_name, status, created_at, last_synced_at',
        )
        .eq('user_id', user.id)
        .in('provider', ['soundcloud', 'google_drive']),
    ]);

  if (profileError) throw profileError;
  if (connectionError) throw connectionError;

  const notice: ConnectionNotice = connected
    ? { kind: 'success', provider: connected }
    : error
      ? { kind: 'error', code: error }
      : null;

  return (
    <div className="flex h-full flex-col">
      <div className="border-line shrink-0 border-b px-5 py-4">
        <p className="label-plate">Account</p>
        <h1 className="text-fg mt-0.5 text-base font-medium">Settings</h1>
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-5">
        <ProfileForm username={profile.username} displayName={profile.display_name} />

        <ConnectionsPanel
          soundcloudConfigured={soundcloudConfig() !== null}
          soundcloudConnection={
            connections?.find((connection) => connection.provider === 'soundcloud') ?? null
          }
          googleDriveConfigured={googleDriveConfig() !== null}
          googleDriveConnection={
            connections?.find((connection) => connection.provider === 'google_drive') ?? null
          }
          notice={notice}
        />
      </div>
    </div>
  );
}
