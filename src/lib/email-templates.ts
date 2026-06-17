// Templates additionnels pour notifications admin
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
<a href="https://edutunisie.vercel.app/admin/approbations" style="background:linear-gradient(135deg,#F59E0B,#D97706);color:white;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:bold;display:inline-block;">Voir les approbations</a>
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
<a href="https://edutunisie.vercel.app/admin/approbations" style="background:linear-gradient(135deg,#3B82F6,#2563EB);color:white;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:bold;display:inline-block;">Examiner la ressource</a>
</div>
</td></tr>
</table>
</td></tr>
</table></body></html>`;
}