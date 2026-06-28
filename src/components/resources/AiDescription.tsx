'use client';

import {
  Sparkles,
  User,
  Building2,
  GraduationCap,
  CalendarDays,
  BookOpen,
  FileText,
  ListChecks,
  ScrollText,
} from 'lucide-react';
import { useState } from 'react';

interface AiDescriptionProps {
  /** The description text (already in target language). */
  text: string;
  /** Origin of the description: 'agent-v2-multilingual' | 'manual' | null */
  source: string | null | undefined;
  /** Resource language code ('ar' | 'fr' | 'en'). Drives RTL direction. */
  language?: string | null;
  /** Optional CSS class for the description text wrapper. */
  className?: string;
}

type Field = {
  /** Icon component from lucide-react */
  Icon: typeof User;
  /** Localized label, e.g. "الأستاذ" / "Enseignant" */
  label: string;
  /** The value extracted from the description */
  value: string;
};

const LABELS_AR: Record<string, string[]> = {
  teacher: ['الأستاذ', 'الأستا ذ', 'المعلم'],
  school: ['المؤسسة', 'المدرسة'],
  level: ['الصف', 'المستوى', 'الصف', 'السنة', 'الفصل'],
  year: ['السنة الدراسية', 'العام الدراسي'],
  subject: ['المادة', 'المـادة'],
  type: ['النوع', 'نوع'],
  exercises: ['التمارين', 'التمرين'],
  summary: ['ملخص', 'الملخص', 'الموضوع', 'ملخص الدرس'],
  concepts: ['المفاهيم', 'المفاهيم/الشخصيات', 'المفاهيم/المهارات المكتسبة', 'المفاهيم المكتسبة', 'الأفكار الرئيسية'],
};

const LABELS_FR: Record<string, string[]> = {
  teacher: ['Enseignant', 'Professeur', 'Mr', 'Mme'],
  school: ['Établissement', 'Lycée', 'Collège', 'École'],
  level: ['Classe', 'Niveau', 'Année'],
  year: ['Année scolaire', 'Année'],
  subject: ['Matière', 'Matière', 'Subject'],
  type: ['Type'],
  exercises: ['Exercices', 'Exercice'],
  summary: ['Résumé', 'Description', 'Aperçu', 'Contenu'],
  concepts: ['Concepts', 'Notions clés', 'Points clés'],
};

/**
 * Parse the AI-generated description into structured fields.
 * Each field has a label (in AR or FR) and a value.
 */
