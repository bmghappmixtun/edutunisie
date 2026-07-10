import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  getBacStats,
  getBacFiles,
  groupByYear,
  groupBySection,
  BAC_SECTIONS,
  BAC_SUBJECTS,
  formatFileSize,
} from '@/lib/bac-data';
import {
  breadcrumbSchema,
  itemListSchema,
  SITE_URL,
} from '@/lib/structured-data';
import { getLocale, getT, getDict } from '@/lib/i18n-server';
import {
  ChevronRight, Download, FileText, Filter, X, Calendar,
  Award, BookOpen, ArrowLeft, Search, ExternalLink,
} from 'lucide-react';

export const revalidate = 3600;

const PAGE_URL = `${SITE_URL}/bac/archives`;
const PARENT_URL = `${SITE_URL}/bac`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  const isAr = locale === 'ar';
  const stats = getBacStats();
  const title = isAr
    ? `أرشيف الباكالوريا التونسية (2010-2025) — ${stats.totalFiles} ملف | إكسامانت`
    : `Archives Bac Tunisie 2010-2025 — ${stats.totalFiles} fichiers | Examanet`;
  const desc = isAr
    ? `📥 ${stats.totalFiles} ملف من مواضيع وإصلاحات الباكالوريا التونسية من 2010 إلى 2025، الدورة الرئيسية والمراقبة. 7 شعب، 13 مادة. تحميل مباشر PDF مجاني.`
    : `📥 ${stats.totalFiles} fichiers de sujets et corrigés du Baccalauréat tunisien de 2010 à 2025, sessions principale et de contrôle. 7 sections, 13 matières. Téléchargement PDF gratuit.`;

  return {
    title,
    description: desc,
    keywords: isAr ? [
      'أرشيف الباكالوريا تونس', 'مواضيع باكالوريا تونس 2010', 'إصلاحات باكالوريا 2010-2025',
      'باكالوريا 2025', 'باكالوريا 2024', 'باكالوريا 2023', 'باكالوريا 2022',
      'باكالوريا 2021', 'باكالوريا 2020', 'باكالوريا 2019', 'باكالوريا 2018',
      'باكالوريا 2017', 'باكالوريا 2016', 'باكالوريا 2015', 'باكالوريا 2014',
      'باكالوريا 2013', 'باكالوريا 2012', 'باكالوريا 2011', 'باكالوريا 2010',
      'دورة رئيسية', 'دورة مراقبة', 'مواضيع', 'إصلاحات',
      'شعبة الرياضيات', 'شعبة العلوم التجريبية', 'شعبة الاقتصاد',
      'تحميل', 'PDF مجاني',
    ] : [
      'archives bac tunisie', 'sujets bac 2010', 'corrigés bac tunisie 2010-2025',
      'bac 2025', 'bac 2024', 'bac 2023', 'bac 2022', 'bac 2021', 'bac 2020',
      'bac 2019', 'bac 2018', 'bac 2017', 'bac 2016', 'bac 2015', 'bac 2014',
      'bac 2013', 'bac 2012', 'bac 2011', 'bac 2010',
      'session principale', 'session controle', 'rattrapage bac',
      'sujets', 'corrigés', 'math bac', 'physique bac', 'svt bac',
      'télécharger', 'PDF gratuit', 'examanet bac',
    ],
    alternates: {
      canonical: PAGE_URL,
      languages: { 'fr': PAGE_URL, 'ar': PAGE_URL, 'x-default': PAGE_URL },
    },
    openGraph: {
      title,
      description: desc,
      url: PAGE_URL,
      siteName: 'Examanet',
      locale: isAr ? 'ar_TN' : 'fr_TN',
      type: 'website',
      images: [{ url: '/api/og/page/bac', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: ['/api/og/page/bac'],
    },
  };
}

interface PageProps {
  searchParams: { year?: string; section?: string; subject?: string; session?: string; type?: string };
}

export default function BacArchivesPage({ searchParams }: PageProps) {
  const t = getT();
  const locale = getLocale();
  const isAr = locale === 'ar';

  const stats = getBacStats();
  const files = stats.totalFiles > 0 ? getBacFiles() : [];
  const yearGroups = groupByYear();
  const sectionGroups = groupBySection();

  // Structured data
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Bac', url: PARENT_URL },
    { name: isAr ? 'الأرشيف' : 'Archives', url: PAGE_URL },
  ]);

  const itemListJsonLd = stats.totalFiles > 0
    ? itemListSchema({
        name: isAr ? 'أرشيف مواضيع الباكالوريا التونسية' : 'Archives des sujets du Bac tunisien',
        description: isAr
          ? 'قائمة كاملة بأرشيف الباكالوريا التونسية 2010-2025'
          : 'Liste complète des archives du Baccalauréat tunisien 2010-2025',
        url: PAGE_URL,
        items: files.slice(0, 50).map((f: any) => ({
          name: `${isAr ? 'موضوع' : 'Sujet'} ${f.subject} ${f.year} ${f.session === 'principale' ? (isAr ? 'د.ر' : 'P') : (isAr ? 'د.م' : 'C')}`,
          url: f.url,
          description: `${f.section} · ${f.subject} · ${f.session}`,
        })),
      })
    : null;

  const allSchemas = [breadcrumbJsonLd, itemListJsonLd].filter(Boolean);

  // Active filters
  const activeYear = searchParams.year ? parseInt(searchParams.year, 10) : null;
  const activeSection = searchParams.section || null;
  const activeSubject = searchParams.subject || null;
  const activeSession = searchParams.session || null;
  const activeType = searchParams.type || null;

  return (
    <div className="min-h-screen flex flex-col">
      {allSchemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <Header />

      <main className="flex-1 pt-20">
        {/* HERO */}
        <section className="relative bg-gradient-to-br from-violet-50 via-white to-amber-50 py-12 lg:py-16 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-violet-300 to-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-br from-amber-300 to-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-xs text-slate-500 mb-6 flex-wrap">
              <Link href="/" className="hover:text-primary-600 transition">{t('common.home')}</Link>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <Link href="/bac" className="hover:text-primary-600 transition">{t('levels.bac')}</Link>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-900 font-semibold">{t('bac.archives.title')}</span>
            </nav>

            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-white border-2 border-violet-200 rounded-full px-5 py-2 mb-6 shadow-sm">
                <FileText className="w-5 h-5 text-violet-600" />
                <span className="text-sm font-bold text-violet-700">
                  {isAr ? '📥 أرشيف 2010-2025' : '📥 Archives 2010-2025'}
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold mb-3 text-slate-900">
                {t('bac.archives.title')}
              </h1>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                {t('bac.archives.subtitle')}
              </p>
            </div>

            {/* Stats */}
            {stats.totalFiles > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
                {[
                  { value: stats.totalFiles.toString(), label: t('bac.archives.files'), icon: FileText, color: 'bg-violet-100 text-violet-600' },
                  { value: stats.totalSujets.toString(), label: t('bac.archives.sujets'), icon: BookOpen, color: 'bg-amber-100 text-amber-600' },
                  { value: stats.totalCorriges.toString(), label: t('bac.archives.corriges'), icon: Award, color: 'bg-emerald-100 text-emerald-600' },
                  { value: stats.sectionsCount.toString(), label: t('bac.archives.sections'), icon: Filter, color: 'bg-rose-100 text-rose-600' },
                  { value: stats.yearRange ? `${stats.yearRange.min}-${stats.yearRange.max}` : '—', label: t('bac.archives.yearsLabelArchive'), icon: Calendar, color: 'bg-indigo-100 text-indigo-600' },
                ].map((s, i) => (
                  <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-slate-100 text-center">
                    <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${s.color} flex items-center justify-center`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 mb-0.5">{s.value}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* COMING SOON BANNER (when no files yet) */}
        {stats.totalFiles === 0 && (
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="relative bg-gradient-to-br from-violet-50 via-white to-amber-50 rounded-3xl p-8 lg:p-12 border-2 border-violet-200 overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-violet-200/30 blur-3xl" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-amber-200/30 blur-3xl" />

                <div className="relative text-center">
                  <div className="text-7xl mb-6">📥</div>
                  <div className="inline-block px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold mb-3">
                    {isAr ? '🚧 قيد الإنشاء' : '🚧 EN COURS DE CONSTRUCTION'}
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-extrabold mb-3 text-slate-900">
                    {t('bac.archives.noFiles')}
                  </h2>
                  <p className="text-slate-600 max-w-2xl mx-auto mb-6">
                    {isAr
                      ? 'نحن نجمع بنشاط مواضيع وإصلاحات الباكالوريا التونسية الرسمية من المصادر الرسمية (9web.edunet.tn) للدورات من 2010 إلى 2025. ستتوفر قريباً جميع الشعب السبع (الرياضيات، العلوم التجريبية، العلوم التقنية، علوم الإعلامية، الاقتصاد والتصرف، الآداب، الرياضة) والمواد الـ 13.'
                      : 'Nous collectons activement les sujets et corrigés officiels du Bac tunisien depuis les sources officielles (9web.edunet.tn) pour les sessions de 2010 à 2025. Bientôt disponibles : les 7 sections (Math, Sc Exp, Sc Tech, Sc Info, Éco-Gestion, Lettres, Sport) et les 13 matières.'}
                  </p>

                  {/* What will be available */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                    {[
                      { value: '15', label: isAr ? 'سنوات (2010-2025)' : 'Années (2010-2025)', icon: '📅' },
                      { value: '7', label: isAr ? 'شعب' : 'Sections', icon: '🎓' },
                      { value: '13', label: isAr ? 'مواد' : 'Matières', icon: '📚' },
                    ].map((s, i) => (
                      <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200">
                        <div className="text-3xl mb-1">{s.icon}</div>
                        <div className="text-2xl font-extrabold text-violet-700 mb-0.5">{s.value}</div>
                        <div className="text-xs text-slate-500 font-semibold uppercase">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STRUCTURE OVERVIEW — sections × years (when files exist) */}
        {stats.totalFiles > 0 && (
          <>
            {/* Filters */}
            <section className="py-8 bg-slate-50 border-y border-slate-200">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Filter className="w-4 h-4" />
                    {isAr ? 'المرشحات:' : 'Filtres:'}
                  </div>

                  {/* Year filter */}
                  <select className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                    <option>{t('bac.archives.filterYear')}</option>
                    {stats.yearsWithFiles.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  {/* Section filter */}
                  <select className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                    <option>{t('bac.archives.filterSection')}</option>
                    {BAC_SECTIONS.map((s) => (
                      <option key={s.slug} value={s.slug}>{s.nameFr}</option>
                    ))}
                  </select>

                  {/* Subject filter */}
                  <select className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                    <option>{t('bac.archives.filterSubject')}</option>
                    {BAC_SUBJECTS.map((s) => (
                      <option key={s.slug} value={s.slug}>{s.nameFr}</option>
                    ))}
                  </select>

                  {/* Session filter */}
                  <select className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                    <option>{t('bac.archives.filterSession')}</option>
                    <option value="principale">{t('bac.archives.principale')}</option>
                    <option value="controle">{t('bac.archives.controle')}</option>
                  </select>

                  {/* Type filter */}
                  <select className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                    <option>{t('bac.archives.filterType')}</option>
                    <option value="sujets">{t('bac.archives.sujets')}</option>
                    <option value="corriges">{t('bac.archives.corriges')}</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Year Groups */}
            <section className="py-12 bg-white">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {yearGroups.map((yg) => (
                  <div key={yg.year} className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-extrabold text-lg">
                        {yg.year.toString().slice(-2)}
                      </div>
                      <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">
                          Bac {yg.year}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {yg.sujets} {t('bac.archives.sujets')} · {yg.corriges} {t('bac.archives.corriges')}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {yg.files.slice(0, 12).map((f: any, i: number) => (
                        <a
                          key={i}
                          href={f.url}
                          target="_blank"
                          rel="noopener"
                          className="group bg-white border border-slate-200 rounded-xl p-3 hover:border-primary-400 hover:shadow-md transition flex items-center gap-2"
                        >
                          <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-slate-900 truncate">
                              {f.subject} · {f.session === 'principale' ? 'P' : 'C'} · {f.type === 'sujets' ? (isAr ? 'موضوع' : 'Sujet') : (isAr ? 'إصلاح' : 'Corrigé')}
                            </div>
                            <div className="text-xs text-slate-500">{formatFileSize(f.size)}</div>
                          </div>
                          <Download className="w-4 h-4 text-slate-400 group-hover:text-primary-600 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* SECTIONS OVERVIEW (always shown) */}
        <section className="py-16 bg-gradient-to-br from-slate-50 to-primary-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl lg:text-3xl font-extrabold mb-2 text-slate-900">
                {isAr ? '7 شعب، 13 مادة، 15 سنة من الأرشيف' : '7 sections, 13 matières, 15 ans d\'archives'}
              </h2>
              <p className="text-slate-600">
                {isAr
                  ? 'استكشف الأرشيف حسب شعبتك. كل شعبة لها معاملاتها وموادها الخاصة.'
                  : 'Explorez les archives par section. Chaque section a ses propres coefficients et matières.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BAC_SECTIONS.map((section) => {
                const stats = sectionGroups.find((sg) => sg.section === section.slug);
                return (
                  <Link
                    key={section.slug}
                    href={`/bac/archives?section=${section.slug}`}
                    className="group bg-white rounded-2xl p-5 border-2 border-slate-100 hover:border-primary-400 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{section.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-slate-900 group-hover:text-primary-600 transition">
                          {isAr ? section.nameAr : section.nameFr}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {stats && stats.total > 0
                            ? `${stats.total} ${t('bac.archives.files')}`
                            : isAr ? 'قيد التحميل...' : 'En cours de chargement...'}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-600 rtl:group-hover:rotate-180" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* BACK TO BAC */}
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Link
              href="/bac"
              className="inline-flex items-center gap-2 text-violet-700 hover:text-violet-800 font-bold"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {isAr ? 'العودة إلى الباكالوريا' : 'Retour à la page Bac'}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
