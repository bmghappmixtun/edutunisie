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

export async function sendResourceApprovedEmail(to: string, firstName: string, resourceTitle: string, approved: boolean): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
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


