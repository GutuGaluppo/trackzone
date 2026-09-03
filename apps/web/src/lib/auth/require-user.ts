import 'server-only';

import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export interface AuthenticatedContext {
  user: User;
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
}

/** For Server Components: guarantees a user or sends them to sign in. */
export async function requireUser(nextPath?: string): Promise<AuthenticatedContext> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const target = nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : '/sign-in';
    redirect(target);
  }

  return { user, supabase };
}

/**
 * For route handlers: returns the user or null. Callers decide the status code,
 * because "not signed in" and "not allowed" are different answers.
 */
export async function getOptionalUser(): Promise<{
  user: User | null;
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
}> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabase };
}
