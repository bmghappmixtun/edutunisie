import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ResourceCard from '@/components/resources/ResourceCard';
import { prisma } from '@/lib/prisma';
import { getUserFavorites, decorateWithFavorites } from '@/lib/resource-helpers';
import { ChevronRight, BookOpen, GraduationCap, Sparkles, Award, Clock, Users, Target, CheckCircle, ArrowRight } from 'lucide-react';
import { getLocale, getT } from '@/lib/i18n-server';
import { itemListSchema, breadcrumbSchema } from '@/lib/structured-data';

export const revalidate = 3600; // ISR: refresh every hour

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  const isAr = locale === "ar";
  return {
    title: isAr ? "دروس الإعدادي تونس — السنة 7، 8، 9 أساسي | إكسامانت" : "Cours Collège Tunisie — 7ème, 8ème, 9ème année de base | Examanet",
    description: isAr ? "📚 +3700 مورد مجاني للإعدادي في تونس: دروس، فروض، سلاسل، تمارين وإصلاحات للسنة السابعة والثامنة والتاسعة أساسي." : "📚 +3 700 ressources gratuites pour le collège en Tunisie : cours, devoirs, séries, exercices et corrigés pour la 7ème, 8ème et 9ème année de base. Mathématiques, Physique, SVT, Français, Arabe, Anglais et plus.",
    alternates: isAr ? {"canonical":"/college"} : {"canonical":"/college"},
    openGraph: {
      title: isAr ? "دروس الإعدادي تونس — السنة 7، 8، 9" : "Cours Collège Tunisie — 7ème, 8ème, 9ème année de base",
      description: isAr ? "+3700 مورد مجاني للإعدادي في تونس." : "+3 700 ressources gratuites pour le collège en Tunisie : cours, devoirs, séries, exercices et corrigés.",
      url: isAr ? "/college" : "/college",
      siteName: isAr ? "إكسامانت" : "Examanet",
      locale: isAr ? "ar_TN" : "fr_TN",
      type: isAr ? "website" : "website",
      images: isAr ? [{"url":"/api/og/page/college","width":1200,"height":630,"alt":"إكسامانت — الإعدادي"}] : [{"url":"/api/og/page/college","width":1200,"height":630,"alt":"Examanet — Collège"}],
    },
  };
}

const SUBJECT_INFO: Record<string, { color: string; icon: string; desc: string }> = {
  Mathématiques: { color: '#3B82F6', icon: '📐', desc: 'Algèbre, géométrie, fonctions, statistiques' },
  Physique: { color: '#8B5CF6', icon: '⚛️', desc: 'Mécanique, électricité, optique' },
  'Sciences de la Vie et de la Terre': { color: '#10B981', icon: '🧬', desc: 'Biologie, géologie, écologie' },
  Français: { color: '#EF4444', icon: '📖', desc: 'Grammaire, conjugaison, rédaction, lecture' },
  Arabe: { color: '#F59E0B', icon: '📚', desc: 'قواعد، بلاغة، تعبير، قراءة' },
  Anglais: { color: '#06B6D4', icon: '🌍', desc: 'Grammar, vocabulary, comprehension' },
  Technologie: { color: '#84CC16', icon: '⚙️', desc: 'Mécanique, électronique, projets techniques' },
  Informatique: { color: '#6366F1', icon: '💻', desc: 'Algorithmique, programmation, bureautique' },
  Histoire: { color: '#A855F7', icon: '🏛️', desc: 'Histoire ancienne, moderne et contemporaine' },
  Géographie: { color: '#EC4899', icon: '🗺️', desc: 'Géographie de la Tunisie et du monde' },
  'Éducation Civique': { color: '#F97316', icon: '🏛️', desc: 'Citoyenneté et droits humains' },
};

