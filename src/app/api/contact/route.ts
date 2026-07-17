import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendContactEmail } from '@/lib/email';

export const runtime = 'nodejs';

const VALID_SUBJECTS = ['question', 'bug', 'teacher', 'partnership', 'copyright', 'other'];

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Nom, email et message sont requis' }, { status: 400 });
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nom invalide' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message trop long (max 2000 caractères)' },
        { status: 400 },
      );
    }

    const subjectValue = subject && VALID_SUBJECTS.includes(subject) ? subject : 'other';

    // Save to DB
    await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        subject: subjectValue,
        message: message.trim(),
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: req.headers.get('user-agent')?.slice(0, 500) || null,
      },
    });

    // Send email notification to admin
    await sendContactEmail({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subjectValue,
      message: message.trim(),
    }).catch((e) => console.error('Contact email error:', e));

    return NextResponse.json({ success: true, message: 'Message envoyé' });
  } catch (e: any) {
    console.error('Contact form error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
