'use client';

import { useEffect } from 'react';

/**
 * Client wrapper that renders pre-extracted HTML and mounts its inline
 * scripts as proper <script> tags. We extract scripts on the server and
 * render them here (instead of putting them inside dangerouslySetInnerHTML
 * and re-executing them client-side) so that:
 *   1. The browser executes each script exactly once (no redeclaration
 *      errors when SSR + client re-injection both fire).
 *   2. Top-level `const`/`let` declarations don't collide between
 *      multiple script blocks.
 */
export default function ReferentielContent({
  html,
  scripts = [],
}: {
  html: string;
  scripts?: string[];
}) {
  useEffect(() => {
    // Some of the page logic wires up event listeners on DOM nodes that
    // exist at SSR time. The scripts above already run during hydration,
    // so this effect is intentionally a no-op placeholder for future
    // client-only side effects (e.g. lazy loaders, analytics).
  }, [html]);

  return (
    <>
      {/* Body HTML. Inline scripts are NOT children of this div — putting them
          here alongside `dangerouslySetInnerHTML` triggers React error #60
          ("Can only set one of `children` or `props.dangerouslySetInnerHTML`")
          on the production minified client, captured as ERR-SX7MS6 (2x on
          /fr/referentiel-national, 2026-08-26 nightly digest). The scripts
          are rendered as siblings below so they execute once during hydration
          and don't get re-injected into the innerHTML. */}
      <div id="referentiel-body" dangerouslySetInnerHTML={{ __html: html }} />
      {scripts.map((code, idx) => (
        // eslint-disable-next-line react/no-danger
        <script
          key={`ref-script-${idx}`}
          dangerouslySetInnerHTML={{ __html: code }}
        />
      ))}
    </>
  );
}
