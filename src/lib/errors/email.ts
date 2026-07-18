/**
 * AGENT alert email sender
 * Sends technical error notifications to AGENT_EMAIL (admin/operator)
 * NEVER sends to end users (admin policy: internal only)
 */

import { Resend } from 'resend';
import { ErrorSeverity, ErrorSource } from './types';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const AGENT_EMAIL = process.env.AGENT_EMAIL || process.env.OWNER_EMAIL || 'contact@examanet.com';
const FROM_ADDRESS = process.env.EMAIL_FROM || 'Examanet Alerts <alerts@examanet.com>';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

interface AgentAlertParams {
  reference: string;
  message: string;
  stack?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  userId?: string;
  userEmail?: string; // The end user who triggered the error (for context, not recipient)
  severity: ErrorSeverity;
  source: ErrorSource;
  context?: Record<string, unknown>;
  region?: string;
  requestId?: string;
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

/**
 * Send agent/operator alert (admin-only)
 * Internal policy: end users are NEVER notified automatically
 * The agent gets a technical email with all the debugging context
 */
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

  // Reply-To: if the error is tied to an end user, the agent can reply directly
  // This is for the admin's convenience, NOT to email the user automatically
  const replyTo = params.userEmail && params.userEmail !== AGENT_EMAIL
    ? params.userEmail
    : undefined;

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
      EXAMANET ADMIN ALERT · ${now} · ref ${params.reference}<br>
      <span style="opacity:0.6;">Internal — never sent to end users</span>
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
      replyTo,
    });
    // Fire-and-forget Discord notification (don't block email on it)
    sendDiscordAlert(params).catch((e) => console.error('[discord-alert] failed:', e));
    return !!result.data?.id;
  } catch (err) {
    console.error('[agent-alert] Resend error:', err);
    // Even if email fails, try Discord
    sendDiscordAlert(params).catch(() => {});
    return false;
  }
}

/**
 * Discord webhook notification (real-time push to admin)
 * Uses embeds with severity color. Silent for DEBUG/INFO.
 */
async function sendDiscordAlert(params: AgentAlertParams): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) return false;

  // Skip noise — only send WARNING+
  if (params.severity === 'DEBUG' || params.severity === 'INFO') return false;

  const sev = SEVERITY_COLORS[params.severity] || SEVERITY_COLORS.ERROR;
  // Convert hex bg color to int for Discord embed
  const colorInt = parseInt(sev.bg.replace('#', ''), 16);

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'Source', value: params.source, inline: true },
    { name: 'Method', value: params.method || '—', inline: true },
  ];
  if (params.url) fields.push({ name: 'URL', value: params.url.length > 200 ? params.url.slice(0, 200) + '…' : params.url, inline: false });
  if (params.userEmail) fields.push({ name: 'User', value: params.userEmail, inline: true });
  if (params.region) fields.push({ name: 'Region', value: params.region, inline: true });
  if (params.requestId) fields.push({ name: 'Req ID', value: params.requestId, inline: true });

  const stackPreview = params.stack
    ? params.stack.split('\n').slice(0, 3).join('\n').slice(0, 500)
    : null;

  const embed = {
    title: `${params.severity === 'CRITICAL' ? '🚨' : params.severity === 'ERROR' ? '⚠️' : '⚡'} ${params.reference}`,
    description: `\`\`\`${params.message.slice(0, 500)}\`\`\``,
    color: colorInt,
    fields,
    ...(stackPreview && { footer: { text: stackPreview } }),
    timestamp: new Date().toISOString(),
    author: { name: 'Examanet Alerts' },
  };

  const content = params.severity === 'CRITICAL' ? '🔴 **CRITICAL ERROR**' : params.severity === 'ERROR' ? '🟠 Error detected' : '🟡 Warning';

  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        embeds: [embed],
        // Suppress @everyone pings; admin only
        allowed_mentions: { parse: [] },
      }),
    });
    if (!res.ok) {
      console.error('[discord-alert] HTTP', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[discord-alert] fetch error:', err);
    return false;
  }
}

// DEPRECATED: sendErrorEmail() was removed per admin policy
// End users are NEVER notified automatically
// If you need to email a user manually, use Resend directly
