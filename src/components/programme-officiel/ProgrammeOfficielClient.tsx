'use client';

import { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  BookOpen,
  Calculator,
  Atom,
  Leaf,
  Cpu,
  Cog,
  Globe,
  BookText,
  Brain,
  Landmark,
  Laptop,
  Heart,
  Languages,
  TrendingUp,
  Briefcase,
  ChevronRight,
  ChevronDown,
  Library,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { programmeOfficiel, getLevelStats } from '@/lib/programme-officiel';
import type { Level, Subject, Section } from '@/lib/programme-officiel/types';

const SUBJECT_ICONS: Record<string, any> = {
  mathematiques: Calculator,
  physique: Atom,
  svt: Leaf,
  technologie: Cog,
  informatique: Laptop,
  anglais: Globe,
  francais: BookText,
  arabe: BookOpen,
  philosophie: Brain,
  'histoire-geographie': Landmark,
  'education-islamique': Heart,
  economie: TrendingUp,
  gestion: Briefcase,
};

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
};

export default function ProgrammeOfficielClient() {
  const locale = useLocale();
  const t = useTranslations('programmeOfficiel');
  const isAr = locale === 'ar';

  // Active year accordion
  const [activeLevel, setActiveLevel] = useState<string>('7eme');
  // Active section per level
  const [activeSection, setActiveSection] = useState<Record<string, string>>({});
  // Opened subject cards
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set());
  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sidebar groups: collapsible year groups
  const [openYearGroups, setOpenYearGroups] = useState<Set<string>>(new Set());

  const yearMap: Record<string, { fr: string; ar: string; icon: any }> = {
    '7eme': { fr: '7ème année', ar: 'السنة السابعة', icon: BookOpen },
    '8eme': { fr: '8ème année', ar: 'السنة الثامنة', icon: BookOpen },
    '9eme': { fr: '9ème année', ar: 'السنة التامنة', icon: BookOpen },
    '1AS': { fr: '1ère année (1AS)', ar: 'الأولى ثانوي', icon: BookOpen },
    '2AS': { fr: '2ème année (2AS)', ar: 'الثانية ثانوي', icon: BookOpen },
    '3AS': { fr: '3ème année (3AS)', ar: 'الثالثة ثانوي', icon: BookOpen },
    '4AS': { fr: '4ème année (BAC)', ar: 'البكالوريا', icon: BookOpen },
  };

  const totalSubjects = useMemo(
    () => programmeOfficiel.levels.reduce((sum, l) => sum + l.subjects.length, 0),
    []
  );

  // Stats by level
  const levelStats = useMemo(
    () => Object.fromEntries(programmeOfficiel.levels.map((l) => [l.key, getLevelStats(l)])),
    []
  );

  // Toggle year group (collapsible)
  const toggleYearGroup = (key: string) => {
    setOpenYearGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Toggle year accordion
  const toggleLevel = (key: string) => {
    setActiveLevel((prev) => (prev === key ? '' : key));
  };

  // Toggle subject card
  const toggleSubject = (id: string) => {
    setOpenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter section
  const selectSection = (levelKey: string, sectionKey: string) => {
    setActiveSection((prev) => ({ ...prev, [levelKey]: sectionKey }));
  };

  // Open section from sidebar
  const openLevelSection = (levelKey: string, sectionKey?: string) => {
    setActiveLevel(levelKey);
    if (sectionKey) {
      setActiveSection((prev) => ({ ...prev, [levelKey]: sectionKey }));
    } else {
      setActiveSection((prev) => ({ ...prev, [levelKey]: 'all' }));
    }
    setTimeout(() => {
      const el = document.getElementById(`year-${levelKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const getTrimestreLabel = (index: number, isArSubject: boolean) => {
    if (isArSubject) {
      return ['الثلاثي الأول', 'الثلاثي الثاني', 'الثلاثي الثالث'][index];
    }
    return ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'][index];
  };

  const getLangBadge = (lang: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      fr: { bg: 'bg-blue-100', text: 'text-blue-700', label: '🇫🇷 FR' },
      ar: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🇹🇳 AR' },
      en: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '🇬🇧 EN' },
    };
    return map[lang] || { bg: 'bg-slate-100', text: 'text-slate-700', label: lang.toUpperCase() };
  };

  return (
    <div className="bg-slate-50 min-h-screen" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <header className="mb-8 pb-6 border-b-2 border-violet-500">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-xs text-slate-500 mb-4">
            <Link href="/" className="hover:text-violet-600 transition">
              {t('common.home')}
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="text-slate-900 font-semibold">{t('title')}</span>
          </nav>

          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0">
              <Library className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
                {t('hero.title')}
              </h1>
              <p className="text-base text-slate-600 mt-1">{t('hero.subtitle')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
              ✓ {t('badge.official')}
            </span>
            <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold">
              📚 7 {t('badge.levels')}
            </span>
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">
              🎓 {totalSubjects} {t('badge.subjects')}
            </span>
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
              🌍 FR · AR · EN
            </span>
          </div>
        </header>

        {/* Layout: Sidebar + Content */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar */}
          <aside className={`lg:sticky lg:top-4 lg:self-start ${sidebarOpen ? 'fixed inset-0 z-50 bg-white p-4 overflow-y-auto' : 'hidden lg:block'}`}>
            {/* Mobile close */}
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <span className="font-bold text-slate-900">{t('sidebar.title')}</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {/* Collège */}
              <div className="pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">
                  {t('sidebar.college')}
                </div>
                {(['7eme', '8eme', '9eme'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => { openLevelSection(key); setSidebarOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      activeLevel === key
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    {isAr ? yearMap[key].ar : yearMap[key].fr}
                  </button>
                ))}
              </div>

              {/* Lycée */}
              <div className="pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">
                  {t('sidebar.lycee')}
                </div>

                {/* 1AS — tronc commun, no sections */}
                <button
                  onClick={() => { openLevelSection('1AS'); setSidebarOpen(false); }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeLevel === '1AS'
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  {isAr ? yearMap['1AS'].ar : yearMap['1AS'].fr}
                </button>

                {/* 2AS, 3AS, 4AS — collapsible sections */}
                {(['2AS', '3AS', '4AS'] as const).map((yearKey) => {
                  const level = programmeOfficiel.levels.find((l) => l.key === yearKey);
                  if (!level?.sections) return null;
                  const isOpen = openYearGroups.has(yearKey);
                  const isActive = activeLevel === yearKey;
                  return (
                    <div key={yearKey} className="mt-1">
                      <button
                        onClick={() => {
                          toggleYearGroup(yearKey);
                          openLevelSection(yearKey);
                          setSidebarOpen(false);
                        }}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                          isActive
                            ? 'bg-violet-600 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <BookOpen className="w-4 h-4" />
                        <span className="flex-1">{isAr ? yearMap[yearKey].ar : yearMap[yearKey].fr}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-slate-200 ps-2">
                          {level.sections.map((sec) => (
                            <button
                              key={sec.key}
                              onClick={() => { openLevelSection(yearKey, sec.key); setSidebarOpen(false); }}
                              className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition ${
                                isActive && activeSection[yearKey] === sec.key
                                  ? 'bg-violet-100 text-violet-700'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                              {isAr ? sec.nameAr : sec.nameFr}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Resources link */}
              <div className="pt-4 border-t border-slate-200 mt-4">
                <Link
                  href="/ressources"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  <Library className="w-4 h-4" />
                  {t('sidebar.resources')}
                </Link>
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <div className="min-w-0">
            {programmeOfficiel.levels.map((level) => {
              const isActive = activeLevel === level.key;
              const stats = levelStats[level.key];
              const currentSection = activeSection[level.key] || 'all';

              return (
                <section
                  key={level.key}
                  id={`year-${level.key}`}
                  className={`mb-6 bg-white rounded-2xl border-2 transition-all ${
                    isActive ? 'border-violet-300 shadow-md' : 'border-slate-200'
                  }`}
                >
                  {/* Year header */}
                  <button
                    onClick={() => toggleLevel(level.key)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50 rounded-2xl transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {level.num}
                      </div>
                      <div className="min-w-0">
                        <div className="text-lg font-extrabold text-slate-900 truncate">
                          {isAr ? `${t('common.year')} ${level.num}` : level.title}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{level.subtitle}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="hidden sm:inline-block text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {stats.totalSubjects} {t('badge.subjects').toLowerCase()}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform ${
                          isActive ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Section tabs (for lycée years with sections) */}
                  {isActive && level.sections && level.sections.length > 0 && (
                    <div className="px-6 pb-3 flex flex-wrap gap-1.5">
                      <button
                        onClick={() => selectSection(level.key, 'all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                          currentSection === 'all'
                            ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ✨ {t('sectionTabs.all')}
                      </button>
                      {level.sections.map((sec) => (
                        <button
                          key={sec.key}
                          onClick={() => selectSection(level.key, sec.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                            currentSection === sec.key
                              ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isAr ? sec.nameAr : sec.nameFr}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Subjects grid */}
                  {isActive && (
                    <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {level.subjects
                        .filter((subject) => {
                          if (currentSection === 'all') return true;
                          return subject.taughtIn.includes(currentSection);
                        })
                        .map((subject) => {
                          const Icon = SUBJECT_ICONS[subject.slug] || BookOpen;
                          const colorSet = COLOR_MAP[subjectColor(subject.slug)] || COLOR_MAP.slate;
                          const isOpen = openSubjects.has(`${level.key}-${subject.slug}`);
                          const cardId = `${level.key}-${subject.slug}`;
                          const badge = getLangBadge(subject.lang);

                          return (
                            <div
                              key={subject.slug}
                              className={`rounded-xl border-2 ${colorSet.border} ${colorSet.bg} overflow-hidden`}
                            >
                              {/* Card header */}
                              <button
                                onClick={() => toggleSubject(cardId)}
                                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/50 transition"
                              >
                                <div className={`w-9 h-9 rounded-lg ${colorSet.bg} ${colorSet.text} flex items-center justify-center flex-shrink-0`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-extrabold ${colorSet.text}`}>
                                    {isAr ? subject.nameAr : subject.name}
                                  </div>
                                  {isAr && subject.name !== subject.nameAr && (
                                    <div className="text-[10px] text-slate-500 truncate">
                                      {subject.name}
                                    </div>
                                  )}
                                </div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                                  {badge.label}
                                </span>
                                <ChevronDown className={`w-4 h-4 ${colorSet.text} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </button>

                              {/* Card body */}
                              {isOpen && (
                                <div className="bg-white border-t border-slate-100 p-4 text-sm text-slate-700 max-h-96 overflow-y-auto">
                                  {renderSubjectContent(subject, level.key, isAr)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </section>
              );
            })}

            {/* Sources section */}
            <SourcesSection />
          </div>
        </div>
      </div>

      {/* Mobile sidebar trigger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed bottom-6 left-6 w-12 h-12 rounded-full bg-violet-600 text-white shadow-2xl flex items-center justify-center z-40"
        aria-label="Open menu"
      >
        <BookOpen className="w-5 h-5" />
      </button>
    </div>
  );
}

function subjectColor(slug: string): string {
  const map: Record<string, string> = {
    mathematiques: 'blue',
    physique: 'indigo',
    svt: 'emerald',
    technologie: 'purple',
    informatique: 'cyan',
    anglais: 'cyan',
    francais: 'slate',
    arabe: 'red',
    philosophie: 'fuchsia',
    'histoire-geographie': 'yellow',
    'education-islamique': 'green',
    economie: 'orange',
    gestion: 'amber',
  };
  return map[slug] || 'slate';
}

function renderSubjectContent(subject: Subject, levelKey: string, isAr: boolean) {
  const data: any = subject.data;
  const useAR = subject.lang === 'ar';

  // Pattern 1: t1/t2/t3 (college)
  if (data.t1 || data.t2 || data.t3) {
    return (
      <div className="space-y-3">
        {data.t1 && <TrimestreBlock label="1" lessons={data.t1} useAR={useAR} isAr={isAr} />}
        {data.t2 && <TrimestreBlock label="2" lessons={data.t2} useAR={useAR} isAr={isAr} />}
        {data.t3 && <TrimestreBlock label="3" lessons={data.t3} useAR={useAR} isAr={isAr} />}
      </div>
    );
  }

  // Pattern 2: themes (BAC)
  if (data.themes) {
    return (
      <div className="space-y-3">
        {data.themes.map((t: any, i: number) => (
          <div key={i} className="border-l-2 border-violet-300 pl-3">
            <div className="font-bold text-slate-900">{t.theme}</div>
            {t.duree && <div className="text-xs text-slate-500">⏱ {t.duree}</div>}
            {t.content && <div className="text-sm text-slate-700 mt-1 leading-relaxed">{t.content}</div>}
          </div>
        ))}
      </div>
    );
  }

  // Pattern 3: sections
  if (data.sections) {
    return (
      <div className="space-y-3">
        {Object.entries(data.sections).map(([secKey, sec]: [string, any]) => (
          <div key={secKey}>
            {sec.themes ? (
              sec.themes.map((t: any, i: number) => (
                <div key={i} className="border-l-2 border-violet-300 pl-3 mb-3">
                  <div className="font-bold text-slate-900">{t.theme}</div>
                  {t.duree && <div className="text-xs text-slate-500">⏱ {t.duree}</div>}
                  {t.content && <div className="text-sm text-slate-700 mt-1">{t.content}</div>}
                </div>
              ))
            ) : (
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">
                  {sec.nameFr || secKey}
                </div>
                {sec.trimestre1 && <TrimestreBlock label="1" lessons={sec.trimestre1} useAR={useAR} isAr={isAr} />}
                {sec.trimestre2 && <TrimestreBlock label="2" lessons={sec.trimestre2} useAR={useAR} isAr={isAr} />}
                {sec.trimestre3 && <TrimestreBlock label="3" lessons={sec.trimestre3} useAR={useAR} isAr={isAr} />}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Pattern 4: trimestre1/2/3
  if (data.trimestre1 || data.trimestre2 || data.trimestre3) {
    return (
      <div className="space-y-3">
        {data.trimestre1 && <TrimestreBlock label="1" lessons={data.trimestre1} useAR={useAR} isAr={isAr} />}
        {data.trimestre2 && <TrimestreBlock label="2" lessons={data.trimestre2} useAR={useAR} isAr={isAr} />}
        {data.trimestre3 && <TrimestreBlock label="3" lessons={data.trimestre3} useAR={useAR} isAr={isAr} />}
      </div>
    );
  }

  return <div className="text-slate-500 italic">—</div>;
}

function TrimestreBlock({ label, lessons, useAR, isAr }: { label: string; lessons: string[]; useAR: boolean; isAr: boolean }) {
  const labels = useAR 
    ? ['الثلاثي الأول', 'الثلاثي الثاني', 'الثلاثي الثالث']
    : ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];
  return (
    <div>
      <div className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-1.5" dir={useAR ? 'rtl' : 'ltr'}>
        📌 {labels[parseInt(label) - 1]}
      </div>
      <ul className="space-y-1 text-sm text-slate-700" dir={useAR ? 'rtl' : 'ltr'}>
        {lessons.map((lesson, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-violet-500 mt-1 flex-shrink-0">▸</span>
            <span className="leading-relaxed">{lesson}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourcesSection() {
  const t = useTranslations('programmeOfficiel');
  const sources = [
    { url: 'http://www.edunet.tn', name: 'Portail Edunet', icon: '🏛️' },
    { url: 'https://education.gov.tn', name: 'Ministère de l\'Éducation Tunisien', icon: '🏛️' },
    { url: 'https://www.cnp.com.tn', name: 'CNP — Centre National Pédagogique', icon: '📚' },
    { url: 'https://www.bac.com.tn', name: 'Bac.com.tn — Programmes BAC', icon: '🎓' },
    { url: 'http://www.edunet.tn/ressources/pedagogie/programmes/2024_2025/aide_info_ScInfo.pdf', name: 'Aide pédagogique — Informatique Sc Info (4AS) [PDF]', icon: '📄' },
    { url: 'http://www.edunet.tn/ressources/pedagogie/programmes/2024_2025/Convention_Algorithmique_2024.pdf', name: 'Convention Algorithmique 2024 [PDF]', icon: '📄' },
  ];
  return (
    <section className="mt-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1 flex items-center gap-2">
        🔗 <span>{t('sources.title')}</span>
      </h2>
      <p className="text-sm text-slate-600 mb-4">{t('sources.subtitle')}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {sources.map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-violet-50 hover:border-violet-200 border border-transparent transition group"
          >
            <span className="text-lg">{s.icon}</span>
            <span className="text-sm font-medium text-slate-700 group-hover:text-violet-700 flex-1">{s.name}</span>
            <span className="text-slate-400 group-hover:text-violet-500">↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}
