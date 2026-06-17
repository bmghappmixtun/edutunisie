import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'EduTunisie <noreply@edutunisie.tn>';

export async function sendOTPEmail(to: string, code: string, firstName?: string) {
  const html = renderOTPEmail(code, firstName || '');
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to}`);
    console.log(`   Code: ${code}`);
    console.log(`   (Set RESEND_API_KEY env var to send real emails)\n`);
    return { id: 'dev-mode', status: 'logged' };
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `${code} — Votre code EduTunisie`,
      html,
    });
    return result;
  } catch (e: any) {
    console.error('Email send error:', e);
    throw e;
  }
}

export async function sendTeacherApprovalEmail(to: string, firstName: string, approved: boolean, reason?: string) {
  const html = approved
    ? renderTeacherApprovedEmail(firstName)
    : renderTeacherRejectedEmail(firstName, reason);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to} | Teacher ${approved ? 'APPROVED' : 'REJECTED'}\n`);
    return { id: 'dev-mode' };
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: approved ? '🎉 Votre compte EduTunisie est approuvé !' : 'Votre demande de compte enseignant',
      html,
    });
  } catch (e: any) {
    console.error('Email error:', e);
  }
}

export async function sendResourceApprovedEmail(to: string, firstName: string, title: string, slug: string) {
  const html = renderResourceApprovedEmail(firstName, title);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] Resource approved for ${to}: ${title}\n`);
    return { id: 'dev-mode' };
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `✅ Votre ressource "${title}" est en ligne !`,
      html,
    });
  } catch (e: any) {
    console.error('Email error:', e);
  }
}

// Email templates

function renderOTPEmail(code: string, firstName: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#F0F9FF;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px;">
<table width="480" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(14,165,233,0.15);">
<tr><td style="background:linear-gradient(135deg,#0EA5E9,#0369A1);padding:32px;text-align:center;">
<h1 style="margin:0;color:white;font-size:28px;">📚 EduTunisie</h1>
<p style="margin:8px 0 0;color:#BAE6FD;font-size:14px;">La plateforme pédagogique #1 en Tunisie</p>
</td></tr>
<tr><td style="padding:40px 32px;">
<h2 style="margin:0 0 16px;color:#0F172A;font-size:22px;">Bonjour ${firstName || 'cher utilisateur'} 👋</h2>
<p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">Voici votre code de vérification à utiliser pour confirmer votre compte :</p>
<div style="background:linear-gradient(135deg,#F0F9FF,#E0F2FE);border:2px dashed #0EA5E9;border-radius:16px;padding:24px;text-align:center;margin:0 0 24px;">
<div style="font-size:42px;font-weight:800;color:#0369A1;letter-spacing:8px;font-family:monospace;">${code}</div>
</div>
<p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">Ce code expire dans <strong>10 minutes</strong>. Si vous n'avez pas demandé ce code, ignorez cet email.</p>
<hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;">
<p style="margin:0;color:#94A3B8;font-size:12px;text-align:center;">EduTunisie · Plateforme pédagogique tunisienne 🇹🇳</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function renderTeacherApprovedEmail(firstName: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:Arial,sans-serif;background:#F0FDF4;">
<table width="100%"><tr><td align="center" style="padding:40px 20px;">
<table width="480" style="background:white;border-radius:24px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#10B981,#059669);padding:32px;text-align:center;">
<h1 style="margin:0;color:white;font-size:28px;">🎉 Bienvenue !</h1>
</td></tr>
<tr><td style="padding:40px 32px;">
<h2 style="margin:0 0 16px;color:#0F172A;font-size:22px;">Bonjour ${firstName},</h2>
<p style="color:#475569;font-size:15px;line-height:1.6;">Votre compte enseignant a été <strong style="color:#10B981;">approuvé</strong> par notre équipe.</p>
<p style="color:#475569;font-size:15px;line-height:1.6;">Vous pouvez maintenant vous connecter et commencer à partager vos ressources avec la communauté EduTunisie !</p>
<div style="text-align:center;margin:32px 0;">
<a href="https://edutunisie.vercel.app/enseignant" style="background:linear-gradient(135deg,#10B981,#059669);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;display:inline-block;">Accéder à mon espace</a>
</div>
</td></tr>
</table>
</td></tr>
</table></body></html>`;
}

function renderTeacherRejectedEmail(firstName: string, reason?: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:Arial,sans-serif;background:#FEF2F2;">
<table width="100%"><tr><td align="center" style="padding:40px 20px;">
<table width="480" style="background:white;border-radius:24px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#EF4444,#DC2626);padding:32px;text-align:center;">
<h1 style="margin:0;color:white;font-size:28px;">Compte non approuvé</h1>
</td></tr>
<tr><td style="padding:40px 32px;">
<h2 style="margin:0 0 16px;color:#0F172A;font-size:22px;">Bonjour ${firstName},</h2>
<p style="color:#475569;font-size:15px;line-height:1.6;">Votre demande de compte enseignant n'a malheureusement pas été acceptée.</p>
${reason ? `<p style="color:#475569;font-size:14px;line-height:1.6;"><strong>Raison :</strong> ${reason}</p>` : ''}
<p style="color:#475569;font-size:15px;line-height:1.6;">Si vous pensez qu'il s'agit d'une erreur, contactez-nous à <a href="mailto:contact@edutunisie.tn">contact@edutunisie.tn</a></p>
</td></tr>
</table>
</td></tr>
</table></body></html>`;
}

function renderResourceApprovedEmail(firstName: string, title: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:Arial,sans-serif;background:#F0F9FF;">
<table width="100%"><tr><td align="center" style="padding:40px 20px;">
<table width="480" style="background:white;border-radius:24px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#0EA5E9,#0369A1);padding:32px;text-align:center;">
<h1 style="margin:0;color:white;font-size:28px;">✅ Ressource publiée !</h1>
</td></tr>
<tr><td style="padding:40px 32px;">
<h2 style="margin:0 0 16px;color:#0F172A;font-size:22px;">Bonjour ${firstName},</h2>
<p style="color:#475569;font-size:15px;line-height:1.6;">Votre ressource <strong>"${title}"</strong> a été approuvée et est maintenant visible publiquement sur EduTunisie.</p>
<div style="text-align:center;margin:32px 0;">
<a href="https://edutunisie.vercel.app/ressources" style="background:linear-gradient(135deg,#0EA5E9,#0369A1);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;display:inline-block;">Voir mes ressources</a>
</div>
</td></tr>
</table>
</td></tr>
</table></body></html>`;
}