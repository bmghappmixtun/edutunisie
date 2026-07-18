/**
 * Test error endpoint — DELETE THIS after testing
 * Triggers different error types to verify error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/errors/with-error-handler';
import { logError } from '@/lib/errors/logger';
import { generateErrorReference } from '@/lib/errors/types';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ?type=db — triggers a database error
// ?type=server — triggers a server error
// ?type=email — triggers an error and sends email
export const GET = withErrorHandler(async (req: NextRequest) => {
  const type = req.nextUrl.searchParams.get('type') || 'server';

  if (type === 'db') {
    // Simulate DB error
    const result = await prisma.$queryRaw`SELECT * FROM nonexistent_table_${Date.now()}`;
    return NextResponse.json({ result });
  }

  if (type === 'email') {
    // Trigger an error and email the admin
    await logError({
      reference: generateErrorReference(),
      source: 'SERVER',
      severity: 'CRITICAL',
      message: 'TEST: This is a test error from /api/test-error',
      stack: 'Test stack trace\n  at test() in route.ts',
      url: req.url,
      context: {
        userEmail: 'admin@examanet.com', // Test email
        action: 'test',
      },
      sendEmail: true,
    });
    return NextResponse.json({ ok: true, message: 'Test error logged' });
  }

  if (type === 'unhandled') {
    // Trigger an unhandled exception
    throw new Error('TEST: Unhandled server error for error handling verification');
  }

  return NextResponse.json({ ok: true, hint: 'Use ?type=db|server|email|unhandled' });
}, { action: 'test-error' });
