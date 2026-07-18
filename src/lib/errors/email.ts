/**
 * Send error email to user via Resend
 * Beautiful HTML template with error details + reference ID
 */

import { Resend } from 'resend';
import { ErrorSeverity, ErrorSource } from './types';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface ErrorEmailParams {
  to: string;
  reference: string;
  message: string;
  url?: string;
  severity: ErrorSeverity;
  source: ErrorSource;
  stack?: string;
  context?: Record<string, unknown>;
}

const SEVERITY_COLORS: Record<ErrorSeverity, { bg: string; text: string; label: string }> = {
  DEBUG: { bg: '#f1f5f9', text: '#475569', label: 'Debug' },
  INFO: { bg: '#dbeafe', text: '#1e40af', label: 'Info' },
  WARNING: { bg: '#fef3c7', text: '#a16207', label: 'Avertissement' },
  ERROR: { bg: '#fee2e2', text: '#b91c1c', label: 'Erreur' },
  CRITICAL: { bg: '#7f1d1d', text: '#ffffff', label: 'Critique' },
};

const SOURCE_LABELS: Record<ErrorSource, string> = {
  CLIENT: 'Navigateur',
  SERVER: 'Serveur',
  BUILD: 'Build',
  CRON: 'Tâche planifiée',
  EXTERNAL: 'Service externe',
};

export async function sendErrorEmail(params: ErrorEmailParams): Promise<boolean> {
  if (!resend) {
    console.warn('[error-email] Resend not configured, skipping email');
    return false;
  }

  const sev = SEVERITY_COLORS[params.severity] || SEVERITY_COLORS.ERROR;
  const srcLabel = SOURCE_LABELS[params.source] || params.source;
  const now = new Date().toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Erreur Examanet — ${params.reference}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0EA5E9 0%,#6366F1 100%);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:48px;margin-bottom:8px;">⚠️</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Une erreur s'est produite</h1>
              <p style="margin:8px 0 0;color:#e0f2fe;font-size:14px;">Notre équipe a été notifiée automatiquement</p>
            </td>
          </tr>

          <!-- Reference + Severity -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background-color:${sev.bg};color:${sev.text};padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
                      ${sev.label}
                    </span>
                    <span style="display:inline-block;background-color:#f1f5f9;color:#475569;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;margin-left:8px;">
                      ${srcLabel}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Error message -->
          <tr>
            <td style="padding:24px 32px 0;">
              <h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Message</h2>
              <div style="background-color:#f8fafc;border-left:3px solid #ef4444;padding:12px 16px;border-radius:4px;font-family:'SF Mono',Monaco,monospace;font-size:13px;color:#0f172a;line-height:1.5;word-break:break-word;">
                ${params.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
              </div>
            </td>
          </tr>

          <!-- Reference ID -->
          <tr>
            <td style="padding:20px 32px 0;">
              <h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Référence</h2>
              <div style="background-color:#f1f5f9;padding:12px 16px;border-radius:4px;font-family:'SF Mono',Monaco,monospace;font-size:18px;font-weight:600;color:#0EA5E9;letter-spacing:0.1em;">
                ${params.reference}
              </div>
              <p style="margin:8px 0 0;font-size:12px;color:#64748b;">Gardez cette référence si vous nous contactez — elle nous permet de retrouver l'erreur immédiatement.</p>
            </td>
          </tr>

          ${params.url ? `
          <!-- Where it happened -->
          <tr>
            <td style="padding:20px 32px 0;">
              <h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Où</h2>
              <div style="background-color:#f8fafc;padding:12px 16px;border-radius:4px;font-family:'SF Mono',Monaco,monospace;font-size:12px;color:#475569;word-break:break-all;">
                ${params.url}
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Timestamp -->
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                🕐 ${now}
              </p>
            </td>
          </tr>

          <!-- What to do -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0f172a;">Que faire ?</h2>
              <ul style="margin:0;padding-left:20px;color:#475569;line-height:1.8;">
                <li>Réessayez de recharger la page</li>
                <li>Si l'erreur persiste, revenez en arrière et réitérez votre action</li>
                <li>Contactez-nous à <a href="mailto:contact@examanet.com" style="color:#0EA5E9;text-decoration:none;font-weight:500;">contact@examanet.com</a> en mentionnant la référence <strong>${params.reference}</strong></li>
              </ul>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Examanet — La plateforme pédagogique #1 en Tunisie 🇹🇳<br>
                Cet email a été envoyé automatiquement. Vous le recevez car vous êtes inscrit sur Examanet.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Examanet <noreply@examanet.com>',
      to: params.to,
      subject: `[${params.reference}] Erreur sur Examanet`,
      html,
    });
    return !!result.data?.id;
  } catch (err) {
    console.error('[error-email] Resend error:', err);
    return false;
  }
}
