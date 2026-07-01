/**
 * Concours 9ème année — data layer
 *
 * Source-of-truth for ALL Concours 9ème data on the site.
 * The pillar page, the /sujets-passes sub-page, and any future
 * "concours 9ème" components MUST read from this file.
 *
 * ARCHITECTURE (future-proof):
 * - `getConcours9emeFiles()` reads the Vercel Blob manifest from /workspace/docs
 * - The pillar dynamically lists all available files per year × subject × voie × type
 * - Adding new corrigés = update the manifest + redeploy (no code change)
 *
 * @see /workspace/docs/concours-9eme-blob-manifest.json
 */

import fs from 'node:fs';
import path from 'node:path';

const BLOB_BASE_URL = 'https://kmy1h6us8l7bg7bg.public.blob.vercel-storage.com';
const MANIFEST_PATH = '/workspace/docs/concours-9eme-blob-manifest.json';

export type ConcoursFile = {
  key: string;
  url: string;
  size: number;
  source?: '9web.edunet.tn' | '9raya.tn' | 'ecoles.com.tn' | string;
  namespace?: 'officials' | '9raya' | string;
  note?: string;
};

export type ConcourStats = {
  totalFiles: number;
  totalSujets: number;
  totalCorriges: number;
  totalCorriges2020Plus: number;
  years: number[];
  yearsAvailable: string[]; // 2001-2026 minus 2014
  voies: Array<'general' | 'technique'>;
  sources: Array<{ name: string; count: number }>;
  gold2020Corrige: ConcoursFile | null;
};

export type ConcourSubject = {
  slug: string; // 'math', 'arabe', etc.
  nameFr: string;
  nameAr: string;
  icon: string;
  color: string; // tailwind/text color
  bgColor: string; // bg color
  descFr: string;
};

export const CONCOURS_SUBJECTS: ConcourSubject[] = [
  {
    slug: 'math',
    nameFr: 'Mathématiques',
    nameAr: 'الرياضيات',
    icon: '📐',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    descFr: 'Algèbre, géométrie, fonctions, statistiques',
  },
  {
    slug: 'arabe',
    nameFr: 'Arabe',
    nameAr: 'العربية',
    icon: '📚',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    descFr: 'قواعد، بلاغة، تعبير، قراءة',
  },
  {
    slug: 'francais',
    nameFr: 'Français',
    nameAr: 'الفرنسية',
    icon: '📖',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    descFr: 'Grammaire, conjugaison, rédaction, lecture',
  },
  {
    slug: 'svt',
    nameFr: 'Sciences de la Vie et de la Terre',
    nameAr: 'علوم الحياة والأرض',
    icon: '🧬',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    descFr: 'Biologie, géologie, écologie',
  },
  {
    slug: 'physique',
    nameFr: 'Physique',
    nameAr: 'علوم فيزيائية',
    icon: '⚛️',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    descFr: 'Mécanique, électricité, optique',
  },
  {
    slug: 'anglais',
    nameFr: 'Anglais',
    nameAr: 'الإنجليزية',
    icon: '🌍',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    descFr: 'Grammar, vocabulary, comprehension',
  },
  {
    slug: 'histoire',
    nameFr: 'Histoire-Géographie',
    nameAr: 'التاريخ والجغرافيا',
    icon: '🏛️',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    descFr: 'Histoire, géographie, éducation civique',
  },
];

export const CONCOURS_VOIES = [
  { slug: 'general', nameFr: 'Voie Générale', nameAr: 'العام', icon: '🎓', color: 'text-indigo-600' },
  { slug: 'technique', nameFr: 'Voie Technique', nameAr: 'التقني', icon: '🔧', color: 'text-orange-600' },
] as const;

let _manifest: any = null;
let _manifestMtime = 0;

function loadManifest(): any {
  // Read at runtime; cache but re-read if file mtime changes
  try {
    const stat = fs.statSync(MANIFEST_PATH);
    if (_manifest && _manifestMtime === stat.mtimeMs) {
      return _manifest;
    }
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    _manifest = JSON.parse(raw);
    _manifestMtime = stat.mtimeMs;
    return _manifest;
  } catch (e) {
    console.error('[concours-9eme-data] failed to load manifest:', e);
    return { uploaded: [], failed: [], namespaces: {} };
  }
}

/**
 * Get ALL Concours 9ème files from the manifest.
 */
export function getConcours9emeFiles(): ConcoursFile[] {
  const m = loadManifest();
  return (m.uploaded || []).map((u: any) => ({
    key: u.key,
    url: u.url,
    size: u.size,
    source: u.source,
    namespace: u.namespace,
    note: u.note,
  }));
}

