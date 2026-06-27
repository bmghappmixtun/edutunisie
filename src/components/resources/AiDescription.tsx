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

const LABELS_AR: Record<string, string> = {
  teacher: 'الأستاذ',
  school: 'المؤسسة',
  level: 'المستوى',
  year: 'السنة الدراسية',
  subject: 'المادة',
  type: 'النوع',
  exercises: 'التمارين',
  summary: 'الملخص',
};

const LABELS_FR: Record<string, string> = {
  teacher: 'Enseignant',
  school: 'Établissement',
  level: 'Classe',
  year: 'Année scolaire',
  subject: 'Matière',
  type: 'Type',
  exercises: 'Exercices',
  summary: 'Résumé',
};

/**
 * Parse the AI-generated description into structured fields.
 * Each field has a label (in AR or FR) and a value.
 */
function parseFields(html: string, isAr: boolean): { fields: Field[]; summary: string } {
  const labels = isAr ? LABELS_AR : LABELS_FR;
  const fields: Field[] = [];
  let summary = '';

  // Strip HTML tags but preserve <br> as newlines
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>([^<]+)<\/strong>/gi, '$1:')
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
    // Try to match "Label : value" or "Label: value"
    let matched = false;
    for (const [key, label] of Object.entries(labels)) {
      // Match either "Label :" or "Label:"
      const re = new RegExp(`^${escapeRe(label)}\\s*[:：]\\s*(.+)$`, 'i');
      const m = line.match(re);
      if (m && m[1]) {
        const value = m[1].trim();
        if (value) {
          if (key === 'summary') {
            summary = value;
          } else {
            fields.push({ Icon: iconMap[key] || FileText, label, value });
          }
        }
        matched = true;
        break;
      }
    }
    // If a line didn't match a label, it might be a continuation of summary
    if (!matched && fields.length > 0 && !line.match(/^[\u0600-\u06FFa-zA-Z]+\s*[:：]/)) {
      // Continuation line — append to last field value
      const last = fields[fields.length - 1];
      if (last) last.value = `${last.value} ${line}`;
    } else if (!matched && fields.length === 0 && line) {
      // No labels matched — treat everything as summary
      summary = summary ? `${summary} ${line}` : line;
    }
  }

  return { fields, summary };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Render the resource description as a beautiful info card with icons.
 * Each piece of info (teacher, school, level, etc.) gets its own icon.
 * The summary is in a separate highlighted block at the bottom.
 */
export default function AiDescription({ text, source, language, className = '' }: AiDescriptionProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const isAi = !!source && source.startsWith('agent-');
  const isRtl = language === 'ar';

  // Parse the raw text into structured fields
  const html = text
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br>')
    .replace(/<br>\s*<br>/g, '<br><br>');
  const { fields, summary } = parseFields(html, isRtl);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={language || 'fr'}
      className={`relative rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/30 p-4 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-violet-100 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
        <span className="font-bold text-sm text-slate-800">
          {isRtl ? 'ملخص ذكي' : 'Résumé intelligent'}
        </span>

        {/* AI badge with tooltip */}
        {isAi && (
          <div
            className={`relative ${isRtl ? 'mr-auto' : 'ml-auto'}`}
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
          >
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-100 to-indigo-100 border border-violet-200 text-violet-700 cursor-help text-[10px] font-bold uppercase tracking-wide">
              IA
            </span>
            {tooltipOpen && (
              <span className={`absolute z-50 ${isRtl ? 'left-0' : 'right-0'} top-full mt-1.5 w-56 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs leading-relaxed shadow-xl pointer-events-none`}>
                <span className="block font-semibold mb-0.5">
                  {isRtl ? '✨ ملخص مُولَّد بالذكاء الاصطناعي' : '✨ Résumé généré par IA'}
                </span>
                <span className="block text-slate-300">
                  {isRtl
                    ? 'ملخص تلقائي لمحتوى الـ PDF لمساعدتك في إيجاد المورد المناسب.'
                    : 'Résumé automatique du contenu du PDF pour vous aider à trouver la bonne ressource.'}
                </span>
                <span className={`absolute -top-1 ${isRtl ? 'left-3' : 'right-3'} w-2 h-2 bg-slate-900 rotate-45`} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info grid */}
      {fields.length > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-3 ${isRtl ? 'text-right' : ''}`}>
          {fields.map((f, i) => (
            <div key={i} className={`flex items-start gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <f.Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor(f.Icon)}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-none mb-0.5">
                  {f.label}
                </div>
                <div className="text-sm text-slate-800 font-medium leading-snug break-words">
                  {f.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary block */}
      {summary && (
        <div className={`mt-3 pt-3 border-t border-violet-100 ${isRtl ? 'text-right' : ''}`}>
          <div className={`flex items-start gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <ScrollText className="w-4 h-4 mt-0.5 flex-shrink-0 text-violet-600" />
            <div className="flex-1 text-sm text-slate-700 leading-relaxed">
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
