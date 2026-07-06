import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'Examanet <noreply@examanet.com>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
const INVITATION_TTL_DAYS = 10;

// Status constants
export const INV_STATUS = {
  PENDING: 'PENDING',     // Created, email not yet sent
  SENT: 'SENT',           // Email sent, link not clicked
  CLICKED: 'CLICKED',     // Link clicked, not yet activated
  ACTIVATED: 'ACTIVATED', // Teacher set their own password
  EXPIRED: 'EXPIRED',     // Past 10 days without activation
  CANCELLED: 'CANCELLED', // Admin cancelled
} as const;

// User.status for invitations
export const USER_INV_STATUS = {
  PENDING_INVITATION: 'PENDING_INVITATION',
  INVITED: 'INVITED',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  ACTIVATED: 'ACTIVATED',
} as const;

/**
 * Generate a secure URL-safe token for invitation link
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a unique random 8-char password
 * Uses unambiguous chars (no 0/O/1/l/I), mixed case + digits
 */
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

/**
 * Create an invitation record for a teacher
 */
export async function createInvitation(teacherId: string, invitedById?: string, customMessage?: string) {
  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { id: true, email: true, firstName: true, lastName: true, status: true }
  });
  if (!teacher) throw new Error('Teacher not found');
  if (!teacher.email) throw new Error('Teacher has no email');

  const token = generateInvitationToken();
  const tempPassword = generateTempPassword();
  const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.teacherInvitation.create({
    data: {
      teacherId,
      email: teacher.email,
      token,
      tempPassword: tempPasswordHash, // Stored hashed
      expiresAt,
      status: INV_STATUS.PENDING,
      invitedById,
      customMessage,
    }
  });

  // Update User: lock account with new temp password
  await prisma.user.update({
    where: { id: teacherId },
    data: {
      passwordHash: tempPasswordHash,
      invitationStatus: USER_INV_STATUS.PENDING_INVITATION,
      lastInvitationId: invitation.id,
      mustChangePassword: true,
      status: 'PENDING_OTP', // Force activation flow
    }
  });

  return { invitation, tempPassword, token };
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(invitationId: string, tempPassword: string): Promise<{ ok: boolean; error?: string }> {
  const inv = await prisma.teacherInvitation.findUnique({
    where: { id: invitationId },
    include: { teacher: { select: { firstName: true, lastName: true } } }
  });
  if (!inv) return { ok: false, error: 'Invitation not found' };

  const teacherName = `${inv.teacher.firstName || ''} ${inv.teacher.lastName || ''}`.trim() || 'Cher enseignant';
  const acceptUrl = `${SITE_URL}/invitation/${inv.token}`;
  const landingUrl = `${SITE_URL}/enseignants/rejoindre`;

  // Count their files
  const fileCount = await prisma.resource.count({
    where: { teacherId: inv.teacherId, status: 'PUBLISHED' }
  });

  const html = renderInvitationEmail({
    teacherName,
    teacherEmail: inv.email,
    acceptUrl,
    landingUrl,
    tempPassword,
    fileCount,
    customMessage: inv.customMessage,
    expiresAt: inv.expiresAt,
  });

  if (!resend) {
    console.log(`\n📧 [INVITATION - DEV] To: ${inv.email}`);
    console.log(`   Name: ${teacherName}`);
    console.log(`   Temp password: ${tempPassword}`);
    console.log(`   Accept URL: ${acceptUrl}`);
    console.log(`   Files: ${fileCount}`);
    return { ok: true };
  }

  try {
    const result: any = await resend.emails.send({
      from: FROM,
      to: [inv.email],
      subject: `${teacherName}, vos ${fileCount} fichiers vous attendent sur Examanet 🎓`,
      html,
    });

    if (result.error) {
      console.error('📧 [INVITATION ERROR]', inv.email, '→', result.error.message);
      return { ok: false, error: result.error.message };
    }

    await prisma.teacherInvitation.update({
      where: { id: invitationId },
      data: {
        status: INV_STATUS.SENT,
        emailSentAt: new Date(),
      }
    });

    await prisma.user.update({
      where: { id: inv.teacherId },
      data: {
        invitationStatus: USER_INV_STATUS.INVITED,
        invitationSentAt: new Date(),
      }
    });

    return { ok: true };
  } catch (e: any) {
    console.error('📧 [INVITATION THROW]', inv.email, '→', e?.message);
    return { ok: false, error: e?.message };
  }
}

