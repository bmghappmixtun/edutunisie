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
    return new EmailResult(true, 'test-mode');
  }
  const html = renderWelcomeEmail(firstName, role);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to} | Welcome (${role}) - awaiting OTP\n`);
    return new EmailResult(true, 'dev-mode');
  }
  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `🎉 Bienvenue sur Examanet, ${firstName} !`,
      html,
    });
    if (result.error) {
      console.error('📧 [WELCOME ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendWelcomeConfirmedEmail(to: string, firstName: string, role: string): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    return new EmailResult(true, 'test-mode');
  }
  const html = renderWelcomeConfirmedEmail(firstName, role);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to} | Welcome confirmed\n`);
    return new EmailResult(true, 'dev-mode');
  }
  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `✅ Compte activé — Bienvenue ${firstName} !`,
      html,
    });
    if (result.error) {
      console.error('📧 [CONFIRM ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendContactEmail(payload: { name: string; email: string; subject: string; message: string }): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    return new EmailResult(true, 'test-mode');
  }
  const html = renderContactEmail(payload);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] Contact: ${payload.email} → admin\n`);
    return new EmailResult(true, 'dev-mode');
  }
  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: ['boutiti.mehdi@gmail.com'],
      replyTo: payload.email,
      subject: `[Contact] ${payload.subject}`,
      html,
    });
    if (result.error) {
      console.error('📧 [CONTACT ERROR]', '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendTeacherApprovalEmail(to: string, firstName: string, approved: boolean): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    return new EmailResult(true, 'test-mode');
  }
  const html = renderTeacherApprovalEmail(firstName, approved);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to} | Teacher ${approved ? 'approved' : 'rejected'}\n`);
    return new EmailResult(true, 'dev-mode');
  }
  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: approved ? '🎉 Votre compte enseignant est approuvé !' : 'Mise à jour de votre compte',
      html,
    });
    if (result.error) {
      console.error('📧 [TEACHER APPROVAL ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    return new EmailResult(false, 'threw', e?.message);
  }
}

/**
 * Send a request to a NEW (non-invited) teacher asking for 5 sample files.
 * This is the verification step for teachers who registered themselves
 * and weren't invited by the admin.
 */
