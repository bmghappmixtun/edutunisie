// Vercel force rebuild - real change for Vercel to detect
// 2026-08-10: New component - displays AI-extracted exercise summaries
// (from ResourceMetadata.keyInsights) as a separate collapsible card
// between the AI Summary and the "Points clés" card.

import {
  ListChecks,
  FlaskConical,
  Atom,
} from 'lucide-react';
import AiContentSection from './AiContentSection';

interface AiExerciseOverviewProps {
  /** Array of strings like "Exercice 1 (Physique): ..." or "Exercice 2 (Chimie): ..." */
  keyInsights: string[];
  /** Optional subject slug for palette selection. */
  subjectSlug?: string | null;
}

/**
 * Parse a keyInsight string to extract:
 * - exercise number ("Exercice 1", "Exercice 2", etc.)
 * - type ("Physique" | "Chimie")
 * - summary text
 *
 * Returns null if the string doesn't match the expected format.
 */
function parseKeyInsight(ki: string): {
  number: string;
  type: 'Physique' | 'Chimie' | 'Math' | 'SVT' | null;
  summary: string;
} | null {
  // Match: "Exercice N (Type): summary"
  // Accept Physique, Chimie, Math, SVT, and any other subject tag
  const m = ki.match(/^Exercice\s+(\d+(?:\s*[A-Za-z])?)\s*\(([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]*)\)[:\s]+(.+)$/i);
  if (!m) return null;
  const typeLower = m[2].toLowerCase().trim();
  // Map to known types
  let type: 'Physique' | 'Chimie' | 'Math' | 'SVT' | null = null;
  if (typeLower === 'physique') type = 'Physique';
  else if (typeLower === 'chimie') type = 'Chimie';
  else if (typeLower === 'math' || typeLower === 'maths' || typeLower === 'mathématiques') type = 'Math';
  else if (typeLower === 'svt' || typeLower === 'sciences de la vie et de la terre') type = 'SVT';
  else return null; // unknown type
  
  return {
    number: m[1].trim(),
    type,
    summary: m[3].trim(),
  };
}

const TYPE_ICON = {
  Physique: Atom,
  Chimie: FlaskConical,
  Math: Atom,
  SVT: FlaskConical,
} as const;

const TYPE_COLOR = {
  Physique: 'bg-blue-100 text-blue-700 border-blue-200',
  Chimie: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Math: 'bg-violet-100 text-violet-700 border-violet-200',
  SVT: 'bg-amber-100 text-amber-700 border-amber-200',
} as const;

const TYPE_COLOR_DARK = {
  Physique: 'bg-blue-50 text-blue-600 border-blue-200',
  Chimie: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  Math: 'bg-violet-50 text-violet-600 border-violet-200',
  SVT: 'bg-amber-50 text-amber-600 border-amber-200',
} as const;

export default function AiExerciseOverview({
  keyInsights,
  subjectSlug,
}: AiExerciseOverviewProps) {
  if (!keyInsights || keyInsights.length === 0) return null;

  const parsed = keyInsights
    .map(parseKeyInsight)
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // If no parseable insights, don't render the card
  if (parsed.length === 0) return null;

  const physiqueCount = parsed.filter((p) => p.type === 'Physique').length;
  const chimieCount = parsed.filter((p) => p.type === 'Chimie').length;
  const mathCount = parsed.filter((p) => p.type === 'Math').length;
  const svtCount = parsed.filter((p) => p.type === 'SVT').length;

  return (
    <AiContentSection
      title="Aperçu des exercices"
      icon={<ListChecks className="w-4 h-4" />}
      badge="AI"
      defaultOpen={true}
      subjectSlug={subjectSlug}
    >
      {/* Summary chips: counts per type */}
      {(physiqueCount > 0 || chimieCount > 0 || mathCount > 0 || svtCount > 0) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {physiqueCount > 0 && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${TYPE_COLOR.Physique}`}>
              <Atom className="w-3 h-3" />
              {physiqueCount} exercice{physiqueCount > 1 ? 's' : ''} physique
            </span>
          )}
          {chimieCount > 0 && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${TYPE_COLOR.Chimie}`}>
              <FlaskConical className="w-3 h-3" />
              {chimieCount} exercice{chimieCount > 1 ? 's' : ''} chimie
            </span>
          )}
          {mathCount > 0 && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${TYPE_COLOR.Math}`}>
              <Atom className="w-3 h-3" />
              {mathCount} exercice{mathCount > 1 ? 's' : ''} math
            </span>
          )}
          {svtCount > 0 && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${TYPE_COLOR.SVT}`}>
              <FlaskConical className="w-3 h-3" />
              {svtCount} exercice{svtCount > 1 ? 's' : ''} SVT
            </span>
          )}
        </div>
      )}

      {/* Exercise list */}
      <ol className="space-y-2 list-none">
        {parsed.map((p, idx) => {
          const Icon = p.type ? TYPE_ICON[p.type] : ListChecks;
          const colors = p.type ? TYPE_COLOR_DARK[p.type] : 'bg-slate-50 text-slate-600 border-slate-200';
          return (
            <li
              key={idx}
              className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
            >
              <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold rounded-md border ${colors}`}>
                <Icon className="w-3 h-3" />
                Ex. {p.number}
                {p.type && (
                  <span className="text-[10px] font-normal opacity-75">· {p.type}</span>
                )}
              </span>
              <p className="flex-1 text-sm text-slate-700 leading-relaxed">
                {p.summary}
              </p>
            </li>
          );
        })}
      </ol>
    </AiContentSection>
  );
}
