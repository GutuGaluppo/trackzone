import 'server-only';

import { createR2Storage, type ObjectStorage } from '@trackzone/storage';
import { serverEnv } from '@/env';

let cached: ObjectStorage | null = null;

/** The single place the app is allowed to talk to object storage. */
export function storage(): ObjectStorage {
  if (!cached) {
    const env = serverEnv();
    cached = createR2Storage({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET,
      ...(env.R2_ENDPOINT ? { endpoint: env.R2_ENDPOINT } : {}),
    });
  }
  return cached;
}
