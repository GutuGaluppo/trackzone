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
});