/**
 * Get corrigés only (type includes 'corrig' or 'sujets+correction' or 'correction').
 */
export function getCorriges(): ConcoursFile[] {
  return getConcours9emeFiles().filter((f) => {
    const parts = f.key.split('/');
    const type = parts[4] || '';
    return type.includes('corrig') || type.includes('correction');
  });
}

/**
 * Get corrigés 2020+ (gold tier, SEO priority).
 * If empty, returns []. UI should show "Plus de corrigés à venir" placeholder.
 */
export function getCorriges2020Plus(): ConcoursFile[] {
  return getCorriges().filter((f) => {
    const parts = f.key.split('/');
    const year = parseInt(parts[2] || '0', 10);
    return year >= 2020;
  });
}

/**
 * Group files by year → voie → subject → { sujet, corrige }
 */
export type YearGroup = {
  year: number;
  voies: {
    [voie: string]: {
      [subject: string]: {
        sujet?: ConcoursFile;
        corrige?: ConcoursFile;
        sujetPlusCorrige?: ConcoursFile; // for combo files like "sujets+correction"
      };
    };
  };
};

export function groupByYear(): YearGroup[] {
  const files = getConcours9emeFiles();
  const grouped: Record<number, YearGroup> = {};
  for (const f of files) {
    const parts = f.key.split('/');
    const year = parseInt(parts[2] || '0', 10);
    const voie = parts[3] || 'general';
    const type = parts[4] || 'sujets';
    const subject = (parts[5] || '').replace('.pdf', '').replace(/-modele-\d+$/, '').replace(/-trial$/, '');

    if (!grouped[year]) grouped[year] = { year, voies: {} };
    if (!grouped[year].voies[voie]) grouped[year].voies[voie] = {};
    if (!grouped[year].voies[voie][subject]) grouped[year].voies[voie][subject] = {};

    if (type.includes('corrig') || type.includes('correction')) {
      if (type.includes('sujets+')) {
        grouped[year].voies[voie][subject].sujetPlusCorrige = f;
      } else {
        grouped[year].voies[voie][subject].corrige = f;
      }
    } else {
      grouped[year].voies[voie][subject].sujet = f;
    }
  }
  return Object.values(grouped).sort((a, b) => b.year - a.year);
}

/**
 * Stats: counts, gold corrigé, sources, etc.
 */
export function getConcoursStats(): ConcourStats {
  const files = getConcours9emeFiles();
  const corriges2020Plus = getCorriges2020Plus();
  const allCorriges = getCorriges();

  // Sources
  const sourcesMap: Record<string, number> = {};
  for (const f of files) {
    if (f.source) sourcesMap[f.source] = (sourcesMap[f.source] || 0) + 1;
  }

  // Years available (sort, exclude 2014 since 9web has nothing for 2014)
  const years = Array.from(new Set(files.map((f) => parseInt(f.key.split('/')[2] || '0', 10))))
    .filter((y) => y > 0)
    .sort((a, b) => a - b);

  return {
    totalFiles: files.length,
    totalSujets: files.length - allCorriges.length,
    totalCorriges: allCorriges.length,
    totalCorriges2020Plus: corriges2020Plus.length,
    years,
    yearsAvailable: years.map(String),
    voies: ['general', 'technique'],
    sources: Object.entries(sourcesMap).map(([name, count]) => ({ name, count })),
    gold2020Corrige: corriges2020Plus[0] || null,
  };
}

/**
 * Human-friendly subject display name.
 */
export function getSubjectMeta(slug: string): ConcourSubject | null {
  return CONCOURS_SUBJECTS.find((s) => s.slug === slug) || null;
}

/**
 * Future-proofing: returns a placeholder structure for years/subjects that
 * have NO corrigés yet. Used by the Pillar to render "Plus de corrigés à venir" cards.
 */
export function getUpcomingCorriges(): Array<{
  year: number;
  subject: string;
  status: 'placeholder';
}> {
  // Years 2020-2026: 7 years × 6 subjects = 42 placeholders max
  // We can show a representative subset to keep the page compact
  const placeholders: Array<{ year: number; subject: string; status: 'placeholder' }> = [];
  const recentYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
  const coreSubjects = ['math', 'francais', 'arabe', 'svt', 'physique', 'anglais'];

  for (const year of recentYears) {
    for (const subject of coreSubjects) {
      const hasCorrige = getCorriges2020Plus().some((f) => {
        const parts = f.key.split('/');
        return parseInt(parts[2], 10) === year && (parts[5] || '').startsWith(subject);
      });
      if (!hasCorrige) {
        placeholders.push({ year, subject, status: 'placeholder' });
      }
    }
  }
  return placeholders.slice(0, 6); // Show 6 representative placeholders
}
