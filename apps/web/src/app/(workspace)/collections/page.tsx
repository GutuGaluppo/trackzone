import Link from 'next/link';
import type { Metadata } from 'next';
import { Folder } from 'lucide-react';
import { requireUser } from '@/lib/auth/require-user';
import { formatRelativeDate } from '@/lib/format';
import { CreateCollectionDialog } from '@/components/collections/create-collection-dialog';

export const metadata: Metadata = { title: 'Collections' };

export default async function CollectionsPage() {
  const { user, supabase } = await requireUser('/collections');

  const { data: collections, error } = await supabase
    .from('collections')
    .select('id, name, description, created_at, collection_tracks(count)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (
    <div className="flex h-full flex-col">
      <div className="border-line flex shrink-0 items-center justify-between border-b px-5 py-4">
        <div>
          <p className="label-plate">Library</p>
          <h1 className="text-fg mt-0.5 text-base font-medium">Collections</h1>
        </div>
        <CreateCollectionDialog />
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-5">
        {collections.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
            <Folder className="text-fg-subtle h-8 w-8" aria-hidden />
            <div>
              <p className="text-fg text-sm">No collections yet</p>
              <p className="text-fg-subtle mt-1 text-xs">
                Group tracks into DJ sets, samples, or works in progress.
              </p>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {collections.map((collection) => (
              <li key={collection.id}>
                <Link
                  href={`/collections/${collection.id}`}
                  className="border-line bg-surface-1 hover:border-line-strong hover:bg-surface-2 flex flex-col gap-2 rounded-md border p-4 transition-colors"
                >
                  <Folder className="text-fg-subtle h-4 w-4" aria-hidden />
                  <span className="text-fg truncate text-sm font-medium">{collection.name}</span>
                  <span className="text-2xs text-fg-subtle tabular">
                    {collection.collection_tracks?.[0]?.count ?? 0} tracks ·{' '}
                    {formatRelativeDate(collection.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