export async function sendTeacherFileRequestEmail(opts: {
  to: string;
  firstName: string;
  lastName: string;
  email: string;
  note?: string | null;
}): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    return new EmailResult(true, 'test-mode');
  }
  const html = renderTeacherFileRequestEmail(opts);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${opts.to} | FILE REQUEST for ${opts.firstName} ${opts.lastName}\n   Note: ${opts.note || '(no note)'}\n`);
    return new EmailResult(true, 'dev-mode');
  }
  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [opts.to],
      subject: `📁 Action requise : envoyez-nous 5 fichiers pour vérifier votre profil — Examanet`,
      html,
    });
    if (result.error) {
      console.error('📧 [TEACHER FILE REQUEST ERROR]', opts.to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    return new EmailResult(false, 'threw', e?.message);
  }
}

/**
 * Notify admin when a teacher uploads verification files.
 * Triggers:
 * - When each new file is uploaded (digest)
 * - When all 5 files are received (priority notification)
 */
export async function sendAdminVerificationFilesEmail(opts: {
  to: string;
  teacher: { firstName: string; lastName: string; email: string };
  files: Array<{ fileName: string; fileSize: number; fileUrl: string; type: string | null; uploadedAt: string }>;
  count: number;
  total: number;
  adminUrl: string;
}): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    return new EmailResult(true, 'test-mode');
  }
  const html = renderAdminVerificationFilesEmail(opts);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To admin: ${opts.to} | ${opts.teacher.firstName} ${opts.teacher.lastName} - ${opts.count}/${opts.total} files`);
    return new EmailResult(true, 'dev-mode');
  }
  const isComplete = opts.count >= opts.total;
  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [opts.to],
      subject: isComplete
        ? `✅ ${opts.teacher.firstName} ${opts.teacher.lastName} a envoyé ses 5 fichiers — à examiner`
        : `📁 ${opts.teacher.firstName} ${opts.teacher.lastName} — ${opts.count}/${opts.total} fichier(s) reçu(s)`,
      html,
    });
    if (result.error) {
      console.error('📧 [ADMIN VERIFICATION EMAIL ERROR]', opts.to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendResourceApprovedEmail(to: string, firstName: string, resourceTitle: string, approved: boolean): Promise<EmailResult> {  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    return new EmailResult(true, 'test-mode');
  }
  const html = renderResourceApprovedEmail(firstName, resourceTitle, approved);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to} | Resource ${approved ? 'approved' : 'rejected'}\n`);
    return new EmailResult(true, 'dev-mode');
  }
  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: approved ? '✅ Votre ressource est en ligne !' : 'Ressource non approuvée',
      html,
    });
    if (result.error) {
      console.error('📧 [RESOURCE APPROVAL ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
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

function renderTeacherApprovalEmail(firstName: string, approved: boolean): string {
  return `<!DOCTYPE html><html><body><h2>${approved ? 'Compte approuvé !' : 'Mise à jour'}</h2><p>Bonjour ${firstName},</p></body></html>`;
}

function renderAdminVerificationFilesEmail(opts: {
  teacher: { firstName: string; lastName: string; email: string };
  files: Array<{ fileName: string; fileSize: number; fileUrl: string; type: string | null; uploadedAt: string }>;
  count: number;
  total: number;
  adminUrl: string;
}): string {
  const { teacher, files, count, total, adminUrl } = opts;
  const safeFirst = teacher.firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeLast = teacher.lastName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const complete = count >= total;
  const filesList = files.slice(0, 10).map(f => {
    const sizeKb = (f.fileSize / 1024).toFixed(0);
    const typeIcon = f.type === 'COURSE' ? '📚' : f.type === 'HOMEWORK' ? '📝' : f.type === 'EXERCISE' ? '✏️' : f.type === 'REVISION' ? '🔄' : f.type === 'EXAM' ? '📋' : f.type === 'BAC_SUBJECT' ? '🎓' : f.type === 'CORRECTION' ? '✅' : '📁';
    return `<tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:13px">${typeIcon} ${f.fileName.replace(/</g, '&lt;')}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b">${sizeKb} KB</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">
        <a href="${f.fileUrl}" style="display:inline-block;background:#7c3aed;color:#fff;font-size:11px;font-weight:600;padding:5px 10px;border-radius:6px;text-decoration:none">Voir</a>
      </td>
    </tr>`;
  }).join('');
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:20px;color:#0f172a">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);padding:24px;text-align:center">
      <div style="font-size:36px;margin-bottom:6px">${complete ? '🎉' : '📁'}</div>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800">
        ${complete ? 'Tous les fichiers de vérification reçus' : 'Nouveaux fichiers reçus'}
      </h1>
      <p style="color:#ede9fe;margin:4px 0 0;font-size:13px">${safeFirst} ${safeLast}</p>
    </div>

    <div style="padding:24px">
      <div style="background:${complete ? '#d1fae5' : '#fef3c7'};border-left:4px solid ${complete ? '#10b981' : '#f59e0b'};padding:12px 16px;border-radius:8px;margin-bottom:20px">
        <strong style="color:${complete ? '#065f46' : '#92400e'};font-size:14px">
          ${complete ? '✅ Vérification complète' : '⏳ En cours de vérification'}
        </strong>
        <p style="margin:4px 0 0;font-size:13px;color:${complete ? '#047857' : '#78350f'};line-height:1.5">
          ${count}/${total} fichier(s) reçu(s).
          ${complete ? 'Vous pouvez maintenant examiner le profil et approuver ou rejeter la demande.' : 'Le prof vous enverra probablement d\'autres fichiers.'}
        </p>
      </div>

      <h2 style="font-size:14px;color:#475569;margin:20px 0 8px;font-weight:700">📂 Fichiers envoyés</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#475569;font-weight:700;text-transform:uppercase">Fichier</th>
            <th style="padding:10px 8px;text-align:left;font-size:11px;color:#475569;font-weight:700;text-transform:uppercase">Taille</th>
            <th style="padding:10px 8px"></th>
          </tr>
        </thead>
        <tbody>${filesList}</tbody>
      </table>

      <div style="text-align:center;margin:24px 0 0">
        <a href="${adminUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;box-shadow:0 4px 14px rgba(124,58,237,0.3)">
          Examiner sur Examanet →
        </a>
      </div>

      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center">
        Email automatique · Examanet Admin
      </p>
    </div>
  </div>
</body></html>`;
}

