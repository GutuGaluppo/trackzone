import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_ENDPOINT: z.string().url().optional(),
  R2_REGION: z.string().min(1).default('auto'),
  GOOGLE_DRIVE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_DRIVE_CLIENT_SECRET: z.string().min(1).optional(),
  PROVIDER_CREDENTIALS_KEY: z.string().min(1).optional(),
});

let cached: z.infer<typeof schema> | null = null;

export function workerEnv() {
  cached ??= schema.parse(process.env);
  return cached;
}
