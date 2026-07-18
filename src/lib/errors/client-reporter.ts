/**
 * Client-side error reporter
 * Reports browser errors to /api/errors/log
 */

interface ClientErrorReport {
  message: string;
  stack?: string;
  url?: string;
  component?: string;
  action?: string;
  data?: Record<string, unknown>;
  severity?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

let reportQueue: ClientErrorReport[] = [];
let isReporting = false;

async function flushQueue() {
  if (isReporting || reportQueue.length === 0) return;
  isReporting = true;

  while (reportQueue.length > 0) {
    const report = reportQueue.shift()!;
    try {
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'CLIENT', ...report }),
        keepalive: true,
      });
    } catch {
      // Re-queue on failure (best effort)
      reportQueue.push(report);
      break;
    }
  }

  isReporting = false;
}

/**
 * Report a client-side error to the server
 * Non-blocking, queued, retries on failure
 */
export function reportClientError(report: ClientErrorReport): void {
  if (typeof window === 'undefined') return;

  reportQueue.push({
    severity: 'ERROR',
    ...report,
    url: report.url || window.location.href,
  });

  // Flush after a microtask (avoid recursive reporting)
  setTimeout(flushQueue, 0);
}

/**
 * Install global error handlers
 * Catches: window.onerror, unhandledrejection, console.error
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  // 1. Unhandled errors
  window.addEventListener('error', (event) => {
    reportClientError({
      message: event.message,
      stack: event.error?.stack,
      component: 'window.onerror',
      action: 'unhandled',
    });
  });

  // 2. Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason;
    reportClientError({
      message: err?.message || String(err),
      stack: err?.stack,
      component: 'unhandledrejection',
      action: 'promise',
    });
  });

  // 3. Catch React errors via custom hook (used by error.tsx boundaries)
  // This is handled separately by error.tsx files
}
