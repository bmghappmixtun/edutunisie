// Templates additionnels pour notifications admin
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';

export function renderNewTeacherEmail(firstName: string, lastName: string, email: string, school: string | null): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:Arial,sans-serif;background:#FFF7ED;">
<table width="100%"><tr><td align="center" style="padding:40px 20px;">
<table width="480" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(245,158,11,0.15);">
<tr><td style="background:linear-gradient(135deg,#F59E0B,#D97706);padding:32px;text-align:center;">
<h1 style="margin:0;color:white;font-size:24px;">👨‍🏫 Nouveau professeur en attente</h1>
</td></tr>
<tr><td style="padding:32px;">
<h2 style="margin:0 0 16px;color:#0F172A;font-size:20px;">Bonjour Admin,</h2>
<p style="color:#475569;font-size:15px;line-height:1.6;">Un nouvel enseignant vient de s'inscrire sur EduTunisie et attend votre approbation.</p>
<div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:8px;padding:16px;margin:20px 0;">
<p style="margin:0 0 8px;color:#92400E;font-weight:bold;">📋 Informations du compte :</p>
<p style="margin:4px 0;color:#78350F;font-size:14px;"><strong>Nom :</strong> ${firstName} ${lastName}</p>
<p style="margin:4px 0;color:#78350F;font-size:14px;"><strong>Email :</strong> <a href="mailto:${email}" style="color:#0369A1;">${email}</a></p>
${school ? `<p style="margin:4px 0;color:#78350F;font-size:14px;"><strong>Établissement :</strong> ${school}</p>` : ''}
</div>
<p style="color:#475569;font-size:14px;">Connectez-vous à votre dashboard admin pour examiner et approuver ce compte.</p>
<div style="text-align:center;margin:24px 0;">
<a href="${SITE_URL}/admin/approbations" style="background:linear-gradient(135deg,#F59E0B,#D97706);color:white;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:bold;display:inline-block;">Voir les approbations</a>
</div>
<hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;">
<p style="margin:0;color:#94A3B8;font-size:12px;text-align:center;">EduTunisie · Système de notification admin</p>
</td></tr>
</table>
</td></tr>
</table></body></html>`;
}

export function renderNewResourceEmail(teacherName: string, title: string, subject: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:Arial,sans-serif;background:#EFF6FF;">
<table width="100%"><tr><td align="center" style="padding:40px 20px;">
<table width="480" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(59,130,246,0.15);">
<tr><td style="background:linear-gradient(135deg,#3B82F6,#2563EB);padding:32px;text-align:center;">
<h1 style="margin:0;color:white;font-size:24px;">📄 Nouvelle ressource à valider</h1>
</td></tr>
<tr><td style="padding:32px;">
<h2 style="margin:0 0 16px;color:#0F172A;font-size:20px;">Bonjour Admin,</h2>
<p style="color:#475569;font-size:15px;line-height:1.6;">Un enseignant a soumis une nouvelle ressource qui attend votre approbation.</p>
<div style="background:#DBEAFE;border-left:4px solid #3B82F6;border-radius:8px;padding:16px;margin:20px 0;">
<p style="margin:0 0 8px;color:#1E40AF;font-weight:bold;">📚 Détails :</p>
<p style="margin:4px 0;color:#1E3A8A;font-size:14px;"><strong>Titre :</strong> ${title}</p>
<p style="margin:4px 0;color:#1E3A8A;font-size:14px;"><strong>Matière :</strong> ${subject}</p>
<p style="margin:4px 0;color:#1E3A8A;font-size:14px;"><strong>Enseignant :</strong> ${teacherName}</p>
</div>
<div style="text-align:center;margin:24px 0;">
<a href="${SITE_URL}/admin/approbations" style="background:linear-gradient(135deg,#3B82F6,#2563EB);color:white;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:bold;display:inline-block;">Examiner la ressource</a>
</div>
</td></tr>
</table>
</td></tr>
</table></body></html>`;
}