/**
 * Record a link click
 */
export async function recordInvitationClick(token: string, ipAddress?: string, userAgent?: string) {
  const inv = await prisma.teacherInvitation.findUnique({ where: { token } });
  if (!inv) return null;
  if (inv.status === INV_STATUS.ACTIVATED || inv.status === INV_STATUS.EXPIRED || inv.status === INV_STATUS.CANCELLED) {
    return inv;
  }

  // Auto-expire if past expiresAt
  if (new Date() > inv.expiresAt) {
    await prisma.teacherInvitation.update({
      where: { id: inv.id },
      data: { status: INV_STATUS.EXPIRED }
    });
    return { ...inv, status: INV_STATUS.EXPIRED };
  }

  const updates: any = {
    clickCount: { increment: 1 },
  };
  if (!inv.linkClickedAt) {
    updates.status = INV_STATUS.CLICKED;
    updates.linkClickedAt = new Date();
    updates.clickIpAddress = ipAddress;
    updates.clickUserAgent = userAgent;
  }

  return prisma.teacherInvitation.update({
    where: { id: inv.id },
    data: updates,
  });
}

/**
 * Activate an invitation: teacher sets their own password
 */
export async function activateInvitation(token: string, newPassword: string, ipAddress?: string, userAgent?: string) {
  const inv = await prisma.teacherInvitation.findUnique({ where: { token } });
  if (!inv) return { ok: false, error: 'Invitation introuvable' };
  if (inv.status === INV_STATUS.ACTIVATED) return { ok: false, error: 'Cette invitation a déjà été activée' };
  if (inv.status === INV_STATUS.CANCELLED) return { ok: false, error: 'Cette invitation a été annulée' };
  if (inv.status === INV_STATUS.EXPIRED) return { ok: false, error: 'Cette invitation a expiré (10 jours)' };
  if (new Date() > inv.expiresAt) {
    await prisma.teacherInvitation.update({
      where: { id: inv.id },
      data: { status: INV_STATUS.EXPIRED }
    });
    return { ok: false, error: 'Cette invitation a expiré (10 jours)' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'Le mot de passe doit contenir au moins 6 caractères' };
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: inv.teacherId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        passwordSetAt: new Date(),
        invitationStatus: USER_INV_STATUS.ACTIVATED,
        invitationActivatedAt: new Date(),
        status: 'ACTIVE',
        emailVerifiedAt: new Date(), // Email is verified by receiving the invitation
      }
    }),
    prisma.teacherInvitation.update({
      where: { id: inv.id },
      data: {
        status: INV_STATUS.ACTIVATED,
        activatedAt: new Date(),
        activateIpAddress: ipAddress,
        activateUserAgent: userAgent,
      }
    }),
  ]);

  return { ok: true };
}

/**
 * Cancel an invitation (admin action)
 */
export async function cancelInvitation(invitationId: string) {
  const inv = await prisma.teacherInvitation.findUnique({ where: { id: invitationId } });
  if (!inv) return { ok: false, error: 'Invitation introuvable' };
  if (inv.status === INV_STATUS.ACTIVATED) return { ok: false, error: 'Impossible d\'annuler une invitation activée' };

  await prisma.$transaction([
    prisma.teacherInvitation.update({
      where: { id: invitationId },
      data: {
        status: INV_STATUS.CANCELLED,
        cancelledAt: new Date(),
      }
    }),
    prisma.user.update({
      where: { id: inv.teacherId },
      data: {
        invitationStatus: USER_INV_STATUS.INVITATION_EXPIRED,
      }
    }),
  ]);

  return { ok: true };
}

/**
 * Expire stale invitations (called by cron or on-demand)
 */
export async function expireStaleInvitations() {
  const now = new Date();
  const stale = await prisma.teacherInvitation.findMany({
    where: {
      status: { in: [INV_STATUS.PENDING, INV_STATUS.SENT, INV_STATUS.CLICKED] },
      expiresAt: { lt: now },
    },
    select: { id: true, teacherId: true }
  });

  if (stale.length === 0) return { expired: 0 };

  await prisma.$transaction([
    prisma.teacherInvitation.updateMany({
      where: { id: { in: stale.map(s => s.id) } },
      data: { status: INV_STATUS.EXPIRED }
    }),
    prisma.user.updateMany({
      where: { id: { in: stale.map(s => s.teacherId) } },
      data: { invitationStatus: USER_INV_STATUS.INVITATION_EXPIRED }
    }),
  ]);

  return { expired: stale.length };
}

