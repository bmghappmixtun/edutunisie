import Link from 'next/link';
import { fileSize, timeAgo } from '@/lib/utils';
import {
  FileText,
  Tag,
  Globe,
  BookOpen,
  GraduationCap,
  FolderOpen,
  Layers,
  CalendarDays,
} from 'lucide-react';

const TYPE_LABELS: Record<string, { fr: string; ar: string; icon: string; color: string }> = {
  COURSE: { fr: '📖 Cours', ar: '📖 درس', icon: '📖', color: 'bg-blue-100 text-blue-700' },
  DEVOIR: { fr: '📝 Devoir', ar: '📝 فرض', icon: '📝', color: 'bg-amber-100 text-amber-700' },
  EXERCISE: {
    fr: '✏️ Exercice',
    ar: '✏️ تمرين',
    icon: '✏️',
    color: 'bg-purple-100 text-purple-700',
  },
  SERIES: { fr: '📚 Série', ar: '📚 سلسلة', icon: '📚', color: 'bg-emerald-100 text-emerald-700' },
  BAC_SUBJECT: {
    fr: '🎓 Sujet Bac',
    ar: '🎓 موضوع باكالوريا',
    icon: '🎓',
    color: 'bg-red-100 text-red-700',
  },
  CORRECTION: {
    fr: '✅ Corrigé',
    ar: '✅ تصحيح',
    icon: '✅',
    color: 'bg-green-100 text-green-700',
  },
  SUMMARY: { fr: '📄 Résumé', ar: '📄 ملخص', icon: '📄', color: 'bg-slate-100 text-slate-700' },
  CARD: { fr: '🗂️ Fiche', ar: '🗂️ بطاقة', icon: '🗂️', color: 'bg-pink-100 text-pink-700' },
};

const TRIMESTER_LABELS: Record<string, string> = {
  T1: '1er trimestre',
  T2: '2ème trimestre',
  T3: '3ème trimestre',
};

const LANGUAGE_LABELS: Record<string, string> = {
  fr: '🇫🇷 Français',
  ar: '🇹🇳 العربية',
  'fr+ar': '🇫🇷 + 🇹🇳 Bilingue',
};

export default function ResourceInfoPanel({ resource, hideClasse = false }: { resource: any; hideClasse?: boolean }) {
  const typeInfo = TYPE_LABELS[resource.type] || TYPE_LABELS.COURSE;
  // Parse PostgreSQL array literal: {a,b,"c d","e f"} → ['a','b','c d','e f']
  // Also handles malformed inputs: {a,b (no closing }) or a,b (no braces)
  const parsePgArray = (s: string): string[] => {
    if (!s || typeof s !== 'string') return [];
    let str = s.trim();
    // Strip outer braces
    if (str.startsWith('{')) str = str.slice(1);
    if (str.endsWith('}')) str = str.slice(0, -1);
    if (!str) return [];
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === '"' && (i === 0 || str[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        const t = cur.trim().replace(/^["']|["']$/g, '');
        if (t) out.push(t);
        cur = '';
      } else {
        cur += c;
      }
    }
    const t = cur.trim().replace(/^["']|["']$/g, '');
    if (t) out.push(t);
    return out;
  };

  const tags = resource.tags ? parsePgArray(resource.tags) : [];

  return (
    <div className="card p-5">
      <h3 className="font-bold text-sm mb-4 text-slate-500 uppercase flex items-center gap-2">
        <FileText className="w-4 h-4" /> Informations
      </h3>

      <dl className="space-y-3 text-sm">
        {/* TYPE */}
        <Row icon={<span className="text-base">{typeInfo.icon}</span>} label="Type">
          <span
            className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${typeInfo.color}`}
          >
            {typeInfo.fr}
          </span>
        </Row>

        {/* MATIÈRE */}
        {resource.subject && (
          <Row icon={<BookOpen className="w-4 h-4" />} label="Matière">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold text-white"
              style={{ background: resource.subject.color || '#0EA5E9' }}
            >
              {resource.subject.icon} {resource.subject.nameFr}
            </span>
          </Row>
        )}

        {/* CLASSE */}
        {resource.class && !hideClasse && (
          <Row icon={<GraduationCap className="w-4 h-4" />} label="Classe">
            <span className="font-semibold text-slate-900">{resource.class.nameFr}</span>
          </Row>
        )}

        {/* SECTION */}
        {resource.section && (
          <Row icon={<FolderOpen className="w-4 h-4" />} label="Section">
            <span className="font-semibold text-slate-900">{resource.section.nameFr}</span>
          </Row>
        )}

        {/* TRIMESTRE */}
        {resource.trimester && (
          <Row icon={<Layers className="w-4 h-4" />} label="Trimestre">
            <span className="font-semibold text-slate-900">
              {TRIMESTER_LABELS[resource.trimester] || resource.trimester}
            </span>
          </Row>
        )}

        {/* ANNÉE */}
        {resource.year && (
          <Row icon={<CalendarDays className="w-4 h-4" />} label="Année">
            <span className="font-semibold text-slate-900">{resource.year}</span>
          </Row>
        )}

        {/* LANGUE */}
        {resource.language && (
          <Row icon={<Globe className="w-4 h-4" />} label="Langue">
            <span className="font-semibold text-slate-900">
              {LANGUAGE_LABELS[resource.language] || resource.language}
            </span>
          </Row>
        )}

        {/* Technical info */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          {resource.pageCount && (
            <div className="flex justify-between text-xs">
              <dt className="text-slate-500">Pages</dt>
              <dd className="font-semibold text-slate-900">{resource.pageCount}</dd>
            </div>
          )}

          {/* TAGS — just before file size, clickable for SEO + UX */}
          {tags.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t: string) => (
                  <Link
                    key={t}
                    href={`/recherche?q=${encodeURIComponent(t)}`}
                    className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md hover:bg-primary-100 hover:text-primary-700 transition"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between text-xs">
            <dt className="text-slate-500">Taille du fichier</dt>
            <dd className="font-semibold text-slate-900">{fileSize(resource.fileSize)}</dd>
          </div>
          {resource.publishedAt && (
            <div className="flex justify-between text-xs">
              <dt className="text-slate-500">Publié</dt>
              <dd className="font-semibold text-slate-900">{timeAgo(resource.publishedAt)}</dd>
            </div>
          )}
        </div>
      </dl>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">
          {label}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
