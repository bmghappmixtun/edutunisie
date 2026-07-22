'use client';

import { useEffect, useState } from 'react';

interface ResourceAgeProps {
  /** ISO date string or Date object */
  publishedAt: string | Date | null | undefined;
  /** Server-computed timeAgo (e.g., "1sem", "2j", "hier"). Used as initial value
   *  to match the SSR HTML byte-for-byte and avoid hydration mismatches. */
  initialLabel: string;
}

/**
 * Renders a relative "time ago" label (e.g., "1sem", "2j", "hier").
 *
 * Why a client component?
 *   The server's `Date.now()` at request time is baked into the HTML. On the
 *   client, React hydrates from that HTML — but if the *server component* is
 *   ever re-executed on the client (e.g., during React's hydration error
 *   recovery path, or when a parent client boundary re-renders), the client's
 *   `Date.now()` would be used and the rendered text would diverge from the
 *   shipped HTML. That triggers React error #425 ("Text content does not match
 *   server-rendered HTML") and #422 ("Hydration error with recovery").
 *
 *   By keeping the *initial* render here identical to the server output and
 *   only updating the displayed label in a `useEffect`, we guarantee a clean
 *   hydration and let the time tick forward after the page is live.
 */
export default function ResourceAge({ publishedAt, initialLabel }: ResourceAgeProps) {
  const [label, setLabel] = useState(initialLabel);

  useEffect(() => {
    if (!publishedAt) return;
    // After mount, recompute on the client with the current time.
    setLabel(computeTimeAgo(publishedAt));
  }, [publishedAt]);

  // Same className as the original span to keep layout identical.
  return (
    <span className="text-[10px] text-slate-400" suppressHydrationWarning>
      {label}
    </span>
  );
}

/** Pure formatter — same logic as the previous server-side timeAgo(). */
function computeTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `${days}j`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  if (days < 365) return `${Math.floor(days / 30)}mois`;
  return `${Math.floor(days / 365)}an`;
}
