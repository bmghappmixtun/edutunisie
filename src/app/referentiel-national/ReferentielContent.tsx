'use client';

import { useEffect } from 'react';

/**
 * Client wrapper that injects static HTML and re-runs its inline scripts
 * (the original page is self-contained with vanilla JS for the tree
 * interactivity, search and filters).
 */
export default function ReferentielContent({ html }: { html: string }) {
  useEffect(() => {
    // Find any <script> tags rendered as text and re-execute them in the
    // current document scope so the page interacts correctly.
    const wrapper = document.getElementById('referentiel-body');
    if (!wrapper) return;

    const scripts = wrapper.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      // Copy attributes (e.g. type=module) if any
      for (const attr of Array.from(oldScript.attributes)) {
        newScript.setAttribute(attr.name, attr.value);
      }
      newScript.text = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [html]);

  return (
    <div
      id="referentiel-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
