import { describe, expect, it } from 'vitest';
import type { TrackVisibility } from '@trackzone/types';
import {
  assertAllowed,
  AuthorizationError,
  canDownloadTrack,
  canModifyTrack,
  canReadTrack,
  type TrackAuthorizationInput,
} from './authorization.ts';

const OWNER = 'owner-id';
const OTHER = 'other-user-id';

function track(overrides: Partial<TrackAuthorizationInput> = {}): TrackAuthorizationInput {
  return {
    ownerId: OWNER,
    visibility: 'private',
    allowDownload: false,
    hasExplicitGrant: false,
    ...overrides,
  };
}

const VISIBILITIES: TrackVisibility[] = ['private', 'shared', 'public'];

describe('canReadTrack', () => {
  it('always allows the owner, at every visibility', () => {
    for (const visibility of VISIBILITIES) {
      const decision = canReadTrack({ userId: OWNER }, track({ visibility }));
      expect(decision).toEqual({ allowed: true, as: 'owner' });
    }
  });

  it('never leaks a private track to another user', () => {
    expect(canReadTrack({ userId: OTHER }, track())).toEqual({
      allowed: false,
      reason: 'private_track',
    });
  });

  it('never leaks a private track to an anonymous visitor', () => {
    expect(canReadTrack({ userId: null }, track())).toEqual({
      allowed: false,
      reason: 'not_authenticated',
    });
  });

  it('ignores a stale grant on a track that went back to private', () => {
    const decision = canReadTrack(
      { userId: OTHER },
      track({ visibility: 'private', hasExplicitGrant: true }),
    );
    expect(decision).toEqual({ allowed: false, reason: 'private_track' });
  });

  it('requires an explicit grant for a shared track', () => {
    expect(canReadTrack({ userId: OTHER }, track({ visibility: 'shared' }))).toEqual({
      allowed: false,
      reason: 'no_grant',
    });

    expect(
      canReadTrack({ userId: OTHER }, track({ visibility: 'shared', hasExplicitGrant: true })),
    ).toEqual({ allowed: true, as: 'grantee' });
  });

  it('allows anyone to read a public track', () => {
    expect(canReadTrack({ userId: null }, track({ visibility: 'public' }))).toEqual({
      allowed: true,
      as: 'public',
    });
  });
});

describe('canDownloadTrack', () => {
  it('does not treat public as downloadable', () => {
    expect(canDownloadTrack({ userId: OTHER }, track({ visibility: 'public' }))).toEqual({
      allowed: false,
      reason: 'download_not_allowed',
    });
  });

  it('allows download when the owner opted in', () => {
    const decision = canDownloadTrack(
      { userId: OTHER },
      track({ visibility: 'public', allowDownload: true }),
    );
    expect(decision).toEqual({ allowed: true, as: 'public' });
  });

  it('allows the owner to download regardless of the flag', () => {
    expect(canDownloadTrack({ userId: OWNER }, track())).toEqual({ allowed: true, as: 'owner' });
  });

  it('refuses download before read: no read, no download', () => {
    expect(canDownloadTrack({ userId: OTHER }, track({ allowDownload: true }))).toEqual({
      allowed: false,
      reason: 'private_track',
    });
  });
});

describe('canModifyTrack', () => {
  it('is owner-only, even for a grantee of a shared track', () => {
    expect(
      canModifyTrack({ userId: OTHER }, track({ visibility: 'shared', hasExplicitGrant: true })),
    ).toEqual({ allowed: false, reason: 'not_owner' });
  });

  it('is owner-only, even for a public track', () => {
    expect(canModifyTrack({ userId: OTHER }, track({ visibility: 'public' }))).toEqual({
      allowed: false,
      reason: 'not_owner',
    });
  });
});

describe('assertAllowed', () => {
  it('throws an AuthorizationError carrying the reason', () => {
    expect(() => assertAllowed(canReadTrack({ userId: OTHER }, track()))).toThrowError(
      AuthorizationError,
    );
  });

  it('passes an allowed decision through', () => {
    expect(() => assertAllowed(canReadTrack({ userId: OWNER }, track()))).not.toThrow();
  });
});
