import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CheckCircle, XCircle, FileText, Clock, User } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import ApprobationActions from '@/components/admin/ApprobationActions';

export const dynamic = 'force-dynamic';

export default async function AdminApprovationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');

  const [pendingTeachers, pendingResources] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'TEACHER', status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, firstName: true, lastName: true, schoolName: true, governorate: true, teachingSubjects: true, teachingLevels: true, diploma: true, createdAt: true }
    }),
    prisma.resource.findMany({
      where: { status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
      include: { subject: true, class: true, teacher: { select: { firstName: true, lastName: true, email: true, schoolName: true } } }
    })
  ]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">✅ Approbations en attente</h1>

      {/* Teachers */}
      <div className="mb-10">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-amber-500" /> Enseignants ({pendingTeachers.length})</h2>
        {pendingTeachers.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p className="font-semibold text-emerald-800">Aucun enseignant en attente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTeachers.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-amber-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-extrabold text-lg flex items-center justify-center">
                        {t.firstName?.[0]}{t.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-bold text-lg">{t.firstName} {t.lastName}</div>
                        <div className="text-sm text-slate-500">{t.email}</div>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      {t.schoolName && <div><span className="text-slate-500">Établissement :</span> <span className="font-semibold">{t.schoolName}</span></div>}
                      {t.governorate && <div><span className="text-slate-500">Gouvernorat :</span> <span className="font-semibold">{t.governorate}</span></div>}
                      {t.diploma && <div><span className="text-slate-500">Diplôme :</span> <span className="font-semibold">{t.diploma}</span></div>}
                      {t.teachingSubjects && <div><span className="text-slate-500">Matières :</span> <span className="font-semibold">{t.teachingSubjects}</span></div>}
                      {t.teachingLevels && <div><span className="text-slate-500">Niveaux :</span> <span className="font-semibold">{t.teachingLevels}</span></div>}
                      <div><span className="text-slate-500">Demandé :</span> <span className="font-semibold">{timeAgo(t.createdAt)}</span></div>
                    </div>
                  </div>
                  <ApprobationActions type="teacher" targetId={t.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resources */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-orange-500" /> Ressources ({pendingResources.length})</h2>
        {pendingResources.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p className="font-semibold text-emerald-800">Aucune ressource en attente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingResources.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-orange-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-12 bg-slate-100 rounded flex items-center justify-center">
                        <FileText className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <div className="font-bold">{r.title}</div>
                        <div className="text-sm text-slate-500">{r.subject.nameFr} · {r.class?.nameFr}</div>
                      </div>
                    </div>
                    {r.description && <p className="text-sm text-slate-600 mb-2">{r.description}</p>}
                    <div className="text-sm text-slate-500">
                      Par {r.teacher?.firstName} {r.teacher?.lastName} · {r.teacher?.email}
                      {r.teacher?.schoolName && ` · ${r.teacher.schoolName}`}
                    </div>
                  </div>
                  <ApprobationActions type="resource" targetId={r.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
