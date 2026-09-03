/**
 * Hand-maintained mirror of supabase/migrations.
 *
 * Regenerate with `pnpm db:types` once a Supabase project is linked; until
 * then this file is the contract and must be updated in the same commit as
 * any migration that changes a table.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TrackVisibility = 'private' | 'shared' | 'public';
export type TrackRole = 'owner' | 'viewer';
export type Provider = 'trackzone' | 'local' | 'google_drive' | 'soundcloud' | 'dropbox';
export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type SourceStatus = 'available' | 'missing' | 'error';
export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'error';
export type ImportStatus =
  | 'pending'
  | 'discovering'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type ImportItemStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type TrackRow = {
  id: string;
  owner_id: string;
  title: string;
  artist_name: string | null;
  album_name: string | null;
  artwork_url: string | null;
  duration_ms: number | null;
  visibility: TrackVisibility;
  allow_download: boolean;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

type AudioFileRow = {
  id: string;
  track_id: string;
  storage_provider: Provider;
  storage_key: string;
  original_filename: string;
  mime_type: string | null;
  codec: string | null;
  file_size: number | null;
  checksum: string | null;
  duration_ms: number | null;
  sample_rate: number | null;
  bit_depth: number | null;
  bitrate: number | null;
  channels: number | null;
  is_original: boolean;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
};

type TrackSourceRow = {
  id: string;
  track_id: string;
  provider: Provider;
  provider_file_id: string | null;
  audio_file_id: string | null;
  source_metadata: Json;
  status: SourceStatus;
  created_at: string;
  updated_at: string;
}

type TrackAccessRow = {
  track_id: string;
  user_id: string;
  role: TrackRole;
  created_at: string;
};

type CollectionRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  visibility: TrackVisibility;
  created_at: string;
  updated_at: string;
}

type CollectionTrackRow = {
  collection_id: string;
  track_id: string;
  position: number;
  created_at: string;
};

type ProviderConnectionRow = {
  id: string;
  user_id: string;
  provider: Provider;
  provider_account_id: string | null;
  display_name: string | null;
  status: ConnectionStatus;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

type ImportRow = {
  id: string;
  user_id: string;
  provider: Provider;
  connection_id: string | null;
  status: ImportStatus;
  total_items: number;
  processed_items: number;
  failed_items: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type ImportItemRow = {
  id: string;
  import_id: string;
  provider_file_id: string;
  filename: string | null;
  track_id: string | null;
  status: ImportItemStatus;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type LibraryTrackRow = {
  id: string;
  owner_id: string;
  title: string;
  artist_name: string | null;
  album_name: string | null;
  artwork_url: string | null;
  duration_ms: number | null;
  visibility: TrackVisibility;
  allow_download: boolean;
  favorite: boolean;
  created_at: string;
  updated_at: string;
  owner_username: string;
  owner_display_name: string | null;
  audio_file_id: string | null;
  original_filename: string | null;
  mime_type: string | null;
  codec: string | null;
  file_size: number | null;
  sample_rate: number | null;
  bit_depth: number | null;
  bitrate: number | null;
  channels: number | null;
  processing_status: ProcessingStatus | null;
  processing_error: string | null;
  source_providers: Provider[];
};

/** Columns the database fills in for us on insert. */
type Generated = 'id' | 'created_at' | 'updated_at' | 'search_vector';

/** Mirrors postgrest-js's GenericRelationship so embedded selects type-check. */
interface Relationship {
  foreignKeyName: string;
  columns: readonly string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: readonly string[];
}

type Table<
  Row,
  Optional extends keyof Row = never,
  Relationships extends readonly Relationship[] = [],
