import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CheckCircle } from 'lucide-react';
import ApprobationsClient from '@/components/admin/ApprobationsClient';

export const dynamic = 'force-dynamic';

export default async function AdminApprovationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');

  const [pendingTeachers, pendingResources] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'TEACHER', status: { in: ['PENDING_APPROVAL', 'PENDING_FILE_VERIFICATION'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        schoolName: true, governorate: true, diploma: true,
        teachingSubjects: true, teachingLevels: true, createdAt: true,
        status: true, invitationStatus: true, lastInvitationId: true,
        verificationFilesRequestedAt: true, verificationFilesCount: true,
        verificationFilesReceivedAt: true,
      }
    }),
    prisma.resource.findMany({
      where: { status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
      include: {
        subject: { select: { nameFr: true } },
        class: { select: { nameFr: true } },
        teacher: { select: { firstName: true, lastName: true, email: true, schoolName: true } }
      }
    })
  ]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
        <CheckCircle className="w-7 h-7 text-emerald-500" />
        Approbations en attente
      </h1>

      {pendingTeachers.length === 0 && pendingResources.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-3 text-emerald-500" />
          <p className="font-bold text-emerald-800 text-2xl mb-2">Tout est à jour ! 🎉</p>
          <p className="text-emerald-700">Aucune demande en attente d'approbation.</p>
        </div>
      ) : (
        <ApprobationsClient
          initialTeachers={pendingTeachers.map(t => ({
            ...t,
            createdAt: t.createdAt.toISOString(),
            verificationFilesRequestedAt: t.verificationFilesRequestedAt?.toISOString() || null,
            verificationFilesReceivedAt: t.verificationFilesReceivedAt?.toISOString() || null,
          }))}
          initialResources={pendingResources.map(r => ({
            ...r,
            createdAt: r.createdAt.toISOString()
          }))}
        />
      )}
    </div>
  );
}