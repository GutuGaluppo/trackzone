/**
 * Minimal env so `@/env` can be imported in unit tests. Real values are never
 * needed here — tests that exercise configured behaviour stub their own via
 * `vi.stubEnv` + `vi.resetModules`.
 */
const DEFAULTS: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  R2_ACCOUNT_ID: 'test-account',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_BUCKET: 'test-bucket',
  PROVIDER_CREDENTIALS_KEY: Buffer.alloc(32, 7).toString('base64'),
};

for (const [name, value] of Object.entries(DEFAULTS)) {
  process.env[name] ??= value;
}
