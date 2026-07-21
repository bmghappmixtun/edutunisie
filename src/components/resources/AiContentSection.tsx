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
}

/**
 * Collapsible section for AI-extracted content (summary, key points, topics).
 * Used on the resource detail page to keep the page clean — users expand
 * only what they need.
 *
 * Color palette (Digital Synopsis minimal #1: Orange, Pink, Purple, Blue):
 * - system  → Peach    #F8B195
 * - summary → Pink     #F67280
 * - points  → Mauve    #C06C84
 * - topics  → Purple   #6C5B7B
 * - default → Slate    (neutral)
 */
export default function AiContentSection({
  title,
  icon,
  badge = 'AI',
  defaultOpen = true,
  children,
  variant = 'default',
}: AiContentSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Visual styles per variant — Digital Synopsis minimal palette #1 (Orange/Pink/Purple/Blue)
  // F8B195 peach → orange-200  | F67280 pink → rose-300  | C06C84 mauve → fuchsia-400  | 6C5B7B purple → indigo-500
  const containerClass =
    variant === 'system'
      ? 'mb-4 p-4 bg-gradient-to-r from-orange-50 to-rose-50 border border-orange-200 rounded-xl'
      : variant === 'summary'
      ? 'mb-4 p-4 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl'
      : variant === 'points'
      ? 'mb-4 p-4 bg-gradient-to-r from-fuchsia-50 to-purple-50 border border-fuchsia-200 rounded-xl'
      : variant === 'topics'
      ? 'mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl'
      : 'mb-4 p-4 bg-white border border-slate-200 rounded-xl';

  const titleColor =
    variant === 'system'
      ? 'text-orange-700'
      : variant === 'summary'
      ? 'text-rose-700'
      : variant === 'points'
      ? 'text-fuchsia-700'
      : variant === 'topics'
      ? 'text-indigo-700'
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
