import 'server-only';

import type { LibraryTrack } from '@trackzone/types';
import type { createServerSupabase } from '@/lib/supabase/server';

export type LibraryScope = 'all' | 'recent' | 'favorites' | 'unsorted';

export interface LibraryQueryOptions {
  ownerId: string;
  scope: LibraryScope;
  search?: string;
}

const LIBRARY_COLUMNS =
  'id, owner_id, title, artist_name, album_name, artwork_url, duration_ms, visibility, allow_download, favorite, created_at, updated_at, owner_username, owner_display_name, audio_file_id, original_filename, mime_type, codec, file_size, sample_rate, bit_depth, bitrate, channels, processing_status, processing_error, source_providers';

/**
 * Reads the owner's own library through `library_tracks` (docs §12).
 *
 * This intentionally queries `owner_id = ownerId` rather than relying on RLS
 * alone to decide *which* tracks come back: RLS is the backstop that makes a
 * mistake here safe, not the mechanism selecting "my library".
 */
export async function queryLibrary(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  { ownerId, scope, search }: LibraryQueryOptions,
): Promise<LibraryTrack[]> {
  if (scope === 'unsorted') {
    return queryUnsorted(supabase, ownerId, search);
  }

  let query = supabase
    .from('library_tracks')
    .select(LIBRARY_COLUMNS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (scope === 'favorites') {
    query = query.eq('favorite', true);
  }
  if (scope === 'recent') {
    query = query.limit(25);
  }
  if (search) {
    query = query.textSearch('search_vector', search, {
      type: 'websearch',
      config: 'simple',
    });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Tracks that belong to no collection yet — computed in two steps, MVP scale. */
async function queryUnsorted(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  ownerId: string,
  search?: string,
): Promise<LibraryTrack[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from('collection_tracks')
    .select('track_id, collections!inner(owner_id)')
    .eq('collections.owner_id', ownerId);

  if (membershipError) throw membershipError;

  const sortedTrackIds = [...new Set(memberships.map((m) => m.track_id))].sort();

  let query = supabase
    .from('library_tracks')
    .select(LIBRARY_COLUMNS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (sortedTrackIds.length > 0) {
    query = query.not('id', 'in', `(${sortedTrackIds.join(',')})`);
  }
  if (search) {
    query = query.textSearch('search_vector', search, {
      type: 'websearch',
      config: 'simple',
    });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