export function renderResourceRejectedEmail(
  firstName: string,
  resourceTitle: string,
  reason: string,
  resourceUrl?: string
): string {
  const safeReason = (reason || 'Aucun motif fourni').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#FEF2F2 0%,#FEE2E2 100%);padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#FEF2F2 0%,#FEE2E2 100%);padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(220,38,38,0.15);">
  <!-- Header with warning gradient -->
  <tr><td style="background:linear-gradient(135deg,#EF4444 0%,#DC2626 50%,#B91C1C 100%);padding:40px 32px;text-align:center;position:relative;">
    <div style="width:80px;height:80px;margin:0 auto 16px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);">
      <div style="font-size:42px;line-height:80px;">❌</div>
    </div>
    <h1 style="margin:0;color:white;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Ressource non validée</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Votre demande nécessite des corrections</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;">
    <p style="margin:0 0 8px;color:#0F172A;font-size:16px;">Bonjour <strong style="color:#0F172A;">${firstName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      Après examen, votre ressource n'a malheureusement pas pu être validée en l'état. Pas d'inquiétude, c'est tout à fait réversible !
    </p>

    <!-- Resource card -->
    <div style="background:linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 100%);border:1px solid #E2E8F0;border-radius:16px;padding:20px;margin:0 0 24px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#0EA5E9,#0369A1);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="color:white;font-size:20px;line-height:40px;text-align:center;width:100%;">📄</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#EF4444;margin-bottom:4px;">Ressource concernée</div>
          <div style="font-weight:700;color:#0F172A;font-size:15px;line-height:1.4;word-break:break-word;">${resourceTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
      </div>
    </div>

    <!-- Reason block -->
    <div style="background:#FEF2F2;border-left:4px solid #EF4444;border-radius:0 12px 12px 0;padding:20px;margin:0 0 24px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <div style="font-size:18px;line-height:32px;text-align:center;width:100%;">💬</div>
        </div>
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#B91C1C;">Motif du refus</div>
      </div>
      <div style="color:#7F1D1D;font-size:14px;line-height:1.6;font-style:italic;padding:4px 0 0 40px;border-left:2px solid rgba(239,68,68,0.2);margin-left:16px;padding-left:16px;padding-top:0;">
        ${safeReason}
      </div>
    </div>

    ${resourceUrl ? `
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${resourceUrl}" style="display:inline-block;background:linear-gradient(135deg,#0EA5E9,#0369A1);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 8px 24px rgba(14,165,233,0.3);">Voir la ressource</a>
    </div>
    ` : ''}

    <!-- Next steps -->
    <div style="background:linear-gradient(135deg,#F0F9FF 0%,#E0F2FE 100%);border:1px solid #BAE6FD;border-radius:16px;padding:20px;margin:0 0 24px;">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0369A1;margin-bottom:12px;">💡 Et maintenant ?</div>
      <ul style="margin:0;padding-left:20px;color:#0F172A;font-size:14px;line-height:1.8;">
        <li>Relisez attentivement le motif ci-dessus</li>
        <li>Corrigez votre fichier en conséquence</li>
        <li>Soumettez à nouveau votre ressource</li>
      </ul>
    </div>

    <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
      Besoin d'aide ou de précisions ? Répondez simplement à cet email, notre équipe vous accompagnera volontiers.
    </p>
  </td></tr>

  <!-- Footer -->
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

export function renderEditApprovedEmail(
  firstName: string,
  resourceTitle: string,
  resourceUrl: string
): string {
  const safeTitle = resourceTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 100%);padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 100%);padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(34,197,94,0.15);">
  <tr><td style="background:linear-gradient(135deg,#10B981 0%,#059669 50%,#047857 100%);padding:40px 32px;text-align:center;">
    <div style="width:80px;height:80px;margin:0 auto 16px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);">
      <div style="font-size:42px;line-height:80px;">✅</div>
    </div>
    <h1 style="margin:0;color:white;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Modification approuvée</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Vos changements sont en ligne</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 8px;color:#0F172A;font-size:16px;">Bonjour <strong style="color:#0F172A;">${firstName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      Excellente nouvelle ! La modification que vous avez soumise pour la ressource ci-dessous a été approuvée par notre équipe et est désormais en ligne sur Examanet.
    </p>
    <div style="background:linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 100%);border:1px solid #E2E8F0;border-radius:16px;padding:20px;margin:0 0 24px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#10B981,#059669);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="color:white;font-size:20px;line-height:40px;text-align:center;width:100%;">📝</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#10B981;margin-bottom:4px;">Ressource modifiée</div>
          <div style="font-weight:700;color:#0F172A;font-size:15px;line-height:1.4;word-break:break-word;">${safeTitle}</div>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${resourceUrl}" style="display:inline-block;background:linear-gradient(135deg,#10B981,#059669);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 8px 24px rgba(16,185,129,0.3);">Voir la version mise à jour</a>
    </div>
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
      Merci pour votre contribution à améliorer Examanet ! Vos modifications aident les élèves tunisiens à apprendre plus efficacement.
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

export function renderEditRejectedEmail(
  firstName: string,
  resourceTitle: string,
  reason: string,
  resourceUrl: string
): string {
  const safeTitle = resourceTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeReason = (reason || 'Aucun motif fourni').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#FEF2F2 0%,#FEE2E2 100%);padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#FEF2F2 0%,#FEE2E2 100%);padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(220,38,38,0.15);">
  <tr><td style="background:linear-gradient(135deg,#EF4444 0%,#DC2626 50%,#B91C1C 100%);padding:40px 32px;text-align:center;">
    <div style="width:80px;height:80px;margin:0 auto 16px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);">
      <div style="font-size:42px;line-height:80px;">📝</div>
    </div>
    <h1 style="margin:0;color:white;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Modification refusée</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Votre demande nécessite des corrections</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 8px;color:#0F172A;font-size:16px;">Bonjour <strong style="color:#0F172A;">${firstName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      Après examen, la modification que vous avez soumise pour la ressource ci-dessous n'a malheureusement pas pu être validée en l'état. Pas d'inquiétude, c'est tout à fait réversible !
    </p>
    <div style="background:linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 100%);border:1px solid #E2E8F0;border-radius:16px;padding:20px;margin:0 0 24px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#0EA5E9,#0369A1);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="color:white;font-size:20px;line-height:40px;text-align:center;width:100%;">📄</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#EF4444;margin-bottom:4px;">Ressource concernée</div>
          <div style="font-weight:700;color:#0F172A;font-size:15px;line-height:1.4;word-break:break-word;">${safeTitle}</div>
        </div>
      </div>
    </div>
    <div style="background:#FEF2F2;border-left:4px solid #EF4444;border-radius:0 12px 12px 0;padding:20px;margin:0 0 24px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <div style="font-size:18px;line-height:32px;text-align:center;width:100%;">💬</div>
        </div>
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#B91C1C;">Motif du refus</div>
      </div>
      <div style="color:#7F1D1D;font-size:14px;line-height:1.6;font-style:italic;margin-left:16px;padding-left:16px;border-left:2px solid rgba(239,68,68,0.2);">
        ${safeReason}
      </div>
    </div>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${resourceUrl}" style="display:inline-block;background:linear-gradient(135deg,#0EA5E9,#0369A1);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 8px 24px rgba(14,165,233,0.3);">Voir la ressource</a>
    </div>
    <div style="background:linear-gradient(135deg,#F0F9FF 0%,#E0F2FE 100%);border:1px solid #BAE6FD;border-radius:16px;padding:20px;margin:0 0 24px;">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0369A1;margin-bottom:12px;">💡 Et maintenant ?</div>
      <ul style="margin:0;padding-left:20px;color:#0F172A;font-size:14px;line-height:1.8;">
        <li>Relisez attentivement le motif ci-dessus</li>
        <li>Soumettez à nouveau une nouvelle modification</li>
        <li>La modification précédente est annulée (le contenu original est conservé)</li>
      </ul>
    </div>
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
      Besoin d'aide ou de précisions ? Répondez simplement à cet email, notre équipe vous accompagnera volontiers.
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

export function renderNewEditPendingEmail(
  teacherName: string,
  resourceTitle: string,
  editSummary: string,
  resourceUrl: string,
  wasPreviouslyRejected: boolean,
  previousRejectionReason?: string
): string {
  const safeTitle = resourceTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeSummary = (editSummary || 'modification').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeTeacher = teacherName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safePrevReason = (previousRejectionReason || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html><body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%);padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%);padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(59,130,246,0.15);">
  <tr><td style="background:linear-gradient(135deg,#3B82F6 0%,#2563EB 50%,#1D4ED8 100%);padding:40px 32px;text-align:center;">
    <div style="width:80px;height:80px;margin:0 auto 16px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);">
      <div style="font-size:42px;line-height:80px;">${wasPreviouslyRejected ? '🔄' : '✏️'}</div>
    </div>
    <h1 style="margin:0;color:white;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${wasPreviouslyRejected ? 'Nouvelle soumission à valider' : 'Modification à valider'}</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">${wasPreviouslyRejected ? 'Le prof a corrigé et re-soumis sa modification' : 'Un enseignant a soumis une modification'}</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 8px;color:#0F172A;font-size:16px;">Bonjour Admin,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
      ${wasPreviouslyRejected
        ? `L'enseignant <strong>${safeTeacher}</strong> a corrigé sa modification suite à votre refus et l'a re-soumise pour validation.`
        : `L'enseignant <strong>${safeTeacher}</strong> a soumis une modification sur la ressource ci-dessous.`}
    </p>

    ${wasPreviouslyRejected && safePrevReason ? `
    <!-- Previous rejection reason (for context) -->
    <div style="background:#FEF2F2;border-left:4px solid #EF4444;border-radius:0 12px 12px 0;padding:16px;margin:0 0 16px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#B91C1C;margin-bottom:6px;">⚠️ Motif du refus précédent</div>
      <div style="color:#7F1D1D;font-size:13px;line-height:1.5;font-style:italic;">${safePrevReason}</div>
    </div>
    ` : ''}

    <!-- Resource card -->
    <div style="background:linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 100%);border:1px solid #E2E8F0;border-radius:16px;padding:20px;margin:0 0 16px;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#0EA5E9,#0369A1);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="color:white;font-size:20px;line-height:40px;text-align:center;width:100%;">📄</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#3B82F6;margin-bottom:4px;">Ressource modifiée</div>
          <div style="font-weight:700;color:#0F172A;font-size:15px;line-height:1.4;word-break:break-word;">${safeTitle}</div>
          <div style="font-size:12px;color:#64748B;margin-top:6px;">📝 ${safeSummary}</div>
        </div>
      </div>
    </div>

    <div style="text-align:center;margin:0 0 16px;">
      <a href="${resourceUrl}" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#2563EB);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 8px 24px rgba(59,130,246,0.3);">Examiner la modification</a>
    </div>
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
