'use client';

import { useEffect } from 'react';
import ErrorDisplay from '@/components/errors/ErrorDisplay';
import { reportClientError } from '@/lib/errors/client-reporter';
import { generateErrorReference } from '@/lib/errors/types';

/**
 * Root error boundary
 * Catches unhandled errors in any page.
 *
 * IMPORTANT: This renders INSIDE the root layout (which already provides
 * <html> and <body>). Do NOT return <html>/<body> here — only `global-error.tsx`
 * renders without the layout, and only it should return the full document.
 *
 * Returning <html><body> from this file caused React #419 hydration mismatches
 * (nested <html>/<body> tags), which is why `notFound()` flows on
 * `/professeurs/[numericId]/[slug]` were erroring in the browser.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reference = error.digest || generateErrorReference();

  useEffect(() => {
    reportClientError({
      message: error.message || 'Unknown error',
      stack: error.stack,
      component: 'app/error.tsx',
      action: 'render',
      data: { digest: error.digest },
    });
  }, [error]);

  return (
    <ErrorDisplay
      reference={reference}
      title="Une erreur s'est produite"
      message="La page que vous cherchez a rencontré un problème. Notre équipe a été automatiquement notifiée et travaille à résoudre ce souci."
    />
  );
}
