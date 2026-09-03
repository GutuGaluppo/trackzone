import type { TrackVisibility } from '@trackzone/types';

/**
 * Application-side authorization.
 *
 * This is the deliberate twin of the RLS policies in
 * `supabase/migrations/20260903120100_init_library.sql`. The two layers must
 * agree; when they disagree the database wins and this file is the bug.
 *
 * The functions are pure so the rules can be tested exhaustively without a
 * database, and so a route can never "forget" to check by accident: issuing a
 * signed URL requires an AccessDecision.
 */

export interface Viewer {
  /** null for an anonymous request. */
  userId: string | null;
}

export interface TrackAuthorizationInput {
  ownerId: string;
  visibility: TrackVisibility;
  allowDownload: boolean;
  /** True when an explicit `track_access` grant exists for this viewer. */
  hasExplicitGrant: boolean;
}

export type DenyReason =
  'not_authenticated' | 'not_owner' | 'no_grant' | 'private_track' | 'download_not_allowed';

export type AccessDecision =
  { allowed: true; as: 'owner' | 'grantee' | 'public' } | { allowed: false; reason: DenyReason };

const deny = (reason: DenyReason): AccessDecision => ({ allowed: false, reason });

/** May this viewer see the track and stream its audio? */
export function canReadTrack(viewer: Viewer, track: TrackAuthorizationInput): AccessDecision {
  if (viewer.userId && viewer.userId === track.ownerId) {
    return { allowed: true, as: 'owner' };
  }

  if (track.visibility === 'public') {
    return { allowed: true, as: 'public' };
  }

  if (!viewer.userId) {
    return deny('not_authenticated');
  }

  if (track.visibility === 'private') {
    return deny('private_track');
  }

  return track.hasExplicitGrant ? { allowed: true, as: 'grantee' } : deny('no_grant');
}

/**
 * May this viewer download the original file?
 *
 * Visibility and download rights are separate concepts: a public track is not
 * downloadable unless its owner said so. The owner can always download.
 */
export function canDownloadTrack(viewer: Viewer, track: TrackAuthorizationInput): AccessDecision {
  const read = canReadTrack(viewer, track);
  if (!read.allowed) return read;
  if (read.as === 'owner') return read;

  return track.allowDownload ? read : deny('download_not_allowed');
}

/** Only the owner may edit metadata, change visibility or delete. */
export function canModifyTrack(viewer: Viewer, track: TrackAuthorizationInput): AccessDecision {
  if (!viewer.userId) return deny('not_authenticated');
  return viewer.userId === track.ownerId ? { allowed: true, as: 'owner' } : deny('not_owner');
}

/** Only the owner may grant or revoke access. */
export const canManageAccess = canModifyTrack;

export class AuthorizationError extends Error {
  readonly reason: DenyReason;

  constructor(reason: DenyReason) {
    super(`Access denied: ${reason}`);
    this.name = 'AuthorizationError';
    this.reason = reason;
  }
}

/** Narrows a decision to its allowed form, throwing otherwise. */
export function assertAllowed(
  decision: AccessDecision,
): asserts decision is Extract<AccessDecision, { allowed: true }> {
  if (!decision.allowed) {
    throw new AuthorizationError(decision.reason);
  }
}
