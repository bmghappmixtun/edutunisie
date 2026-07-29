'use client';

import { useEffect, useRef } from 'react';
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
 *
 * ChunkLoadError auto-recovery (fixes ERR-NPNKS9, ERR-P975Q5, ERR-C6EGKC
 * in 2026-07-29 nightly digest — 6 ChunkLoadError events on
 * /professeurs/1474/boufares-amor and /ressources/11972/...):
 *   When the browser has a stale _next/static/chunks/.../[hash].js reference
 *   (after a deploy swaps the chunk hash), the dynamic import fails with
 *   `Loading chunk N failed`. We detect this error name and auto-reload
 *   the page exactly ONCE per error — a force-reload picks up the new
 *   chunk hashes from the fresh HTML. We guard against reload loops by
 *   only firing once per error instance.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reference = error.digest || generateErrorReference();
  const didAutoReload = useRef(false);

  // ChunkLoadError: stale chunk after deploy — force a full reload to
  // pick up the new _next/static/chunks/* hashes. The fresh HTML will
  // reference the new chunk filenames, so the same import won't fail.
  const isChunkLoadError =
    error.name === 'ChunkLoadError' ||
    /Loading chunk \d+ failed/i.test(error.message || '');

  useEffect(() => {
    if (isChunkLoadError && !didAutoReload.current) {
      didAutoReload.current = true;
      // Small delay so the error gets reported first (avoids a race with
      // the beacon POST being cancelled by the reload).
      const t = setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 250);
      return () => clearTimeout(t);
    }
  }, [isChunkLoadError]);

  useEffect(() => {
    reportClientError({
      message: error.message || 'Unknown error',
      stack: error.stack,
      component: 'app/error.tsx',
      action: 'render',
      data: { digest: error.digest, isChunkLoadError },
    });
  }, [error, isChunkLoadError]);

  if (isChunkLoadError) {
    return (
      <ErrorDisplay
        reference={reference}
        title="Mise à jour en cours…"
        message="Le site vient d'être mis à jour. Nous rechargeons automatiquement la page avec la dernière version."
      />
    );
  }

  return (
    <ErrorDisplay
      reference={reference}
      title="Une erreur s'est produite"
      message="La page que vous cherchez a rencontré un problème. Notre équipe a été automatiquement notifiée et travaille à résoudre ce souci."
    />
  );
}