function parseFields(html: string, isAr: boolean, bilingual: boolean = false): { fields: Field[]; summary: string } {
  // If bilingual mode, merge both label sets. Otherwise pick by detected language.
  const labels: Record<string, string[]> = bilingual
    ? mergeBilingualLabels(LABELS_AR, LABELS_FR, isAr)
    : (isAr ? LABELS_AR : LABELS_FR);
  const fields: Field[] = [];
  let summary = '';

  // Strip HTML tags but preserve <br> as newlines
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>([^<]+)<\/strong>/gi, '$1')
    .replace(/<[^>]+>/g, '');

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const iconMap: Record<string, typeof User> = {
    teacher: User,
    school: Building2,
    level: GraduationCap,
    year: CalendarDays,
    subject: BookOpen,
    type: FileText,
    exercises: ListChecks,
    summary: ScrollText,
  };

  for (const line of lines) {
    let matched = false;
    for (const [key, labelVariants] of Object.entries(labels)) {
      // Try each label variant for this key
      for (const label of labelVariants) {
        const re = new RegExp(`^${escapeRe(label)}\\s*[:：]\\s*(.+)$`, 'i');
        const m = line.match(re);
        if (m && m[1]) {
          const value = m[1].trim();
          if (value) {
            // Use the first (canonical) label for display
            const displayLabel = labels[key][0];
            if (key === 'summary') {
              summary = value;
            } else if (key === 'concepts') {
              // concepts go into the summary block (already formatted as <ul> in DB)
              summary = summary ? `${summary}\n${value}` : value;
            } else {
              fields.push({ Icon: iconMap[key] || FileText, label: displayLabel, value });
            }
          }
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    if (!matched && fields.length > 0 && !line.match(/^[\u0600-\u06FFa-zA-Z]+\s*[:：]/)) {
      const last = fields[fields.length - 1];
      if (last) last.value = `${last.value} ${line}`;
    } else if (!matched && fields.length === 0 && line) {
      summary = summary ? `${summary} ${line}` : line;
    }
  }

  return { fields, summary };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Merge AR + FR label sets so the parser can handle bilingual descriptions.
 * The display language (passed via isAr) decides which label is shown first.
 */
function mergeBilingualLabels(
  ar: Record<string, string[]>,
  fr: Record<string, string[]>,
  isAr: boolean
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  const keys = new Set([...Object.keys(ar), ...Object.keys(fr)]);
  for (const key of keys) {
    const arLabels = ar[key] || [];
    const frLabels = fr[key] || [];
    // Put preferred language first (for display)
    merged[key] = isAr ? [...arLabels, ...frLabels] : [...frLabels, ...arLabels];
  }
  return merged;
}

/**
 * Render the resource description as a beautiful info card with icons.
 *
 * RTL handling: We rely on the browser's natural RTL flow via `dir="rtl"`.
 * - In RTL: the icon (first child in DOM) appears on the RIGHT
 * - In LTR: the icon appears on the LEFT
 * No flex-row-reverse needed — the dir attribute handles it correctly.
 */
export default function AiDescription({ text, source, language, className = '' }: AiDescriptionProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const isAi = !!source && source.startsWith('agent-');

  // Auto-detect language from content: count Arabic vs Latin characters.
  // Some PDFs were imported with wrong language in DB (e.g. lang='fr' but
  // description is in Arabic). This prevents the parser from picking the
  // wrong label set and dumping everything into the summary.
  const arabicCharCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinCharCount = (text.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  const detectedLang = arabicCharCount > latinCharCount * 0.3 ? 'ar' : (language || 'fr');
  const isRtl = detectedLang === 'ar';

  const html = text
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br>')
    .replace(/<br>\s*<br>/g, '<br><br>');
  // Try both AR and FR labels regardless of detected language, because
  // many descriptions mix languages (FR labels with AR values, or vice versa).
  const { fields, summary } = parseFields(html, isRtl, true);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={language || 'fr'}
      className={`relative rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/30 p-4 shadow-sm ${className}`}
    >
      {/* Header */}
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="flex items-center gap-2 mb-3 pb-2 border-b border-violet-100"
      >
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
        <span className="font-bold text-sm text-slate-800 flex-1">
          {isRtl ? 'ملخص ذكي' : 'Résumé intelligent'}
        </span>

        {isAi && (
          <div
            className="relative flex-shrink-0"
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
          >
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-100 to-indigo-100 border border-violet-200 text-violet-700 cursor-help text-[10px] font-bold uppercase tracking-wide">
              IA
            </span>
            {tooltipOpen && (
              <span className={`absolute z-50 top-full mt-1.5 w-56 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs leading-relaxed shadow-xl pointer-events-none ${isRtl ? 'left-0' : 'right-0'}`}>
                <span className="block font-semibold mb-0.5">
                  {isRtl ? '✨ ملخص مُولَّد بالذكاء الاصطناعي' : '✨ Résumé généré par IA'}
                </span>
                <span className="block text-slate-300">
                  {isRtl
                    ? 'ملخص تلقائي لمحتوى الـ PDF لمساعدتك في إيجاد المورد المناسب.'
                    : 'Résumé automatique du contenu du PDF pour vous aider à trouver la bonne ressource.'}
                </span>
                <span className={`absolute -top-1 w-2 h-2 bg-slate-900 rotate-45 ${isRtl ? 'left-3' : 'right-3'}`} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info grid — natural RTL flow via dir="rtl" */}
      {fields.length > 0 && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-3"
        >
          {fields.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <f.Icon className={`w-4 h-4 mt-1 flex-shrink-0 ${iconColor(f.Icon)}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-none mb-1">
                  {f.label}
                </div>
                <div
                  dir={isRtl ? 'ltr' : 'auto'}
                  style={{ unicodeBidi: 'isolate' }}
                  className={`text-sm text-slate-800 font-medium leading-snug break-words ${isRtl ? 'text-right' : 'text-left'}`}
                >
                  {f.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary block */}
      {summary && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="mt-3 pt-3 border-t border-violet-100"
        >
          <div className="flex items-start gap-2">
            <ScrollText className="w-4 h-4 mt-1 flex-shrink-0 text-violet-600" />
            <div
              dir="auto"
              style={{ unicodeBidi: 'isolate' }}
              className={`flex-1 text-sm text-slate-700 leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}
            >
              {summary}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pick a distinct color for each icon type to make the card more vibrant. */
function iconColor(Icon: typeof User): string {
  if (Icon === User) return 'text-blue-600';
  if (Icon === Building2) return 'text-emerald-600';
  if (Icon === GraduationCap) return 'text-purple-600';
  if (Icon === CalendarDays) return 'text-orange-600';
  if (Icon === BookOpen) return 'text-rose-600';
  if (Icon === FileText) return 'text-cyan-600';
  if (Icon === ListChecks) return 'text-amber-600';
  if (Icon === ScrollText) return 'text-violet-600';
  return 'text-slate-600';
}
