import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@trackzone/types';

/**
 * Integration-test helpers for a real (local) Supabase/Postgres instance.
 * Every exported test in this directory skips itself when these env vars are
 * absent, so `pnpm test` never requires a live database — only
 * `pnpm test:integration`, run against `supabase start`, does.
 */

export function integrationEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) return null;
  return { url, anonKey, serviceRoleKey };
}

export function adminClient(): SupabaseClient<Database> {
  const env = integrationEnv();
  if (!env) throw new Error('Integration env not configured');
  return createClient<Database>(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient<Database> {
  const env = integrationEnv();
  if (!env) throw new Error('Integration env not configured');
  return createClient<Database>(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient<Database>;
}

let counter = 0;

/** Creates a confirmed user and returns a client already signed in as them. */
export async function createTestUser(usernameSeed: string): Promise<TestUser> {
  counter += 1;
  const admin = adminClient();
  const email = `${usernameSeed}-${Date.now()}-${counter}@example.test`;
  const password = 'correct horse battery staple';

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: usernameSeed },
  });
  if (error) throw error;

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { id: data.user.id, email, client };
}

export async function deleteTestUser(userId: string): Promise<void> {
  await adminClient().auth.admin.deleteUser(userId);
}
