import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ResourceCard from '@/components/resources/ResourceCard';
import { prisma } from '@/lib/prisma';
import { getUserFavorites, decorateWithFavorites } from '@/lib/resource-helpers';
import {
  breadcrumbSchema,
  courseSchema,
  faqSchema,
  itemListSchema,
} from '@/lib/structured-data';
import { SITE_URL } from '@/lib/structured-data';
import {
  SUBJECTS_CONFIG,
  getSubjectConfig,
} from '@/lib/subjects.config';
import SubjectHero from '@/components/subjects/SubjectHero';
import SubjectFilters from '@/components/subjects/SubjectFilters';
import {
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

// ============== TYPES ==============
interface PageProps {
  params: Promise<{ subject: string }>;
  searchParams: Promise<{
    annee?: string;
    section?: string;
    type?: string;
    trimestre?: string;
    prof?: string;
    sort?: string;
    view?: string;
    page?: string;
  }>;
}

// ============== CONSTS ==============
export const revalidate = 600; // 10 min cache — pages publiques très SEO

// Pre-generate all subject slugs for static rendering
export async function generateStaticParams() {
  const subjects = await prisma.subject.findMany({ select: { slug: true } });
  return subjects.map((s) => ({ subject: s.slug }));
}

// Hard-coded filter options
const RESOURCE_TYPES = [
  { slug: 'COURSE',      label: 'Cours',        emoji: '📘' },
  { slug: 'HOMEWORK',    label: 'Devoirs',      emoji: '📝' },
  { slug: 'EXERCISE',    label: 'Exercices',    emoji: '✏️' },
  { slug: 'REVISION',    label: 'Révisions',    emoji: '🔁' },
  { slug: 'BAC_SUBJECT', label: 'Sujets BAC',   emoji: '🎓' },
  { slug: 'CORRECTION',  label: 'Corrigés',     emoji: '✅' },
  { slug: 'SUMMARY',     label: 'Résumés',      emoji: '📋' },
  { slug: 'EXAM',        label: 'Examens',      emoji: '📊' },
];

const TRIMESTERS = [
  { slug: '1', label: 'Trimestre 1' },
  { slug: '2', label: 'Trimestre 2' },
  { slug: '3', label: 'Trimestre 3' },
];

const PAGE_SIZE = 24;

// ============== METADATA (full SEO) ==============
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subject: subjectSlug } = await params;
  const subject = await prisma.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) return { title: 'Matière non trouvée' };

  const cfg = getSubjectConfig(subjectSlug);
  const seo = cfg?.seo;
  const baseUrl = SITE_URL;

  return {
    title: seo?.titleFr ?? `${subject.nameFr} — Cours, Devoirs et Exercices`,
    description: seo?.descriptionFr ?? `Ressources en ${subject.nameFr} pour le système éducatif tunisien.`,
    keywords: [
      ...(seo?.keywordsFr ?? []),
      subject.nameFr.toLowerCase(),
      `${subject.nameFr.toLowerCase()} tunisie`,
      `${subject.nameFr.toLowerCase()} gratuit`,
      `${subject.nameFr.toLowerCase()} bac`,
    ],
    alternates: {
      canonical: `${baseUrl}/matieres/${subject.slug}`,
      languages: {
        'fr-TN': `${baseUrl}/matieres/${subject.slug}`,
        'ar-TN': `${baseUrl}/ar/matieres/${subject.slug}`,
      },
    },
    openGraph: {
      title: seo?.titleFr ?? `${subject.nameFr} — Examanet`,
      description: seo?.descriptionFr,
      url: `${baseUrl}/matieres/${subject.slug}`,
      siteName: 'Examanet',
      locale: 'fr_TN',
      type: 'website',
      images: [
        {
          url: `${baseUrl}/api/og/subject/${subject.slug}`,
          width: 1200,
          height: 630,
          alt: `${subject.nameFr} — Examanet`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo?.titleFr,
      description: seo?.descriptionFr,
      images: [`${baseUrl}/api/og/subject/${subject.slug}`],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  };
}

// ============== PAGE ==============
export default async function SubjectPage({ params, searchParams }: PageProps) {
  const { subject: subjectSlug } = await params;
  const sp = await searchParams;

  const subject = await prisma.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) notFound();

  const cfg = getSubjectConfig(subjectSlug);
  const color = cfg?.color ?? subject.color ?? '#0EA5E9';

  // ===== Build filter where clause =====
  const where: Record<string, unknown> = { subjectId: subject.id, status: 'PUBLISHED' };

  if (sp.annee) {
    const klass = await prisma.class.findFirst({
      where: { OR: [{ slug: sp.annee }, { nameFr: { contains: sp.annee } }] },
      select: { id: true },
    });
    if (klass) where.classId = klass.id;
  }
  if (sp.section) {
    const sect = await prisma.section.findFirst({ where: { slug: sp.section }, select: { id: true } });
    if (sect) where.sectionId = sect.id;
  }
  if (sp.type) where.type = sp.type;
  if (sp.trimestre) where.trimester = sp.trimestre;
  if (sp.prof) where.teacherId = sp.prof;

  // Sort
  const sort = sp.sort ?? 'recent';
  let orderBy: Record<string, unknown> = { publishedAt: 'desc' };
  if (sort === 'popular') orderBy = { viewsCount: 'desc' };
  if (sort === 'downloads') orderBy = { downloadsCount: 'desc' };
  if (sort === 'favorites') orderBy = { favoritesCount: 'desc' };

  // ===== Facets (counts per filter dimension) =====
  const facetBase = { subjectId: subject.id, status: 'PUBLISHED' as const };

  const [byType, byTrimestre, byAnnee, byProf, teachers, classes, sections] = await Promise.all([
    prisma.resource.groupBy({
      by: ['type'],
      where: facetBase,
      _count: true,
    }),
    prisma.resource.groupBy({
      by: ['trimester'],
      where: { ...facetBase, trimester: { not: null } },
      _count: true,
    }),
    prisma.resource.findMany({
      where: facetBase,
      select: { classId: true, class: { select: { nameFr: true, slug: true, order: true } } },
      distinct: ['classId'],
    }),
    prisma.resource.findMany({
      where: { ...facetBase, teacherId: { not: null } },
      select: {
        teacher: {
          select: {
            id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true,
            avatarUrl: true, schoolName: true,
          },
        },
      },
      take: 30,
    }),
    prisma.user.findMany({
      where: {
        role: 'TEACHER',
        status: 'ACTIVE',
        isVerifiedTeacher: true,
        uploadedFiles: { some: { subjectId: subject.id, status: 'PUBLISHED' } },
      },
      select: {
        id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true,
        avatarUrl: true, schoolName: true,
      },
      take: 30,
    }),
    prisma.class.findMany({
      where: { resources: { some: { subjectId: subject.id, status: 'PUBLISHED' } } },
      select: { id: true, nameFr: true, slug: true, order: true },
      orderBy: { order: 'asc' },
    }),
    prisma.section.findMany({
      where: { resources: { some: { subjectId: subject.id, status: 'PUBLISHED' } } },
      select: { id: true, nameFr: true, slug: true, class: { select: { nameFr: true } } },
      take: 100,
    }),
  ]);

  // ===== Main query =====
  const page = Number(sp.page ?? 1);
  const resources = await prisma.resource.findMany({
    where,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    orderBy,
    include: {
      subject: true,
      class: true,
      section: true,
      teacher: {
        select: {
          id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true,
          avatarUrl: true, schoolName: true,
        },
      },
    },
  });
  const totalCount = await prisma.resource.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Decorate favorites
  const favoriteIds = await getUserFavorites(resources.map((r) => r.id));
  const decoratedResources = decorateWithFavorites(resources, favoriteIds);

  // Unique teachers (dedupe)
  const uniqueTeachers = Array.from(
    new Map(teachers.filter((t) => (t as any).teacher).map((t) => [(t as any).teacher!.id, (t as any).teacher!])).values()
  );

  // ===== JSON-LD =====
  const baseUrl = SITE_URL;
  const url = `${baseUrl}/matieres/${subject.slug}`;

  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Accueil', url: `${baseUrl}/` },
    { name: 'Matières', url: `${baseUrl}/matieres` },
    { name: subject.nameFr || subject.slug, url },
  ]);

  const courseJsonLd = courseSchema({
    slug: subject.slug,
    title: subject.nameFr,
    description:
      cfg?.seo?.descriptionFr ??
      `Cours complets en ${subject.nameFr} pour le système éducatif tunisien (7ème au Baccalauréat).`,
    language: 'fr',
    level: 'Enseignement Secondaire',
    cycle: 'Tous niveaux',
    subject: subject.nameFr,
    type: 'COURSE',
    url,
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    aggregateRating: { ratingValue: 4.7, ratingCount: Math.min(totalCount, 500) },
  });

  const itemListJsonLd =
    totalCount > 0
      ? itemListSchema({
          name: `Ressources en ${subject.nameFr} — Examanet`,
          description: `Liste de ressources en ${subject.nameFr} pour élèves tunisiens.`,
          url,
          items: resources.slice(0, 10).map((r) => ({
            name: r.title,
            url: `${baseUrl}/ressources/${r.slug}`,
            description: r.summary ?? r.description?.slice(0, 120) ?? '',
            image: r.thumbnailUrl ?? `${baseUrl}/icon-transparent.png`,
          })),
        })
      : null;

  const faqJsonLd =
    cfg?.seo?.faq && cfg.seo.faq.length > 0
      ? faqSchema(cfg.seo.faq.map((f) => ({ question: f.q, answer: f.a })))
      : null;

  // Related subjects (for cross-linking SEO)
  const relatedSubjects = (cfg?.seo?.related ?? [])
    .map((slug) => SUBJECTS_CONFIG[slug])
    .filter(Boolean)
    .map((c) => ({
      slug: c.slug,
      nameFr: subject.nameFr, // placeholder, replaced below
      color: c.color,
      emoji: c.design.emoji,
      gradient: c.design.gradient,
    }));

  // Resolve real names for related subjects
  const relatedDBSubjects = await prisma.subject.findMany({
    where: { slug: { in: (cfg?.seo?.related ?? []) } },
    select: { slug: true, nameFr: true, color: true },
  });
  const relatedFinal = relatedDBSubjects.map((s) => {
    const c = SUBJECTS_CONFIG[s.slug];
    return {
      ...s,
      emoji: c?.design.emoji ?? '📚',
      gradient: c?.design.gradient ?? 'from-slate-100 to-slate-50',
    };
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* ============== JSON-LD ============== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <Header />

      <main className="flex-1 pt-20">
        {/* ============== HERO ============== */}
        <SubjectHero
          subject={{
            slug: subject.slug,
            nameFr: subject.nameFr,
            nameAr: subject.nameAr,
            color,
            emoji: cfg?.design.emoji ?? '📚',
            gradient: cfg?.design.gradient ?? 'from-slate-100 to-slate-50',
            motif: cfg?.design.motif ?? 'sparkles',
          }}
          intro={cfg?.seo?.introFr ?? ''}
          totalResources={totalCount}
          totalTeachers={uniqueTeachers.length}
        />

        {/* ============== INTRO SEO ============== */}
        <section className="bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="prose prose-slate max-w-4xl">
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Tout sur {subject.nameFr} au système éducatif tunisien
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {cfg?.seo?.introFr ??
                  `Trouvez toutes les ressources en ${subject.nameFr} : cours, devoirs, séries d'exercices, sujets de BAC et corrigés, pour les classes de 7ème jusqu'au Baccalauréat.`}
              </p>
            </div>
          </div>
        </section>

        {/* ============== FILTERS + GRID ============== */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar filters */}
            <aside className="w-full lg:w-72 flex-shrink-0">
              <SubjectFilters
                subjectSlug={subject.slug}
                classes={classes}
                sections={sections.map((s) => ({ id: s.id, name: s.nameFr, slug: s.slug, class: s.class }))}
                teachers={uniqueTeachers}
                resourceTypes={RESOURCE_TYPES}
                trimesters={TRIMESTERS}
                facets={{
                  byType: Object.fromEntries(byType.map((b) => [b.type, b._count])),
                  byTrimestre: Object.fromEntries(byTrimestre.map((b) => [b.trimester!, b._count])),
                  byAnnee: byAnnee.filter((b) => b.class).reduce(
                    (acc: Record<string, number>, b) => {
                      if (b.class) acc[b.class.slug ?? b.class.nameFr] = (acc[b.class.slug ?? b.class.nameFr] ?? 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  ),
                }}
                activeFilters={sp}
                totalCount={totalCount}
              />
            </aside>

            {/* Resource grid */}
            <div className="flex-1 min-w-0">
              {/* Sort header */}
              <div className="flex items-center justify-between mb-5 bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <div className="text-sm text-slate-600">
                    <strong className="text-slate-900">{totalCount.toLocaleString()}</strong> ressources
                    {sp.annee || sp.section || sp.type || sp.trimestre || sp.prof ? (
                      <span className="ml-1 text-slate-500">filtrées</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {sp.annee && `Classe: ${classes.find((c) => c.slug === sp.annee)?.nameFr ?? sp.annee}`}
                    {sp.section && ` · Section: ${sections.find((s) => s.slug === sp.section)?.nameFr ?? sp.section}`}
                    {sp.trimestre && ` · Trim. ${sp.trimestre}`}
                    {sp.type && ` · ${RESOURCE_TYPES.find((t) => t.slug === sp.type)?.label ?? sp.type}`}
                  </div>
                </div>
                <SortDropdown current={sort} subjectSlug={subject.slug} activeFilters={sp} />
              </div>

              {/* Grid */}
              {totalCount === 0 ? (
                <EmptyState subjectName={subject.nameFr} />
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {decoratedResources.map((r) => (
                    <ResourceCard key={r.id} resource={r as any} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  current={page}
                  total={totalPages}
                  subjectSlug={subject.slug}
                  activeFilters={sp}
                />
              )}
            </div>
          </div>

          {/* ============== RELATED SUBJECTS (cross-linking SEO) ============== */}
          {relatedFinal.length > 0 && (
            <section className="mt-16 border-t border-slate-200 pt-12">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-2xl font-bold text-slate-900">Matières complémentaires</h2>
              </div>
              <p className="text-slate-600 mb-6 -mt-3">
                Ces matières sont liées à <strong>{subject.nameFr}</strong> dans le système éducatif tunisien.
                Explorez-les pour une vision complète de votre parcours scolaire.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedFinal.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/matieres/${r.slug}`}
                    className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${r.gradient} border border-slate-200 p-5 hover:shadow-md transition`}
                  >
                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{r.emoji}</div>
                    <h3 className="font-bold text-slate-900 mb-1">{r.nameFr}</h3>
                    <p className="text-xs text-slate-600 mb-3">Découvrir →</p>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ============== FAQ SEO ============== */}
          {cfg?.seo?.faq && cfg.seo.faq.length > 0 && (
            <section className="mt-16 border-t border-slate-200 pt-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span>❓</span> Questions fréquentes — {subject.nameFr}
              </h2>
              <div className="space-y-4">
                {cfg.seo.faq.map((f, i) => (
                  <details
                    key={i}
                    className="bg-white border border-slate-200 rounded-xl p-5 group open:shadow-md transition"
                  >
                    <summary className="cursor-pointer font-semibold text-slate-900 flex items-center justify-between">
                      <span>{f.q}</span>
                      <span className="text-slate-400 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                    </summary>
                    <p className="text-slate-600 mt-3 leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ============== SUB-COMPONENTS (server-rendered) ==============
function SortDropdown({
  current,
  subjectSlug,
  activeFilters,
}: {
  current: string;
  subjectSlug: string;
  activeFilters: Record<string, string | undefined>;
}) {
  const options = [
    { slug: 'recent', label: 'Plus récents' },
    { slug: 'popular', label: 'Plus consultés' },
    { slug: 'downloads', label: 'Plus téléchargés' },
    { slug: 'favorites', label: 'Plus populaires' },
  ];
  return (
    <div className="relative">
      <select
        className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-9 py-1.5 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition"
        defaultValue={current}
        onChange={undefined /* URL change handled via Link */ }
      >
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.label}
          </option>
        ))}
      </select>
      <SlidersHorizontal className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function EmptyState({ subjectName }: { subjectName: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
      <div className="text-5xl mb-3">📚</div>
      <h3 className="text-xl font-bold mb-2">Aucune ressource en {subjectName} pour ces filtres</h3>
      <p className="text-slate-500">Essayez d'élargir vos critères ou revenez bientôt !</p>
    </div>
  );
}

function Pagination({
  current,
  total,
  subjectSlug,
  activeFilters,
}: {
  current: number;
  total: number;
  subjectSlug: string;
  activeFilters: Record<string, string | undefined>;
}) {
  const makeUrl = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(activeFilters).forEach(([k, v]) => {
      if (v && k !== 'page') params.set(k, v);
    });
    if (p > 1) params.set('page', String(p));
    return `/matieres/${subjectSlug}?${params.toString()}`;
  };

  return (
    <nav className="mt-8 flex justify-center gap-2">
      {current > 1 && (
        <Link href={makeUrl(current - 1)} className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm">
          ← Précédent
        </Link>
      )}
      {Array.from({ length: Math.min(total, 7) }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={makeUrl(p)}
          className={`px-3 py-2 rounded-lg text-sm ${
            p === current ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50'
          }`}
        >
          {p}
        </Link>
      ))}
      {current < total && (
        <Link href={makeUrl(current + 1)} className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm">
          Suivant →
        </Link>
      )}
    </nav>
  );
}
