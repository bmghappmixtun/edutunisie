'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AiContentSectionProps {
  title: string;
  icon?: ReactNode;
  badge?: string; // e.g., "AI" badge text
  defaultOpen?: boolean;
  children: ReactNode;
  variant?: 'default' | 'summary' | 'system' | 'points' | 'topics';
  /**
   * Optional palette override. Allows per-subject branding.
   * If not provided, falls back to the default Digital Synopsis palette #1.
   */
  palette?: AiPalette;
}

/**
 * Subject palette: 4 variants + 2 accents (for topic tag cycling).
 * Each variant uses a 2-stop gradient (container + border) + title color.
 */
export interface AiPalette {
  name: string;
  system: PaletteVariant;   // system name / dossier technique
  summary: PaletteVariant;  // AI summary
  points: PaletteVariant;   // key points
  topics: PaletteVariant;   // topic tags container
  accents: string[];        // solid bg colors for topic tag cycling (Tailwind arbitrary values, e.g. 'bg-[#330C4B]')
}

interface PaletteVariant {
  // Container: bg gradient + border
  container: string;
  // Title text color
  title: string;
  // Body accent color (e.g. arrow bullet, link)
  accent: string;
  // Solid strong color (e.g. for systemName big text)
  strong: string;
}

/**
 * Default Digital Synopsis palette #1 (Orange/Pink/Purple/Blue).
 * Used when no subject-specific palette is provided.
 */
export const DEFAULT_PALETTE: AiPalette = {
  name: 'digital-synopsis-1',
  system: {
    container: 'bg-gradient-to-r from-orange-50 to-rose-50 border-orange-200',
    title: 'text-orange-700',
    accent: 'text-orange-500',
    strong: 'text-orange-900',
  },
  summary: {
    container: 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200',
    title: 'text-rose-700',
    accent: 'text-rose-500',
    strong: 'text-rose-900',
  },
  points: {
    container: 'bg-gradient-to-r from-fuchsia-50 to-purple-50 border-fuchsia-200',
    title: 'text-fuchsia-700',
    accent: 'text-fuchsia-500',
    strong: 'text-fuchsia-900',
  },
  topics: {
    container: 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200',
    title: 'text-indigo-700',
    accent: 'text-indigo-500',
    strong: 'text-indigo-900',
  },
  accents: [
    'bg-[#F8B195] hover:bg-[#E69A7E]',
    'bg-[#F67280] hover:bg-[#E55D6B]',
    'bg-[#C06C84] hover:bg-[#A85A70]',
    'bg-[#6C5B7B] hover:bg-[#5A4A68]',
  ],
};

/**
 * Physique palette — Deep Purple / Lavender sunset.
 * 6-color scheme:
 *   #330C4B Deep Purple   #51017C Purple Iris   #711E7B Eminence
 *   #B9379D Sunset Lavender   #E3A88A Fawn   #EEDAA5 Maize
 */
export const PHYSIQUE_PALETTE: AiPalette = {
  name: 'physique-lavender',
  system: {
    container: 'bg-gradient-to-r from-[#F4E4F4] to-[#EEDAA5]/30 border-[#330C4B]/30',
    title: 'text-[#330C4B]',
    accent: 'text-[#711E7B]',
    strong: 'text-[#330C4B]',
  },
  summary: {
    container: 'bg-gradient-to-r from-[#F4E4F4] to-[#E3A88A]/30 border-[#51017C]/30',
    title: 'text-[#51017C]',
    accent: 'text-[#711E7B]',
    strong: 'text-[#51017C]',
  },
  points: {
    container: 'bg-gradient-to-r from-[#F4E4F4] to-[#B9379D]/20 border-[#711E7B]/30',
    title: 'text-[#711E7B]',
    accent: 'text-[#B9379D]',
    strong: 'text-[#711E7B]',
  },
  topics: {
    container: 'bg-gradient-to-r from-[#EEDAA5]/20 to-[#F4E4F4] border-[#B9379D]/30',
    title: 'text-[#B9379D]',
    accent: 'text-[#B9379D]',
    strong: 'text-[#51017C]',
  },
  accents: [
    'bg-[#330C4B] hover:bg-[#51017C]',
    'bg-[#711E7B] hover:bg-[#B9379D]',
    'bg-[#B9379D] hover:bg-[#E3A88A]',
    'bg-[#51017C] hover:bg-[#330C4B]',
  ],
};

/**
 * Subject slug → palette lookup.
 * Add new palettes here as they're designed.
 */
export const SUBJECT_PALETTES: Record<string, AiPalette> = {
  physique: PHYSIQUE_PALETTE,
  // future: mathematiques: MATH_PALETTE, etc.
};

/** Helper: get palette for a subject slug (falls back to default). */
export function getPaletteForSubject(slug?: string | null): AiPalette {
  if (!slug) return DEFAULT_PALETTE;
  return SUBJECT_PALETTES[slug] ?? DEFAULT_PALETTE;
}

/**
 * Collapsible section for AI-extracted content (summary, key points, topics).
 * Used on the resource detail page to keep the page clean — users expand
 * only what they need.
 */
export default function AiContentSection({
  title,
  icon,
  badge = 'AI',
  defaultOpen = true,
  children,
  variant = 'default',
  palette,
}: AiContentSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Resolve the active palette: explicit prop > variant from default
  const activePalette = palette ?? DEFAULT_PALETTE;
  const v = activePalette;

  // Pick the right variant from the active palette
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
