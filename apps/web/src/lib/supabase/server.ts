import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@trackzone/types';
import { clientEnv } from '@/env';

/**
 * Request-scoped client acting as the signed-in user. Reads and writes through
 * this client are enforced by RLS, so it is the default choice everywhere.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component: the session refresh already
            // happened in proxy.ts, so it is safe to ignore here.
          }
        },
      },
    },
  );
}
