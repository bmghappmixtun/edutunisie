import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/prisma';
import { itemListSchema } from '@/lib/structured-data';
import {
  BookOpen, ArrowRight, Sparkles, GraduationCap, School,
  Baby, Library, Atom, Trophy, BookMarked, ChevronRight,
  type LucideIcon,
} from 'lucide-react';

export const revalidate = 300; // 5 min cache

/** Per-level design tokens (color + icon + gradient) */
const LEVEL_DESIGN: Record<string, {
  emoji: string;
  color: string;
  gradient: string;       // main hero gradient
  cardGradient: string;   // section background
  accent: string;         // small accent color
  Icon: LucideIcon;
  badge: string;
  tagline: string;
}> = {
  college: {
    emoji: '🏫',
    color: '#10B981',
    gradient: 'from-emerald-50 via-green-50/60 to-teal-50',
    cardGradient: 'from-emerald-100/60 via-white to-green-50/40',
    accent: '#059669',
    Icon: School,
    badge: 'bg-emerald-100 text-emerald-700',
    tagline: 'Collège · De la 7ème à la 9ème année',
  },
  lycee: {
    emoji: '🎓',
    color: '#7C3AED',
    gradient: 'from-indigo-50 via-violet-50/60 to-purple-50',
    cardGradient: 'from-indigo-100/60 via-white to-violet-50/40',
    accent: '#6D28D9',
    Icon: GraduationCap,
    badge: 'bg-violet-100 text-violet-700',
    tagline: 'Lycée · De la 1ère année au Baccalauréat',
  },
};

/** Per-class design: index, short code, color shift */
const CLASS_STYLES: Record<string, { roman: string; emoji: string; tint: string }> = {
  '7eme':         { roman: 'VII',  emoji: '📗', tint: '#10B981' },
  '8eme':         { roman: 'VIII', emoji: '📘', tint: '#059669' },
  '9eme':         { roman: 'IX',   emoji: '📙', tint: '#0D9488' },
  '1ere-secondaire': { roman: 'I',  emoji: '📓', tint: '#6366F1' },
  '2eme-secondaire': { roman: 'II', emoji: '📔', tint: '#7C3AED' },
  '3eme-secondaire': { roman: 'III', emoji: '📒', tint: '#8B5CF6' },
  '4eme-secondaire': { roman: 'IV', emoji: '🎯', tint: '#A855F7' },
};

