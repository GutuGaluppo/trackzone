import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const envPath = fileURLToPath(new URL('../apps/web/.env.local', import.meta.url));
const isLocal = (value) => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname);

try {
  let env = readFileSync(envPath, 'utf8');
  const configuredUrl = env.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^"'\s]+)["']?\s*$/m)?.[1];
  if (!configuredUrl || !isLocal(configuredUrl)) {
    throw new Error(
      'Local storage setup requires NEXT_PUBLIC_SUPABASE_URL to point to your local Supabase. No configuration was changed.',
    );
  }
  const status = JSON.parse(
    execFileSync('supabase', ['status', '-o', 'json'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
  if (
    !isLocal(status.API_URL) ||
    !isLocal(status.STORAGE_S3_URL) ||
    new URL(configuredUrl).port !== new URL(status.API_URL).port
  ) {
    throw new Error('The configured Supabase does not match the running local instance.');
  }
  if (
    !status.S3_PROTOCOL_ACCESS_KEY_ID ||
    !status.S3_PROTOCOL_ACCESS_KEY_SECRET ||
    !status.SERVICE_ROLE_KEY
  ) {
    throw new Error(
      'Local S3 credentials are unavailable. Enable storage.s3_protocol and start Supabase.',
    );
  }

  const bucket = 'trackzone-audio';
  const bucketUrl = `${status.API_URL}/storage/v1/bucket`;
  const headers = {
    apikey: status.SERVICE_ROLE_KEY,
    Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
    'content-type': 'application/json',
  };
  const existing = await fetch(`${bucketUrl}/${bucket}`, { headers });
  if (!existing.ok && existing.status !== 404 && existing.status !== 400) {
    throw new Error(`Could not check the local audio bucket (HTTP ${existing.status}).`);
  }
  const exists = existing.ok;
  const response = await fetch(exists ? `${bucketUrl}/${bucket}` : bucketUrl, {
    method: exists ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: false,
      file_size_limit: 2 * 1024 * 1024 * 1024,
    }),
  });
  if (!response.ok)
    throw new Error(
      `Could not configure the private local audio bucket (HTTP ${response.status}).`,
    );

  const values = {
    R2_ACCOUNT_ID: 'local-supabase',
    R2_ACCESS_KEY_ID: status.S3_PROTOCOL_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: status.S3_PROTOCOL_ACCESS_KEY_SECRET,
    R2_BUCKET: bucket,
    R2_ENDPOINT: status.STORAGE_S3_URL,
    R2_REGION: status.S3_PROTOCOL_REGION || 'local',
  };
  for (const [name, value] of Object.entries(values)) {
    const line = `${name}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^${name}\\s*=.*$`, 'm');
    env = pattern.test(env) ? env.replace(pattern, () => line) : `${env.trimEnd()}\n${line}\n`;
  }
  writeFileSync(envPath, env, { mode: 0o600 });
  console.log(
    'Private local audio storage configured. Restart the web app to load the updated environment.',
  );
  console.log(
    'Audio files stay in your local Supabase Docker volume. Cloudflare R2 credentials are required for an R2 deployment.',
  );
} catch (error) {
  // Subprocess output may contain credentials; never print the raw error or status.
  console.error(
    error?.code !== undefined
      ? 'Could not read local Supabase status. Start Docker and run supabase start, then retry.'
      : error.message,
  );
  process.exitCode = 1;
}
