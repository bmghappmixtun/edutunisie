import { NextRequest } from 'next/server';

/**
 * Build an absolute URL relative to the incoming request's origin.
 * Uses the request's URL first (works in dev + prod without env vars),
 * falls back to NEXT_PUBLIC_APP_URL, then to NEXTAUTH_URL, and finally to localhost.
 */
export function getRequestOrigin(req: NextRequest): string {
  try {
    return new URL(req.url).origin;
  } catch {
    // ignore — fall through
  }
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
