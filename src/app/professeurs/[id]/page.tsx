import { notFound } from 'next/navigation';
import { getInitials } from '@/lib/text-utils';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  GraduationCap, MapPin, BookOpen, FileText, Star,
  Award, Mail, Calendar, Download, Eye,
  Briefcase, Layers, MessageSquare, Share2, CheckCircle
} from 'lucide-react';
import ShareButton from '@/components/share/ShareButton';
import FollowButton from '@/components/social/FollowButton';
import MessageTeacherButton from '@/components/social/MessageTeacherButton';
import { timeAgo } from '@/lib/utils';
import ResourceCard from '@/components/resources/ResourceCard';
import { personSchema, breadcrumbSchema } from '@/lib/structured-data';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await prisma.user.findUnique({
    where: { id },
    select: { firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, bio: true, schoolName: true, schoolNameAr: true },
  });
  if (!teacher) return { title: 'Enseignant non trouvé' };
  const fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.replace(/\s+/g, ' ').trim();
  const description = teacher.bio
    ? teacher.bio.slice(0, 160)
    : `${fullName}${teacher.schoolName ? ' - ' + teacher.schoolName : ''} — Enseignant sur Examanet. Cours, devoirs et exercices gratuits.`;
  return {
    title: `${fullName} — Enseignant`,
    description,
    alternates: { canonical: `${SITE_URL}/professeurs/${id}` },
    openGraph: {
      title: `${fullName} — Enseignant sur Examanet`,
      description,
      url: `${SITE_URL}/professeurs/${id}`,
      locale: 'fr_TN',
      type: 'profile',
    },
  };
}

const TYPE_LABELS: Record<string, string> = {
  COURSE: 'Cours', HOMEWORK: 'Devoir', EXERCISE: "Série d'exercices",
  REVISION: 'Révision', EXAM: 'Contrôle/Examen', BAC_SUBJECT: 'Sujet Bac',
  CORRECTION: 'Corrigé', SUMMARY: 'Résumé', OTHER: 'Autre'
};

const TYPE_COLORS: Record<string, string> = {
  COURSE: 'from-blue-500 to-blue-700',
  HOMEWORK: 'from-purple-500 to-purple-700',
  EXERCISE: 'from-emerald-500 to-emerald-700',
  REVISION: 'from-orange-500 to-orange-700',
  EXAM: 'from-red-500 to-red-700',
  BAC_SUBJECT: 'from-amber-500 to-amber-700',
  CORRECTION: 'from-teal-500 to-teal-700',
  SUMMARY: 'from-pink-500 to-pink-700',
  OTHER: 'from-slate-500 to-slate-700'
};

