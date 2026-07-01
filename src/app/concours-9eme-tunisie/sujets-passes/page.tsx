import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  getConcoursStats,
  groupByYear,
  getSubjectMeta,
  CONCOURS_VOIES,
} from '@/lib/concours-9eme-data';
import {
  itemListSchema,
  breadcrumbSchema,
  SITE_URL,
} from '@/lib/structured-data';
import {
  ChevronRight, Download, FileText, CheckCircle, Star,
  Filter, Calendar, BookOpen, ArrowLeft, Search, X,
} from 'lucide-react';
import { ConcoursSujetsClient } from './client';

export const revalidate = 3600; // ISR: refresh every hour

const PAGE_URL = `${SITE_URL}/concours-9eme-tunisie/sujets-passes`;
const PARENT_URL = `${SITE_URL}/concours-9eme-tunisie`;

export const metadata: Metadata = {
  title: 'Sujets & Corrigés Concours 9ème Tunisie depuis 2001 | Examanet',
  description:
    "📥 Tous les sujets et corrigés du concours 9ème année en Tunisie depuis 2001. Téléchargement gratuit par année, matière, voie. Filtre, recherche, et téléchargement direct.",
  keywords: [
    'sujets 9ème année',
    'corrigés 9ème tunisie',
    'concours 9eme 2001',
    'concours 9eme 2024',
    'concours 9eme 2025',
    'concours 9eme 2026',
    'télécharger sujets 9eme',
    'PDF gratuit 9eme',
    'مناظرة التاسعة أساسي',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Sujets & Corrigés Concours 9ème Tunisie depuis 2001',
    description: 'Tous les sujets et corrigés depuis 2001. Filtre, recherche, téléchargement direct.',
    url: PAGE_URL,
    siteName: 'Examanet',
    locale: 'fr_TN',
    type: 'website',
  },
};

interface PageProps {
  searchParams: { year?: string; subject?: string; voie?: string; type?: string; q?: string };
}

export default function ConcoursSujetsPassesPage({ searchParams }: PageProps) {
  const stats = getConcoursStats();
  const yearGroups = groupByYear();

  // Filters from URL
  const yearFilter = searchParams.year ? parseInt(searchParams.year, 10) : null;
  const subjectFilter = searchParams.subject || null;
  const voieFilter = searchParams.voie || null;
  const typeFilter = searchParams.type || null; // 'sujet' or 'corrige'
  const qFilter = (searchParams.q || '').toLowerCase();

  // Apply filters
  const filteredYears = yearGroups
    .map((yg) => {
      if (yearFilter && yg.year !== yearFilter) return null;
      const filteredVoies: typeof yg.voies = {};
      for (const [voie, subjects] of Object.entries(yg.voies)) {
        if (voieFilter && voie !== voieFilter) continue;
        const filteredSubjects: any = {};
        for (const [subject, files] of Object.entries(subjects)) {
          if (subjectFilter && subject !== subjectFilter) continue;
          const filtered: any = { ...files };
          if (typeFilter === 'sujet' && !files.sujet) delete filtered.sujet;
          if (typeFilter === 'corrige' && !files.corrige && !files.sujetPlusCorrige) {
            delete filtered.corrige;
            delete filtered.sujetPlusCorrige;
          }
          if (Object.keys(filtered).length === 0) continue;
          if (qFilter) {
            const searchStr = `${yg.year} ${subject} ${voie} ${Object.keys(filtered).join(' ')}`.toLowerCase();
            if (!searchStr.includes(qFilter)) continue;
          }
          filteredSubjects[subject] = filtered;
        }
        if (Object.keys(filteredSubjects).length > 0) {
          filteredVoies[voie] = filteredSubjects;
        }
      }
      if (Object.keys(filteredVoies).length === 0) return null;
      return { ...yg, voies: filteredVoies };
    })
    .filter((yg): yg is NonNullable<typeof yg> => yg !== null);

  // JSON-LD: ItemList (top 50 files for SERP)
  const allFiles = stats.gold2020Corrige
    ? [stats.gold2020Corrige, ...filteredYears.flatMap((yg) =>
        Object.values(yg.voies).flatMap((s) =>
          Object.values(s).flatMap((f) => [f.sujet, f.corrige, f.sujetPlusCorrige].filter(Boolean)),
        ),
      )].slice(0, 50)
    : filteredYears.flatMap((yg) =>
        Object.values(yg.voies).flatMap((s) =>
          Object.values(s).flatMap((f) => [f.sujet, f.corrige, f.sujetPlusCorrige].filter(Boolean)),
        ),
      ).slice(0, 50);

  const itemListJsonLd = itemListSchema({
    name: 'Sujets & Corrigés du Concours 9ème Tunisie',
    description: `Liste complète des ${stats.totalFiles} sujets et corrigés du concours 9ème depuis 2001`,
    url: PAGE_URL,
    items: allFiles.map((f: any) => ({
      name: f.key.split('/').slice(2).join('/'),
      url: f.url,
    })),
  });

  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Collège', url: `${SITE_URL}/college` },
    { name: 'Concours 9ème', url: PARENT_URL },
    { name: 'Sujets & Corrigés', url: PAGE_URL },
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <Header />

      <main className="flex-1 pt-20">
        {/* ========== COMPACT HERO ========== */}
        <section className="relative bg-gradient-to-br from-primary-50 via-white to-amber-50 py-8 lg:py-12 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-xs text-slate-500 mb-4 flex-wrap">
              <Link href="/" className="hover:text-primary-600 transition">Accueil</Link>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <Link href="/college" className="hover:text-primary-600 transition">Collège</Link>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <Link href="/concours-9eme-tunisie" className="hover:text-primary-600 transition">Concours 9ème</Link>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-900 font-semibold">Sujets & corrigés</span>
            </nav>

            <Link
              href="/concours-9eme-tunisie"
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-semibold mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Retour au pillar
            </Link>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-2">
                  Sujets & Corrigés du <span className="gradient-text">Concours 9ème</span>
                </h1>
                <p className="text-base lg:text-lg text-slate-600">
                  <strong>{stats.totalFiles} fichiers</strong> collectés depuis 2001 — filtre, recherche, téléchargement.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-white border border-slate-200 rounded-full px-3 py-1.5 font-semibold text-slate-700">
                  {stats.totalSujets} sujets
                </span>
                <span className="bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-3 py-1.5 font-semibold">
                  {stats.totalCorriges} corrigés
                </span>
                <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5 font-semibold">
                  ⭐ {stats.totalCorriges2020Plus} corrigés 2020+
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CLIENT-SIDE FILTERS + LIST ========== */}
        <ConcoursSujetsClient
          yearGroups={filteredYears}
          allYearGroups={yearGroups}
          totalFiles={stats.totalFiles}
        />
      </main>

      <Footer />
    </div>
  );
}
