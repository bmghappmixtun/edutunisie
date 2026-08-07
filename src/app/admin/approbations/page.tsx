import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CheckCircle } from 'lucide-react';
import ApprobationsClient from '@/components/admin/ApprobationsClient';

export const dynamic = 'force-dynamic';

/**
 * Server-side date formatter. Produces a stable relative-time string
 * ("30s", "5min", "2h", or a French absolute date) using a FIXED reference
 * time so the server-rendered HTML and the client-rendered initial tree
 * produce the same string. Without this, the client's `new Date()` and
 * the server's `new Date()` differ by a few seconds (network + hydration
 * latency), and the "30s" / "5min" diff calculation lands on different
 * branches — React #419 (text content mismatch).
 *
 * Fixes ERR-M3YA2R 2× React #419 on /admin/approbations (2026-08-07
 * nightly digest, Googlebot IP 74.125.19.40).
 *
 * NOTE: the displayed label is computed at SSR time. The label may become
 * slightly stale after the page sits open in a tab, but the admin panel
 * is short-lived and the staleness is acceptable.
 */
function formatDateLabel(iso: string | null | undefined, now: Date): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${Math.max(0, diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return date.toLocaleDateString('fr-FR');
}

export default async function AdminApprovationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');

  const [pendingTeachers, pendingResources] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'TEACHER', status: { in: ['PENDING_APPROVAL', 'PENDING_FILE_VERIFICATION', 'PENDING_OTP'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        schoolName: true,
        governorate: true,
        diploma: true,
        teachingSubjects: true,
        teachingLevels: true,
        createdAt: true,
        status: true,
        emailVerifiedAt: true,
        invitationStatus: true,
        lastInvitationId: true,
        verificationFilesRequestedAt: true,
        verificationFilesCount: true,
        verificationFilesReceivedAt: true,
        _count: {
          select: { uploadedFiles: true, library: true, verificationFiles: true },
        },
      },
    }),
    prisma.resource.findMany({
      where: { status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
      include: {
        subject: { select: { nameFr: true } },
        class: { select: { nameFr: true } },
        teacher: { select: { firstName: true, lastName: true, email: true, schoolName: true } },
      },
    }),
  ]);

  // Single "now" reference so every label is computed against the same
  // instant — keeps the streamed HTML internally consistent and matches
  // whatever the client will see on hydration.
  const now = new Date();

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
          initialTeachers={pendingTeachers.map((t) => ({
            ...t,
            createdAt: t.createdAt.toISOString(),
            createdAtLabel: formatDateLabel(t.createdAt.toISOString(), now) ?? '',
            emailVerifiedAt: t.emailVerifiedAt?.toISOString() || null,
            verificationFilesRequestedAt: t.verificationFilesRequestedAt?.toISOString() || null,
            verificationFilesRequestedAtLabel: formatDateLabel(t.verificationFilesRequestedAt?.toISOString() ?? null, now),
            verificationFilesReceivedAt: t.verificationFilesReceivedAt?.toISOString() || null,
          }))}
          initialResources={pendingResources.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            createdAtLabel: formatDateLabel(r.createdAt.toISOString(), now) ?? '',
          }))}
        />
      )}
    </div>
  );
}