> = {
  Row: Row;
  Insert: Omit<Row, Extract<Generated, keyof Row> | Optional> &
    Partial<Pick<Row, Extract<Generated, keyof Row> | Optional>>;
  Update: Partial<Row>;
  Relationships: Relationships;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'display_name' | 'avatar_url'>;
      tracks: Table<
        TrackRow,
        | 'artist_name'
        | 'album_name'
        | 'artwork_url'
        | 'duration_ms'
        | 'visibility'
        | 'allow_download'
        | 'favorite',
        [
          {
            foreignKeyName: 'tracks_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ]
      >;
      audio_files: Table<
        AudioFileRow,
        | 'storage_provider'
        | 'mime_type'
        | 'codec'
        | 'file_size'
        | 'checksum'
        | 'duration_ms'
        | 'sample_rate'
        | 'bit_depth'
        | 'bitrate'
        | 'channels'
        | 'is_original'
        | 'processing_status'
        | 'processing_error',
        [
          {
            foreignKeyName: 'audio_files_track_id_fkey';
            columns: ['track_id'];
            isOneToOne: false;
            referencedRelation: 'tracks';
            referencedColumns: ['id'];
          },
        ]
      >;
      track_sources: Table<
        TrackSourceRow,
        'provider_file_id' | 'audio_file_id' | 'source_metadata' | 'status',
        [
          {
            foreignKeyName: 'track_sources_track_id_fkey';
            columns: ['track_id'];
            isOneToOne: false;
            referencedRelation: 'tracks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'track_sources_audio_file_id_fkey';
            columns: ['audio_file_id'];
            isOneToOne: false;
            referencedRelation: 'audio_files';
            referencedColumns: ['id'];
          },
        ]
      >;
      track_access: Table<
        TrackAccessRow,
        'role',
        [
          {
            foreignKeyName: 'track_access_track_id_fkey';
            columns: ['track_id'];
            isOneToOne: false;
            referencedRelation: 'tracks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'track_access_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ]
      >;
      collections: Table<
        CollectionRow,
        'description' | 'visibility',
        [
          {
            foreignKeyName: 'collections_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ]
      >;
      collection_tracks: Table<
        CollectionTrackRow,
        'position',
        [
          {
            foreignKeyName: 'collection_tracks_collection_id_fkey';
            columns: ['collection_id'];
            isOneToOne: false;
            referencedRelation: 'collections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collection_tracks_track_id_fkey';
            columns: ['track_id'];
            isOneToOne: false;
            referencedRelation: 'tracks';
            referencedColumns: ['id'];
          },
        ]
      >;
      provider_connections: Table<
        ProviderConnectionRow,
        'provider_account_id' | 'display_name' | 'status' | 'last_synced_at',
        [
          {
            foreignKeyName: 'provider_connections_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ]
      >;
      imports: Table<
        ImportRow,
        | 'connection_id'
        | 'status'
        | 'total_items'
        | 'processed_items'
        | 'failed_items'
        | 'completed_at',
        [
          {
            foreignKeyName: 'imports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'imports_connection_id_fkey';
            columns: ['connection_id'];
            isOneToOne: false;
            referencedRelation: 'provider_connections';
            referencedColumns: ['id'];
          },
        ]
      >;
      import_items: Table<
        ImportItemRow,
        'filename' | 'track_id' | 'status' | 'error_code' | 'error_message',
        [
          {
            foreignKeyName: 'import_items_import_id_fkey';
            columns: ['import_id'];
            isOneToOne: false;
            referencedRelation: 'imports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'import_items_track_id_fkey';
            columns: ['track_id'];
            isOneToOne: false;
            referencedRelation: 'tracks';
            referencedColumns: ['id'];
          },
        ]
      >;
    };
    Views: {
      library_tracks: { Row: LibraryTrackRow; Relationships: [] };
    };
    Functions: {
      track_is_readable_by: { Args: { p_track_id: string; p_user_id: string }; Returns: boolean };
      track_is_owned_by: { Args: { p_track_id: string; p_user_id: string }; Returns: boolean };
    };
    Enums: {
      track_visibility: TrackVisibility;
      track_role: TrackRole;
      provider: Provider;
      processing_status: ProcessingStatus;
      source_status: SourceStatus;
      connection_status: ConnectionStatus;
      import_status: ImportStatus;
      import_item_status: ImportItemStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
