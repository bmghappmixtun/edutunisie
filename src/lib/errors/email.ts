/**
 * Send error emails via Resend
 * - sendErrorEmail() — user-facing (when user hits an error)
 * - sendAgentAlert() — technical (for the agent/owner, ALL errors)
 */

import { Resend } from 'resend';
import { ErrorSeverity, ErrorSource } from './types';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const AGENT_EMAIL = process.env.AGENT_EMAIL || process.env.OWNER_EMAIL || 'contact@examanet.com';
const FROM_ADDRESS = process.env.EMAIL_FROM || 'Examanet Alerts <alerts@examanet.com>';

// =====================================================================
// USER EMAIL — friendly, action-oriented
// =====================================================================

interface UserErrorEmailParams {
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

export async function sendErrorEmail(params: UserErrorEmailParams): Promise<boolean> {
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
          <tr>
            <td style="background:linear-gradient(135deg,#0EA5E9 0%,#6366F1 100%);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:48px;margin-bottom:8px;">⚠️</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Une erreur s'est produite</h1>
              <p style="margin:8px 0 0;color:#e0f2fe;font-size:14px;">Notre équipe a été notifiée automatiquement</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <span style="display:inline-block;background-color:${sev.bg};color:${sev.text};padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${sev.label}</span>
              <span style="display:inline-block;background-color:#f1f5f9;color:#475569;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;margin-left:8px;">${srcLabel}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Message</h2>
              <div style="background-color:#f8fafc;border-left:3px solid #ef4444;padding:12px 16px;border-radius:4px;font-family:'SF Mono',Monaco,monospace;font-size:13px;color:#0f172a;line-height:1.5;word-break:break-word;">
                ${params.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
              </div>
            </td>
          </tr>
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
          <tr>
            <td style="padding:20px 32px 0;">
              <h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Où</h2>
              <div style="background-color:#f8fafc;padding:12px 16px;border-radius:4px;font-family:'SF Mono',Monaco,monospace;font-size:12px;color:#475569;word-break:break-all;">
                ${params.url}
              </div>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">🕐 ${now}</p>
            </td>
          </tr>
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
          <tr>
            <td style="background-color:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Examanet — La plateforme pédagogique #1 en Tunisie 🇹🇳<br>
                Cet email a été envoyé automatiquement car vous utilisez Examanet.
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
      from: FROM_ADDRESS,
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

// =====================================================================
// AGENT ALERT EMAIL — technical, dense, all errors
// =====================================================================

interface AgentAlertParams {
  reference: string;
  message: string;
  stack?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  userId?: string;
  userEmail?: string;
  severity: ErrorSeverity;
  source: ErrorSource;
  context?: Record<string, unknown>;
  region?: string;
  requestId?: string;
}

export async function sendAgentAlert(params: AgentAlertParams): Promise<boolean> {
  if (!resend) {
    console.warn('[agent-alert] Resend not configured, skipping email');
    return false;
  }

  const sev = SEVERITY_COLORS[params.severity] || SEVERITY_COLORS.ERROR;
  const now = new Date().toISOString();
  const frTime = new Date().toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  // Build a quick JSON dump for the agent
  const dump = {
    reference: params.reference,
    timestamp: now,
    severity: params.severity,
    source: params.source,
    message: params.message,
    url: params.url,
    method: params.method,
    userAgent: params.userAgent,
    userId: params.userId,
    userEmail: params.userEmail,
    region: params.region,
    requestId: params.requestId,
    context: params.context,
  };

  // Build the stack trace HTML (collapse if too long)
  let stackHtml = '';
  if (params.stack) {
    const stackLines = params.stack.split('\n').slice(0, 15).join('\n');
    stackHtml = `
      <h3 style="margin:16px 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Stack (top 15 lines)</h3>
      <pre style="background-color:#0f172a;color:#e2e8f0;padding:12px;border-radius:4px;font-family:'SF Mono',Monaco,monospace;font-size:11px;line-height:1.4;overflow-x:auto;white-space:pre-wrap;word-break:break-all;">${stackLines.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    `;
  }

  // Build context HTML
  let contextHtml = '';
  if (params.context && Object.keys(params.context).length > 0) {
    contextHtml = `
      <h3 style="margin:16px 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;">Context</h3>
      <pre style="background-color:#f1f5f9;padding:12px;border-radius:4px;font-family:'SF Mono',Monaco,monospace;font-size:11px;line-height:1.4;overflow-x:auto;">${JSON.stringify(params.context, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    `;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>[${params.severity}] ${params.reference} — Examanet</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'SF Mono',Monaco,monospace,monospace;color:#e2e8f0;">
  <div style="max-width:900px;margin:0 auto;padding:24px 16px;">

    <!-- Header bar -->
    <div style="background-color:${sev.bg};color:${sev.text};padding:16px 20px;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">${sev.label}</span>
        <span style="opacity:0.6;margin:0 8px;">·</span>
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">${params.source}</span>
      </div>
      <code style="font-size:14px;font-weight:700;letter-spacing:0.1em;">${params.reference}</code>
    </div>

    <!-- Body -->
    <div style="background-color:#1e293b;padding:20px;border-radius:0 0 8px 8px;">

      <!-- Message -->
      <h2 style="margin:0 0 12px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Message</h2>
      <pre style="background-color:#0f172a;color:#fca5a5;padding:12px;border-radius:4px;font-size:13px;line-height:1.5;overflow-x:auto;white-space:pre-wrap;word-break:break-word;margin:0;">${params.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>

      <!-- Quick info -->
      <h3 style="margin:20px 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Request</h3>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 12px 4px 0;color:#94a3b8;width:120px;">URL</td>
          <td style="padding:4px 0;color:#e2e8f0;word-break:break-all;">${params.url || '—'}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;color:#94a3b8;">Method</td>
          <td style="padding:4px 0;color:#e2e8f0;">${params.method || '—'}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;color:#94a3b8;">Time (Paris)</td>
          <td style="padding:4px 0;color:#e2e8f0;">${frTime}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;color:#94a3b8;">Region</td>
          <td style="padding:4px 0;color:#e2e8f0;">${params.region || '—'}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;color:#94a3b8;">Request ID</td>
          <td style="padding:4px 0;color:#e2e8f0;">${params.requestId || '—'}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;color:#94a3b8;">User ID</td>
          <td style="padding:4px 0;color:#e2e8f0;">${params.userId || 'anonymous'}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;color:#94a3b8;">User Email</td>
          <td style="padding:4px 0;color:#e2e8f0;">${params.userEmail || '—'}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;color:#94a3b8;vertical-align:top;">User Agent</td>
          <td style="padding:4px 0;color:#e2e8f0;word-break:break-all;font-size:11px;">${(params.userAgent || '—').replace(/</g, '&lt;')}</td>
        </tr>
      </table>

      ${stackHtml}
      ${contextHtml}

      <!-- Actions -->
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #334155;">
        <a href="https://examanet.com/admin/erreurs" style="display:inline-block;background-color:#0EA5E9;color:#ffffff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;margin-right:8px;">
          Voir dans l'admin →
        </a>
        <a href="https://console.neon.tech/app/projects/little-silence-94324724" style="display:inline-block;background-color:#475569;color:#ffffff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">
          Neon Console
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="margin-top:12px;text-align:center;font-size:10px;color:#64748b;letter-spacing:0.05em;">
      EXAMANET ERROR MONITOR · ${now} · ref ${params.reference}
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: AGENT_EMAIL,
      subject: `[${params.severity}] ${params.reference} — ${params.message.slice(0, 60)}`,
      html,
      replyTo: params.userEmail && params.userEmail !== AGENT_EMAIL ? params.userEmail : undefined,
    });
    return !!result.data?.id;
  } catch (err) {
    console.error('[agent-alert] Resend error:', err);
    return false;
  }
}
