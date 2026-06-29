'use client';

import { Analytics } from '@vercel/analytics/react';
import { useEffect, useState } from 'react';
import { EyeOff, Eye } from 'lucide-react';

/**
 * Wraps Vercel Analytics with an opt-out toggle.
 *
 * Vercel Analytics natively respects the `va-disable` cookie.
 * If that cookie is present (set via the toggle below), Analytics is
 * NOT rendered and no events are sent.
 *
 * Cookie is set with `max-age=31536000` (1 year), `SameSite=Lax`,
 * `Path=/`. This applies to ALL future visits from this browser.
 */
export default function AnalyticsWithOptOut() {
  const [optedOut, setOptedOut] = useState<boolean | null>(null);

  useEffect(() => {
    // Read initial state from cookie
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('va-disable='))
      ?.split('=')[1];
    setOptedOut(cookieValue === 'true');
  }, []);

  function toggle() {
    if (optedOut) {
      // Re-enable: clear cookie
      document.cookie = 'va-disable=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
      setOptedOut(false);
    } else {
      // Opt out: set cookie for 1 year
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `va-disable=true; expires=${expires}; path=/; SameSite=Lax`;
      setOptedOut(true);
    }
  }

  // Only render Analytics if not opted out
  if (optedOut === null) return null; // SSR-safe: don't render until we know
  if (optedOut) {
    // Render a small status badge so user knows analytics is OFF
    return (
      <>
        <AnalyticsStatusBadge optedOut onToggle={toggle} />
        {/* No <Analytics /> — fully disabled */}
      </>
    );
  }

  return (
    <>
      <Analytics />
      <AnalyticsStatusBadge optedOut={false} onToggle={toggle} />
    </>
  );
}

function AnalyticsStatusBadge({
  optedOut,
  onToggle,
}: {
  optedOut: boolean;
  onToggle: () => void;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on dev (localhost) so production visitors don't see this
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg transition ${
        optedOut
          ? 'bg-amber-500 text-white hover:bg-amber-600'
          : 'bg-slate-900 text-white hover:bg-slate-800'
      }`}
      title={optedOut ? 'Analytics désactivé sur ce navigateur' : 'Analytics actif — cliquer pour désactiver'}
    >
      {optedOut ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      <span>Analytics {optedOut ? 'OFF' : 'ON'}</span>
    </button>
  );
}