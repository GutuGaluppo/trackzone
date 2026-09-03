import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { LibraryTrack } from '@trackzone/types';
import { requireUser } from '@/lib/auth/require-user';
import { formatRelativeDate } from '@/lib/format';
import { CollectionTrackList } from '@/components/collections/collection-track-list';

interface CollectionPageProps {
  params: Promise<{ collectionId: string }>;
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { collectionId } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from('collections')
    .select('name')
    .eq('id', collectionId)
    .maybeSingle();
  return { title: data?.name ?? 'Collection' };
}

const LIBRARY_COLUMNS =
  'id, owner_id, title, artist_name, album_name, artwork_url, duration_ms, visibility, allow_download, favorite, created_at, updated_at, owner_username, owner_display_name, audio_file_id, original_filename, mime_type, codec, file_size, sample_rate, bit_depth, bitrate, channels, processing_status, processing_error, source_providers';

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { collectionId } = await params;
  const { supabase } = await requireUser(`/collections/${collectionId}`);

  // RLS scopes this to the owner or a public collection: no row means "not
  // found", not "forbidden" — the two answer identically on purpose.
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id, name, description, created_at')
    .eq('id', collectionId)
    .maybeSingle();

  if (collectionError) throw collectionError;
  if (!collection) notFound();

  const { data: memberships, error: membershipError } = await supabase
    .from('collection_tracks')
    .select('track_id, position')
    .eq('collection_id', collectionId)
    .order('position', { ascending: true });

  if (membershipError) throw membershipError;

  let tracks: LibraryTrack[] = [];

  if (memberships.length > 0) {
    const trackIds = memberships.map((m) => m.track_id);
    const { data, error } = await supabase
      .from('library_tracks')
      .select(LIBRARY_COLUMNS)
      .in('id', trackIds);
    if (error) throw error;

    const byId = new Map(data.map((track) => [track.id, track]));
    tracks = memberships
      .map((m) => byId.get(m.track_id))
      .filter((t): t is LibraryTrack => t != null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-line shrink-0 border-b px-5 py-4">
        <p className="label-plate">Collection</p>
        <h1 className="text-fg mt-0.5 text-base font-medium">{collection.name}</h1>
        <p className="text-fg-subtle mt-1 text-xs">
          {collection.description ? `${collection.description} · ` : ''}
          {tracks.length} tracks · Created {formatRelativeDate(collection.created_at)}
        </p>
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        {tracks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-fg text-sm">This collection is empty</p>
            <p className="text-fg-subtle text-xs">
              Add tracks from your Library using the track menu.
            </p>
          </div>
        ) : (
          <CollectionTrackList collectionId={collection.id} tracks={tracks} />
        )}
      </div>
    </div>
  );
}
