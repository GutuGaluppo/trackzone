import { randomUUID } from 'node:crypto';
import { createR2Storage } from '../packages/storage/src/r2.ts';
import { buildUploadKey, buildOriginalKey } from '../packages/storage/src/keys.ts';

// A self-contained probe: no database, existing user, audio file or public bucket required.
// Only two randomly generated temporary keys are written, then removed.
const parts = { userId: randomUUID(), uploadId: randomUUID(), extension: 'wav' };
const staging = buildUploadKey(parts);
const final = buildOriginalKey({ ...parts, uploadId: randomUUID() });
const results = {};
let store;
class VerificationError extends Error {}
function ensure(condition, message) {
  if (!condition) throw new VerificationError(message);
}

try {
  ensure((process.env.R2_REGION || 'auto') === 'auto', 'R2_REGION must be auto for Cloudflare R2.');
  store = createR2Storage({
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || '',
    endpoint: process.env.R2_ENDPOINT || undefined,
    region: 'auto',
  });
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin;
  const target = await store.createUploadUrl({
    key: staging,
    contentType: 'audio/wav',
    expiresInSeconds: 60,
  });
  const cors = await fetch(target.url, {
    method: 'OPTIONS',
    signal: AbortSignal.timeout(15000),
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  results.cors =
    cors.ok && [origin, '*'].includes(cors.headers.get('access-control-allow-origin'))
      ? 'passed'
      : 'failed';

  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  const text = (offset, value) =>
    [...value].forEach((letter, i) => {
      bytes[offset + i] = letter.charCodeAt(0);
    });
  text(0, 'RIFF');
  view.setUint32(4, 38, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, 2, true);
  const put = await fetch(target.url, {
    method: 'PUT',
    headers: target.headers,
    body: bytes,
    signal: AbortSignal.timeout(15000),
  });
  results.upload = put.status;
  ensure(put.ok, `R2 PUT returned HTTP ${put.status}.`);
  const head = await store.head(staging);
  ensure(head?.size === bytes.length && head.etag, 'R2 HEAD did not verify the temporary upload.');
  await store.copy(staging, final, head.etag);
  results.copy = 'passed';
  const finalHead = await store.head(final);
  ensure(finalHead?.size === bytes.length, 'The copied object size does not match.');
  const url = await store.createDownloadUrl({ key: final, expiresInSeconds: 60 });
  const get = await fetch(url, { signal: AbortSignal.timeout(15000) });
  results.playback = get.status;
  ensure(get.ok, `R2 GET returned HTTP ${get.status}.`);
  const downloaded = new Uint8Array(await get.arrayBuffer());
  ensure(
    downloaded.length === bytes.length && downloaded.every((value, i) => value === bytes[i]),
    'The copied bytes differ.',
  );
  const seek = await fetch(url, {
    headers: { Range: 'bytes=0-15' },
    signal: AbortSignal.timeout(15000),
  });
  results.seek = seek.status;
  ensure(seek.status === 206, 'R2 does not serve byte ranges for seeking.');
  await seek.body?.cancel();
  ensure(results.cors === 'passed', 'CORS does not allow uploads from NEXT_PUBLIC_SITE_URL.');
} catch (error) {
  results.error =
    error instanceof VerificationError
      ? error.message
      : 'R2 verification failed; check credentials, endpoint, connectivity and bucket permissions.';
  process.exitCode = 1;
} finally {
  if (store) {
    const cleanup = await Promise.allSettled([store.delete(staging), store.delete(final)]);
    results.cleanup = cleanup.every((result) => result.status === 'fulfilled')
      ? 'passed'
      : 'failed';
    if (results.cleanup === 'failed') process.exitCode = 1;
  }
}
console.log(JSON.stringify(results, null, 2));
