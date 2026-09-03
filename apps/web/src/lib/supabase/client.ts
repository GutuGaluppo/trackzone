'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@trackzone/types';
import { clientEnv } from '@/env';

/**
 * Browser client. Carries the anon key only — every query it makes is subject
 * to Row Level Security, which is the point.
 */
export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
