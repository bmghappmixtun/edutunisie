import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

/**
 * Next-intl middleware.
 *
 * Responsibilities:
 * - Detect locale from URL prefix, cookie, or Accept-Language
 * - Redirect bare URLs (e.g. /matieres) to /fr/matieres (default locale)
 * - Strip /ar/* to locale-internal routing (handled by [locale] segment)
 * - Set NEXT_LOCALE cookie for persistence
 *
 * The matcher excludes:
 * - /api/* (API routes don't need locale)
 * - /_next/* (Next.js internals)
 * - Files with extensions (favicon.ico, robots.txt, etc.)
 * - /admin, /enseignant, /connexion, /mon-compte, etc. (NOT localized - admin & auth pages stay FR only)
 */
export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames EXCEPT:
    // - /api/*, /_next/*, /_vercel/* (internals)
    // - Files with extensions (favicon.ico, robots.txt, etc.)
    // - Admin/auth pages that are NOT localized
    '/((?!api|_next|_vercel|admin|enseignant|connexion|inscription|en-attente|messages|verifier|invitation|mon-compte|.*\\..*).*)',
  ],
};