function renderTeacherFileRequestEmail(opts: {
  firstName: string;
  lastName: string;
  email: string;
  note?: string | null;
}): string {
  const { firstName, lastName, email, note } = opts;
  const safeFirst = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeLast = lastName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeEmail = email.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const noteHtml = note
    ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:8px;margin:20px 0;color:#78350f"><strong>📝 Message de l'équipe :</strong><br><span style="white-space:pre-line">${note.replace(/</g, '&lt;')}</span></div>`
    : '';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;color:#0f172a">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 50%,#d97706 100%);padding:32px 24px;text-align:center">
      <div style="font-size:48px;margin-bottom:8px">📁</div>
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800">Examanet</h1>
      <p style="color:#ede9fe;margin:6px 0 0;font-size:13px">Plateforme pédagogique #1 en Tunisie</p>
    </div>

    <!-- Content -->
    <div style="padding:32px 24px">
      <p style="margin:0 0 16px;font-size:16px">Bonjour <strong>${safeFirst} ${safeLast}</strong>,</p>

      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">
        Nous vous remercions pour votre demande de compte enseignant sur <strong>Examanet</strong>.
        Votre profil a bien été reçu et nous l'examinons avec attention.
      </p>

      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">
        Afin de vérifier votre expertise pédagogique et de garantir la qualité des ressources
        partagées sur notre plateforme, nous vous invitons à nous envoyer
        <strong>5 fichiers Word (.docx) d'exemple</strong> parmi vos productions :
      </p>

      <!-- Requirements card -->
      <div style="background:linear-gradient(135deg,#faf5ff 0%,#fef3c7 100%);border:2px solid #c084fc;border-radius:12px;padding:20px;margin:24px 0">
        <h3 style="margin:0 0 12px;font-size:15px;color:#6b21a8">📋 Ce que nous attendons :</h3>
        <ul style="margin:0;padding-left:20px;color:#334155;line-height:1.8;font-size:14px">
          <li><strong>5 fichiers au total</strong> (minimum)</li>
          <li>Formats acceptés : <strong>Word (.docx)</strong> ou <strong>PDF</strong></li>
          <li>Types de fichiers recommandés : <em>cours, séries d'exercices, devoirs, corrigés</em>…</li>
          <li>Chaque fichier doit contenir <strong>votre nom et prénom</strong> (${safeFirst} ${safeLast}) en pied de page ou en en-tête</li>
          <li>Les fichiers doivent refléter votre <strong>niveau d'enseignement réel</strong></li>
        </ul>
      </div>

      ${noteHtml}

      <!-- How to send -->
      <h3 style="margin:24px 0 12px;font-size:15px;color:#0f172a">📤 Comment nous les envoyer ?</h3>
      <ol style="margin:0;padding-left:20px;color:#334155;line-height:1.8;font-size:14px">
        <li>Connectez-vous à votre compte Examanet</li>
        <li>Rendez-vous sur votre tableau de bord enseignant</li>
        <li>Cliquez sur <strong>« Soumettre mes fichiers de vérification »</strong></li>
        <li>Joignez vos 5 fichiers et validez</li>
      </ol>

      <p style="margin:20px 0 8px;font-size:14px;color:#64748b">
        Vous avez 7 jours pour nous envoyer ces fichiers. Passé ce délai,
        votre demande sera classée sans suite.
      </p>

      <p style="margin:24px 0 0;font-size:14px;color:#64748b">
        Une question ? Répondez simplement à cet email ou contactez-nous à
        <a href="mailto:contact@examanet.com" style="color:#7c3aed">contact@examanet.com</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 24px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0 0 4px;font-size:12px;color:#64748b">Cordialement,</p>
      <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a">L'équipe Examanet</p>
      <p style="margin:8px 0 0;font-size:11px;color:#94a3b8">🇹🇳 Made with love in Tunisia</p>
    </div>
  </div>
</body></html>`;
}

function renderResourceApprovedEmail(firstName: string, resourceTitle: string, approved: boolean): string {
  return `<!DOCTYPE html><html><body><h2>${approved ? 'Ressource approuvée' : 'Ressource refusée'}</h2><p>${resourceTitle}</p></body></html>`;
}


export async function sendResourceRejectedEmail(
  to: string,
  firstName: string,
  resourceTitle: string,
  reason: string,
  resourceUrl?: string
): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Rejection for ${to}: ${resourceTitle} - ${reason?.slice(0, 50)}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderResourceRejectedEmail(firstName, resourceTitle, reason, resourceUrl);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to} | REJECTED: ${resourceTitle}\n   Reason: ${reason}\n`);
    return new EmailResult(true, 'dev-mode');
  }
  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `❌ Votre ressource n'a pas été validée — ${resourceTitle.slice(0, 40)}`,
      html,
    });
    if (result.error) {
      console.error('📧 [REJECTION ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [REJECTION THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendEditApprovedEmail(
  to: string,
  firstName: string,
  resourceTitle: string,
  resourceUrl: string
): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Edit approved for ${to}: ${resourceTitle}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderEditApprovedEmail(firstName, resourceTitle, resourceUrl);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to} | EDIT APPROVED: ${resourceTitle}\n`);
    return new EmailResult(true, 'dev-mode');
  }
  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `✅ Modification approuvée — ${resourceTitle.slice(0, 40)}`,
      html,
    });
    if (result.error) {
      console.error('📧 [EDIT APPROVED ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EDIT APPROVED THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}

export async function sendEditRejectedEmail(
  to: string,
  firstName: string,
  resourceTitle: string,
  reason: string,
  resourceUrl: string
): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Edit rejected for ${to}: ${resourceTitle} - ${reason?.slice(0, 50)}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderEditRejectedEmail(firstName, resourceTitle, reason, resourceUrl);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to} | EDIT REJECTED: ${resourceTitle}\n   Reason: ${reason}\n`);
    return new EmailResult(true, 'dev-mode');
  }
  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `❌ Modification refusée — ${resourceTitle.slice(0, 40)}`,
      html,
    });
    if (result.error) {
      console.error('📧 [EDIT REJECTED ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EDIT REJECTED THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}


export async function sendNewEditPendingEmail(
  to: string,
  teacherName: string,
  resourceTitle: string,
  editSummary: string,
  resourceUrl: string,
  wasPreviouslyRejected: boolean,
  previousRejectionReason?: string
): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] New edit pending for ${to}: ${resourceTitle}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderNewEditPendingEmail(
    teacherName, resourceTitle, editSummary, resourceUrl,
    wasPreviouslyRejected, previousRejectionReason
  );
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to} | NEW EDIT PENDING (rejected=${wasPreviouslyRejected}): ${resourceTitle}\n`);
    return new EmailResult(true, 'dev-mode');
  }
  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: wasPreviouslyRejected
        ? `🔄 Re-soumission à valider — ${resourceTitle.slice(0, 40)}`
        : `✏️ Nouvelle modification à valider — ${resourceTitle.slice(0, 40)}`,
      html,
    });
    if (result.error) {
      console.error('📧 [NEW EDIT PENDING ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [NEW EDIT PENDING THROW]', to, '→', e?.message);
    return new EmailResult(false, 'threw', e?.message);
  }
}


