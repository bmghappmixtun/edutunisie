'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AiContentSectionProps {
  title: string;
  icon?: ReactNode;
  badge?: string; // e.g., "AI" badge text
  defaultOpen?: boolean;
  children: ReactNode;
  variant?: 'default' | 'summary' | 'system';
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
}: AiContentSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Visual styles per variant
  const containerClass =
    variant === 'system'
      ? 'mb-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl'
      : variant === 'summary'
      ? 'mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl'
      : 'mb-4 p-4 bg-white border border-slate-200 rounded-xl';

  const titleColor =
    variant === 'system'
      ? 'text-orange-700'
      : variant === 'summary'
      ? 'text-blue-700'
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
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">
            {badge}
          </span>
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
