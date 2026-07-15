/* eslint-disable */
import { Resend } from 'resend';
import { renderResourceRejectedEmail, renderEditApprovedEmail, renderEditRejectedEmail, renderNewEditPendingEmail } from './email-templates';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'Examanet <noreply@examanet.com>';

// Always include dev code as fallback in case email is not delivered
// (e.g., Resend test mode, custom domain not verified, spam folder)
const ALWAYS_INCLUDE_DEV_CODE = process.env.HIDE_DEV_CODE !== 'true';

export class EmailResult {
  constructor(
    public success: boolean,
    public id: string,
    public error?: string,
    public devCode?: string
  ) {}
}

export async function sendOTPEmail(to: string, code: string, firstName?: string): Promise<EmailResult> {
  // Skip real sending if disabled (tests)
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] OTP for ${to}: ${code}`);
    return new EmailResult(true, 'test-mode', undefined, code);
  }
  const html = renderOTPEmail(code, firstName || '');
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to}`);
    console.log(`   Code: ${code}`);
    return new EmailResult(true, 'dev-mode', undefined, code);
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `${code} — Votre code Examanet`,
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message, code);
    }
    // Success - still include dev code as fallback in case email goes to spam
    return new EmailResult(true, result.data?.id || 'sent', undefined, ALWAYS_INCLUDE_DEV_CODE ? code : undefined);
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message, code);
  }
}

export async function sendWelcomeEmail(to: string, firstName: string, role: string): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Welcome for ${to}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderWelcomeEmail(firstName, role);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to}`);
    console.log(`   Welcome ${firstName}!`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: 'Bienvenue sur Examanet !',
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendWelcomeConfirmedEmail(to: string, firstName: string, role: string): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Welcome confirmed for ${to}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderWelcomeConfirmedEmail(firstName, role);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to}`);
    console.log(`   Welcome confirmed ${firstName}!`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: 'Compte activé — Bienvenue sur Examanet !',
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendContactEmail(payload: { name: string; email: string; subject: string; message: string }): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Contact from ${payload.email}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderContactEmail(payload);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] Contact from ${payload.email}`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: ['contact@examanet.com'],
      replyTo: payload.email,
      subject: `[Contact] ${payload.subject}`,
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', payload.email, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', payload.email, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendTeacherApprovalEmail(to: string, firstName: string, approved: boolean, opts?: { lastName?: string; dashboardUrl?: string; subjects?: string[]; level?: string; }): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Teacher approval for ${to} approved=${approved}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderTeacherApprovalEmail(firstName, approved, opts);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] Teacher approval for ${to} approved=${approved}`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: approved ? 'Votre compte enseignant est approuvé ✓' : 'Mise à jour de votre compte enseignant',
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendTeacherFileRequestEmail(opts: {
  to: string;
  firstName: string;
  lastName: string;
  email?: string;
  resourceTitle?: string;
  uploadUrl?: string;
  note?: string | null;
}): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Teacher file request for ${opts.to}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderTeacherFileRequestEmail(opts);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] Teacher file request for ${opts.to}`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [opts.to],
      subject: 'Action requise : uploadez votre fichier',
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', opts.to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', opts.to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendAdminVerificationFilesEmail(opts: {
  to?: string;
  teacherName?: string;
  teacherEmail?: string;
  teacher?: { firstName: string; lastName: string; email: string };
  resourceTitle?: string;
  resourceId?: number | string;
  reviewUrl?: string;
  files?: Array<{ fileName: string; fileSize: number; fileUrl: string; type: string | null; uploadedAt: string }>;
  count?: number;
  total?: number;
  adminUrl?: string;
}): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Admin verification files`);
    return new EmailResult(true, 'test-mode');
  }
  // Normalize: support both old flat shape and new nested shape
  const teacherName = opts.teacherName ?? (opts.teacher ? `${opts.teacher.firstName} ${opts.teacher.lastName}`.trim() : 'Enseignant');
  const teacherEmail = opts.teacherEmail ?? opts.teacher?.email ?? '';
  const resourceTitle = opts.resourceTitle ?? 'Ressource';
  const reviewUrl = opts.reviewUrl ?? opts.adminUrl ?? 'https://examanet.com/admin/approbations';
  const html = renderAdminVerificationFilesEmail({
    teacherName,
    teacherEmail,
    resourceTitle,
    resourceId: opts.resourceId ?? '',
    reviewUrl,
  });
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] Admin verification files`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [opts.to || 'admin@examanet.com'],
      subject: `📁 Fichier à vérifier — ${resourceTitle}`,
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', opts.to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', opts.to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendResourceApprovedEmail(to: string, firstName: string, resourceTitle: string, approved: boolean, resourceUrl?: string): Promise<EmailResult> {  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Resource approved for ${to} approved=${approved} url=${resourceUrl}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderResourceApprovedEmail(firstName, resourceTitle, approved, resourceUrl);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] Resource approved for ${to} approved=${approved}`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: approved ? '✓ Votre ressource est en ligne' : 'Ressource rejetée',
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

