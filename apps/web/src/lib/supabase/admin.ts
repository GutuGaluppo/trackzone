import 'server-only';

import { createServiceClient, type ServiceClient } from '@trackzone/database/service';
import { clientEnv } from '@/env';
import { serverEnv } from '@/env';

let cached: ServiceClient | null = null;

/**
 * Service-role client — bypasses RLS.
 *
 * Only for work the user cannot do under their own policies: verifying an
 * uploaded object, writing processing results, reading a public track for an
 * anonymous visitor. Every caller MUST authorize the request first, using
 * `@trackzone/database`'s decision helpers.
 */
export function createAdminSupabase(): ServiceClient {
  cached ??= createServiceClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
  );
  return cached;
}
