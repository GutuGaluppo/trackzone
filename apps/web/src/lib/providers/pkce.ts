import { createHash, randomBytes } from 'node:crypto';

/**
 * PKCE (RFC 7636) — required by SoundCloud's OAuth 2.1 authorization-code flow.
 * The verifier is kept server-side (in the short-lived flow cookie) and only the
 * S256 challenge is put on the authorize URL.
 */

export interface PkcePair {
  verifier: string;
  challenge: string;
}

/** base64url(sha256(verifier)) — the `S256` transform. */
export function challengeFor(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function createPkcePair(): PkcePair {
  // 32 bytes → 43-char base64url string, within RFC 7636's 43–128 range and
  // already restricted to the unreserved character set.
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: challengeFor(verifier) };
}

/** Opaque anti-CSRF value round-tripped through the authorize request. */
export function randomState(): string {
  return randomBytes(16).toString('base64url');
}
