import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase/env';

/** Paths reachable signed out. `/auth/*` must stay open — it is how a session
 *  is established in the first place, so gating it would deadlock sign-in. */
function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/auth/');
}

/**
 * Moves refreshed auth cookies onto a response that replaces the pass-through
 * one, so a token rotated during this request is not lost when the request is
 * turned away instead of forwarded.
 *
 * Only cookies are copied, never the headers. `NextResponse.next()` carries
 * internal `x-middleware-*` headers that mean "continue to the route" — copy
 * those onto a 401 and Next runs the route anyway, ignoring the status and
 * body entirely.
 */
function withAuthCookies(target: NextResponse, source: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

/**
 * Two jobs on every matched request: refresh the Supabase session, and turn
 * away anyone who isn't signed in.
 *
 * The refresh writes rotated auth cookies onto the response. Server Components
 * cannot set cookies, so without this the refresh token never rotates and
 * sessions die early.
 *
 * The gate redirects signed-out visitors to `/login`, carrying the path they
 * asked for as `next` so sign-in returns them there. Enforcing it here rather
 * than in the client means no frame of the app renders before the redirect.
 * RLS still independently protects the data — this gate is about the UI, and a
 * cookie check alone is never what keeps rows safe.
 *
 * With no Supabase project configured the gate is skipped entirely: there is
 * nothing to sign into, so the app stays fully usable local-only rather than
 * bouncing to a login form that cannot work.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!SUPABASE_URL || !SUPABASE_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Responses carrying auth cookies must never be cached by a CDN or
        // one user's tokens can be served to another.
        for (const [header, headerValue] of Object.entries(headers)) {
          response.headers.set(header, headerValue);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (user || isPublicPath(pathname)) return response;

  // A fetch that follows a redirect to /login receives HTML and fails on
  // JSON.parse, hiding the real cause. API routes get a status instead.
  if (pathname.startsWith('/api/')) {
    return withAuthCookies(
      NextResponse.json(
        { error: 'unauthorized', message: 'Sign in to use this endpoint.' },
        { status: 401 }
      ),
      response
    );
  }

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', pathname);
  return withAuthCookies(NextResponse.redirect(loginUrl), response);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — those never carry a
     * session and refreshing on them wastes a round trip per asset.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
