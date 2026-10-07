import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@trackzone/types';

/**
 * Runs before every matched request. Two jobs:
 *   1. refresh the Supabase session cookie (Server Components cannot write cookies);
 *   2. keep unauthenticated visitors out of the workspace.
 *
 * This is a convenience gate, not the security boundary — that is RLS plus the
 * authorization checks in the route handlers.
 */

const WORKSPACE_PREFIXES = ['/library', '/collections', '/settings', '/shared'];
const AUTH_ROUTES = ['/sign-in', '/sign-up', '/forgot-password'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates the token with Supabase; getSession() would trust the
  // cookie as-is, which is not good enough for an access decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && WORKSPACE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/sign-in';
    redirect.searchParams.set('next', pathname);
    return NextResponse.redirect(redirect);
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/library';
    redirect.search = '';
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets. Audio bytes never pass through here:
     * the browser fetches them straight from R2 with a signed URL.
     */
    '/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
