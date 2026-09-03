import 'server-only';

import type { User } from '@supabase/supabase-js';
import {
  assertAllowed,
  canDownloadTrack,
  canModifyTrack,
  canReadTrack,
  AuthorizationError,
  type AccessDecision,
  type TrackAuthorizationInput,
} from '@trackzone/database';
import { createAdminSupabase } from '@/lib/supabase/admin';

export interface AuthorizedTrack {
  id: string;
  ownerId: string;
  title: string;
  visibility: TrackAuthorizationInput['visibility'];
  allowDownload: boolean;
  decision: Extract<AccessDecision, { allowed: true }>;
  audioFile: {
    id: string;
    storageKey: string;
    originalFilename: string;
    mimeType: string | null;
    processingStatus: string;
  } | null;
}

/**
 * Loads a track and decides, in one place, whether the caller may have it.
 *
 * The read uses the service-role client so the *application* makes the access
 * decision explicitly rather than inferring it from an empty RLS result — the
 * two layers then check each other instead of one silently masking the other.
 * Nothing is returned before `assertAllowed` has run.
 */
async function loadTrack(trackId: string) {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from('tracks')
    .select(
      'id, owner_id, title, visibility, allow_download, audio_files(id, storage_key, original_filename, mime_type, processing_status, is_original)',
    )
    .eq('id', trackId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function hasGrant(trackId: string, userId: string | null): Promise<boolean> {
  if (!userId) return false;

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('track_access')
    .select('user_id')
    .eq('track_id', trackId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

type Intent = 'read' | 'download' | 'modify';

const CHECKS = {
  read: canReadTrack,
  download: canDownloadTrack,
  modify: canModifyTrack,
} as const;

/**
 * Authorizes `intent` on a track. Throws AuthorizationError on denial, which
 * the route wrapper translates into the right status code.
 */
export async function authorizeTrack(
  trackId: string,
  user: User | null,
  intent: Intent,
): Promise<AuthorizedTrack> {
  const track = await loadTrack(trackId);

  // A missing track and an unauthorized track answer identically on purpose.
  if (!track) {
    throw new AuthorizationError(user ? 'private_track' : 'not_authenticated');
  }

  const input: TrackAuthorizationInput = {
    ownerId: track.owner_id,
    visibility: track.visibility,
    allowDownload: track.allow_download,
    hasExplicitGrant:
      track.visibility === 'shared' ? await hasGrant(trackId, user?.id ?? null) : false,
  };

  const decision = CHECKS[intent]({ userId: user?.id ?? null }, input);
  assertAllowed(decision);

  const original =
    track.audio_files?.find((file) => file.is_original) ?? track.audio_files?.[0] ?? null;

  return {
    id: track.id,
    ownerId: track.owner_id,
    title: track.title,
    visibility: track.visibility,
    allowDownload: track.allow_download,
    decision,
    audioFile: original
      ? {
          id: original.id,
          storageKey: original.storage_key,
          originalFilename: original.original_filename,
          mimeType: original.mime_type,
          processingStatus: original.processing_status,
        }
      : null,
  };
}
