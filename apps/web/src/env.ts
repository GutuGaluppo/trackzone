import { z } from 'zod';

/**
 * Environment validation.
 *
 * Server secrets are read lazily through `serverEnv()` so that importing this
 * module from a client component can never pull a secret into the bundle, and
 * so a missing variable fails loudly at the call site rather than silently
 * producing `undefined` deep inside a signing routine.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

/** Optional string that treats an empty value as "not set". */
const optionalSecret = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  R2_ACCOUNT_ID: z.string().min(1, 'R2_ACCOUNT_ID is required'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
  R2_BUCKET: z.string().min(1, 'R2_BUCKET is required'),
  R2_ENDPOINT: z.string().url().optional(),
  R2_REGION: z.string().min(1).default('auto'),
  /** Optional: without it, background processing enqueue is skipped, not fatal. */
  TRIGGER_SECRET_KEY: z.string().min(1).optional(),

  /**
   * SoundCloud connection (docs §20 Phase 7). All three must be present for the
   * integration to switch on; any missing (or blank) and `soundcloudConfig()`
   * returns null and the feature stays dormant. `PROVIDER_CREDENTIALS_KEY` is a
   * 32-byte key (base64 or hex) used to encrypt stored OAuth tokens at rest.
   * `''` is normalized to "unset" so a blank line in `.env` doesn't fail boot.
   */
  SOUNDCLOUD_CLIENT_ID: optionalSecret,
  SOUNDCLOUD_CLIENT_SECRET: optionalSecret,
  GOOGLE_DRIVE_CLIENT_ID: optionalSecret,
  GOOGLE_DRIVE_CLIENT_SECRET: optionalSecret,
  PROVIDER_CREDENTIALS_KEY: optionalSecret,
});

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function parse<T>(
  schema: z.ZodType<T>,
  source: Record<string, string | undefined>,
  kind: string,
): T {
  const result = schema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues.map((issue) => `  - ${issue.message}`).join('\n');
    throw new Error(`Invalid ${kind} environment:\n${details}\n\nSee apps/web/.env.example`);
  }

  return result.data;
}

// Referenced explicitly so Next inlines them into the client bundle.
export const clientEnv: ClientEnv = parse(
  clientSchema,
  {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  'client',
);

let cachedServerEnv: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() was called in the browser. Secrets stay on the server.');
  }

  cachedServerEnv ??= parse(serverSchema, process.env, 'server');
  return cachedServerEnv;
}
