import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { serverEnv } from '@/env';

/**
 * Symmetric encryption for provider OAuth tokens at rest.
 *
 * `private.provider_credentials.encrypted_credentials` stores the output of
 * `encryptJson`. The database never interprets it; only this module (running on
 * the server, holding `PROVIDER_CREDENTIALS_KEY`) can read it back.
 *
 * Format: `v1.<iv>.<authTag>.<ciphertext>`, each part base64url. AES-256-GCM,
 * 96-bit IV — the tag makes tampering a decryption failure, not a silent one.
 */

const VERSION = 'v1';
const IV_BYTES = 12;

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = serverEnv().PROVIDER_CREDENTIALS_KEY;
  if (!raw) {
    throw new Error('PROVIDER_CREDENTIALS_KEY is not set — provider token encryption is unavailable.');
  }

  const buffer = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');

  if (buffer.length !== 32) {
    throw new Error(
      `PROVIDER_CREDENTIALS_KEY must decode to 32 bytes (got ${buffer.length}). ` +
        'Generate one with: openssl rand -base64 32',
    );
  }

  cachedKey = buffer;
  return buffer;
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptJson<T = unknown>(token: string): T {
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Malformed encrypted payload.');
  }

  const [, ivPart, tagPart, ctPart] = parts as [string, string, string, string];
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctPart, 'base64url')),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString('utf8')) as T;
}