// ======================== EMAIL TEMPLATE ========================

function renderInvitationEmail(args: {
  teacherName: string;
  teacherEmail: string;
  acceptUrl: string;
  landingUrl: string;
  tempPassword: string;
  fileCount: number;
  customMessage?: string | null;
  expiresAt: Date;
}): string {
  const { teacherName, acceptUrl, landingUrl, tempPassword, fileCount, customMessage } = args;
  const daysLeft = 10;
  const firstName = teacherName.split(' ')[0] || 'Cher enseignant';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Vos fichiers vous attendent sur Examanet</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<!-- Preheader (hidden) -->
<div style="display:none;max-height:0;overflow:hidden">${fileCount} fichiers vous attendent — activez votre compte enseignant gratuit sur Examanet</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

  <!-- HEADER -->
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#0EA5E9 0%,#0369A1 100%);border-radius:16px 16px 0 0;padding:32px 40px">
      <tr>
        <td>
          <div style="display:inline-block;background:rgba(255,255,255,0.15);padding:6px 14px;border-radius:999px;color:white;font-size:12px;font-weight:600;letter-spacing:0.5px">EXAMANET • PLATEFORME ÉDUCATIVE TUNISIENNE</div>
        </td>
      </tr>
      <tr><td style="padding-top:24px">
        <h1 style="margin:0;color:white;font-size:30px;line-height:1.2;font-weight:800">Vos fichiers vous attendent 🎓</h1>
        <p style="margin:12px 0 0 0;color:rgba(255,255,255,0.92);font-size:16px;line-height:1.5">${firstName}, on a préparé ${fileCount} de vos ressources pour les rendre visibles à des milliers d'élèves tunisiens.</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- BODY -->
  <tr><td style="background:white;padding:40px">

    ${customMessage ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:8px;margin-bottom:24px"><p style="margin:0;color:#78350f;font-size:14px;line-height:1.6;font-style:italic">${customMessage.replace(/\n/g, '<br>')}</p></div>` : ''}

    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#334155">Bonjour <strong>${teacherName}</strong>,</p>

    <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#334155">Vous avez partagé <strong>${fileCount} ressources</strong> via JotForm ces dernières années. Nous les avons <strong>conservées, indexées et publiées</strong> sur Examanet — la plateforme éducative tunisienne qui rassemble désormais des milliers de devoirs, cours et exercices.</p>

    <!-- Files summary box -->
    <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #bae6fd;border-radius:12px;padding:20px;margin:24px 0">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="background:#0EA5E9;color:white;width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px">📚</div>
        <div>
          <div style="font-size:14px;color:#0369a1;font-weight:600">VOS RESSOURCES SONT EN LIGNE</div>
          <div style="font-size:24px;color:#0c4a6e;font-weight:800;margin-top:2px">${fileCount} fichiers publiés</div>
        </div>
      </div>
    </div>

    <p style="margin:24px 0 16px 0;font-size:16px;line-height:1.6;color:#334155">En activant votre compte enseignant <strong>gratuit</strong>, vous pouvez :</p>

    <!-- Benefits list -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0">
      <tr><td style="padding:10px 0"><table role="presentation"><tr>
        <td style="vertical-align:top;padding-right:12px"><div style="background:#dcfce7;color:#16a34a;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700">✓</div></td>
        <td style="font-size:15px;line-height:1.5;color:#334155"><strong>Récupérer vos ${fileCount} fichiers</strong> — versions Word d'origine et PDF propres (sans watermark)</td>
      </tr></table></td></tr>
      <tr><td style="padding:10px 0"><table role="presentation"><tr>
        <td style="vertical-align:top;padding-right:12px"><div style="background:#dcfce7;color:#16a34a;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700">📊</div></td>
        <td style="font-size:15px;line-height:1.5;color:#334155"><strong>Voir les statistiques</strong> de vos ressources — téléchargements, vues, notes, commentaires</td>
      </tr></table></td></tr>
      <tr><td style="padding:10px 0"><table role="presentation"><tr>
        <td style="vertical-align:top;padding-right:12px"><div style="background:#dcfce7;color:#16a34a;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700">✏️</div></td>
        <td style="font-size:15px;line-height:1.5;color:#334155"><strong>Modifier vos fichiers</strong> après publication (correction, mise à jour, ajout)</td>
      </tr></table></td></tr>
      <tr><td style="padding:10px 0"><table role="presentation"><tr>
        <td style="vertical-align:top;padding-right:12px"><div style="background:#dcfce7;color:#16a34a;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700">👥</div></td>
        <td style="font-size:15px;line-height:1.5;color:#334155"><strong>Gagner en visibilité</strong> auprès de <strong>25 000+ élèves et enseignants</strong> tunisiens qui utilisent Examanet chaque mois</td>
      </tr></table></td></tr>
      <tr><td style="padding:10px 0"><table role="presentation"><tr>
        <td style="vertical-align:top;padding-right:12px"><div style="background:#dcfce7;color:#16a34a;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;font-weight:700">💬</div></td>
        <td style="font-size:15px;line-height:1.5;color:#334155"><strong>Recevoir des messages</strong> d'élèves qui ont des questions sur vos devoirs</td>
      </tr></table></td></tr>
    </table>

    <!-- Login credentials card -->
    <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin:32px 0">
      <div style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px">🔐 VOS IDENTIFIANTS DE CONNEXION</div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#64748b;width:140px">Email</td>
          <td style="padding:8px 0;font-size:15px;color:#0f172a;font-weight:600;font-family:monospace">${args.teacherEmail}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#64748b">Mot de passe temporaire</td>
          <td style="padding:8px 0">
            <span style="display:inline-block;background:#0f172a;color:white;padding:8px 16px;border-radius:8px;font-family:monospace;font-size:18px;font-weight:700;letter-spacing:2px">${tempPassword}</span>
          </td>
        </tr>
      </table>

      <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:13px;color:#78350f;line-height:1.5">
        ⚠️ <strong>Important</strong> — Ce mot de passe est à usage unique. Vous devrez le changer lors de l'activation de votre compte. Vous avez <strong>${daysLeft} jours</strong> pour activer votre compte.
      </div>
    </div>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0">
      <tr><td align="center">
        <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(135deg,#0EA5E9,#0369A1);color:white;text-decoration:none;padding:18px 48px;border-radius:12px;font-size:17px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(14,165,233,0.35)">Activer mon compte gratuit →</a>
      </td></tr>
    </table>

    <p style="text-align:center;font-size:13px;color:#94a3b8;margin:8px 0 32px 0">ou copier ce lien : <a href="${acceptUrl}" style="color:#0EA5E9;text-decoration:underline;word-break:break-all">${acceptUrl}</a></p>

    <!-- Landing page link -->
    <div style="background:#fafafa;border-radius:12px;padding:20px;text-align:center;margin:24px 0">
      <p style="margin:0 0 8px 0;font-size:14px;color:#64748b">Envie d'en savoir plus sur les avantages pour les enseignants ?</p>
      <a href="${landingUrl}" style="color:#0EA5E9;font-weight:600;text-decoration:none;font-size:15px">Découvrir tous les avantages →</a>
    </div>

    <p style="margin:32px 0 0 0;font-size:15px;line-height:1.6;color:#334155">À très vite sur Examanet,<br><strong style="color:#0EA5E9">L'équipe Examanet</strong></p>

  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#f8fafc;padding:24px 40px;border-radius:0 0 16px 16px;border-top:1px solid #e2e8f0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-size:12px;color:#94a3b8;line-height:1.5">
          Cet email a été envoyé à <strong>${args.teacherEmail}</strong> car vous avez partagé des ressources via JotForm / devoirat.net.<br>
          Vous ne souhaitez pas rejoindre Examanet ? <a href="${SITE_URL}/api/invitation/unsubscribe?token=${args.teacherEmail}" style="color:#94a3b8;text-decoration:underline">Se désinscrire</a>
        </td>
      </tr>
      <tr><td style="padding-top:12px;font-size:12px;color:#cbd5e1">
        © ${new Date().getFullYear()} Examanet • Plateforme pédagogique tunisienne • Made with ❤️ in Tunisia
      </td></tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}