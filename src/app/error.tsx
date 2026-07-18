'use client';

import { useEffect } from 'react';
import ErrorDisplay from '@/components/errors/ErrorDisplay';
import { reportClientError } from '@/lib/errors/client-reporter';
import { generateErrorReference } from '@/lib/errors/types';

/**
 * Root error boundary
 * Catches unhandled errors in any page
 * Renders WITHOUT the main layout (simpler to avoid server-only imports)
 */
export default function GlobalError({
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
    <html lang="fr">
      <body style={{ margin: 0 }}>
        <ErrorDisplay
          reference={reference}
          title="Une erreur s'est produite"
          message="La page que vous cherchez a rencontré un problème. Notre équipe a été automatiquement notifiée et travaille à résoudre ce souci."
        />
      </body>
    </html>
  );
}