export default async function NiveauxPage() {
  const levels = await prisma.level.findMany({
    orderBy: { order: 'asc' },
    include: {
      classes: {
        orderBy: { order: 'asc' },
        include: { _count: { select: { resources: { where: { status: 'PUBLISHED' } } } } },
      },
    },
  });

  const totalResources = levels.reduce(
    (s, lvl) => s + lvl.classes.reduce((a, c) => a + c._count.resources, 0),
    0
  );
  const totalClasses = levels.reduce((s, lvl) => s + lvl.classes.length, 0);

  // JSON-LD: ItemList of all classes
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  const allClasses = levels.flatMap((lvl) =>
    lvl.classes.map((c) => ({
      name: `${c.nameFr} — ${lvl.nameFr}`,
      url: `${baseUrl}/ressources?class=${c.slug}`,
      description: `${c._count.resources} ressources en ${c.nameFr}`,
    }))
  );
  const niveauxListJsonLd = itemListSchema({
    name: 'Tous les niveaux scolaires — Examanet',
    description:
      'Explorez les ressources pédagogiques gratuites par niveau et classe (Enseignement de base et Enseignement Secondaire).',
    url: `${baseUrl}/niveaux`,
    items: allClasses.slice(0, 50),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(niveauxListJsonLd) }}
      />
      <Header />

      <main className="flex-1 pt-20">
        {/* ============== HERO ============== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-primary-50/30 to-indigo-50/30">
          {/* Decorative grid pattern */}
          <svg
            className="absolute right-0 top-0 h-full w-1/2 opacity-40 pointer-events-none"
            viewBox="0 0 200 200"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <pattern id="niveaux-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#7C3AED" strokeWidth="0.6" opacity="0.18" />
              </pattern>
            </defs>
            <rect width="200" height="200" fill="url(#niveaux-grid)" />
          </svg>
          {/* Blurred circles */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-30 bg-emerald-400" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 bg-violet-400" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
                Tous les{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-emerald-600 via-primary-600 to-violet-600 bg-clip-text text-transparent">
                    niveaux scolaires
                  </span>
                  <svg
                    className="absolute -bottom-1 left-0 w-full"
                    viewBox="0 0 200 8"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 0 4 Q 50 0 100 4 T 200 4"
                      fill="none"
                      stroke="url(#niveaux-hero-grad)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="niveaux-hero-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="50%" stopColor="#0EA5E9" />
                        <stop offset="100%" stopColor="#7C3AED" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Notre plateforme couvre les classes <strong className="font-semibold text-slate-900">à partir de la 7ème année de base jusqu&apos;au Baccalauréat</strong>.
                Retrouvez les ressources conformes au programme officiel du Ministère de
                l&apos;Éducation tunisien : cours, devoirs, exercices, corrigés et sujets
                BAC — organisés par cycle et par classe.
              </p>

              {/* Stats pills */}
              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <Library className="w-4 h-4 text-primary-600" />
                  <span className="text-sm">
                    <strong className="font-bold text-slate-900">{levels.length}</strong>
                    <span className="text-slate-500"> cycles</span>
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <School className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm">
                    <strong className="font-bold text-slate-900">{totalClasses}</strong>
                    <span className="text-slate-500"> classes</span>
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <BookOpen className="w-4 h-4 text-violet-600" />
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

        {/* ============== CYCLES ============== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-10">
          {levels.map((level) => {
            const design = LEVEL_DESIGN[level.slug] ?? {
              emoji: '📚',
              color: '#0EA5E9',
              gradient: 'from-slate-50 to-slate-100',
              cardGradient: 'from-slate-50 to-white',
              accent: '#0EA5E9',
              Icon: BookOpen,
              badge: 'bg-slate-100 text-slate-700',
              tagline: level.nameFr,
            };
            const LevelIcon = design.Icon;
            const classCount = level.classes.length;
            const resCount = level.classes.reduce((a, c) => a + c._count.resources, 0);

            return (
              <div key={level.id} className="space-y-5">
                {/* Level header card */}
                <div
                  className={`relative overflow-hidden bg-gradient-to-br ${design.cardGradient} border-2 rounded-3xl p-6 lg:p-8`}
                  style={{ borderColor: `${design.color}30` }}
                >
                  {/* Decorative shape */}
                  <div
                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-15 blur-2xl"
                    style={{ background: design.color }}
                  />
                  <div
                    className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full opacity-10 blur-2xl"
                    style={{ background: design.accent }}
                  />

                  <div className="relative flex flex-col md:flex-row md:items-center gap-5">
                    {/* Big icon block */}
                    <div
                      className="flex-shrink-0 w-20 h-20 lg:w-24 lg:h-24 rounded-3xl flex items-center justify-center text-4xl lg:text-5xl shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${design.color}, ${design.accent})`,
                      }}
                    >
                      <span className="drop-shadow-sm">{design.emoji}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${design.badge}`}
                        >
                          <LevelIcon className="w-3 h-3" />
                          {level.nameAr || 'Cycle'}
                        </span>
                        <span className="text-xs text-slate-500">{design.tagline}</span>
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 leading-tight">
                        {level.nameFr}
                      </h2>
                      <p className="text-slate-600 mt-1 text-sm lg:text-base">
                        <strong className="font-bold text-slate-900">{classCount}</strong>{' '}
                        classe{classCount > 1 ? 's' : ''} ·{' '}
                        <strong className="font-bold text-slate-900">
                          {resCount.toLocaleString('fr-FR')}
                        </strong>{' '}
                        ressources gratuites
                      </p>
                    </div>

                    <Link
                      href={`/niveaux/${level.slug}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all group/btn self-start md:self-auto"
                      style={{ borderColor: design.color, color: design.color }}
                    >
                      Tout voir
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>

                {/* Classes grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                  {level.classes.map((cls) => {
                    const classStyle = CLASS_STYLES[cls.slug] ?? {
                      roman: '?',
                      emoji: '📚',
                      tint: design.color,
                    };
                    const romanNum = classStyle.roman;
                    return (
                      <Link
                        key={cls.id}
                        href={`/ressources?class=${cls.slug}`}
                        className="group relative flex flex-col items-center text-center p-5 lg:p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 transition-all duration-300 overflow-hidden"
                      >
                        {/* Top accent bar (animates on hover) */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                          style={{ background: design.color }}
                        />

                        {/* Background tint (fades in on hover) */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${design.cardGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                        />

                        {/* Roman numeral icon block */}
                        <div
                          className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                          style={{
                            background: `${classStyle.tint}1A`,
                            boxShadow: `0 6px 16px -6px ${classStyle.tint}55`,
                          }}
                        >
                          {/* Background roman numeral */}
                          <span
                            className="absolute text-2xl lg:text-3xl font-extrabold opacity-15"
                            style={{ color: classStyle.tint }}
                          >
                            {romanNum}
                          </span>
                          {/* Foreground emoji */}
                          <span className="relative text-3xl lg:text-4xl drop-shadow-sm">
                            {classStyle.emoji}
                          </span>
                        </div>

                        {/* Class name FR */}
                        <h3 className="relative font-bold text-sm lg:text-base text-slate-900 leading-tight mb-1">
                          {cls.nameFr}
                        </h3>

                        {/* Class name AR */}
                        {cls.nameAr && (
                          <p
                            dir="rtl"
                            className="relative text-xs text-slate-500 leading-tight mb-3"
                            lang="ar"
                          >
                            {cls.nameAr}
                          </p>
                        )}
                        {!cls.nameAr && <div className="mb-3" />}

                        {/* Resource count badge */}
                        <div className="relative mt-auto">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                            style={{
                              background: `${classStyle.tint}15`,
                              color: classStyle.tint,
                            }}
                          >
                            <span className="tabular-nums">
                              {cls._count.resources.toLocaleString('fr-FR')}
                            </span>
                            <span className="font-normal opacity-80">ressources</span>
                          </span>
                        </div>

                        {/* Hover arrow */}
                        <ArrowRight
                          className="absolute bottom-3 right-3 w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300"
                          style={{ color: classStyle.tint }}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* ============== PROGRESSION VISUAL ============== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Votre parcours de la 7ème au Bac
              </h3>
              <p className="text-sm text-slate-500">
                Sept années d'apprentissage — chaque étape ouvre de nouvelles matières
              </p>
            </div>

            {/* Progression bar */}
            <div className="relative">
              <div className="absolute top-1/2 left-0 right-0 h-1.5 -translate-y-1/2 bg-gradient-to-r from-emerald-200 via-primary-300 to-violet-300 rounded-full" />
              <div className="relative grid grid-cols-7 gap-2">
                {[
                  { num: 'VII', label: '7ème', color: '#10B981' },
                  { num: 'VIII', label: '8ème', color: '#059669' },
                  { num: 'IX', label: '9ème', color: '#0D9488' },
                  { num: 'I', label: '1ère', color: '#6366F1' },
                  { num: 'II', label: '2ème', color: '#7C3AED' },
                  { num: 'III', label: '3ème', color: '#8B5CF6' },
                  { num: 'IV', label: 'Bac', color: '#A855F7' },
                ].map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div
                      className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-xs lg:text-sm font-extrabold text-white shadow-md ring-4 ring-white mb-2"
                      style={{ background: step.color }}
                    >
                      {step.num}
                    </div>
                    <span className="text-[11px] lg:text-xs text-slate-700 font-semibold">
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============== CTA ============== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-3xl p-8 lg:p-12 text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-3">
                Préparez votre réussite scolaire
              </h2>
              <p className="text-slate-300 mb-6 max-w-xl mx-auto">
                Toutes les ressources sont conformes au programme officiel tunisien et
                sélectionnées par nos professeurs partenaires.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/ressources"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-primary-50 transition shadow-lg"
                >
                  <BookMarked className="w-4 h-4" />
                  Toutes les ressources
                </Link>
                <Link
                  href="/referentiel-national"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition border border-white/20"
                >
                  🇹🇳 Référentiel national
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
