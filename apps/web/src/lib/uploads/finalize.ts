import 'server-only';
import type { UploadSessionRow } from '@trackzone/types';
import type { ObjectStorage } from '@trackzone/storage';
import { keyBelongsToUser, isMediaKeyForUser } from '@trackzone/storage';
import { MAX_UPLOAD_BYTES } from '@trackzone/validation';

export class UploadError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface CompletedUpload {
  trackId: string;
  audioFileId: string;
}
export interface FinalizeUploadDeps {
  load: () => Promise<UploadSessionRow | null>;
  claim: () => Promise<UploadSessionRow | null>;
  publish: (claim: UploadSessionRow) => Promise<CompletedUpload>;
  release: (claim: UploadSessionRow) => Promise<void>;
  storage: ObjectStorage;
  now?: () => number;
}

function completed(session: UploadSessionRow): CompletedUpload {
  if (!session.track_id || !session.audio_file_id)
    throw new UploadError(410, 'upload_deleted', 'This imported track has been deleted.');
  return { trackId: session.track_id, audioFileId: session.audio_file_id };
}

export async function finalizeUpload(
  ownerId: string,
  deps: FinalizeUploadDeps,
): Promise<CompletedUpload> {
  const session = await deps.load();
  if (!session || session.owner_id !== ownerId)
    throw new UploadError(404, 'upload_not_found', 'This upload could not be found.');
  if (session.status === 'completed') return completed(session);
  if (
    session.status === 'expired' ||
    Date.parse(session.expires_at) <= (deps.now?.() ?? Date.now())
  )
    throw new UploadError(410, 'upload_expired', 'This upload has expired. Import the file again.');

  const claim = await deps.claim();
  if (!claim) {
    const current = await deps.load();
    if (current?.owner_id === ownerId && current.status === 'completed') return completed(current);
    throw new UploadError(409, 'upload_busy', 'This upload is being finalized. Try again shortly.');
  }
  try {
    if (
      claim.owner_id !== ownerId ||
      !claim.claim_token ||
      !claim.final_key ||
      !keyBelongsToUser(claim.storage_key, ownerId) ||
      !isMediaKeyForUser(claim.final_key, ownerId)
    ) {
      throw new UploadError(403, 'forbidden_key', 'The upload storage reference is invalid.');
    }
    const original = await deps.storage.head(claim.storage_key);
    if (!original) throw new UploadError(409, 'upload_missing', 'The uploaded file is missing.');
    if (original.size > MAX_UPLOAD_BYTES)
      throw new UploadError(413, 'upload_too_large', 'The file exceeds the 2 GB upload limit.');
    if (
      original.size <= 0 ||
      original.size !== claim.file_size ||
      original.contentType !== claim.mime_type
    )
      throw new UploadError(
        409,
        'upload_mismatch',
        'The uploaded file does not match the authorized upload.',
      );
    if (!original.etag)
      throw new UploadError(409, 'upload_unverified', 'The uploaded file could not be verified.');

    // Bytes stay in object storage. The browser never receives PUT access to this new key.
    await deps.storage.copy(claim.storage_key, claim.final_key, original.etag);
    const final = await deps.storage.head(claim.final_key);
    if (!final || final.size !== claim.file_size || final.contentType !== claim.mime_type)
      throw new UploadError(409, 'upload_mismatch', 'The finalized file could not be verified.');
    return await deps.publish(claim);
  } catch (error) {
    // A database timeout may have happened AFTER commit: do not delete final bytes.
    // Every candidate is registered for later cleanup; release is token-conditional.
    await deps.release(claim).catch(() => {});
    throw error;
  }
}
