import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ResourceActions from '@/components/resources/ResourceActions';
import PDFViewer from '@/components/resources/PDFViewer';
import RatingSection from '@/components/resources/RatingSection';
import CommentsSection from '@/components/resources/CommentsSection';
import ResourceInfoPanel from '@/components/resources/ResourceInfoPanel';
import AiDescription from '@/components/resources/AiDescription';
import { formatNumber, RESOURCE_TYPE_LABELS, HOMEWORK_SUBTYPE_LABELS } from '@/lib/utils';
import { isArabic } from '@/lib/text-utils';
import { courseSchema, breadcrumbSchema } from '@/lib/structured-data';
import { Eye, Download, MessageCircle, Star, FileText, ChevronLeft, ChevronRight, CheckCircle2, Pencil, GraduationCap, Wrench, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id: rawId, slug: rawSlug } = await params;
  // The numericId is the stable identifier; the slug is purely cosmetic / SEO
  const numericId = parseInt(rawId, 10);
  if (isNaN(numericId)) {
    return { title: 'Ressource non trouvée' };
  }
  // Same URL-decode fix as the page (Next.js doesn't auto-decode non-ASCII slugs)
  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = rawSlug;
  }
  const resource = await prisma.resource.findUnique({
    where: { numericId },
    include: { subject: true, class: true, teacher: true },
  });
  if (!resource) return { title: 'Ressource non trouvée' };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  const description = resource.description
    || `${resource.title} — Ressource pédagogique gratuite${resource.subject ? ' en ' + resource.subject.nameFr : ''}${resource.class ? ' pour ' + resource.class.nameFr : ''} sur Examanet Tunisie.`;

  return {
    title: resource.title,
    description: description.slice(0, 160),
    keywords: (() => {
      const tagList = resource.tags ? resource.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
      const auto = [resource.subject?.nameFr, resource.class?.nameFr, resource.type, 'Tunisie', 'examanet'].filter(Boolean) as string[];
      // Combine tags + auto keywords, dedupe, max 15
      return Array.from(new Set([...tagList, ...auto])).slice(0, 15);
    })(),
    alternates: {
      canonical: `${baseUrl}/ressources/${resource.numericId}/${resource.slug}`,
    },
    openGraph: {
      title: resource.title,
      description: description.slice(0, 160),
      url: `${baseUrl}/ressources/${resource.numericId}/${resource.slug}`,
      siteName: 'Examanet',
      locale: 'fr_TN',
      type: 'article',
      // article:tag = Facebook/LinkedIn tags (helps distribution)
      ...(resource.tags ? { tags: resource.tags.split(',').map((t: string) => t.trim()).filter(Boolean) } : {}),
      images: [
        {
          url: `${baseUrl}/api/og/resource/${resource.numericId}`,
          width: 1200,
          height: 630,
          alt: resource.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: resource.title,
      description: description.slice(0, 160),
      images: [`${baseUrl}/api/og/resource/${resource.numericId}`],
    },
  };
}

export default async function ResourcePage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id: rawId, slug: rawSlug } = await params;
  // SECURITY/UX: Next.js does NOT auto-decode non-ASCII chars in [slug] params
  // (e.g. Arabic slugs arrive as '%D9%81...' percent-encoded). Decode manually
  // so Prisma can find the resource by its real slug.
  // The numericId is the stable identifier; the slug is purely cosmetic / SEO.
  const numericId = parseInt(rawId, 10);
  if (isNaN(numericId)) notFound();
  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = rawSlug;
  }
  const userSession = await getCurrentUser();
  const resource = await prisma.resource.findUnique({
    where: { numericId },
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

  // Aggregate ratings for JSON-LD (avg + count) — only shown if there are ratings
  const ratings = resource?.ratings ?? [];
  const aggregateRating = ratings.length > 0
    ? {
        ratingCount: ratings.length,
        ratingValue: Math.round((ratings.reduce((s, r) => s + r.stars, 0) / ratings.length) * 10) / 10,
      }
    : null;
  if (!resource) notFound();
  // Only PUBLISHED resources are public.
  // Owner (teacher) and admins can see their own DRAFT/PENDING/REJECTED resources.
  if (resource.status !== 'PUBLISHED') {
    if (!userSession || (userSession.id !== resource.teacherId && userSession.role !== 'ADMIN')) {
      notFound();
    }
  }

  // Replace the blob URL with our proxy URL so the file is always served from examanet.com
  // (the user never sees the Vercel Blob URL).
  resource.fileUrl = `/api/resources/${resource.id}/download`;

  // Track view
  await prisma.view.create({ data: { resourceId: resource.id, ipAddress: 'visitor' } });
  await prisma.resource.update({ where: { id: resource.id }, data: { viewsCount: { increment: 1 } } });

  // Similar resources
  const similar = await prisma.resource.findMany({
    where: { status: 'PUBLISHED', subjectId: resource.subjectId, NOT: { id: resource.id } },
    take: 4,
    orderBy: { viewsCount: 'desc' },
    select: {
      id: true,
      numericId: true,
      slug: true,
      title: true,
      viewsCount: true,
      avgRating: true,
      subject: { select: { nameFr: true, color: true } },
      class: { select: { nameFr: true, slug: true } },
      teacher: { select: { numericId: true, slug: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, schoolName: true, schoolNameAr: true } },
    },
  });

  // Star distribution
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: resource.ratings.filter(r => r.stars === star).length
  }));
  const maxCount = Math.max(...dist.map(d => d.count), 1);

  // JSON-LD structured data for SEO (LearningResource schema)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  const resourceUrl = `${baseUrl}/ressources/${resource.numericId}/${resource.slug}`;
  const courseJsonLd = courseSchema({
    slug: resource.slug,
    title: resource.title,
    description: resource.description || `${resource.title} — Ressource pédagogique gratuite sur Examanet`,
    language: resource.language || 'fr',
    level: resource.class?.nameFr || resource.class?.level?.nameFr || 'Enseignement de base',
    cycle: (resource.headerData as any)?.cycle || resource.class?.level?.nameFr || 'Enseignement de base',
    subject: resource.subject?.nameFr || 'Éducation',
    type: resource.type,
    year: resource.year,
    teacher: resource.teacher ? `${resource.teacher.firstName || ''} ${resource.teacher.lastName || ''}`.replace(/\s+/g, ' ').trim() || null : null,
    url: resourceUrl,
    datePublished: resource.publishedAt?.toISOString() || resource.createdAt?.toISOString(),
    dateModified: resource.updatedAt?.toISOString() || resource.createdAt?.toISOString(),
    aggregateRating,
    tags: resource.tags, // SEO: auto-generated tags boost discoverability
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Accueil', url: baseUrl },
    { name: 'Ressources', url: `${baseUrl}/ressources` },
    ...(resource.subject ? [{ name: resource.subject.nameFr || resource.subject.slug, url: `${baseUrl}/matieres/${resource.subject.slug}` }] : []),
    ...(resource.class ? [{ name: resource.class.nameFr || resource.class.slug, url: `${baseUrl}/niveaux/${resource.class.level?.slug}?class=${resource.class.slug}` }] : []),
    { name: resource.title || 'Ressource', url: resourceUrl },
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />
      <main className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Visual breadcrumb (matches BreadcrumbList JSON-LD) */}
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-xs text-slate-500 mb-4 flex-wrap">
            <Link href="/" className="hover:text-primary-600 transition">Accueil</Link>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <Link href="/ressources" className="hover:text-primary-600 transition">Ressources</Link>
            {resource.subject && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <Link href={`/matieres/${resource.subject.slug}`} className="hover:text-primary-600 transition">{resource.subject.nameFr}</Link>
              </>
            )}
            {resource.class && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <Link href={`/niveaux/${resource.class.level?.slug}`} className="hover:text-primary-600 transition">{resource.class.nameFr}</Link>
              </>
            )}
          </nav>

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* MAIN */}
            <div>
              {/* PROMINENT correction banner — students search corrected homeworks */}
              {resource.hasCorrection && (
                <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl p-5 mb-4 shadow-lg border-2 border-emerald-400/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-extrabold text-lg mb-1">✅ Ce document contient un corrigé</h2>
                      {resource.correctionSummary ? (
                        <p className="text-sm text-emerald-50">{resource.correctionSummary}</p>
                      ) : (
                        <p className="text-sm text-emerald-50">
                          Le corrigé détaillé est intégré à la fin du document. Faites défiler pour le consulter.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${RESOURCE_TYPE_LABELS[resource.type]?.color}`}>
                    {RESOURCE_TYPE_LABELS[resource.type]?.fr}
                  </span>
                  {/* Homework subtype badge (only when HOMEWORK) */}
                  {resource.type === 'HOMEWORK' && resource.homeworkSubtype && HOMEWORK_SUBTYPE_LABELS[resource.homeworkSubtype] && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${HOMEWORK_SUBTYPE_LABELS[resource.homeworkSubtype].color}`}>
                      {HOMEWORK_SUBTYPE_LABELS[resource.homeworkSubtype].fr}
                      {resource.homeworkNumber ? ` N°${resource.homeworkNumber}` : ''}
                    </span>
                  )}
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
                  {/* Pilote badge — only shown if PILOTE (never PUBLIC) */}
                  {resource.schoolType === 'PILOTE' && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold inline-flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      Lycée/Collège Pilote
                    </span>
                  )}
                  {/* School name badge — shown when extracted from PDF header */}
                  {resource.schoolName && (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium inline-flex items-center gap-1" dir="rtl">
                      <Building2 className="w-3 h-3" />
                      {resource.schoolName}
                    </span>
                  )}
                </div>

                <h1
                  className={`text-2xl lg:text-3xl font-extrabold text-slate-900 mb-3 leading-tight ${isArabic(resource.title) ? 'text-right' : 'text-left'}`}
                  dir={isArabic(resource.title) ? 'rtl' : 'ltr'}
                  lang={isArabic(resource.title) ? 'ar' : 'fr'}
                >
                  {resource.title}
                </h1>
                {resource.description && (
                  <div className="mb-4">
                    <AiDescription
                      text={resource.description}
                      source={resource.descriptionSource}
                      language={resource.language}
                      headerData={resource.headerData as any}
                      classNameFr={resource.class?.nameFr}
                      classNameAr={resource.class?.nameAr}
                    />
                  </div>
                )}

                {/* Product (المنتج) — only for technologie + college */}
                {resource.product && resource.subject?.slug === 'technologie' && resource.class && ['7eme', '8eme', '9eme'].includes(resource.class.slug) && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg inline-flex items-center gap-2 text-sm">
                    <Wrench className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-amber-900">المنتج / Produit :</span>
                    <span className="text-amber-800" dir="rtl">{resource.product}</span>
                  </div>
                )}

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

                <ResourceActions
                  resourceId={resource.id}
                  numericId={resource.numericId}
                  slug={resource.slug}
                  title={resource.title}
                  fileUrl={`/api/resources/${resource.id}/download`}
                  originalFileKey={resource.originalFileKey}
                  originalFileName={resource.originalFileName}
                  originalFormat={resource.originalFormat}
                  isTeacher={userSession?.role === 'TEACHER' || userSession?.role === 'ADMIN'}
                  isOwner={userSession?.id === resource.teacherId}
                />
              </div>

              {/* Aperçu PDF */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
                <div className="px-6 lg:px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-primary-600" /> Aperçu du document</h2>
                  <Link href={`/ressources/${resource.numericId}/${resource.slug}/viewer`} className="text-sm text-primary-600 font-semibold hover:underline">
                    Ouvrir en plein écran →
                  </Link>
                </div>
                <div className="p-0">
                  <PDFViewer
                    url={`/api/resources/${resource.id}/download`}
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
                      <Link key={s.id} href={`/ressources/${s.numericId}/${s.slug}`} className="card card-hover p-4 flex gap-3">
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
                      <div className="font-bold">
                        {resource.teacher.firstName} {resource.teacher.lastName}
                      </div>
                      {(resource.teacher.firstNameAr || resource.teacher.lastNameAr) && (
                        <div className="text-sm text-slate-600" dir="rtl" lang="ar">
                          {resource.teacher.firstNameAr} {resource.teacher.lastNameAr}
                        </div>
                      )}
                      {(resource.teacher.schoolName || resource.teacher.schoolNameAr) && (
                        <div className="text-xs text-slate-500 mt-1">
                          {resource.teacher.schoolName}
                          {resource.teacher.schoolNameAr && (
                            <span className="block text-slate-400" dir="rtl" lang="ar">{resource.teacher.schoolNameAr}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {resource.teacher.bio && <p className="text-sm text-slate-600 line-clamp-3">{resource.teacher.bio}</p>}
                  <Link href={`/professeurs/${resource.teacher.numericId}/${resource.teacher.slug}`} className="text-sm text-primary-600 font-semibold hover:underline mt-2 inline-block">Voir le profil →</Link>
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
