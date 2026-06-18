import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'EduTunisie <noreply@edutunisie.tn>';

export async function sendOTPEmail(to: string, code: string, firstName?: string) {
  // Skip real sending if disabled (tests, dev, quota exceeded)
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] OTP for ${to}: ${code}`);
    return { id: 'test-mode', status: 'skipped' };
  }
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

// Welcome email - sent right after account creation (before OTP verification)
export async function sendWelcomeEmail(to: string, firstName: string, role: string) {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Welcome for ${to}`);
    return { id: 'test-mode' };
  }
  const html = renderWelcomeEmail(firstName, role);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to} | Welcome (${role}) - awaiting OTP\n`);
    return { id: 'dev-mode' };
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `🎉 Bienvenue sur EduTunisie, ${firstName} !`,
      html,
    });
  } catch (e: any) {
    console.error('Welcome email error:', e);
  }
}

// Confirmation email - sent after OTP verification succeeds
export async function sendWelcomeConfirmedEmail(to: string, firstName: string, role: string) {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Confirmation for ${to}`);
    return { id: 'test-mode' };
  }
  const html = renderWelcomeConfirmedEmail(firstName, role);
  if (!resend) {
    console.log(`\n📧 [EMAIL - DEV] To: ${to} | Account confirmed (${role})\n`);
    return { id: 'dev-mode' };
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `✅ Votre compte EduTunisie est activé !`,
      html,
    });
  } catch (e: any) {
    console.error('Confirmation email error:', e);
  }
}

export async function sendTeacherApprovalEmail(to: string, firstName: string, approved: boolean, reason?: string) {
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Teacher ${approved ? 'APPROVED' : 'REJECTED'} for ${to}`);
    return { id: 'test-mode' };
  }
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
  if (process.env.DISABLE_EMAILS === 'true' || process.env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] Resource approved for ${to}: ${title}`);
    return { id: 'test-mode' };
  }
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

function renderWelcomeEmail(firstName: string, role: string): string {
  const isTeacher = role === 'TEACHER';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#F0F9FF;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px;">
<table width="480" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(14,165,233,0.15);">
<tr><td style="background:linear-gradient(135deg,#0EA5E9,#0369A1);padding:40px 32px;text-align:center;">
<h1 style="margin:0;color:white;font-size:32px;">🎉 Bienvenue ${firstName} !</h1>
<p style="margin:12px 0 0;color:#BAE6FD;font-size:15px;">Votre compte EduTunisie a été créé</p>
</td></tr>
<tr><td style="padding:40px 32px;">
<h2 style="margin:0 0 16px;color:#0F172A;font-size:20px;">On est ravis de vous compter parmi nous !</h2>
<p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">Vous venez de rejoindre la communauté EduTunisie, la plateforme pédagogique #1 en Tunisie, qui aide les élèves et enseignants à partager et découvrir des ressources éducatives de qualité.</p>

<div style="background:#F0F9FF;border-radius:12px;padding:20px;margin:0 0 24px;">
<p style="margin:0 0 8px;color:#0F172A;font-weight:bold;font-size:14px;">📋 Prochaine étape :</p>
<p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">${isTeacher
  ? 'Vérifiez votre email avec le code OTP que vous avez reçu, puis attendez l\'approbation de notre équipe pour publier vos ressources.'
  : 'Vérifiez votre email avec le code OTP que vous venez de recevoir pour activer votre compte et commencer à explorer les ressources.'
}</p>
</div>

${isTeacher ? `
<div style="background:#FEF3C7;border-radius:12px;padding:16px;margin:0 0 24px;border-left:4px solid #F59E0B;">
<p style="margin:0;color:#92400E;font-size:13px;line-height:1.5;"><strong>👨‍🏫 Compte enseignant :</strong> Après vérification, votre compte sera examiné par notre équipe sous 24-48h.</p>
</div>
` : ''}

<p style="margin:0 0 8px;color:#0F172A;font-weight:bold;font-size:14px;">Ce que vous pouvez faire :</p>
<ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;">
  <li>Parcourir des milliers de ressources gratuites</li>
  <li>Sauvegarder vos favorites</li>
  <li>Suivre vos enseignants préférés</li>
  ${isTeacher ? '<li>Publier vos propres cours et devoirs</li>' : '<li>Laisser des avis et commentaires</li>'}
</ul>

<div style="text-align:center;margin:24px 0 0;">
<a href="https://edutunisie.vercel.app" style="background:linear-gradient(135deg,#0EA5E9,#0369A1);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;display:inline-block;font-size:15px;">Visiter EduTunisie</a>
</div>

<hr style="border:none;border-top:1px solid #E2E8F0;margin:32px 0 16px;">
<p style="margin:0;color:#94A3B8;font-size:12px;text-align:center;">EduTunisie · Conçu avec ❤️ en Tunisie 🇹🇳 pour les élèves tunisiens</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function renderWelcomeConfirmedEmail(firstName: string, role: string): string {
  const isTeacher = role === 'TEACHER';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#F0FDF4;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px;">
<table width="480" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(16,185,129,0.15);">
<tr><td style="background:linear-gradient(135deg,#10B981,#059669);padding:40px 32px;text-align:center;">
<h1 style="margin:0;color:white;font-size:32px;">✅ Compte activé !</h1>
<p style="margin:12px 0 0;color:#A7F3D0;font-size:15px;">Votre email a été vérifié avec succès</p>
</td></tr>
<tr><td style="padding:40px 32px;">
<h2 style="margin:0 0 16px;color:#0F172A;font-size:20px;">Félicitations ${firstName} ! 🎊</h2>
<p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">${isTeacher
  ? 'Votre email est confirmé. Votre compte enseignant est maintenant en attente d\'approbation par notre équipe. Vous recevrez un email dès qu\'il sera validé (généralement sous 24-48h).'
  : 'Votre compte est officiellement actif ! Vous pouvez maintenant vous connecter et profiter de toutes les ressources gratuites d\'EduTunisie.'
}</p>

${!isTeacher ? `
<div style="text-align:center;margin:32px 0;">
<a href="https://edutunisie.vercel.app/mon-compte" style="background:linear-gradient(135deg,#10B981,#059669);color:white;text-decoration:none;padding:16px 36px;border-radius:12px;font-weight:bold;display:inline-block;font-size:16px;box-shadow:0 4px 14px rgba(16,185,129,0.3);">Accéder à mon espace</a>
</div>
` : `
<div style="background:#FEF3C7;border-radius:12px;padding:20px;margin:24px 0;border-left:4px solid #F59E0B;">
<p style="margin:0;color:#92400E;font-size:14px;line-height:1.6;"><strong>⏳ Prochaine étape :</strong> Notre équipe examine votre demande. Vous serez notifié par email dès l'approbation.</p>
</div>
`}

<hr style="border:none;border-top:1px solid #E2E8F0;margin:32px 0 16px;">
<p style="margin:0;color:#94A3B8;font-size:12px;text-align:center;">EduTunisie · Conçu avec ❤️ en Tunisie 🇹🇳</p>
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