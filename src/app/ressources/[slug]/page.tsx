import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ResourceActions from '@/components/resources/ResourceActions';
import PDFViewer from '@/components/resources/PDFViewer';
import RatingSection from '@/components/resources/RatingSection';
import CommentsSection from '@/components/resources/CommentsSection';
import ResourceInfoPanel from '@/components/resources/ResourceInfoPanel';
import { formatNumber, RESOURCE_TYPE_LABELS } from '@/lib/utils';
import { Eye, Download, MessageCircle, Star, FileText, ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = await prisma.resource.findUnique({
    where: { slug },
    include: {
      subject: true,
      class: { include: { level: true } },
      section: true,
      teacher: true,
      ratings: { include: { user: { select: { firstName: true, lastName: true } } } },
      comments: {
        where: { parentId: null },
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  if (!resource || resource.status !== 'PUBLISHED') notFound();

  // Track view
  await prisma.view.create({ data: { resourceId: resource.id, ipAddress: 'visitor' } });
  await prisma.resource.update({ where: { id: resource.id }, data: { viewsCount: { increment: 1 } } });

  // Similar resources
  const similar = await prisma.resource.findMany({
    where: { status: 'PUBLISHED', subjectId: resource.subjectId, NOT: { id: resource.id } },
    take: 4,
    orderBy: { viewsCount: 'desc' },
    include: { subject: true, class: true, teacher: { select: { firstName: true, lastName: true } } }
  });

  // Star distribution
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: resource.ratings.filter(r => r.stars === star).length
  }));
  const maxCount = Math.max(...dist.map(d => d.count), 1);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/ressources" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 mb-4">
            <ChevronLeft className="w-4 h-4" /> Retour aux ressources
          </Link>

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* MAIN */}
            <div>
              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${RESOURCE_TYPE_LABELS[resource.type]?.color}`}>
                    {RESOURCE_TYPE_LABELS[resource.type]?.fr}
                  </span>
                  {resource.class && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                      {resource.class.nameFr}
                    </span>
                  )}
                  {resource.section && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                      {resource.section.nameFr}
                    </span>
                  )}
                  <span
                    className="px-3 py-1 text-white rounded-full text-xs font-bold"
                    style={{ background: resource.subject.color || '#0EA5E9' }}
                  >
                    {resource.subject.nameFr}
                  </span>
                </div>

                <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 mb-3 leading-tight">{resource.title}</h1>
                {resource.description && <p className="text-slate-600 mb-4 leading-relaxed">{resource.description}</p>}

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1"><Eye className="w-3.5 h-3.5" /> Vues</div>
                    <div className="font-extrabold text-lg">{formatNumber(resource.viewsCount)}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1"><Download className="w-3.5 h-3.5" /> Téléchargements</div>
                    <div className="font-extrabold text-lg">{formatNumber(resource.downloadsCount)}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1"><Star className="w-3.5 h-3.5" /> Note</div>
                    <div className="font-extrabold text-lg">{resource.avgRating.toFixed(1)}/5</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1"><MessageCircle className="w-3.5 h-3.5" /> Commentaires</div>
                    <div className="font-extrabold text-lg">{resource.commentsCount}</div>
                  </div>
                </div>

                <ResourceActions resourceId={resource.id} slug={resource.slug} title={resource.title} />
              </div>

              {/* Aperçu PDF */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
                <div className="px-6 lg:px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-primary-600" /> Aperçu du document</h2>
                  <Link href={`/ressources/${resource.slug}/viewer`} className="text-sm text-primary-600 font-semibold hover:underline">
                    Ouvrir en plein écran →
                  </Link>
                </div>
                <div className="p-0">
                  <PDFViewer
                    url={resource.fileUrl}
                    fileName={`${resource.title}.pdf`}
                  />
                </div>
              </div>

              {/* Notation */}
              <RatingSection
                resourceId={resource.id}
                avgRating={resource.avgRating}
                ratingCount={resource.ratingCount}
                distribution={dist}
                maxCount={maxCount}
              />

              {/* Commentaires */}
              <CommentsSection
                resourceId={resource.id}
                initialComments={resource.comments.map(c => ({
                  id: c.id,
                  content: c.content,
                  createdAt: c.createdAt.toISOString(),
                  user: c.user
                }))}
              />

              {/* Similaires */}
              {similar.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-bold text-xl mb-4">📚 Ressources similaires</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {similar.map(s => (
                      <Link key={s.id} href={`/ressources/${s.slug}`} className="card card-hover p-4 flex gap-3">
                        <div className="w-16 h-20 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                          <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm line-clamp-2 mb-1">{s.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatNumber(s.viewsCount)}</span>
                            <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {s.avgRating.toFixed(1)}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              {/* Prof */}
              {resource.teacher && (
                <div className="card p-5">
                  <h3 className="font-bold text-sm mb-3 text-slate-500 uppercase">Enseignant</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white font-bold text-lg flex items-center justify-center">
                      {resource.teacher.firstName?.[0]}{resource.teacher.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-bold">{resource.teacher.firstName} {resource.teacher.lastName}</div>
                      <div className="text-xs text-slate-500">{resource.teacher.schoolName}</div>
                    </div>
                  </div>
                  {resource.teacher.bio && <p className="text-sm text-slate-600 line-clamp-3">{resource.teacher.bio}</p>}
                  <Link href={`/professeurs/${resource.teacher.id}`} className="text-sm text-primary-600 font-semibold hover:underline mt-2 inline-block">Voir le profil →</Link>
                </div>
              )}

              {/* COMPLETE Info Panel */}
              <ResourceInfoPanel resource={resource} />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