export default async function CollegePillar() {
  const t = getT();
  // Top resources (by views) for carousel
  const topResources = await prisma.resource.findMany({
    where: {
      status: 'PUBLISHED',
      class: { level: { slug: 'college' } },
    },
    orderBy: { viewsCount: 'desc' },
    take: 8,
    include: {
      subject: true,
      class: { include: { level: true } },
      teacher: { select: { firstName: true, lastName: true, firstNameAr: true, lastNameAr: true } },},
  });

  // Resources by class
  const classStats = await prisma.class.findMany({
    where: { level: { slug: 'college' } },
    orderBy: { order: 'asc' },
    include: { _count: { select: { resources: { where: { status: 'PUBLISHED' } } } } },
  });

  // Resources by subject for college
  const subjectStats = await prisma.$queryRaw<Array<{ subject: string; subjectId: string; slug: string; icon: string | null; color: string | null; count: bigint }>>`
    SELECT s."nameFr" as subject, s.id as "subjectId", s.slug, s.icon, s.color, COUNT(r.id)::int as count
    FROM "Resource" r
    JOIN "Subject" s ON r."subjectId" = s.id
    JOIN "Class" c ON r."classId" = c.id
    JOIN "Level" l ON c."levelId" = l.id
    WHERE l.slug = 'college' AND r.status = 'PUBLISHED'
    GROUP BY s."nameFr", s.id, s.slug, s.icon, s.color
    ORDER BY count DESC
  `;

  // Top teachers in college by resource count
  const topTeachers = await prisma.user.findMany({
    where: {
      role: 'TEACHER',
      uploadedFiles: { some: { class: { level: { slug: 'college' } } } },
    },
    select: {
      id: true,
      numericId: true,
      slug: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      isVerifiedTeacher: true,
      schoolName: true,
      _count: { select: { uploadedFiles: { where: { class: { level: { slug: 'college' } }, status: 'PUBLISHED' } } } },
    },
    orderBy: { uploadedFiles: { _count: 'desc' } },
    take: 8,
  });

  const totalResources = classStats.reduce((s, c) => s + c._count.resources, 0);

  // Decorate topResources with isFavorited
  const topFavIds = await getUserFavorites(topResources.map(r => r.id));
  const decoratedTopResources = decorateWithFavorites(topResources, topFavIds);

  // JSON-LD: ItemList of top resources
  const resourcesListJsonLd = topResources.length > 0 ? itemListSchema({
    name: 'Top ressources du collège — Examanet',
    description: `Les ${totalResources.toLocaleString('fr-TN')} ressources pédagogiques les plus consultées pour le collège en Tunisie`,
    url: `${SITE_URL}/college`,
    items: topResources.slice(0, 50).map((r) => ({
      name: r.title,
      url: `${SITE_URL}/ressources/${r.numericId}/${r.slug}`,
      description: r.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) || undefined,
    })),
  }) : null;

  // JSON-LD: Breadcrumb
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Collège', url: `${SITE_URL}/college` },
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      {resourcesListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(resourcesListJsonLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />

      <main className="flex-1 pt-20">
        {/* HERO */}
        <section className="relative bg-gradient-to-br from-primary-50 via-white to-sky-50 py-12 lg:py-20 overflow-hidden">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
          <div className="absolute top-40 -right-20 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-xs text-slate-500 mb-6 flex-wrap">
              <Link href="/" className="hover:text-primary-600 transition">{t('common.home')}</Link>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-900 font-semibold">{t('college.hero.breadcrumb')}</span>
            </nav>

            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-white border border-primary-200 rounded-full px-4 py-2 mb-6 shadow-sm">
                <GraduationCap className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-semibold text-slate-700">{t('college.hero.badge')}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                {t('college.hero.titleStart')}<span className="gradient-text">{t('college.hero.titleGradient')}</span>{t('college.hero.titleEnd')}
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto mb-8">
                {t('college.hero.subtitle').replace('{count}', totalResources.toLocaleString('fr-TN'))}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="#classes" className="btn-primary text-base">{t('college.hero.cta1')}</Link>
                <Link href="#matieres" className="btn-secondary text-base">{t('college.hero.cta2')}</Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
                <div className="text-3xl lg:text-4xl font-extrabold text-primary-600 mb-1">+{(totalResources / 1000).toFixed(1)}K</div>
                <div className="text-xs text-slate-500 font-semibold uppercase">{t('college.stats.ressources')}</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
                <div className="text-3xl lg:text-4xl font-extrabold text-amber-600 mb-1">{classStats.length}</div>
                <div className="text-xs text-slate-500 font-semibold uppercase">{t('college.stats.classes')}</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
                <div className="text-3xl lg:text-4xl font-extrabold text-emerald-600 mb-1">{subjectStats.length}</div>
                <div className="text-xs text-slate-500 font-semibold uppercase">{t('college.stats.matieres')}</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
                <div className="text-3xl lg:text-4xl font-extrabold text-purple-600 mb-1">100%</div>
                <div className="text-xs text-slate-500 font-semibold uppercase">{t('college.stats.gratuit')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEM / VALUE PROP */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-extrabold mb-6 text-slate-900">
                  {t('college.problem.title')}
                </h2>
                <p className="text-slate-700 leading-relaxed mb-4">
                  {t('college.problem.p1')}
                </p>
                <p className="text-slate-700 leading-relaxed mb-4">
                  {t('college.problem.p2')}
                </p>
                <p className="text-slate-700 leading-relaxed">
                  {t('college.problem.p3')}
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: CheckCircle, titleKey: 'college.features.f1' },
                  { icon: Sparkles, titleKey: 'college.features.f2' },
                  { icon: Users, titleKey: 'college.features.f3' },
                  { icon: Target, titleKey: 'college.features.f4' },
                  { icon: Award, titleKey: 'college.features.f5' },
                  { icon: Clock, titleKey: 'college.features.f6' },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                      <f.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{t(f.titleKey + '.title')}</div>
                      <div className="text-xs text-slate-600">{t(f.titleKey + '.desc')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CLASSES */}
        <section id="classes" className="py-16 bg-gradient-to-br from-slate-50 to-primary-50 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 text-slate-900">
                {t('college.classes.title')}
              </h2>
              <p className="text-lg text-slate-600">
                {t('college.classes.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {classStats.map((cls) => (
                <div
                  key={cls.id}
                  className="group bg-white rounded-3xl p-8 shadow-sm border-2 border-slate-100 hover:border-primary-400 hover:shadow-xl transition-all"
                >
                  <Link href={`/ressources?class=${cls.slug}`} className="block">
                    <div className="text-5xl mb-4">{cls.slug === '7eme' ? '📗' : cls.slug === '8eme' ? '📘' : '📕'}</div>
                    <div className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-2">{cls.nameAr}</div>
                    <h3 className="text-2xl font-extrabold text-slate-900 mb-3">{cls.nameFr}</h3>
                    <p className="text-slate-600 mb-4 text-sm">
                      {cls.slug === '7eme' && t('college.classes.desc7')}
                      {cls.slug === '8eme' && t('college.classes.desc8')}
                      {cls.slug === '9eme' && t('college.classes.desc9')}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="font-bold text-primary-600">+{cls._count.resources.toLocaleString('fr-TN')} {t('college.classes.ressources')}</div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                  {cls.slug === '9eme' && (
                    <Link
                      href="/concours-9eme-tunisie"
                      className="mt-4 flex items-center justify-between gap-2 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl px-4 py-3 hover:from-amber-100 hover:to-yellow-100 transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-amber-700 uppercase">{t('college.classes.prepConcours')}</div>
                        <div className="text-sm font-bold text-amber-900">{t('college.classes.concoursTitle')}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-amber-600" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SUBJECTS */}
        <section id="matieres" className="py-16 bg-white scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 text-slate-900">
                {t('college.subjects.title')}
              </h2>
              <p className="text-lg text-slate-600">
                {t('college.subjects.subtitle')}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectStats.map((s) => {
                const info = SUBJECT_INFO[s.subject] || { color: '#0EA5E9', icon: '📘', desc: '' };
                return (
                  <Link
                    key={s.subjectId}
                    href={`/matieres/${s.slug}`}
                    className="group bg-white rounded-2xl p-5 border border-slate-100 hover:border-primary-300 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: info.color + '20' }}>
                        {info.icon}
                      </div>
                      <div className="text-xs font-bold text-slate-500">+{Number(s.count).toLocaleString('fr-TN')}</div>
                    </div>
                    <h3 className="font-bold text-lg mb-1 text-slate-900 group-hover:text-primary-600 transition">{s.subject}</h3>
                    <p className="text-xs text-slate-500">{info.desc}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* TOP RESOURCES */}
        <section className="py-16 bg-gradient-to-br from-primary-50 to-sky-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 text-slate-900">
                {t('college.top.title')}
              </h2>
              <p className="text-lg text-slate-600">
                {t('college.top.subtitle')}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {decoratedTopResources.map((r) => (
                <ResourceCard key={r.id} resource={r as any} />
              ))}
            </div>

            <div className="text-center mt-8">
              <Link
                href="/ressources?class=7eme&class=8eme&class=9eme"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition"
              >
                Voir toutes les ressources <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* TOP TEACHERS */}
        {topTeachers.length > 0 && (
          <section className="py-16 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 text-slate-900">
                  Enseignants qui partagent
                </h2>
                <p className="text-lg text-slate-600">
                  Une communauté d'enseignants tunisiens qui partagent leurs ressources avec les élèves.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {topTeachers.map((t) => (
                  <Link
                    key={t.id}
                    href={`/professeurs/${t.numericId}/${t.slug}`}
                    className="group bg-slate-50 rounded-2xl p-5 text-center hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-primary-200"
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white font-bold text-xl flex items-center justify-center mb-3">
                      {(t.firstName?.[0] || '') + (t.lastName?.[0] || '')}
                    </div>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-primary-600 transition">
                        {t.firstName} {t.lastName}
                      </h3>
                      {t.isVerifiedTeacher && (
                        <CheckCircle className="w-4 h-4 text-primary-600 fill-primary-100" />
                      )}
                    </div>
                    {t.schoolName && (
                      <p className="text-xs text-slate-500 mb-2 line-clamp-1">{t.schoolName}</p>
                    )}
                    <p className="text-xs text-primary-600 font-bold">+{t._count.uploadedFiles} ressources</p>
                  </Link>
                ))}
              </div>

              <div className="text-center mt-8">
                <Link href="/professeurs" className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:gap-3 transition-all">
                  Voir tous les enseignants <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* FAQ SECTION */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-8 text-center text-slate-900">
              Questions fréquentes — Collège
            </h2>
            <div className="space-y-3">
              {[
                {
                  q: "Quelles classes sont disponibles sur Examanet ?",
                  a: "Tu trouveras des ressources pour la 7ème année de base, 8ème année de base et 9ème année de base (les trois années du collège tunisien).",
                },
                {
                  q: "Les ressources sont-elles conformes au programme officiel ?",
                  a: "Oui, toutes les ressources sont alignées sur le programme officiel du Ministère de l'Éducation tunisien. Elles sont validées par des enseignants tunisiens.",
                },
                {
                  q: "Puis-je télécharger les cours au format PDF ?",
                  a: "Absolument. Toutes les ressources sont au format PDF et peuvent être téléchargées et imprimées librement pour ton usage personnel.",
                },
                {
                  q: "Y a-t-il des corrigés pour les exercices ?",
                  a: "Oui, la majorité des séries d'exercices et des devoirs sont accompagnés de corrigés détaillés pour vérifier tes réponses et comprendre tes erreurs.",
                },
                {
                  q: "Comment réviser efficacement pour le contrôle ?",
                  a: "1) Télécharge les cours et les séries d'exercices, 2) Fais les exercices sans regarder les corrigés, 3) Vérifie tes réponses et identifie tes lacunes, 4) Refais les exercices ratés.",
                },
                {
                  q: "Puis-je devenir contributeur ?",
                  a: "Si tu es enseignant et que tu souhaites partager tes propres ressources avec la communauté, crée un compte enseignant gratuit sur Examanet.",
                },
              ].map((faq, i) => (
                <details key={i} className="bg-white rounded-xl border border-slate-200 hover:border-primary-300 transition group">
                  <summary className="cursor-pointer p-5 font-semibold text-slate-900 flex items-center justify-between gap-3 list-none">
                    <span>{faq.q}</span>
                    <span className="text-primary-600 text-xl group-open:rotate-45 transition-transform flex-shrink-0">+</span>
                  </summary>
                  <div className="px-5 pb-5 text-slate-700 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-br from-primary-600 to-sky-700 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
              {t('college.cta.title')}
            </h2>
            <p className="text-lg lg:text-xl text-primary-100 mb-8">
              {t('college.cta.subtitle')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/ressources?class=7eme&class=8eme&class=9eme" className="bg-white text-primary-700 font-bold px-7 py-3 rounded-xl hover:bg-primary-50 transition shadow-lg">
                {t('college.cta.cta1')}
              </Link>
              <Link href="/matieres" className="bg-primary-500 text-white font-bold px-7 py-3 rounded-xl hover:bg-primary-400 transition border-2 border-primary-300">
                {t('college.cta.cta2')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}