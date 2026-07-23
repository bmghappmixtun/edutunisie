'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getPaletteForSubject } from '@/lib/ai-palettes';

interface AiContentSectionProps {
  title: string;
  icon?: ReactNode;
  badge?: string; // e.g., "AI" badge text
  defaultOpen?: boolean;
  children: ReactNode;
  variant?: 'default' | 'summary' | 'system' | 'points' | 'topics';
  /**
   * Optional subject slug. The component looks up the palette from
   * SUBJECT_PALETTES (server-safe module). Falls back to default palette
   * if not provided or no subject-specific palette exists.
   */
  subjectSlug?: string | null;
}

// Re-export for backward compat
export type { AiPalette, PaletteVariant } from '@/lib/ai-palettes';
export { getPaletteForSubject, DEFAULT_PALETTE, PHYSIQUE_PALETTE, SUBJECT_PALETTES } from '@/lib/ai-palettes';

/**
 * Collapsible section for AI-extracted content.
 */
export default function AiContentSection({
  title,
  icon,
  badge = 'AI',
  defaultOpen = true,
  children,
  variant = 'default',
  subjectSlug,
}: AiContentSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const v = getPaletteForSubject(subjectSlug);

  const containerClass =
    variant === 'system'
      ? `mb-4 p-4 ${v.system.container} border rounded-xl`
      : variant === 'summary'
      ? `mb-4 p-4 ${v.summary.container} border rounded-xl`
      : variant === 'points'
      ? `mb-4 p-4 ${v.points.container} border rounded-xl`
      : variant === 'topics'
      ? `mb-4 p-4 ${v.topics.container} border rounded-xl`
      : 'mb-4 p-4 bg-white border border-slate-200 rounded-xl';

  const titleColor =
    variant === 'system'
      ? v.system.title
      : variant === 'summary'
      ? v.summary.title
      : variant === 'points'
      ? v.points.title
      : variant === 'topics'
      ? v.topics.title
      : 'text-slate-600';

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 group"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Réduire' : 'Développer'} ${title}`}
      >
        <div className={`text-xs font-bold ${titleColor} uppercase tracking-wide flex items-center gap-2`}>
          {icon}
          <span>{title}</span>
          {badge && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded-full uppercase">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
        )}
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  );
}
