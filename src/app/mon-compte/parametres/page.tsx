import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import SettingsClient from '@/components/settings/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, email: true, role: true, status: true,
      firstName: true, lastName: true, avatarUrl: true,
      bio: true, schoolName: true, governorate: true, diploma: true,
      teachingSubjects: true, teachingLevels: true,
      phone: true, website: true,
      preferredLang: true, themePref: true,
      notifyEmail: true, notifyInApp: true,
      createdAt: true, lastLoginAt: true, emailVerifiedAt: true
    }
  });

  if (!account) redirect('/connexion');

  // Get available options for teachers
  const [subjects, classes, levels] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { nameFr: 'asc' },
      select: { slug: true, nameFr: true, nameAr: true }
    }).catch(() => []),
    prisma.class.findMany({
      orderBy: { order: 'asc' },
      select: { slug: true, nameFr: true, nameAr: true, level: { select: { nameFr: true } } }
    }).catch(() => []),
    prisma.level.findMany({
      orderBy: { order: 'asc' },
      select: { slug: true, nameFr: true }
    }).catch(() => []),
  ]);

  return (
    <SettingsClient
      account={JSON.parse(JSON.stringify(account))}
      options={{
        subjects: JSON.parse(JSON.stringify(subjects)),
        classes: JSON.parse(JSON.stringify(classes)),
        levels: JSON.parse(JSON.stringify(levels))
      }}
    />
  );
}