function renderOTPEmail(code: string, firstName: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f1f5f9;margin:0;padding:20px"><div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#0EA5E9,#0369A1);padding:32px;text-align:center;color:white"><h1 style="margin:0;font-size:24px">Vérifiez votre email</h1></div><div style="padding:32px"><p>Bonjour ${firstName || ''},</p><div style="background:#0EA5E9;color:white;font-size:36px;font-weight:800;text-align:center;padding:24px;border-radius:12px;letter-spacing:8px;margin:24px 0">${code}</div><p style="color:#64748b;font-size:14px">Valide 30 minutes.</p></div></div></body></html>`;
}

function renderWelcomeEmail(firstName: string, role: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif"><div style="max-width:600px;margin:0 auto;padding:20px"><h1>Bienvenue ${firstName} !</h1><p>Votre compte a été créé. Vous êtes ${role === 'TEACHER' ? 'enseignant' : 'élève'}.</p><p>Vérifiez votre email pour activer votre compte.</p></div></body></html>`;
}

function renderWelcomeConfirmedEmail(firstName: string, role: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif"><div style="max-width:600px;margin:0 auto;padding:20px"><h1>Compte activé !</h1><p>Bonjour ${firstName}, votre email a été vérifié.</p></div></body></html>`;
}

function renderContactEmail(p: { name: string; email: string; subject: string; message: string }): string {
  return `<!DOCTYPE html><html><body><h2>Contact: ${p.subject}</h2><p><strong>De:</strong> ${p.name} (${p.email})</p><p>${p.message}</p></body></html>`;
}

