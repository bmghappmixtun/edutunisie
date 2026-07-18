'use client';

import { useEffect } from 'react';

/**
 * Service Worker registration
 * Only registers in production. In dev, HMR + SW can conflict.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // In dev, optionally unregister any existing SW
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
      return;
    }

    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none', // Always check for updates
        });

        // Listen for waiting worker (new version installed)
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version ready — auto-activate after 5s
              console.info('[SW] New version installed. Refresh to update.');
              setTimeout(() => {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }, 5000);
            }
          });
        });

        // Reload page when new SW takes over
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      } catch (err) {
        console.error('[SW] Registration failed:', err);
      }
    };

    // Register after page load to not block initial render
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
