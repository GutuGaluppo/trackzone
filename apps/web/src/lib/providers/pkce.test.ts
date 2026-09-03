import { describe, expect, it } from 'vitest';
import { challengeFor, createPkcePair, randomState } from './pkce';

describe('challengeFor', () => {
  it('matches the RFC 7636 Appendix B test vector', () => {
    expect(challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });
});

describe('createPkcePair', () => {
  it('produces an unreserved-charset verifier of legal length', () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(challenge).toBe(challengeFor(verifier));
  });

  it('is unique per call', () => {
    expect(createPkcePair().verifier).not.toBe(createPkcePair().verifier);
  });
});

describe('randomState', () => {
  it('is non-empty and unique', () => {
    expect(randomState()).not.toBe(randomState());
    expect(randomState().length).toBeGreaterThan(0);
  });
});
