/**
 * Server-side error logger
 * Logs errors to the database + sends email + notifies agent
 *
 * Usage:
 *   import { logError } from '@/lib/errors/logger';
 *   await logError({
 *     source: 'SERVER',
 *     message: 'Database connection failed',
 *     stack: error.stack,
 *     url: req.url,
 *     userId: session?.user?.id,
 *     context: { component: 'ressources', query: searchParams },
 *   });
 */

import { prisma } from '@/lib/prisma';
import { sendErrorEmail } from './email';
import { notifyAgent } from './notify';
import {
  ErrorReport,
  ErrorSource,
  ErrorSeverity,
  generateErrorReference,
} from './types';

interface LogResult {
  reference: string;
  errorId: string;
  emailSent: boolean;
  agentNotified: boolean;
}

/**
 * Log an error to the database
 * - Always saves to DB
 * - Sends email to user (if userId provided AND sendEmail !== false)
 * - Notifies agent (for ERROR/CRITICAL severity)
 */
export async function logError(report: ErrorReport): Promise<LogResult> {
  const reference = report.reference || generateErrorReference();
  const severity = report.severity || 'ERROR';
  const source: ErrorSource = report.source;
  const shouldEmail = report.sendEmail !== false && !!report.context?.userEmail;
  const shouldNotifyAgent = severity === 'ERROR' || severity === 'CRITICAL';

  let errorId = '';
  let emailSent = false;
  let agentNotified = false;
  let userEmail: string | undefined;

  try {
    // 1. Save to database
    const errorLog = await prisma.errorLog.create({
      data: {
        reference,
        source,
        severity,
        message: report.message.slice(0, 1000), // Truncate to fit
        stack: report.stack?.slice(0, 5000), // Truncate stack
        url: report.url,
        method: report.method,
        userAgent: report.userAgent,
        userId: report.context?.userId as string | undefined,
        userEmail: report.context?.userEmail as string | undefined,
        context: (report.context || {}) as any,
        emailSent: shouldEmail,
        emailedAt: shouldEmail ? new Date() : null,
        agentNotified: shouldNotifyAgent,
        agentNotifiedAt: shouldNotifyAgent ? new Date() : null,
      },
    });
    errorId = errorLog.id;
    userEmail = (report.context?.userEmail as string) || undefined;
  } catch (dbErr) {
    // Database write failed — log to console as fallback
    console.error('[error-logger] Failed to save error to DB:', dbErr);
    console.error('[error-logger] Original error:', {
      reference,
      source,
      severity,
      message: report.message,
      url: report.url,
    });
  }

  // 2. Send email (async, don't block)
  if (shouldEmail && userEmail) {
    try {
      await sendErrorEmail({
        to: userEmail,
        reference,
        message: report.message,
        url: report.url,
        severity,
        source,
        stack: report.stack,
        context: report.context,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error('[error-logger] Failed to send email:', emailErr);
    }
  }

  // 3. Notify agent (async, don't block)
  if (shouldNotifyAgent) {
    try {
      await notifyAgent({
        reference,
        message: report.message,
        severity,
        source,
        url: report.url,
        userEmail,
      });
      agentNotified = true;
    } catch (notifyErr) {
      console.error('[error-logger] Failed to notify agent:', notifyErr);
    }
  }

  return { reference, errorId, emailSent, agentNotified };
}

/**
 * Convenience wrapper for API routes
 * Catches errors, logs them, returns user-friendly response
 */
export async function withErrorHandler<T>(
  fn: () => Promise<T>,
  context: {
    req?: Request;
    userId?: string;
    userEmail?: string;
    action?: string;
  } = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string; reference: string }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err: any) {
    const reference = generateErrorReference();
    console.error(`[${reference}] ${context.action || 'API error'}:`, err);

    // Log to DB + email + agent
    await logError({
      reference,
      source: 'SERVER',
      severity: 'ERROR',
      message: err?.message || 'Unknown error',
      stack: err?.stack,
      url: context.req?.url,
      method: context.req?.method,
      userAgent: context.req?.headers.get('user-agent') || undefined,
      context: {
        userId: context.userId,
        userEmail: context.userEmail,
        action: context.action,
      },
    });

    return {
      ok: false,
      error: 'Une erreur est survenue. Réessayez ou contactez le support si le problème persiste.',
      reference,
    };
  }
}
