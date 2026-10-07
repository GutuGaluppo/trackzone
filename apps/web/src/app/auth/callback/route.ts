import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

function safeNextPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/reset-password';
}

/** Exchanges Supabase's single-use recovery code for the short-lived recovery session. */
export async function GET(request: NextRequest) {
  const redirect = new URL(safeNextPath(request.nextUrl.searchParams.get('next')), request.url);
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    redirect.pathname = '/forgot-password';
    redirect.searchParams.set('error', 'invalid-link');
    return NextResponse.redirect(redirect);
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    redirect.pathname = '/forgot-password';
    redirect.searchParams.set('error', 'invalid-link');
  }
  return NextResponse.redirect(redirect);
}
