import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'EduTunisie <noreply@edutunisie.tn>';

// In dev/test mode without proper Resend domain, log OTP to console so dev can test
const DEV_SHOW_OTP = true; // Always show dev code as fallback when email fails

export class EmailResult {
  constructor(
    public success: boolean,
    public id: string,
    public error?: string,
    public devCode?: string
  ) {}
}

export async function sendOTPEmail(to: string, code: string, firstName?: string): Promise<EmailResult> {
  // Skip real sending if disabled (tests, dev, quota exceeded)
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] OTP for ${to}: ${code}`);
    return new EmailResult(true, 'test-mode');
  }
  const html = renderOTPEmail(code, firstName || '');
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to}`);
    console.log(`   Code: ${code}`);
    console.log(`   (Set RESEND_API_KEY env var to send real emails)\n`);
    return new EmailResult(true, 'dev-mode', undefined, code);
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `${code} — Votre code EduTunisie`,
      html,
    });
    if (result.error) {
      console.error('📧 [EMAIL ERROR]', to, '→', result.error.message);
      if (DEV_SHOW_OTP) {
        console.log(`\n📧 [DEV FALLBACK] OTP for ${to}: ${code}\n`);
        return new EmailResult(false, 'failed', result.error.message, code);
      }
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [EMAIL THROW]', to, '→', e?.message);
    if (DEV_SHOW_OTP) {
      console.log(`\n📧 [DEV FALLBACK] OTP for ${to}: ${code}\n`);
      return new EmailResult(false, 'threw', e?.message, code);
    }
    throw e;
  }
}

// Welcome email - sent right after account creation (before OTP verification)
export async function sendWelcomeEmail(to: string, firstName: string, role: string): Promise<EmailResult> {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Welcome for ${to}`);
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
      subject: `🎉 Bienvenue sur EduTunisie, ${firstName} !`,
      html,
    });
    if (result.error) {
      console.error('📧 [WELCOME ERROR]', to, '→', result.error.message);
      return new EmailResult(false, 'failed', result.error.message);
    }
    return new EmailResult(true, result.data?.id || 'sent');
  } catch (e: any) {
    console.error('📧 [WELCOME THROW]', to, '→', e?.message);
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
    // Send to admin
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

// =============================================================================
// Email templates
// =============================================================================

function renderOTPEmail(code: string, firstName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #0EA5E9, #0369A1); padding: 32px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 24px;">Vérifiez votre email</h1>
      <p style="margin: 8px 0 0; opacity: 0.9;">Code de confirmation EduTunisie</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #334155; font-size: 16px;">Bonjour ${firstName || 'cher utilisateur'},</p>
      <p style="color: #334155; font-size: 16px;">Voici votre code de vérification :</p>
      <div style="background: #0EA5E9; color: white; font-size: 36px; font-weight: 800; text-align: center; padding: 24px; border-radius: 12px; letter-spacing: 8px; margin: 24px 0;">
        ${code}
      </div>
      <p style="color: #64748b; font-size: 14px;">Ce code est valide pendant <strong>30 minutes</strong>.</p>
      <p style="color: #64748b; font-size: 14px;">Si vous n'avez pas créé de compte, ignorez cet email.</p>
    </div>
    <div style="background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
      © 2026 EduTunisie · La plateforme pédagogique #1 en Tunisie
    </div>
  </div>
</body>
</html>`;
}

function renderWelcomeEmail(firstName: string, role: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f1f5f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #F59E0B, #D97706); padding: 32px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 28px;">🎉 Bienvenue ${firstName} !</h1>
    </div>
    <div style="padding: 32px;">
      <p>Votre compte a été créé sur EduTunisie.</p>
      <p>Vous êtes inscrit en tant que <strong>${role === 'TEACHER' ? 'Enseignant' : 'Élève'}</strong>.</p>
      <p>📧 Un code de vérification vient de vous être envoyé. Vérifiez votre boîte mail pour activer votre compte.</p>
    </div>
  </div>
</body>
</html>`;
}

function renderWelcomeConfirmedEmail(firstName: string, role: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f1f5f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 32px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 28px;">✅ Compte activé !</h1>
    </div>
    <div style="padding: 32px;">
      <p>Bonjour ${firstName},</p>
      <p>Votre email a été vérifié avec succès. Votre compte ${role === 'TEACHER' ? 'enseignant' : 'élève'} est maintenant ${role === 'TEACHER' ? 'en attente d\'approbation par un administrateur' : 'actif'}.</p>
      <p>Vous pouvez dès maintenant vous connecter à la plateforme.</p>
    </div>
  </div>
</body>
</html>`;
}

function renderContactEmail(p: { name: string; email: string; subject: string; message: string }): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <h2>Nouveau message de contact</h2>
  <p><strong>De:</strong> ${p.name} (${p.email})</p>
  <p><strong>Sujet:</strong> ${p.subject}</p>
  <hr>
  <p>${p.message.replace(/\n/g, '<br>')}</p>
</body>
</html>`;
}

function renderTeacherApprovalEmail(firstName: string, approved: boolean): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <h2>${approved ? '🎉 Compte approuvé !' : 'Mise à jour du compte'}</h2>
  <p>Bonjour ${firstName},</p>
  <p>${approved ? 'Votre compte enseignant a été approuvé. Vous pouvez maintenant publier des ressources.' : 'Votre demande n\'a pas été approuvée. Contactez le support pour plus d\'informations.'}</p>
</body>
</html>`;
}

function renderResourceApprovedEmail(firstName: string, resourceTitle: string, approved: boolean): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <h2>${approved ? '✅ Ressource approuvée' : 'Ressource non approuvée'}</h2>
  <p>Bonjour ${firstName},</p>
  <p>Votre ressource <strong>${resourceTitle}</strong> a été ${approved ? 'approuvée et publiée' : 'refusée'}.</p>
</body>
</html>`;
}
