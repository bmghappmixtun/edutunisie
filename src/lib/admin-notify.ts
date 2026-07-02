import { Resend } from 'resend';
import { renderNewTeacherEmail, renderNewResourceEmail } from './email-templates';
import { prisma } from './prisma';
import { getAdminEmailsFromConfig } from './admin-config';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'Examanet <onboarding@resend.dev>';

/**
 * Notify all admins that a new teacher has registered and is awaiting approval.
 */
export async function notifyAdminsNewTeacher(teacherId: string) {
  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || teacher.role !== 'TEACHER') return;

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  if (admins.length === 0) return;

  // In-app notifications
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'new_teacher_pending',
        title: '👨‍🏫 Nouveau professeur en attente',
        message: `${teacher.firstName || ''} ${teacher.lastName || ''} (${teacher.email}) a postulé comme enseignant.`,
        link: '/admin/approbations'
      }
    });
  }

  // Email notifications
  const adminEmails = getAdminEmailsFromConfig();
  if (!resend) {
    console.log(`\n📧 [ADMIN EMAIL - DEV] New teacher: ${teacher.firstName || ""} ${teacher.lastName || ""} → ${adminEmails.join(', ')}\n`);
    return;
  }

  try {
    const html = renderNewTeacherEmail(
      teacher.firstName || '',
      teacher.lastName || '',
      teacher.email,
      teacher.schoolName
    );
    // Send to BOTH DB admins + hardcoded fallback
    const recipients = new Set<string>(adminEmails);
    for (const admin of admins) {
      if (admin.email) recipients.add(admin.email);
    }
    if (recipients.size === 0) return;
    await resend.emails.send({
      from: FROM,
      to: Array.from(recipients),
      subject: `👨‍🏫 Nouveau professeur à approuver : ${teacher.firstName || ""} ${teacher.lastName || ""}`,
      html,
    });
  } catch (e) {
    console.error('Failed to notify admins of new teacher:', e);
  }
}

/**
 * Notify all admins that a new resource was uploaded and awaits approval.
 */
export async function notifyAdminsNewResource(resourceId: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { teacher: true, subject: true }
  });
  if (!resource) return;

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  if (admins.length === 0) return;

  // In-app notifications
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'new_resource_pending',
        title: '📄 Ressource à valider',
        message: `${resource.teacher?.firstName || 'Un enseignant'} a ajouté "${resource.title}"`,
        link: '/admin/approbations'
      }
    });
  }

  // Email notifications
  const adminEmails = getAdminEmailsFromConfig();
  if (!resend) {
    console.log(`\n📧 [ADMIN EMAIL - DEV] New resource: ${resource.title} → ${adminEmails.join(', ')}\n`);
    return;
  }

  try {
    const html = renderNewResourceEmail(
      `${resource.teacher?.firstName || ''} ${resource.teacher?.lastName || ''}`.trim(),
      resource.title,
      resource.subject.nameFr
    );
    // Send to BOTH DB admins + hardcoded fallback
    const recipients = new Set<string>(adminEmails);
    for (const admin of admins) {
      if (admin.email) recipients.add(admin.email);
    }
    if (recipients.size === 0) return;
    await resend.emails.send({
      from: FROM,
      to: Array.from(recipients),
      subject: `📄 Nouvelle ressource à valider : ${resource.title}`,
      html,
    });
  } catch (e) {
    console.error('Failed to notify admins of new resource:', e);
  }
}