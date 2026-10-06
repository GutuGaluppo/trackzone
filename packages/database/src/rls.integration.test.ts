import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  adminClient,
  anonClient,
  createTestUser,
  deleteTestUser,
  integrationEnv,
  type TestUser,
} from './test/helpers.ts';

/**
 * Integration tests against a real local Postgres/PostgREST instance
 * (`supabase start`), exercising the RLS policies in supabase/migrations/
 * directly — the layer packages/database/src/authorization.test.ts cannot
 * reach on its own. Skips itself when SUPABASE_URL / SUPABASE_ANON_KEY /
 * SUPABASE_SERVICE_ROLE_KEY are not set.
 *
 * Run with: pnpm --filter @trackzone/database test:integration
 */
describe.skipIf(!integrationEnv())('RLS integration', () => {
  let owner: TestUser;
  let grantee: TestUser;
  let stranger: TestUser;

  beforeAll(async () => {
    [owner, grantee, stranger] = await Promise.all([
      createTestUser('owner'),
      createTestUser('grantee'),
      createTestUser('stranger'),
    ]);
  });

  afterAll(async () => {
    await Promise.all([owner, grantee, stranger].map((u) => deleteTestUser(u.id)));
  });

  async function insertTrack(
    visibility: 'private' | 'shared' | 'public',
    title: string,
  ): Promise<string> {
    const { data, error } = await owner.client
      .from('tracks')
      .insert({ owner_id: owner.id, title, visibility })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  it('creates a profile with a valid username on signup', async () => {
    const { data, error } = await owner.client
      .from('profiles')
      .select('username')
      .eq('id', owner.id)
      .single();

    expect(error).toBeNull();
    expect(data?.username).toMatch(/^[a-z0-9][a-z0-9_-]{2,29}$/);
  });

  describe('private tracks', () => {
    it('are invisible to another authenticated user', async () => {
      const trackId = await insertTrack('private', 'Private Track');

      const { data, error } = await stranger.client.from('tracks').select('id').eq('id', trackId);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('are invisible to an anonymous visitor', async () => {
      const trackId = await insertTrack('private', 'Private Track 2');

      const { data } = await anonClient().from('tracks').select('id').eq('id', trackId);

      expect(data).toEqual([]);
    });

    it('are visible to the owner', async () => {
      const trackId = await insertTrack('private', 'Private Track 3');

      const { data, error } = await owner.client.from('tracks').select('id').eq('id', trackId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe('shared tracks', () => {
    it('are invisible without an explicit grant', async () => {
      const trackId = await insertTrack('shared', 'Shared Track');

      const { data } = await stranger.client.from('tracks').select('id').eq('id', trackId);

      expect(data).toEqual([]);
    });

    it('become visible to a user once granted access', async () => {
      const trackId = await insertTrack('shared', 'Shared Track 2');

      const { error: grantError } = await owner.client
        .from('track_access')
        .insert({ track_id: trackId, user_id: grantee.id, role: 'viewer' });
      expect(grantError).toBeNull();

      const { data, error } = await grantee.client.from('tracks').select('id').eq('id', trackId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);

      // The grant is scoped to that one user — a third party still sees nothing.
      const { data: strangerData } = await stranger.client
        .from('tracks')
        .select('id')
        .eq('id', trackId);
      expect(strangerData).toEqual([]);
    });

    it('rejects a grant with role "owner" at the database level', async () => {
      const trackId = await insertTrack('shared', 'Shared Track 3');

      const { error } = await owner.client
        .from('track_access')
        .insert({ track_id: trackId, user_id: grantee.id, role: 'owner' });

      expect(error).not.toBeNull();
    });
  });

  describe('public tracks', () => {
    it('are visible to any authenticated user and to anonymous visitors', async () => {
      const trackId = await insertTrack('public', 'Public Track');

      const { data: strangerData } = await stranger.client
        .from('tracks')
        .select('id')
        .eq('id', trackId);
      expect(strangerData).toHaveLength(1);

      const { data: anonData } = await anonClient().from('tracks').select('id').eq('id', trackId);
      expect(anonData).toHaveLength(1);
    });
  });

  describe('ownership', () => {
    it('lets the owner update-and-return their own track in one call', async () => {
      // The route handlers behind PATCH /api/tracks/:id and PUT .../visibility
      // both do `.update(...).select(...).single()` — UPDATE ... RETURNING
      // re-checks the SELECT policy against the just-updated row, which is
      // exactly the snapshot trap the INSERT case above hit.
      const trackId = await insertTrack('private', 'Editable Track');

      const { data, error } = await owner.client
        .from('tracks')
        .update({ visibility: 'public' })
        .eq('id', trackId)
        .select('id, visibility')
        .single();

      expect(error).toBeNull();
      expect(data?.visibility).toBe('public');
    });

    it('silently affects zero rows when a non-owner tries to update a track', async () => {
      const trackId = await insertTrack('public', 'Owned Track');

      const { data, error } = await stranger.client
        .from('tracks')
        .update({ title: 'Hijacked' })
        .eq('id', trackId)
        .select('id');

      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: check } = await owner.client
        .from('tracks')
        .select('title')
        .eq('id', trackId)
        .single();
      expect(check?.title).toBe('Owned Track');
    });

    it('lets the owner delete their own track', async () => {
      const trackId = await insertTrack('private', 'Doomed Track');

      const { error, count } = await owner.client
        .from('tracks')
        .delete({ count: 'exact' })
        .eq('id', trackId);

      expect(error).toBeNull();
      expect(count).toBe(1);
    });
  });

  describe('collection membership cannot launder access', () => {
    it("rejects adding another user's unreadable track to a collection", async () => {
      const privateTrackId = await insertTrack('private', 'Not Yours');

      const { data: collection, error: collectionError } = await grantee.client
        .from('collections')
        .insert({ owner_id: grantee.id, name: `Grantee Collection ${Date.now()}` })
        .select('id')
        .single();
      expect(collectionError).toBeNull();

      const { error: membershipError } = await grantee.client
        .from('collection_tracks')
        .insert({ collection_id: collection!.id, track_id: privateTrackId, position: 0 });

      expect(membershipError).not.toBeNull();
    });
  });

  describe('public collections', () => {
    it('are readable by an anonymous visitor', async () => {
      const { data: collection, error } = await owner.client
        .from('collections')
        .insert({
          owner_id: owner.id,
          name: `Public Collection ${Date.now()}`,
          visibility: 'public',
        })
        .select('id')
        .single();
      expect(error).toBeNull();

      const { data } = await anonClient().from('collections').select('id').eq('id', collection!.id);
      expect(data).toHaveLength(1);
    });
  });

  describe('duplicate storage keys', () => {
    it('are rejected, backing upload idempotency', async () => {
      const trackId = await insertTrack('private', 'Storage Key Test');
      const storageKey = `originals/${owner.id}/${crypto.randomUUID()}.wav`;

      const admin = adminClient();
      const first = await admin.from('audio_files').insert({
        track_id: trackId,
        storage_provider: 'trackzone',
        storage_key: storageKey,
        original_filename: 'test.wav',
        is_original: true,
      });
      expect(first.error).toBeNull();

      const second = await admin.from('audio_files').insert({
        track_id: trackId,
        storage_provider: 'trackzone',
        storage_key: storageKey,
        original_filename: 'test-again.wav',
        is_original: false,
      });

      expect(second.error).not.toBeNull();
      expect(second.error?.code).toBe('23505');
    });
  });
  describe('server-owned media and upload transactions', () => {
    async function session() {
      const id = crypto.randomUUID();
      const { error } = await adminClient()
        .from('upload_sessions')
        .insert({
          id,
          owner_id: owner.id,
          storage_key: `uploads/${owner.id}/${id}.wav`,
          filename: 'test.wav',
          title: 'Authorized import',
          mime_type: 'audio/wav',
          file_size: 44,
        });
      expect(error).toBeNull();
      return id;
    }

    it('denies owner writes to media columns and upload authorizations', async () => {
      const trackId = await insertTrack('private', 'Server-controlled file');
      const storageKey = `originals/${owner.id}/${crypto.randomUUID()}.wav`;
      const { error: insertError } = await owner.client.from('audio_files').insert({
        track_id: trackId,
        storage_key: storageKey,
        original_filename: 'test.wav',
        processing_status: 'ready',
      });
      expect(insertError).not.toBeNull();
      const { data: audio, error } = await adminClient()
        .from('audio_files')
        .insert({
          track_id: trackId,
          storage_key: storageKey,
          original_filename: 'test.wav',
        })
        .select('id')
        .single();
      expect(error).toBeNull();
      const update = await owner.client
        .from('audio_files')
        .update({ processing_status: 'ready' })
        .eq('id', audio!.id);
      expect(update.error).not.toBeNull();
      const id = await session();
      const read = await owner.client.from('upload_sessions').select('*').eq('id', id);
      expect(read.error).not.toBeNull();
      const claim = await owner.client.rpc('claim_upload', {
        p_upload_id: id,
        p_owner_id: owner.id,
      });
      expect(claim.error).not.toBeNull();
    });

    it('rejects foreign and traversal keys even for a server insert', async () => {
      const trackId = await insertTrack('private', 'Guarded storage');
      for (const key of [
        `originals/${stranger.id}/${crypto.randomUUID()}.wav`,
        `originals/${owner.id}/../${stranger.id}/${crypto.randomUUID()}.wav`,
        `uploads/${owner.id}/${crypto.randomUUID()}.wav`,
      ]) {
        const { error } = await adminClient().from('audio_files').insert({
          track_id: trackId,
          storage_key: key,
          original_filename: 'test.wav',
        });
        expect(error?.code).toBe('23514');
      }
    });

    it('claims once and publishes the entire import idempotently', async () => {
      const id = await session();
      const db = adminClient();
      const foreign = await db.rpc('claim_upload', { p_upload_id: id, p_owner_id: stranger.id });
      expect(foreign.data).toEqual([]);
      const claim = await db.rpc('claim_upload', { p_upload_id: id, p_owner_id: owner.id });
      expect(claim.error).toBeNull();
      const token = claim.data![0]!.claim_token!;
      const second = await db.rpc('claim_upload', { p_upload_id: id, p_owner_id: owner.id });
      expect(second.data).toEqual([]);
      const args = { p_upload_id: id, p_owner_id: owner.id, p_claim_token: token };
      const [first, repeated] = await Promise.all([
        db.rpc('complete_upload', args),
        db.rpc('complete_upload', args),
      ]);
      expect(first.error).toBeNull();
      expect(repeated.error).toBeNull();
      expect(first.data).toEqual(repeated.data);
      const trackId = first.data![0]!.track_id;
      const { data: sources } = await db
        .from('track_sources')
        .select('provider')
        .eq('track_id', trackId);
      expect(sources?.map((row) => row.provider).sort()).toEqual(['local', 'trackzone']);
      const { data: strangerFiles } = await stranger.client
        .from('audio_files')
        .select('id')
        .eq('track_id', trackId);
      expect(strangerFiles).toEqual([]);
    });

    it('rolls back a partially constructed track when audio insertion fails', async () => {
      const id = await session();
      const db = adminClient();
      const { data } = await db.rpc('claim_upload', { p_upload_id: id, p_owner_id: owner.id });
      await db
        .from('upload_sessions')
        .update({ final_key: `originals/${stranger.id}/${crypto.randomUUID()}.wav` })
        .eq('id', id);
      const before = await db
        .from('tracks')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', owner.id);
      const result = await db.rpc('complete_upload', {
        p_upload_id: id,
        p_owner_id: owner.id,
        p_claim_token: data![0]!.claim_token!,
      });
      expect(result.error?.code).toBe('23514');
      const after = await db
        .from('tracks')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', owner.id);
      expect(after.count).toBe(before.count);
    });
  });
  describe('processing leases', () => {
    async function audio() {
      const trackId = await insertTrack('private', 'Lease test');
      const { data, error } = await adminClient()
        .from('audio_files')
        .insert({
          track_id: trackId,
          storage_key: `originals/${owner.id}/${crypto.randomUUID()}.wav`,
          original_filename: 'test.wav',
        })
        .select('id')
        .single();
      expect(error).toBeNull();
      return data!.id;
    }

    it('allows only one concurrent processing claim and rejects stale completion', async () => {
      const id = await audio();
      const db = adminClient();
      const [a, b] = await Promise.all([
        db.rpc('claim_audio_processing', { p_audio_file_id: id }),
        db.rpc('claim_audio_processing', { p_audio_file_id: id }),
      ]);
      expect(a.error).toBeNull();
      expect(b.error).toBeNull();
      expect(a.data!.length + b.data!.length).toBe(1);
      const claim = [...a.data!, ...b.data!][0]!;
      const stale = await db.rpc('finish_audio_processing', {
        p_audio_file_id: id,
        p_token: crypto.randomUUID(),
        p_metadata: { duration_ms: 9000 },
      });
      expect(stale.data).toBe(false);
      const ready = await db.rpc('finish_audio_processing', {
        p_audio_file_id: id,
        p_token: claim.processing_token!,
        p_metadata: { duration_ms: 1000, sample_rate: 44100 },
      });
      expect(ready.error).toBeNull();
      expect(ready.data).toBe(true);
      const repeat = await db.rpc('claim_audio_processing', { p_audio_file_id: id });
      expect(repeat.data).toEqual([]);
    });

    it('does not retry invalid audio or allow users to claim jobs directly', async () => {
      const id = await audio();
      const db = adminClient();
      const userClaim = await owner.client.rpc('claim_audio_processing', { p_audio_file_id: id });
      expect(userClaim.error).not.toBeNull();
      await db
        .from('audio_files')
        .update({ processing_status: 'failed', processing_retryable: false })
        .eq('id', id);
      expect((await db.rpc('claim_audio_processing', { p_audio_file_id: id })).data).toEqual([]);
      expect(
        (await db.rpc('retry_audio_processing', { p_audio_file_id: id, p_owner_id: owner.id }))
          .data,
      ).toEqual([]);
    });

    it('recovers an expired processing lease and limits attempts', async () => {
      const id = await audio();
      const db = adminClient();
      await db
        .from('audio_files')
        .update({
          processing_status: 'processing',
          processing_token: crypto.randomUUID(),
          processing_lease_expires_at: '2000-01-01',
        })
        .eq('id', id);
      const recovered = await db.rpc('claim_audio_processing', { p_audio_file_id: id });
      expect(recovered.data?.[0]?.processing_attempts).toBe(1);
      await db
        .from('audio_files')
        .update({ processing_status: 'failed', processing_attempts: 5 })
        .eq('id', id);
      expect((await db.rpc('claim_audio_processing', { p_audio_file_id: id })).data).toEqual([]);
      expect(
        (await db.rpc('retry_audio_processing', { p_audio_file_id: id, p_owner_id: stranger.id }))
          .data,
      ).toEqual([]);
    });
  });
});
