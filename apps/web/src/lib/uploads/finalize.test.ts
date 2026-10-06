import { describe, expect, it, vi } from 'vitest';
import type { UploadSessionRow } from '@trackzone/types';
import { finalizeUpload, type FinalizeUploadDeps } from './finalize';
const owner = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const token = '33333333-3333-4333-8333-333333333333';
const row: UploadSessionRow = {
  id,
  owner_id: owner,
  storage_key: `uploads/${owner}/${id}.wav`,
  filename: 'audio.wav',
  mime_type: 'audio/wav',
  file_size: 44,
  title: 'audio',
  status: 'issued',
  expires_at: '2030-01-01T00:00:00Z',
  claim_token: token,
  claim_expires_at: '2030-01-01T00:00:00Z',
  final_key: `originals/${owner}/${token}.wav`,
  candidate_keys: [],
  track_id: null,
  audio_file_id: null,
  cleaned_at: null,
  created_at: '',
  updated_at: '',
};
function setup(overrides: Partial<UploadSessionRow> = {}) {
  const session = { ...row, ...overrides };
  const deps = {
    load: vi.fn().mockResolvedValue(session),
    claim: vi.fn().mockResolvedValue(session),
    publish: vi.fn().mockResolvedValue({ trackId: 'track', audioFileId: 'audio' }),
    release: vi.fn().mockResolvedValue(undefined),
    storage: {
      head: vi.fn().mockResolvedValue({ size: 44, contentType: 'audio/wav', etag: '"v1"' }),
      copy: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
      createUploadUrl: vi.fn(),
      createDownloadUrl: vi.fn(),
    },
  } satisfies FinalizeUploadDeps;
  return deps;
}
describe('upload finalization boundary', () => {
  it('copies the verified source version before publishing records', async () => {
    const deps = setup();
    expect(await finalizeUpload(owner, deps)).toEqual({ trackId: 'track', audioFileId: 'audio' });
    expect(deps.storage.copy).toHaveBeenCalledWith(row.storage_key, row.final_key, '"v1"');
    expect(deps.storage.copy.mock.invocationCallOrder[0]).toBeLessThan(
      deps.publish.mock.invocationCallOrder[0]!,
    );
  });
  it('returns an existing import without recopying browser-writable bytes', async () => {
    const deps = setup({ status: 'completed', track_id: 'track', audio_file_id: 'audio' });
    await expect(finalizeUpload(owner, deps)).resolves.toEqual({
      trackId: 'track',
      audioFileId: 'audio',
    });
    expect(deps.storage.copy).not.toHaveBeenCalled();
    expect(deps.claim).not.toHaveBeenCalled();
  });
  it('rejects another owner, expired sessions and deleted imports', async () => {
    for (const values of [
      { owner_id: token },
      { expires_at: '2020-01-01' },
      { status: 'completed' as const },
    ]) {
      const deps = setup(values);
      await expect(finalizeUpload(owner, deps)).rejects.toThrow();
      expect(deps.storage.copy).not.toHaveBeenCalled();
    }
  });
  it('does not start another copy while a live claim exists', async () => {
    const deps = setup();
    deps.claim.mockResolvedValue(null);
    await expect(finalizeUpload(owner, deps)).rejects.toMatchObject({
      status: 409,
      code: 'upload_busy',
    });
    expect(deps.storage.copy).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { size: 0, contentType: 'audio/wav', etag: 'v1' },
    { size: 45, contentType: 'audio/wav', etag: 'v1' },
    { size: 2147483649, contentType: 'audio/wav', etag: 'v1' },
    { size: 44, contentType: 'text/html', etag: 'v1' },
    { size: 44, contentType: 'audio/wav', etag: null },
  ])('rejects a missing or mismatched storage object', async (object) => {
    const deps = setup();
    deps.storage.head.mockResolvedValueOnce(object);
    await expect(finalizeUpload(owner, deps)).rejects.toThrow();
    expect(deps.storage.copy).not.toHaveBeenCalled();
    expect(deps.publish).not.toHaveBeenCalled();
    expect(deps.release).toHaveBeenCalled();
  });
  it('does not publish if the source changes during the conditional copy', async () => {
    const deps = setup();
    deps.storage.copy.mockRejectedValue(new Error('Precondition failed'));
    await expect(finalizeUpload(owner, deps)).rejects.toThrow('Precondition failed');
    expect(deps.publish).not.toHaveBeenCalled();
  });
  it('keeps candidate bytes when a database response fails after a possible commit', async () => {
    const deps = setup();
    deps.publish.mockRejectedValue(new Error('DB timeout'));
    await expect(finalizeUpload(owner, deps)).rejects.toThrow('DB timeout');
    expect(deps.storage.delete).not.toHaveBeenCalled();
    expect(deps.release).toHaveBeenCalled();
  });
});
