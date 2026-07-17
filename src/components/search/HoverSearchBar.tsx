'use client';
import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import SearchBar from './SearchBar';

export default function HoverSearchBar() {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hover intent: small delay before collapsing to avoid flicker
  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setExpanded(true);
  };

  const handleMouseLeave = () => {
    // Don't collapse if input is focused
    if (document.activeElement && containerRef.current?.contains(document.activeElement)) {
      return;
    }
    // Small delay to allow user to move from icon to input
    timeoutRef.current = setTimeout(() => {
      setExpanded(false);
    }, 300);
  };

  // Find the input inside SearchBar and focus it when expanded
  useEffect(() => {
    if (expanded && containerRef.current) {
      // Don't auto-focus on hover, only on click (less intrusive)
    }
  }, [expanded]);

  return (
    <div
      role="group"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative hidden md:flex items-center"
    >
      {/* Collapsed: icon-only button */}
      <button
        type="button"
        onClick={() => {
          setExpanded(true);
          // Focus the input after a short delay
          setTimeout(() => {
            const input = containerRef.current?.querySelector(
              'input[type="search"]',
            ) as HTMLInputElement;
            input?.focus();
          }, 50);
        }}
        className={`p-2.5 rounded-full text-slate-500 hover:bg-primary-50 hover:text-primary-600 transition-all duration-300 ${
          expanded ? 'opacity-0 scale-75 pointer-events-none absolute' : 'opacity-100 scale-100'
        }`}
        aria-label="Rechercher"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Expanded: full search bar */}
      <div
        className={`transition-all duration-300 ease-out ${
          expanded ? 'w-72 lg:w-80 opacity-100' : 'w-9 opacity-0 pointer-events-none'
        }`}
        style={{ overflow: 'visible' }}
      >
        <SearchBar size="sm" />
      </div>

      {/* Permanent icon link for users who don't hover (mobile-friendly) */}
    </div>
  );
}
