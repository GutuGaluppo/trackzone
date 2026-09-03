import type { LibraryTrackRow, Provider, ProcessingStatus, TrackVisibility } from './database.ts';

/**
 * A row as the Library table consumes it. `search_vector` exists on
 * LibraryTrackRow only so `.textSearch()` type-checks against the view — it is
 * never selected, so it is never part of what the UI actually receives.
 */
export type LibraryTrack = Omit<LibraryTrackRow, 'search_vector'>;

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  visibility: TrackVisibility;
  trackCount: number;
  createdAt: string;
}

/**
 * Contract every storage backend must satisfy. R2 is the v0.1 implementation;
 * keeping the interface narrow is what makes object storage replaceable.
 */
export interface SignedUpload {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  storageKey: string;
  expiresInSeconds: number;
}

export interface SignedPlayback {
  url: string;
  expiresAt: string;
  allowDownload: boolean;
}

/**
 * Provider contract. v0.1 implements `local` only; Google Drive is expected to
 * be the first module to implement this without touching the domain model.
 */
export interface AudioProvider {
  readonly id: Provider;
  readonly label: string;
  readonly requiresConnection: boolean;
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  trackzone: 'TrackZone',
  local: 'Local',
  google_drive: 'Google Drive',
  soundcloud: 'SoundCloud',
  dropbox: 'Dropbox',
};

/** Compact codes used by the source rail in the Library (SC / GD / DB / TZ). */
export const PROVIDER_CODES: Record<Provider, string> = {
  trackzone: 'TZ',
  local: 'LOC',
  google_drive: 'GD',
  soundcloud: 'SC',
  dropbox: 'DB',
};

export const PROCESSING_LABELS: Record<ProcessingStatus, string> = {
  pending: 'Queued',
  processing: 'Analyzing',
  ready: 'Ready',
  failed: 'Failed',
};

export const VISIBILITY_LABELS: Record<TrackVisibility, string> = {
  private: 'Private',
  shared: 'Shared',
  public: 'Public',
};