export default async function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const teacher = await prisma.user.findFirst({
    where: {
      id,
      role: 'TEACHER',
      // Show ACTIVE teachers, or any teacher if admin wants to see
      OR: [{ status: 'ACTIVE' }, { isVerifiedTeacher: true }]
    },
    select: {
      id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, avatarUrl: true, bio: true,
      email: true, schoolName: true, schoolNameAr: true, governorate: true, diploma: true,
      teachingSubjects: true, teachingLevels: true, createdAt: true,
      lastLoginAt: true
    }
  });

  if (!teacher) notFound();

  // Get current user for follow/message state
  const currentUser = await getCurrentUser();
  let isFollowing = false;
  let followersCount = 0;
  if (currentUser) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUser.id, followingId: id } }
    });
    isFollowing = !!follow;
  }
  followersCount = await prisma.follow.count({ where: { followingId: id } });

  // Get all published resources by this teacher
  const resources = await prisma.resource.findMany({
    where: { teacherId: teacher.id, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: {
      subject: { select: { slug: true, nameFr: true, color: true, icon: true } },
      class: { select: { slug: true, nameFr: true } },
      section: { select: { slug: true, nameFr: true } },
      _count: { select: { comments: true, ratings: true } }
    }
  });

  // Stats
  const totalViews = resources.reduce((s, r) => s + r.viewsCount, 0);
  const totalDownloads = resources.reduce((s, r) => s + r.downloadsCount, 0);
  const totalComments = resources.reduce((s, r) => s + r._count.comments, 0);
  const avgRating = resources.length
    ? resources.reduce((s, r) => s + r.avgRating, 0) / resources.length
    : 0;
  const totalFavorites = await prisma.favorite.count({
    where: { resource: { teacherId: teacher.id } }
  });

  // Group by type
  const byType = resources.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by subject
  const bySubject = resources.reduce((acc, r) => {
    const key = r.subject?.nameFr || 'Autre';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Parse teaching data
  const teachingSubjects = teacher.teachingSubjects
    ? (JSON.parse(teacher.teachingSubjects) as string[])
    : [];
  const teachingLevels = teacher.teachingLevels
    ? (JSON.parse(teacher.teachingLevels) as string[])
    : [];

  // Latest resources (top 6)
  const latestResources = resources.slice(0, 6);

  const profileUrl = `${SITE_URL}/professeurs/${teacher.id}`;
  const initials = getInitials(teacher.firstName, teacher.lastName);

  // JSON-LD: Person schema + BreadcrumbList
  const fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.replace(/\s+/g, ' ').trim();
  const personJsonLd = personSchema({
    id: `${profileUrl}#person`,
    name: fullName,
    description: teacher.bio || `Enseignant sur Examanet — ${resources.length} ressources pédagogiques`,
    url: profileUrl,
    schoolName: teacher.schoolName,
    schoolNameAr: teacher.schoolNameAr,
    resourceCount: resources.length,
    subjects: teachingSubjects.length > 0 ? teachingSubjects : Object.keys(bySubject),
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Professeurs', url: `${SITE_URL}/professeurs` },
    { name: fullName, url: profileUrl },
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />

      <main className="flex-1 pt-20">
        {/* Visual breadcrumb (matches BreadcrumbList JSON-LD) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-xs text-slate-500 flex-wrap">
            <Link href="/" className="hover:text-primary-600 transition">Accueil</Link>
            <span className="text-slate-300">›</span>
            <Link href="/professeurs" className="hover:text-primary-600 transition">Professeurs</Link>
            <span className="text-slate-300">›</span>
            <span className="text-slate-900 font-semibold truncate">{fullName}</span>
          </nav>
        </div>

        {/* Hero Header */}
        <div className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_50%,rgba(245,158,11,0.15),transparent_50%)]" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {teacher.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={teacher.avatarUrl}
                    alt={`${teacher.firstName || ''} ${teacher.lastName || ''}`.replace(/\s+/g, ' ').trim()}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-3xl object-cover shadow-2xl border-4 border-white"
                  />
                ) : (
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 text-white font-extrabold text-5xl md:text-6xl flex items-center justify-center shadow-2xl border-4 border-white">
                    {initials}
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-2 shadow-lg border-4 border-white">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                        Professeur vérifié ✓
                      </span>
                      {teacher.diploma && (
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-3 py-1 rounded-full flex items-center gap-1">
                          <Award className="w-3 h-3" /> {teacher.diploma}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const hasFr = !!(teacher.firstName || teacher.lastName);
                      const hasAr = !!(teacher.firstNameAr || teacher.lastNameAr);
                      if (hasFr) {
                        return (
                          <>
                            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-2">
                              {(teacher.firstName || "") + " " + (teacher.lastName || "")}
                            </h1>
                            {hasAr && (
                              <h2 className="text-xl md:text-2xl font-bold text-slate-600 mb-2" dir="rtl" lang="ar">
                                {(teacher.firstNameAr || "") + " " + (teacher.lastNameAr || "")}
                              </h2>
                            )}
                          </>
                        );
                      }
                      if (hasAr) {
                        return (
                          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-2" dir="rtl" lang="ar">
                            {teacher.firstNameAr} {teacher.lastNameAr}
                          </h1>
                        );
                      }
                      return <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-2">Enseignant</h1>;
                    })()}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 mt-3">
                      {(teacher.schoolName || teacher.schoolNameAr) && (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          <div className="flex flex-col">
                            {teacher.schoolName && <span className="font-semibold">{teacher.schoolName}</span>}
                            {teacher.schoolNameAr && <span className="text-xs text-slate-500" dir="rtl" lang="ar">{teacher.schoolNameAr}</span>}
                          </div>
                        </div>
                      )}
                      {teacher.governorate && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{teacher.governorate}, Tunisie</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>Membre depuis {timeAgo(teacher.createdAt)}</span>
                      </div>
                      {teacher.lastLoginAt && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Actif récemment</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <ShareButton
                    url={profileUrl}
                    title={`${teacher.firstName || ""} ${teacher.lastName || ""} sur Examanet`}
                    description={`Découvrez les ressources de ${teacher.firstName || ""} ${teacher.lastName || ""}`}
                  />
                </div>

                {currentUser && currentUser.id !== teacher.id && (
                  <div className="flex gap-2 mt-3">
                    <FollowButton
                      teacherId={teacher.id}
                      initialFollowing={isFollowing}
                      initialCount={followersCount}
                    />
                    <MessageTeacherButton teacherId={teacher.id} />
                  </div>
                )}

                {/* Bio */}
                {teacher.bio && (
                  <p className="text-slate-700 mt-4 max-w-3xl leading-relaxed">{teacher.bio}</p>
                )}

                {/* Teaching subjects & levels */}
                {(teachingSubjects.length > 0 || teachingLevels.length > 0) && (
                  <div className="mt-4 space-y-2">
                    {teachingSubjects.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-500 uppercase">Matières :</span>
                        {teachingSubjects.map(s => (
                          <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">{s}</span>
                        ))}
                      </div>
                    )}
                    {teachingLevels.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-500 uppercase">Niveaux :</span>
                        {teachingLevels.map(l => (
                          <span key={l} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">{l}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white border-y border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard
                icon={<FileText className="w-5 h-5" />}
                label="Ressources"
                value={resources.length}
                color="text-primary-600 bg-primary-50"
              />
              <StatCard
                icon={<Eye className="w-5 h-5" />}
                label="Vues"
                value={totalViews > 999 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews}
                color="text-blue-600 bg-blue-50"
              />
              <StatCard
                icon={<Download className="w-5 h-5" />}
                label="Téléchargements"
                value={totalDownloads > 999 ? `${(totalDownloads / 1000).toFixed(1)}k` : totalDownloads}
                color="text-emerald-600 bg-emerald-50"
              />
              <StatCard
                icon={<Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
                label="Note moyenne"
                value={avgRating.toFixed(1)}
                subValue={`${totalComments} avis`}
                color="text-amber-600 bg-amber-50"
              />
              <StatCard
                icon={<GraduationCap className="w-5 h-5" />}
                label="Favoris"
                value={totalFavorites}
                color="text-rose-600 bg-rose-50"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main: Resources */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-extrabold flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-primary-500" />
                  Ressources ({resources.length})
                </h2>
                {resources.length > 6 && (
                  <Link
                    href={`/ressources?teacher=${teacher.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    Tout voir →
                  </Link>
                )}
              </div>

              {resources.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-semibold text-slate-600">Aucune ressource publiée pour l'instant</p>
                  <p className="text-sm text-slate-500 mt-1">Ce professeur n'a pas encore partagé de contenu.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {latestResources.map(r => (
                    <Link
                      key={r.id}
                      href={`/ressources/${r.slug}`}
                      className="block bg-white rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition p-4 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-14 rounded-lg bg-gradient-to-br ${TYPE_COLORS[r.type] || TYPE_COLORS.OTHER} flex items-center justify-center flex-shrink-0`}>
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-slate-900 group-hover:text-primary-600 transition line-clamp-1">
                              {r.title}
                            </h3>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold flex-shrink-0">
                              {TYPE_LABELS[r.type]}
                            </span>
                          </div>
                          {r.description && (
                            <p
                              className="text-sm text-slate-500 mt-1 line-clamp-2"
                              dangerouslySetInnerHTML={{ __html: r.description }}
                            />
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            {r.subject && (
                              <span className="flex items-center gap-1">
                                {r.subject.icon && <span>{r.subject.icon}</span>}
                                {r.subject.nameFr}
                              </span>
                            )}
                            {r.class && <span>📚 {r.class.nameFr}</span>}
                            {r.section && <span>🎓 {r.section.nameFr}</span>}
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {r.viewsCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Download className="w-3 h-3" /> {r.downloadsCount}
                            </span>
                            {r.avgRating > 0 && (
                              <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                                <Star className="w-3 h-3 fill-current" /> {r.avgRating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Contact card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary-500" />
                  Contact
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Vous êtes élève de ce professeur ? Connectez-vous pour lui envoyer un message ou suivre ses publications.
                </p>
                <Link
                  href="/connexion"
                  className="block w-full text-center py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm transition"
                >
                  Se connecter
                </Link>
              </div>

              {/* Subjects distribution */}
              {Object.keys(bySubject).length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary-500" />
                    Répartition par matière
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(bySubject)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, count]) => {
                        const pct = Math.round((count / resources.length) * 100);
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-700">{name}</span>
                              <span className="text-xs font-semibold text-slate-500">{count}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Types distribution */}
              {Object.keys(byType).length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500" />
                    Types de contenu
                  </h3>
                  <div className="space-y-1.5">
                    {Object.entries(byType)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{TYPE_LABELS[type] || type}</span>
                          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({
  icon, label, value, subValue, color
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold leading-none">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {label}
          {subValue && <span className="ml-1 text-slate-400">· {subValue}</span>}
        </div>
      </div>
    </div>
  );
}