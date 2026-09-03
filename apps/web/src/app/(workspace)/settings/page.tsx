import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { ProfileForm } from '@/components/settings/profile-form';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const { user, supabase } = await requireUser('/settings');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  return (
    <div className="flex h-full flex-col">
      <div className="border-line shrink-0 border-b px-5 py-4">
        <p className="label-plate">Account</p>
        <h1 className="text-fg mt-0.5 text-base font-medium">Settings</h1>
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-5">
        <ProfileForm username={profile.username} displayName={profile.display_name} />
      </div>
    </div>
  );
}
