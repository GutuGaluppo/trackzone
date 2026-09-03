import type { Metadata } from 'next';
import { Users2 } from 'lucide-react';
import { requireUser } from '@/lib/auth/require-user';
import { querySharedWithMe } from '@/lib/tracks/library-query';
import { SharedTrackList } from '@/components/library/shared-track-list';

export const metadata: Metadata = { title: 'Shared with me' };

export default async function SharedPage() {
  const { user, supabase } = await requireUser('/shared');

  const [tracks, { data: collections, error: collectionsError }] = await Promise.all([
    querySharedWithMe(supabase, user.id),
    supabase.from('collections').select('id, name').eq('owner_id', user.id).order('name'),
  ]);

  if (collectionsError) throw collectionsError;

  return (
    <div className="flex h-full flex-col">
      <div className="border-line shrink-0 border-b px-5 py-4">
        <p className="label-plate">Library</p>
        <h1 className="text-fg mt-0.5 text-base font-medium">Shared with me</h1>
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {tracks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
            <Users2 className="text-fg-subtle h-8 w-8" aria-hidden />
            <div>
              <p className="text-fg text-sm">Nothing shared with you yet</p>
              <p className="text-fg-subtle mt-1 text-xs">
                When someone shares a track with your username, it shows up here.
              </p>
            </div>
          </div>
        ) : (
          <SharedTrackList tracks={tracks} collections={collections} />
        )}
      </div>
    </div>
  );
}