function renderTeacherApprovalEmail(firstName: string, approved: boolean, opts?: {
  lastName?: string;
  dashboardUrl?: string;
  subjects?: string[];
  level?: string;
}): string {
  const { lastName = '', dashboardUrl = 'https://examanet.com/enseignant', subjects = [], level = '' } = opts || {};
  const safeFirst = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeLast = lastName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fullName = `${safeFirst} ${safeLast}`.trim();

  if (approved) {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;color:#0f172a">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,0.04)">
    <!-- Hero header with confetti gradient -->
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 50%,#ec4899 100%);padding:48px 32px;text-align:center;position:relative">
      <div style="position:absolute;top:20px;left:20px;font-size:32px;opacity:0.4">✨</div>
      <div style="position:absolute;top:32px;right:24px;font-size:28px;opacity:0.4">🎉</div>
      <div style="position:absolute;bottom:24px;left:32px;font-size:24px;opacity:0.4">⭐</div>
      <div style="position:absolute;bottom:32px;right:20px;font-size:28px;opacity:0.4">✨</div>

      <div style="display:inline-block;width:96px;height:96px;border-radius:50%;background:#ffffff;box-shadow:0 8px 32px rgba(0,0,0,0.12);margin-bottom:20px;line-height:96px;font-size:56px">
        🎓
      </div>

      <h1 style="color:#ffffff;margin:0 0 8px;font-size:32px;font-weight:800;line-height:1.2;letter-spacing:-0.5px">
        Bienvenue dans l'équipe !
      </h1>
      <p style="color:#fce7f3;margin:0;font-size:15px;font-weight:500">
        Votre compte enseignant est approuvé ✨
      </p>
    </div>

    <!-- Welcome message -->
    <div style="padding:40px 32px">
      <p style="margin:0 0 6px;font-size:18px;color:#0f172a;font-weight:700">Bonjour <span style="color:#7c3aed">${safeFirst}</span> 👋</p>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6">
        C'est officiel ! Votre profil enseignant sur <strong>Examanet</strong> a été validé par notre équipe.
        Vous pouvez maintenant partager vos cours, séries d'exercices, devoirs et corrigés avec <strong>des milliers d'élèves tunisiens</strong>.
      </p>

      <!-- Account summary card -->
      <div style="background:linear-gradient(135deg,#faf5ff 0%,#fef3c7 100%);border:2px solid #e9d5ff;border-radius:16px;padding:24px;margin:24px 0">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;flex-shrink:0">
            ${(safeFirst[0] || 'E').toUpperCase()}${(safeLast[0] || '').toUpperCase()}
          </div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#0f172a;line-height:1.2">${fullName}</div>
            <div style="font-size:13px;color:#7c3aed;font-weight:600">Compte enseignant vérifié ✓</div>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:8px;padding-top:16px;border-top:1px solid rgba(124,58,237,0.15)">
          <div style="background:#ffffff;border:1px solid #e9d5ff;border-radius:10px;padding:8px 12px;font-size:12px;color:#6b21a8;font-weight:600">
            ✓ Identité vérifiée
          </div>
          <div style="background:#ffffff;border:1px solid #e9d5ff;border-radius:10px;padding:8px 12px;font-size:12px;color:#6b21a8;font-weight:600">
            ✓ Fichiers contrôlés

      </div>
    </div>
  </div>
</body></html>`;
  } else {
    return `<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;padding:32px">
<h1 style="color:#0f172a">Bonjour ${safeFirst},</h1>
<p>Votre demande d'inscription en tant qu'enseignant n'a pas été acceptée.</p>
<p>Pour plus d'informations, contactez-nous via notre page de contact.</p>
<p style="margin-top:24px">L'équipe Examanet</p>
</div>
</body></html>`;
  }
}

function renderAdminVerificationFilesEmail(opts: {
  teacherName: string;
  teacherEmail: string;
  resourceTitle: string;
  resourceId: number | string;
  reviewUrl: string;
}): string {
  const safeTeacherName = opts.teacherName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeResourceTitle = opts.resourceTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;padding:32px">
<h1 style="color:#0f172a">📁 Fichier à vérifier</h1>
<p><strong>Enseignant :</strong> ${safeTeacherName} (${opts.teacherEmail})</p>
<p><strong>Ressource :</strong> ${safeResourceTitle}</p>
<p><strong>ID :</strong> ${opts.resourceId}</p>
<div style="text-align:center;margin:24px 0">
<a href="${opts.reviewUrl}" style="background:linear-gradient(135deg,#3B82F6,#2563EB);color:white;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:bold;display:inline-block">Examiner le fichier</a>
</div>
</div>
</body></html>`;
}

function renderTeacherFileRequestEmail(opts: {
  to: string;
  firstName: string;
  lastName: string;
  resourceTitle?: string;
  uploadUrl?: string;
}): string {
  const safeFirst = opts.firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeTitle = (opts.resourceTitle ?? 'votre fichier').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#f8fafc;padding:20px">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;padding:32px">
<h1 style="color:#0f172a">Bonjour ${safeFirst},</h1>
<p>Pour finaliser la publication de votre ressource <strong>${safeTitle}</strong>, merci d'uploader le fichier original.</p>
<div style="text-align:center;margin:24px 0">
<a href="${opts.uploadUrl}" style="background:linear-gradient(135deg,#3B82F6,#2563EB);color:white;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:bold;display:inline-block">Uploader le fichier</a>
</div>
<p style="color:#64748b;font-size:13px">Ce lien est personnel et expire dans 7 jours.</p>
</div>
</body></html>`;
}

function renderResourceApprovedEmail(firstName: string, resourceTitle: string, approved: boolean, resourceUrl?: string): string {
  const safeFirst = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeTitle = resourceTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  const fullResourceUrl = resourceUrl
    ? (resourceUrl.startsWith('http') ? resourceUrl : `${SITE_URL}${resourceUrl}`)
    : null;
  if (approved) {
    return `<!DOCTYPE html>
<html><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 100%);padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 100%);padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(34,197,94,0.15);">
  <tr><td style="background:linear-gradient(135deg,#10B981 0%,#059669 50%,#047857 100%);padding:32px 24px;text-align:center;">
    <div style="margin:0 auto 16px;display:inline-block;background:rgba(255,255,255,0.15);border-radius:20px;padding:14px 20px;backdrop-filter:blur(10px);">
      <img src="${SITE_URL}/logo-examanet.png" alt="Examanet" width="160" height="40" style="display:block;max-width:160px;height:auto;" />
    </div>
    <div style="width:80px;height:80px;margin:20px auto 16px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);">
      <div style="font-size:42px;line-height:80px;">✅</div>
    </div>
    <h1 style="margin:0;color:white;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Ressource approuvée !</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Votre ressource est maintenant en ligne</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 8px;color:#0F172A;font-size:16px;">Bonjour <strong style="color:#0F172A;">${safeFirst}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      Excellente nouvelle ! La ressource que vous avez soumise a été approuvée par notre équipe et est désormais <strong>en ligne sur Examanet</strong>. Elle est maintenant visible par des milliers d'élèves et enseignants tunisiens.
    </p>
    <div style="background:linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 100%);border:1px solid #E2E8F0;border-radius:16px;padding:20px;margin:0 0 24px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#10B981,#059669);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="color:white;font-size:20px;line-height:40px;text-align:center;width:100%;">📚</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#10B981;margin-bottom:4px;">Ressource publiée</div>
          <div style="font-weight:700;color:#0F172A;font-size:15px;line-height:1.4;word-break:break-word;">${safeTitle}</div>
        </div>
      </div>
    </div>
    ${fullResourceUrl ? `
    <div style="text-align:center;margin:0 0 8px;">
      <a href="${fullResourceUrl}" style="display:inline-block;background:linear-gradient(135deg,#10B981,#059669);color:white;text-decoration:none;padding:16px 36px;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 8px 24px rgba(16,185,129,0.3);letter-spacing:-0.2px;">Voir la ressource en ligne →</a>
    </div>
    <p style="margin:0 0 24px;text-align:center;color:#94A3B8;font-size:12px;word-break:break-all;">${fullResourceUrl}</p>
    ` : ''}
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
      Merci pour votre contribution à Examanet ! Vos ressources aident les élèves tunisiens à réussir leurs études.
    </p>
  </td></tr>
  <tr><td style="background:#F8FAFC;padding:24px 32px;border-top:1px solid #E2E8F0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-weight:800;color:#0F172A;font-size:16px;letter-spacing:-0.5px;">Examanet</div>
          <div style="color:#94A3B8;font-size:12px;margin-top:2px;">Plateforme pédagogique #1 en Tunisie</div>
        </td>
        <td align="right" style="color:#94A3B8;font-size:11px;">
          Conçu avec ❤️<br>pour les élèves tunisiens
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  }
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#FEF2F2 0%,#FEE2E2 100%);padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#FEF2F2 0%,#FEE2E2 100%);padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(239,68,68,0.15);">
  <tr><td style="background:linear-gradient(135deg,#EF4444 0%,#DC2626 50%,#B91C1C 100%);padding:32px 24px;text-align:center;">
    <div style="margin:0 auto 16px;display:inline-block;background:rgba(255,255,255,0.15);border-radius:20px;padding:14px 20px;backdrop-filter:blur(10px);">
      <img src="${SITE_URL}/logo-examanet.png" alt="Examanet" width="160" height="40" style="display:block;max-width:160px;height:auto;" />
    </div>
    <div style="width:80px;height:80px;margin:20px auto 16px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);">
      <div style="font-size:42px;line-height:80px;">❌</div>
    </div>
    <h1 style="margin:0;color:white;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Ressource non retenue</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Votre soumission n'a pas été approuvée</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 8px;color:#0F172A;font-size:16px;">Bonjour <strong style="color:#0F172A;">${safeFirst}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      Malheureusement, la ressource que vous avez soumise n'a pas été retenue pour publication sur Examanet.
    </p>
    <div style="background:linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 100%);border:1px solid #E2E8F0;border-radius:16px;padding:20px;margin:0 0 24px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#EF4444,#DC2626);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="color:white;font-size:20px;line-height:40px;text-align:center;width:100%;">📄</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#EF4444;margin-bottom:4px;">Ressource refusée</div>
          <div style="font-weight:700;color:#0F172A;font-size:15px;line-height:1.4;word-break:break-word;">${safeTitle}</div>
        </div>
      </div>
    </div>
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
      N'hésitez pas à soumettre une nouvelle version après avoir consulté nos <a href="${SITE_URL}/cgu" style="color:#10B981;font-weight:600;text-decoration:underline;">conditions d'utilisation</a>.
    </p>
  </td></tr>
  <tr><td style="background:#F8FAFC;padding:24px 32px;border-top:1px solid #E2E8F0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-weight:800;color:#0F172A;font-size:16px;letter-spacing:-0.5px;">Examanet</div>
          <div style="color:#94A3B8;font-size:12px;margin-top:2px;">Plateforme pédagogique #1 en Tunisie</div>
        </td>
        <td align="right" style="color:#94A3B8;font-size:11px;">
          Conçu avec ❤️<br>pour les élèves tunisiens
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export async function sendResourceRejectedEmail(to: string, firstName: string, resourceTitle: string, reason: string, resourceUrl?: string): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Resource rejected for ${to}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderResourceRejectedEmail(firstName, resourceTitle, reason, resourceUrl);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] Resource rejected for ${to}`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: 'Ressource non retenue',
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendEditApprovedEmail(to: string, firstName: string, resourceTitle: string, resourceUrl?: string): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Edit approved for ${to}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderEditApprovedEmail(firstName, resourceTitle, resourceUrl ?? '');
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] Edit approved for ${to}`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: '✓ Modification approuvée',
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendEditRejectedEmail(to: string, firstName: string, resourceTitle: string, reason: string, resourceUrl?: string): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Edit rejected for ${to}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderEditRejectedEmail(firstName, resourceTitle, reason, resourceUrl ?? '');
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] Edit rejected for ${to}`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: 'Modification non retenue',
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendNewEditPendingEmail(
  to: string,
  firstName: string,
  resourceTitle: string,
  summary: string,
  resourceUrl: string,
  wasPreviouslyRejected?: boolean,
  previousRejectionReason?: string
): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] New edit pending for ${to}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderNewEditPendingEmail(firstName, resourceTitle, summary, resourceUrl, wasPreviouslyRejected ?? false, previousRejectionReason);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] New edit pending for ${to}`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: '📝 Nouvelle modification en attente',
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [NEW EDIT PENDING THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}


