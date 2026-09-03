import { requireUser } from '@/lib/auth/require-user';
import { Sidebar } from '@/components/workspace/sidebar';
import { Topbar } from '@/components/workspace/topbar';
import { PlayerBar } from '@/components/player/player-bar';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await requireUser('/library');

  const [{ data: profile }, { data: collections }] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).single(),
    supabase.from('collections').select('id, name').order('created_at', { ascending: true }),
  ]);

  return (
    <div data-environment="workspace" className="bg-surface-0 text-fg flex h-dvh flex-col">
      <div className="flex min-h-0 flex-1">
        <Sidebar collections={collections ?? []} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar username={profile?.username ?? 'you'} />
          <main className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <PlayerBar />
    </div>
  );
}
