import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require-user';
import { queryLibrary, type LibraryScope } from '@/lib/tracks/library-query';
import { LibraryTable } from '@/components/library/library-table';
import { LibrarySearch } from '@/components/library/search-box';
import { UploadButton } from '@/components/library/upload-button';
import { EmptyState } from '@/components/library/empty-state';
import { GoogleDriveImportButton } from '@/components/library/google-drive-import-button';

export const metadata: Metadata = { title: 'Library' };

const SCOPE_TITLES: Record<LibraryScope, string> = {
  all: 'All Tracks',
  recent: 'Recently Added',
  favorites: 'Favorites',
  unsorted: 'Unsorted',
};

function parseScope(value: string | undefined): LibraryScope {
  return value === 'recent' || value === 'favorites' || value === 'unsorted' ? value : 'all';
}

interface LibraryPageProps {
  searchParams: Promise<{ scope?: string; q?: string }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { scope: rawScope, q } = await searchParams;
  const scope = parseScope(rawScope);
  const search = q?.trim() || undefined;

  const { user, supabase } = await requireUser('/library');
  const [
    tracks,
    { data: collections, error: collectionsError },
    { data: googleDriveConnection, error: connectionError },
  ] = await Promise.all([
    queryLibrary(supabase, { ownerId: user.id, scope, search }),
    supabase.from('collections').select('id, name').eq('owner_id', user.id).order('name'),
    supabase
      .from('provider_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google_drive')
      .eq('status', 'active')
      .maybeSingle(),
  ]);

  if (collectionsError) throw collectionsError;
  if (connectionError) throw connectionError;

  return (
    <div className="flex h-full flex-col">
      <div className="border-line flex shrink-0 items-center justify-between border-b px-5 py-4">
        <div>
          <p className="label-plate">Library</p>
          <h1 className="text-fg mt-0.5 text-base font-medium">{SCOPE_TITLES[scope]}</h1>
        </div>
        <div className="flex items-center gap-3">
          <LibrarySearch initialValue={search ?? ''} />
          <GoogleDriveImportButton connected={googleDriveConnection !== null} />
          <UploadButton />
        </div>
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {tracks.length === 0 ? (
          <EmptyState scope={scope} search={search} />
        ) : (
          <LibraryTable tracks={tracks} collections={collections} />
        )}
      </div>
    </div>
  );
}