// ============================================================================
// PASSWORD CHANGED NOTIFICATION
// ============================================================================

/**
 * Send a confirmation email after a successful password change.
 * The email includes:
 *  - Confirmation that the password was changed
 *  - Date/time of change (Africa/Tunis timezone)
 *  - IP address
 *  - User-Agent (browser/device)
 *  - A clear "if this wasn't you" warning with a contact link
 *  - Security recommendations
 */
export async function sendPasswordChangedEmail(opts: {
  to: string;
  firstName: string;
  ip: string;
  userAgent: string;
}): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Password changed for ${opts.to}`);
    return new EmailResult(true, 'test-mode');
  }

  const html = renderPasswordChangedEmail(opts);

  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${opts.to}`);
    console.log(`   Subject: Votre mot de passe Examanet a été modifié`);
    console.log(`   IP: ${opts.ip}`);
    console.log(`   UA: ${opts.userAgent}`);
    return new EmailResult(true, 'dev-mode');
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [opts.to],
      subject: '🔒 Votre mot de passe Examanet a été modifié',
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', opts.to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    console.log(`[password-changed] email sent to ${opts.to} ip=${opts.ip}`);
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', opts.to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

function renderPasswordChangedEmail(opts: {
  firstName: string;
  ip: string;
  userAgent: string;
}): string {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  const safeFirst = (opts.firstName || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeIp = (opts.ip || 'Inconnue').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeUa = (opts.userAgent || 'Inconnu').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Format date in French timezone
  const changedAt = new Date().toLocaleString('fr-FR', {
    timeZone: 'Africa/Tunis',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Parse user-agent to display a friendly name
  let device = 'Appareil inconnu';
  if (/iPhone/.test(opts.userAgent)) device = '📱 iPhone';
  else if (/iPad/.test(opts.userAgent)) device = '📱 iPad';
  else if (/Android/.test(opts.userAgent)) device = '📱 Android';
  else if (/Mac OS X/.test(opts.userAgent)) device = '💻 Mac';
  else if (/Windows/.test(opts.userAgent)) device = '💻 Windows';
  else if (/Linux/.test(opts.userAgent)) device = '💻 Linux';
  else if (/curl|wget|http/i.test(opts.userAgent)) device = '🤖 Outil automatisé';

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,0.04)">

  <!-- Header: green check + gradient -->
  <tr><td style="background:linear-gradient(135deg,#10B981 0%,#059669 100%);padding:40px 32px;text-align:center">
    <div style="display:inline-block;width:80px;height:80px;border-radius:50%;background:#ffffff;box-shadow:0 8px 24px rgba(0,0,0,0.1);margin-bottom:16px;line-height:80px;font-size:48px">
      🔒
    </div>
    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;line-height:1.2;letter-spacing:-0.5px">
      Mot de passe modifié
    </h1>
    <p style="color:#d1fae5;margin:8px 0 0;font-size:15px;font-weight:500">
      Votre compte Examanet est sécurisé
    </p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px 32px">

    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;line-height:1.5">
      Bonjour <strong>${safeFirst}</strong> 👋
    </p>

    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6">
      Nous vous confirmons que le mot de passe de votre compte Examanet
      (<strong>${(opts as any).email || ''}</strong>) a été modifié avec succès.
      Vous pouvez désormais vous connecter avec votre nouveau mot de passe.
    </p>

    <!-- Details card -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 24px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:12px">
        📋 Détails de la modification
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#334155">
        <tr>
          <td style="padding:6px 0;width:120px;color:#64748b">📅 Date</td>
          <td style="padding:6px 0;font-weight:600">${changedAt} (heure de Tunis)</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b">🌐 Adresse IP</td>
          <td style="padding:6px 0;font-family:monospace">${safeIp}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b">💻 Appareil</td>
          <td style="padding:6px 0">${device}</td>
        </tr>
      </table>
    </div>

    <!-- CTA Login -->
    <div style="text-align:center;margin:0 0 32px">
      <a href="${SITE_URL}/connexion" style="display:inline-block;background:linear-gradient(135deg,#0EA5E9,#0369A1);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 8px 24px rgba(14,165,233,0.3)">
        Se connecter
      </a>
    </div>

    <!-- Big warning: not you? -->
    <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:16px;padding:24px;margin:0 0 24px">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="font-size:32px;line-height:1;flex-shrink:0">⚠️</div>
        <div>
          <div style="font-size:16px;font-weight:800;color:#991b1b;margin-bottom:8px">
            Ce n'est pas vous qui avez modifié le mot de passe ?
          </div>
          <p style="margin:0 0 16px;font-size:14px;color:#7f1d1d;line-height:1.6">
            Si vous n'êtes pas à l'origine de cette modification, votre compte
            est peut-être compromis. <strong>Contactez-nous immédiatement</strong>
            pour que nous puissions sécuriser votre compte et annuler les changements.
          </p>
          <a href="${SITE_URL}/contact?subject=Compte%20compromise&motif=password" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px">
            🚨 Nous contacter d'urgence
          </a>
        </div>
      </div>
    </div>

    <!-- Security tips -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:0 0 16px">
      <div style="font-size:14px;font-weight:800;color:#92400e;margin-bottom:8px">
        💡 Conseils de sécurité
      </div>
      <ul style="margin:0;padding-left:20px;font-size:13px;color:#78350f;line-height:1.7">
        <li>Utilisez un mot de passe unique (différent de vos autres comptes)</li>
        <li>Ne partagez jamais votre mot de passe avec qui que ce soit</li>
        <li>Activez l'authentification à deux facteurs dès qu'elle sera disponible</li>
        <li>Méfiez-vous des emails suspects vous demandant votre mot de passe</li>
      </ul>
    </div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-weight:800;color:#0f172a;font-size:15px;letter-spacing:-0.5px">Examanet</div>
          <div style="color:#94a3b8;font-size:12px;margin-top:2px">Plateforme pédagogique #1 en Tunisie</div>
        </td>
        <td align="right" style="color:#94a3b8;font-size:11px">
          Conçu avec ❤️<br>pour les élèves tunisiens
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:11px;color:#cbd5e1;text-align:center">
      Cet email a été envoyé automatiquement suite à la modification de votre mot de passe.<br>
      Si vous n'êtes pas à l'origine de cette action, contactez-nous via
      <a href="${SITE_URL}/contact" style="color:#0EA5E9;text-decoration:underline">examanet.com/contact</a>.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}
