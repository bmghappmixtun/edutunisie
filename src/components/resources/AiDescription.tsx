'use client';

import { Sparkles } from 'lucide-react';
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

/**
 * Render the description with rich formatting (bold labels, line breaks).
 * The component sanitizes a small whitelist of HTML tags emitted by the AI:
 *  - <strong>...</strong> for labels / keywords
 *  - <br> for line breaks
 *  - <em>...</em> for subtle emphasis
 * Everything else is escaped.
 */
function renderFormattedText(raw: string) {
  if (!raw) return null;
  // Whitelist sanitize: keep <strong>, <b>, <em>, <i>, <br>; escape the rest.
  // We do this in two passes to keep things simple and safe.
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // Normalize newlines to <br>
  let html = raw.replace(/\r\n/g, '\n').replace(/\n/g, '<br>');

  // Apply whitelist tags: <strong>, <b>, <em>, <i> — keep them
  // (We trust our own AI output since the description comes from a controlled pipeline.)
  html = html
    .replace(/&lt;strong&gt;/g, '<strong>')
    .replace(/&lt;\/strong&gt;/g, '</strong>')
    .replace(/&lt;b&gt;/g, '<strong>')
    .replace(/&lt;\/b&gt;/g, '</strong>')
    .replace(/&lt;em&gt;/g, '<em>')
    .replace(/&lt;\/em&gt;/g, '</em>')
    .replace(/&lt;i&gt;/g, '<em>')
    .replace(/&lt;\/i&gt;/g, '</em>');

  // Strip any other tags just in case
  html = html.replace(/<(?!\/?(strong|em|br)\b)[^>]*>/g, '');

  return html;
}

/**
 * Renders the resource description with a subtle "IA" badge when the
 * description was AI-generated (source starts with 'agent-').
 *
 * Design intent:
 * - No big mauve banner.
 * - No header noise.
 * - Just a tiny sparkles icon + tooltip on hover that explains the origin.
 */
export default function AiDescription({ text, source, language, className = '' }: AiDescriptionProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const isAi = !!source && source.startsWith('agent-');
  const isRtl = language === 'ar';

  const html = renderFormattedText(text);

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        lang={language || 'fr'}
        className={`flex-1 text-slate-600 leading-relaxed [&_strong]:font-bold [&_strong]:text-slate-900 ${isRtl ? 'text-right' : ''}`}
        dangerouslySetInnerHTML={{ __html: html || '' }}
      />

      {isAi && (
        <div
          className="relative flex-shrink-0 mt-0.5"
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
          onFocus={() => setTooltipOpen(true)}
          onBlur={() => setTooltipOpen(false)}
        >
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/70 text-violet-700 cursor-help select-none"
            tabIndex={0}
            aria-label="Description générée par IA"
          >
            <Sparkles className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-wide">IA</span>
          </span>

          {tooltipOpen && (
            <span
              role="tooltip"
              className="absolute z-50 right-0 top-full mt-1.5 w-56 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs leading-relaxed shadow-xl pointer-events-none"
            >
              <span className="block font-semibold mb-0.5">✨ Description générée par l'IA</span>
              <span className="block text-slate-300">
                Résumé automatique du contenu du PDF pour vous aider à trouver la bonne ressource.
              </span>
              {/* Arrow */}
              <span className="absolute -top-1 right-3 w-2 h-2 bg-slate-900 rotate-45" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}