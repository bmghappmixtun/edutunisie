/**
 * Error logging endpoint
 * - POST: Log a new error (from client or server)
 * - GET: Health check
 */

import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/errors/logger';
import { generateErrorReference, ErrorReport } from '@/lib/errors/types';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<ErrorReport> & { breadcrumbs?: Array<{ type: string; timestamp: number; data: Record<string, unknown> }> };
    const { source, message, stack, url, method, userAgent, context, severity, breadcrumbs } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }
    if (!source || !['CLIENT', 'SERVER', 'BUILD', 'CRON', 'EXTERNAL'].includes(source)) {
      return NextResponse.json({ error: 'invalid source' }, { status: 400 });
    }

    // Try to identify the user (for client errors, may have session)
    let userId: string | undefined;
    let userEmail: string | undefined;
    try {
      const user = await getCurrentUser();
      if (user) {
        userId = user.id;
        userEmail = user.email;
      }
    } catch {
      // Auth not available
    }

    const result = await logError({
      reference: generateErrorReference(),
      source: source as any,
      severity: (severity as any) || 'ERROR',
      message,
      stack,
      url,
      method,
      userAgent: userAgent || req.headers.get('user-agent') || undefined,
      context: {
        ...context,
        userId,
        userEmail,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        referer: req.headers.get('referer') || undefined,
        breadcrumbs: breadcrumbs || undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      reference: result.reference,
      agentAlertSent: result.agentAlertSent,
    });
  } catch (err: any) {
    // Don't let the error reporter itself fail loudly
    console.error('[api/errors/log] Failed to process error report:', err);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'error-logger' });
}
