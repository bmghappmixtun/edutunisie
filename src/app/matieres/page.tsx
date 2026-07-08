import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/prisma';
import { itemListSchema } from '@/lib/structured-data';
import { BookOpen, Sparkles, ArrowRight, GraduationCap } from 'lucide-react';
import { SUBJECTS_CONFIG, getSubjectConfig } from '@/lib/subjects.config';
import { SUBJECT_ICONS } from '@/lib/subjects.icons';

export const revalidate = 300; // 5 min cache

// Slugs to exclude from the /matieres index page
// 'sport' = "Éducation Physique" (it's a sport discipline, no resources)
// 'sciences-informatique-matiere' = a BAC section, not a subject
const EXCLUDED_SLUGS = new Set(['sport', 'sciences-informatique-matiere']);

export default async function SubjectsPage() {
  const dbSubjects = await prisma.subject.findMany({
    where: { slug: { notIn: Array.from(EXCLUDED_SLUGS) } },
    orderBy: { order: 'asc' },
    include: { _count: { select: { resources: { where: { status: 'PUBLISHED' } } } } },
  });

  // Total resources (for the hero stat)
  const totalResources = dbSubjects.reduce((sum, s) => sum + s._count.resources, 0);

  // JSON-LD: ItemList of subjects for rich SERP results
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  const subjectListJsonLd = itemListSchema({
    name: 'Toutes les matières — Examanet',
    description: `${dbSubjects.length} matières disponibles : cours, devoirs, exercices et corrigés gratuits pour le système éducatif tunisien.`,
    url: `${baseUrl}/matieres`,
    items: dbSubjects.slice(0, 50).map((s) => ({
      name: s.nameFr,
      url: `${baseUrl}/matieres/${s.slug}`,
      description: `${s._count.resources} ressources en ${s.nameFr}`,
    })),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(subjectListJsonLd) }}
      />
      <Header />
      <main className="flex-1 pt-20">
        {/* ============== HERO ============== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-primary-50/30 to-sky-50">
          {/* Decorative dots */}
          <svg
            className="absolute right-0 top-0 h-full w-1/2 opacity-40 pointer-events-none"
            viewBox="0 0 200 200"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <pattern id="subjects-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.4" fill="#0EA5E9" opacity="0.12" />
              </pattern>
            </defs>
            <rect width="200" height="200" fill="url(#subjects-dots)" />
          </svg>
          {/* Blurred circles */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-30 bg-primary-400" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 bg-sky-400" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <div className="max-w-3xl">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full mb-5 text-xs font-semibold text-slate-700 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Programme officiel · JORT 2019-1085
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
                Toutes les{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-primary-600 to-sky-500 bg-clip-text text-transparent">
                    matières
                  </span>
                  <svg
                    className="absolute -bottom-1 left-0 w-full"
                    viewBox="0 0 200 8"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 0 4 Q 50 0 100 4 T 200 4"
                      fill="none"
                      stroke="url(#hero-grad)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="hero-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0EA5E9" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Explorez {dbSubjects.length} matières du système éducatif tunisien — de la 7ème
                de base jusqu'au Baccalauréat. Cours, devoirs, séries, sujets BAC et corrigés
                gratuits, conformes au programme officiel.
              </p>

              {/* Hero stats */}
              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <BookOpen className="w-4 h-4 text-primary-600" />
                  <span className="text-sm">
                    <strong className="font-bold text-slate-900">{dbSubjects.length}</strong>
                    <span className="text-slate-500"> matières</span>
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm">
                    <strong className="font-bold text-slate-900">
                      {totalResources.toLocaleString('fr-FR')}
                    </strong>
                    <span className="text-slate-500"> ressources</span>
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <span className="text-amber-500 text-base">⭐</span>
                  <span className="text-sm text-slate-600">100% gratuit</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============== GRID ============== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
            {dbSubjects.map((s) => {
              const cfg = getSubjectConfig(s.slug);
              const Icon = cfg ? SUBJECT_ICONS[cfg.design.iconName] ?? BookOpen : BookOpen;
              const color = cfg?.color ?? s.color ?? '#0EA5E9';
              const emoji = cfg?.design.emoji ?? '📚';
              const gradient = cfg?.design.gradient ?? 'from-slate-100 to-slate-50';

              return (
                <Link
                  key={s.id}
                  href={`/matieres/${s.slug}`}
                  className="group relative flex flex-col items-center text-center p-5 lg:p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 transition-all duration-300 overflow-hidden"
                >
                  {/* Top accent bar (animated on hover) */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                    style={{ background: color }}
                  />

                  {/* Background tint (fades in on hover) */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none`}
                  />

                  {/* Icon block */}
                  <div
                    className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                    style={{
                      background: `${color}1A`, // ~10% alpha
                      boxShadow: `0 6px 16px -6px ${color}55`,
                    }}
                  >
                    {/* Lucide icon (background, faded) */}
                    <Icon
                      className="absolute w-7 h-7 lg:w-9 lg:h-9 opacity-15"
                      style={{ color }}
                      strokeWidth={1.8}
                    />
                    {/* Emoji foreground (larger, on top) */}
                    <span className="relative text-3xl lg:text-4xl drop-shadow-sm">
                      {emoji}
                    </span>
                  </div>

                  {/* Subject name FR */}
                  <h3
                    className="relative font-bold text-sm lg:text-base text-slate-900 leading-tight mb-0.5 group-hover:text-slate-900 transition-colors"
                    style={{ color: undefined }}
                  >
                    {s.nameFr}
                  </h3>

                  {/* AR name (if available) */}
                  {s.nameAr && (
                    <p
                      dir="rtl"
                      className="relative text-xs text-slate-500 leading-tight mb-3"
                      lang="ar"
                    >
                      {s.nameAr}
                    </p>
                  )}
                  {!s.nameAr && <div className="mb-3" />}

                  {/* Resource count badge */}
                  <div className="relative mt-auto">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{
                        background: `${color}15`,
                        color: color,
                      }}
                    >
                      <span className="tabular-nums">{s._count.resources.toLocaleString('fr-FR')}</span>
                      <span className="font-normal opacity-80">ressources</span>
                    </span>
                  </div>

                  {/* Hover arrow */}
                  <ArrowRight
                    className="absolute bottom-3 right-3 w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300"
                    style={{ color }}
                  />
                </Link>
              );
            })}
          </div>
        </section>

        {/* ============== CTA ============== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 lg:p-12 text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary-500/20 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-3">
                Vous ne trouvez pas une matière ?
              </h2>
              <p className="text-slate-300 mb-6 max-w-xl mx-auto">
                Notre catalogue s'enrichit chaque semaine. Contactez-nous pour suggérer une
                matière ou un niveau manquant.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-primary-50 transition shadow-lg"
              >
                Nous contacter
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
