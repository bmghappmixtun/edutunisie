'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import { reportClientError } from '@/lib/errors/client-reporter';
import { generateErrorReference } from '@/lib/errors/types';

/**
 * Global error boundary
 * Catches errors that occur in the root layout itself
 * This renders WITHOUT the layout (no Header/Footer)
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
      message: error.message || 'Unknown global error',
      stack: error.stack,
      component: 'app/global-error.tsx',
      action: 'render',
      severity: 'CRITICAL',
      data: { digest: error.digest },
    });
  }, [error]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <html lang="fr">
      <body style={{
        margin: 0,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
        minHeight: '100vh',
      }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fee2e2 0%, #fed7aa 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            }}>
              <AlertTriangle size={48} color="#dc2626" />
            </div>

            <h1 style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 12px',
            }}>
              Erreur critique
            </h1>

            <p style={{
              fontSize: '16px',
              color: '#475569',
              margin: '0 0 24px',
              lineHeight: 1.6,
            }}>
              L'application a rencontré un problème grave.
              Notre équipe a été notifiée et intervient en urgence.
            </p>

            <div style={{
              display: 'inline-block',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
            }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Référence
              </div>
              <code style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: 700, color: '#0EA5E9', letterSpacing: '0.1em' }}>
                {reference}
              </code>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => reset()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0EA5E9 0%, #0284c7 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '15px',
                  minHeight: '44px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
              >
                <RefreshCw size={20} />
                Réessayer
              </button>

              <button
                onClick={handleBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: 600,
                  border: '2px solid #e2e8f0',
                  cursor: 'pointer',
                  fontSize: '15px',
                  minHeight: '44px',
                }}
              >
                <ArrowLeft size={20} />
                Page précédente
              </button>

              <a
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: 600,
                  border: '2px solid #e2e8f0',
                  textDecoration: 'none',
                  fontSize: '15px',
                  minHeight: '44px',
                }}
              >
                <Home size={20} />
                Accueil
              </a>
            </div>

            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '32px' }}>
              Si le problème persiste, contactez <a href="mailto:contact@examanet.com" style={{ color: '#0EA5E9' }}>contact@examanet.com</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
