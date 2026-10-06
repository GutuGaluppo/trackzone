import { createDecipheriv, createCipheriv, randomBytes } from 'node:crypto';
import { buildOriginalKey } from '@trackzone/storage';
import { MAX_UPLOAD_BYTES, resolveAudioMimeType, sanitizeFilename } from '@trackzone/validation';
import { workerEnv } from './env.ts';
import { serviceClient, storage } from './clients.ts';

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope?: string;
}
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FILES_URL = 'https://www.googleapis.com/drive/v3/files';

function credentialKey(): Buffer {
  const raw = workerEnv().PROVIDER_CREDENTIALS_KEY;
  if (!raw) throw new Error('PROVIDER_CREDENTIALS_KEY is required for Google Drive imports.');
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('PROVIDER_CREDENTIALS_KEY must decode to 32 bytes.');
  return key;
}
function decryptTokens(value: string): GoogleTokens {
  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1')
    throw new Error('Stored provider credentials are malformed.');
  const [, iv, tag, ciphertext] = parts as [string, string, string, string];
  const decipher = createDecipheriv('aes-256-gcm', credentialKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8'),
  ) as GoogleTokens;
}
function encryptTokens(tokens: GoogleTokens): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', credentialKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}
async function refresh(tokens: GoogleTokens): Promise<GoogleTokens> {
  if (Date.parse(tokens.expiresAt) > Date.now() + 60_000) return tokens;
  const { GOOGLE_DRIVE_CLIENT_ID: clientId, GOOGLE_DRIVE_CLIENT_SECRET: clientSecret } =
    workerEnv();
  if (!clientId || !clientSecret)
    throw new Error('Google Drive OAuth credentials are not configured in the worker.');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refreshToken,
    }),
  });
  if (!response.ok) throw new Error(`Google Drive token refresh failed (HTTP ${response.status}).`);
  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token)
    throw new Error('Google Drive refresh response did not include an access token.');
  return {
    ...tokens,
    accessToken: json.access_token,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
  };
}
async function listAudio(accessToken: string): Promise<DriveFile[]> {
  const url = new URL(FILES_URL);
  url.searchParams.set('q', "mimeType contains 'audio/' and trashed = false");
  url.searchParams.set('pageSize', '1000');
  url.searchParams.set('fields', 'files(id,name,mimeType,size,modifiedTime,webViewLink)');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Google Drive file listing failed (HTTP ${response.status}).`);
  const json = (await response.json()) as { files?: DriveFile[] };
  return json.files ?? [];
}

export async function importGoogleDriveAudio(
  importId: string,
  enqueueProcessing: (audioFileId: string) => Promise<void>,
): Promise<{ imported: number; failed: number }> {
  const db = serviceClient();
  const { data: job, error: jobError } = await db
    .from('imports')
    .select('id, user_id, connection_id, status')
    .eq('id', importId)
    .eq('provider', 'google_drive')
    .maybeSingle();
  if (jobError) throw jobError;
  if (!job || job.status === 'cancelled' || job.status === 'completed')
    return { imported: 0, failed: 0 };
  if (!job.connection_id) throw new Error('Google Drive import has no connection.');
  await db.from('imports').update({ status: 'discovering' }).eq('id', job.id);
  const { data: credential, error: credentialError } = await db
    .schema('private')
    .from('provider_credentials')
    .select('encrypted_credentials')
    .eq('connection_id', job.connection_id)
    .maybeSingle();
  if (credentialError) throw credentialError;
  if (!credential) throw new Error('Google Drive credentials are missing.');
  const tokens = await refresh(decryptTokens(credential.encrypted_credentials));
  if (tokens.expiresAt !== decryptTokens(credential.encrypted_credentials).expiresAt)
    await db
      .schema('private')
      .from('provider_credentials')
      .update({ encrypted_credentials: encryptTokens(tokens), expires_at: tokens.expiresAt })
      .eq('connection_id', job.connection_id);
  const files = await listAudio(tokens.accessToken);
  await db
    .from('imports')
    .update({ status: 'running', total_items: files.length })
    .eq('id', job.id);
  let imported = 0;
  let failed = 0;
  for (const file of files) {
    const filename = sanitizeFilename(file.name);
    const mimeType = resolveAudioMimeType(filename, file.mimeType);
    const size = Number(file.size ?? '0');
    if (!mimeType || !Number.isSafeInteger(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
      failed++;
      continue;
    }
    const { data: item, error: itemError } = await db
      .from('import_items')
      .upsert(
        { import_id: job.id, provider_file_id: file.id, filename, status: 'pending' },
        { onConflict: 'import_id,provider_file_id', ignoreDuplicates: true },
      )
      .select('id, status')
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item || item.status === 'completed') continue;
    try {
      await db
        .from('import_items')
        .update({ status: 'running', error_code: null, error_message: null })
        .eq('id', item.id);
      const media = await fetch(`${FILES_URL}/${encodeURIComponent(file.id)}?alt=media`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        signal: AbortSignal.timeout(300_000),
      });
      if (!media.ok || !media.body)
        throw new Error(`Google Drive download failed (HTTP ${media.status}).`);
      const storageKey = buildOriginalKey({
        userId: job.user_id,
        uploadId: item.id,
        extension: filename.split('.').pop() ?? 'audio',
      });
      await storage().put(storageKey, media.body, mimeType);
      const { data: completed, error: completeError } = await db.rpc(
        'complete_google_drive_import_item',
        {
          p_import_item_id: item.id,
          p_storage_key: storageKey,
          p_filename: filename,
          p_mime_type: mimeType,
          p_file_size: size,
          p_source_metadata: {
            file_id: file.id,
            modified_time: file.modifiedTime ?? null,
            web_view_link: file.webViewLink ?? null,
          },
        },
      );
      if (completeError || !completed?.[0])
        throw completeError ?? new Error('Google Drive import could not be finalized.');
      await enqueueProcessing(completed[0].audio_file_id);
      imported++;
    } catch (error) {
      failed++;
      await db
        .from('import_items')
        .update({
          status: 'failed',
          error_code: 'provider_import_failed',
          error_message: error instanceof Error ? error.message.slice(0, 500) : 'Import failed.',
        })
        .eq('id', item.id);
      await db.from('imports').update({ failed_items: failed }).eq('id', job.id);
    }
  }
  await db
    .from('imports')
    .update({ status: 'completed', failed_items: failed, completed_at: new Date().toISOString() })
    .eq('id', job.id);
  return { imported, failed };
}
