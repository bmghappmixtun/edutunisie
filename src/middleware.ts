import { NextRequest, NextResponse } from 'next/server';

/**
 * Examanet Middleware — Locale Routing
 *
 * Handles AR URL routing: /ar/* URLs are rewritten to /* with locale=ar cookie.
 * - /ar/matieres → /matieres (internally) with locale=ar cookie set
 * - /matieres → stays as-is (French default)
 *
 * This is a REWRITE, not a redirect. URLs stay shareable.
 *
 * Priority order for determining locale:
 *   1. URL prefix (/ar/* → always 'ar')
 *   2. Cookie (if URL has no prefix)
 *   3. Accept-Language header (for first-time visitors)
 *   4. Default: 'fr'
 */

const AR_PREFIX = '/ar';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Skip middleware for API routes, static files, _next, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/enseignant') ||
    pathname.startsWith('/mon-compte') ||
    pathname.startsWith('/connexion') ||
    pathname.startsWith('/inscription') ||
    pathname.startsWith('/en-attente') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/verifier') ||
    pathname.startsWith('/invitation') ||
    pathname.includes('.')  // static files (favicon.ico, etc.)
  ) {
    return NextResponse.next();
  }

  // CASE 1: /ar/* URL — Arabic locale requested via URL
  if (pathname.startsWith(AR_PREFIX)) {
    // Strip /ar prefix to get the actual page path
    // /ar/matieres → /matieres
    // /ar/recherche?q=foo → /recherche?q=foo
    const newPathname = pathname.slice(AR_PREFIX.length) || '/';
    const url = request.nextUrl.clone();
    url.pathname = newPathname;

    // IMPORTANT: pass x-locale + x-pathname headers via request headers (not response)
    // This makes `headers()` in server components see the locale and pathname.
    // Some runtimes (e.g. generateMetadata context) don't propagate x-locale,
    // so we ALSO pass x-pathname so getServerLocale can detect /ar/* from URL.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-locale', 'ar');
    requestHeaders.set('x-pathname', pathname);

    // Rewrite with the modified request headers
    const response = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });

    // Set locale cookie for 1 year (for subsequent requests without /ar prefix)
    response.cookies.set('locale', 'ar', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });

    return response;
  }

  // CASE 2: Root URL on first visit — check Accept-Language
  // Don't do this for now to avoid surprising users; rely on cookie + manual switch

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all pages except API routes, static files, and _next assets
    '/((?!api|_next/static|_next/image|favicon.ico|icon-transparent.png|apple-touch-icon|robots.txt|sitemap.xml).*)',
  ],
};
