import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@trackzone/types';

export type ServiceClient = SupabaseClient<Database>;

/**
 * Service-role client. It bypasses RLS entirely, so it must never be
 * constructed in code that can reach the browser bundle, and every caller is
 * responsible for performing its own authorization check first.
 *
 * Used by: background processing (worker) and the few API routes that must
 * write on behalf of a user after the route has already authorized them.
 */
export function createServiceClient(url: string, serviceRoleKey: string): ServiceClient {
  if (!url || !serviceRoleKey) {
    throw new Error('createServiceClient requires a Supabase URL and service role key');
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'trackzone-service' } },
  });
}
