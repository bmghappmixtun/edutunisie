/**
 * POST /api/admin/invite-new-teacher
 *
 * Invite a NEW prof (not yet in the platform) by email + first name + last name + source site.
 * Creates a User record (with PENDING_INVITATION status) + a TeacherInvitation,
 * then sends the dedicated email template.
 *
 * Body:
 *   {
 *     firstName: string
 *     lastName: string
 *     email: string
 *     site: 'devoirat' | 'tunisiecollege'
 *     customMessage?: string
 *   }
 *
 * Response:
 *   { ok: true, invitationId, userId, tempPassword, acceptUrl }
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  createInvitation,
  sendInvitationEmail,
  USER_INV_STATUS,
} from '@/lib/invitation';
import { renderJotformInvitationEmail, type SourceSite } from '@/lib/email-templates/jotform-invitation';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'Examanet <noreply@examanet.com>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';

const BodySchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(200),
  site: z.enum(['devoirat', 'tunisiecollege']),
  customMessage: z.string().max(1000).optional(),
});

function generateTempPassword(): string {
  // 10 chars, alphanumeric, no ambiguous chars
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = crypto.randomBytes(10);
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[arr[i] % chars.length];
  return s;
}

export async function POST(req: NextRequest) {
  // Auth: admin only
  const me = await getCurrentUser();
  if (!me || me.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse + validate body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { firstName, lastName, email, site, customMessage } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, role: true, status: true, firstName: true, lastName: true },
  });

  if (user) {
    // Existing user — if not a teacher, convert? For now: error if not a teacher
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: `Cet email appartient déjà à un compte avec le rôle ${user.role}` },
        { status: 400 },
      );
    }
  } else {
    // Create the new user (with PENDING_INVITATION status, no password yet)
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName,
        lastName,
        role: 'TEACHER',
        status: USER_INV_STATUS.PENDING_INVITATION,
        // We don't set a password — the teacher will set it during activation
      },
      select: { id: true, role: true, status: true, firstName: true, lastName: true },
    });
  }

  // Check if there's already a pending (non-expired) invitation
  const existingInv = await prisma.teacherInvitation.findFirst({
    where: {
      teacherId: user.id,
      status: { in: ['PENDING', 'SENT', 'CLICKED'] },
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInv) {
    return NextResponse.json(
      { error: 'Une invitation active existe déjà pour ce prof', invitationId: existingInv.id },
      { status: 400 },
    );
  }

  // Create the invitation (with site in customMessage for now, since we don't have a column)
  const { invitation, tempPassword, token } = await createInvitation(
    user.id,
    me.id,
    customMessage,
  );
  const acceptUrl = `${SITE_URL}/invitation/${token}`;

  // Render the dedicated email template
  const html = renderJotformInvitationEmail({
    firstName,
    site: site as SourceSite,
    acceptUrl,
    unsubscribeUrl: `${SITE_URL}/desinscrire?email=${encodeURIComponent(normalizedEmail)}`,
    customMessage: customMessage || null,
  });

  const subject = SITE_CONFIG[site as SourceSite].subject;

  // Send the email
  let emailOk = false;
  let emailError: string | undefined;
  if (resend) {
    try {
      const result: any = await resend.emails.send({
        from: FROM,
        to: [normalizedEmail],
        subject,
        html,
      });
      if (result.error) {
        emailError = result.error.message;
        console.error('📧 [JOTFORM INVITATION ERROR]', normalizedEmail, '→', result.error.message);
      } else {
        emailOk = true;
        await prisma.teacherInvitation.update({
          where: { id: invitation.id },
          data: { status: 'SENT', emailSentAt: new Date() },
        });
      }
    } catch (e: any) {
      emailError = e.message;
      console.error('📧 [JOTFORM INVITATION EXCEPTION]', e);
    }
  } else {
    // Dev mode: log to console
    console.log(`\n📧 [JOTFORM INVITATION - DEV] To: ${normalizedEmail}`);
    console.log(`   Site: ${site}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Accept URL: ${acceptUrl}`);
    emailOk = true; // In dev, we consider it OK
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    invitationId: invitation.id,
    tempPassword,
    acceptUrl,
    emailSent: emailOk,
    emailError,
  });
}

// Subject lines (kept in sync with the email template)
const SITE_CONFIG: Record<SourceSite, { subject: string }> = {
  devoirat: { subject: '🎁 Une plateforme 100% gratuite attend vos ressources — examenet.com' },
  tunisiecollege: { subject: 'Vos ressources méritent d\'être vues — rejoignez examanet.com 🎓' },
};
