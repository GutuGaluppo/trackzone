import { createServiceClient, type ServiceClient } from '@trackzone/database/service';
import { createR2Storage, type ObjectStorage } from '@trackzone/storage';
import { workerEnv } from './env.ts';

let db: ServiceClient | null = null;
let objectStorage: ObjectStorage | null = null;

/** The worker only ever runs with elevated trust: it authorizes nothing, it processes what the web app already authorized. */
export function serviceClient(): ServiceClient {
  const env = workerEnv();
  db ??= createServiceClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  return db;
}

export function storage(): ObjectStorage {
  const env = workerEnv();
  objectStorage ??= createR2Storage({
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET,
    region: env.R2_REGION,
    ...(env.R2_ENDPOINT ? { endpoint: env.R2_ENDPOINT } : {}),
  });
  return objectStorage;
}
