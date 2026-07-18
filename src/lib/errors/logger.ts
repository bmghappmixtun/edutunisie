/**
 * Server-side error logger
 * Logs errors to the database + sends user email + sends agent alert

Flow:
- Always: save to DB
- If user identified (userId/userEmail in context): send user-friendly email
- Always: send technical agent alert email
- Always: console.error to Vercel logs (for Vercel Anomaly Detection)
 */

import { prisma } from '@/lib/prisma';
import { sendErrorEmail, sendAgentAlert } from './email';
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
  agentAlertSent: boolean;
  agentNotified: boolean;
}

export async function logError(report: ErrorReport): Promise<LogResult> {
  const reference = report.reference || generateErrorReference();
  const severity = report.severity || 'ERROR';
  const source: ErrorSource = report.source;
  const shouldEmailUser = report.sendEmail !== false && !!report.context?.userEmail;
  const shouldAlertAgent = severity === 'ERROR' || severity === 'CRITICAL' || report.context?.alertAgent === true;

  let errorId = '';
  let userEmail: string | undefined;
  let userId: string | undefined;
  let emailSent = false;
  let agentAlertSent = false;
  let agentNotified = false;

  // Extract user info from context
  userEmail = (report.context?.userEmail as string) || undefined;
  userId = (report.context?.userId as string) || undefined;

  // 1. Save to database
  try {
    const errorLog = await prisma.errorLog.create({
      data: {
        reference,
        source,
        severity,
        message: report.message.slice(0, 1000),
        stack: report.stack?.slice(0, 5000),
        url: report.url,
        method: report.method,
        userAgent: report.userAgent,
        userId,
        userEmail,
        context: (report.context || {}) as any,
        emailSent: shouldEmailUser,
        emailedAt: shouldEmailUser ? new Date() : null,
        agentNotified: shouldAlertAgent,
        agentNotifiedAt: shouldAlertAgent ? new Date() : null,
      },
    });
    errorId = errorLog.id;
  } catch (dbErr) {
    console.error('[error-logger] Failed to save error to DB:', dbErr);
    console.error('[error-logger] Original error:', {
      reference, source, severity, message: report.message, url: report.url,
    });
  }

  // 2. Send USER email (only if user identified AND they want it)
  if (shouldEmailUser && userEmail) {
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
      console.error('[error-logger] Failed to send user email:', emailErr);
    }
  }

  // 3. Send AGENT alert (technical, for the operator/owner)
  if (shouldAlertAgent) {
    try {
      await sendAgentAlert({
        reference,
        message: report.message,
        stack: report.stack,
        url: report.url,
        method: report.method,
        userAgent: report.userAgent,
        userId,
        userEmail,
        severity,
        source,
        context: report.context,
        region: report.context?.region as string | undefined,
        requestId: report.context?.requestId as string | undefined,
      });
      agentAlertSent = true;
    } catch (alertErr) {
      console.error('[error-logger] Failed to send agent alert:', alertErr);
    }
  }

  // 4. Always log to console (Vercel will pick this up)
  console.error('[ERROR]', {
    reference,
    severity,
    source,
    message: report.message,
    url: report.url,
    userId,
    userEmail,
    emailSent,
    agentAlertSent,
  });

  // 5. Notify via mavis (future: poll queue)
  if (shouldAlertAgent) {
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

  return { reference, errorId, emailSent, agentAlertSent, agentNotified };
}

// withErrorHandler wrapper stays the same
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
      sendEmail: !!context.userEmail,
    });

    return {
      ok: false,
      error: 'Une erreur est survenue. Réessayez ou contactez le support si le problème persiste.',
      reference,
    };
  }
}
