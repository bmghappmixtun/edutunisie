'use client';
import { useState, useCallback, useEffect, useRef, Component, ReactNode } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2,
  ChevronLeft, ChevronRight, Download,
  Loader2, AlertCircle, RefreshCw, FileWarning,
  Maximize, Minimize, Search, X, Copy, Check
} from 'lucide-react';

// ============================================================================
// PDF.js Worker setup
// ============================================================================
// Use a local worker file served from the same origin. This avoids:
// - CORS issues with cross-origin workers
// - Network failures (worker loads from same CDN as the app)
// - Version mismatches (we copy the worker that matches pdfjs-dist version)
if (typeof window !== 'undefined' && pdfjs?.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

// ============================================================================
// Constants
// ============================================================================
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

type FitMode = 'width' | 'height' | 'page' | 'manual';

// ============================================================================
// Error boundary for individual page layers
// If the text/annotation layer crashes (e.g. on PDFs with bad fonts),
// the boundary catches it and the parent auto-disables these layers.
// The canvas (visual rendering) keeps working.
// ============================================================================
class PageLayerBoundary extends Component<
  { children: ReactNode; onLayerError: () => void; label: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(`[PDF] ${this.props.label} layer crashed (auto-disabled):`, error.message);
    this.props.onLayerError();
  }

  render() {
    if (this.state.hasError) {
      // Render children without the crashed layer
      return this.props.children;
    }
    return this.props.children;
  }
}

// ============================================================================
// Document-level error boundary
// Catches catastrophic errors (e.g. invalid PDF, network failure)
// ============================================================================
class DocumentErrorBoundary extends Component<
  { children: ReactNode; onError: (msg: string) => void },
  { hasError: boolean; error: string | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('[PDF] Document error:', error);
    this.props.onError(error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center max-w-md">
            <FileWarning className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <h3 className="font-bold text-lg mb-2">Impossible de charger le PDF</h3>
            <p className="text-sm text-slate-500 mb-4">{this.state.error || 'Erreur inconnue'}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface PDFViewerProps {
  url: string;
  fileName?: string;
  initialPage?: number;
  onDownload?: () => void;
  className?: string;
}

export default function PDFViewer({
  url,
  fileName,
  initialPage = 1,
  onDownload,
  className = ''
}: PDFViewerProps) {
  // ==========================================================================
  // State
  // ==========================================================================
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1);
  // UX FIX: default to 'page' (fit to page) so the entire first page is visible
  // without scrolling. User can switch to 'width' if they want to zoom in and
  // read at a larger size (then they'll need to scroll vertically).
  const [fitMode, setFitMode] = useState<FitMode>('page');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [containerHeight, setContainerHeight] = useState<number>(600);
  const [pageNaturalSize, setPageNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // Layer enablement — auto-disabled on error
  const [textLayerEnabled, setTextLayerEnabled] = useState(true);
  const [annotationLayerEnabled, setAnnotationLayerEnabled] = useState(true);
  const [textLayerError, setTextLayerError] = useState(false);

  // Search & copy
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ count: number; active: number }>({ count: 0, active: 0 });
  const [copySuccess, setCopySuccess] = useState(false);

  // Worker error tracking
  const [workerReady, setWorkerReady] = useState(true);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // Document options — self-hosted assets, no unpkg dependency
  // ==========================================================================
  const documentOptions = useRef({
    cMapUrl: '/pdf-assets/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdf-assets/standard_fonts/',
    // Don't try to use eval (CSP-friendly)
    isEvalSupported: false,
    // Disable streaming for simpler error handling
    disableStream: false,
    disableRange: false,
    // Verbose error logging
    verbosity: 0,
  }).current;

  // ==========================================================================
  // Container size tracking
  // ==========================================================================
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32);
        setContainerHeight(containerRef.current.clientHeight - 32);
      }
    };
    update();
    window.addEventListener('resize', update);

    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, [isFullscreen]);

  // ==========================================================================
  // Fit mode → scale
  // ==========================================================================
  useEffect(() => {
    if (!pageNaturalSize) return;

    let newScale = scale;
    if (fitMode === 'width' && pageNaturalSize.width > 0) {
      newScale = containerWidth / pageNaturalSize.width;
    } else if (fitMode === 'height' && pageNaturalSize.height > 0) {
      newScale = containerHeight / pageNaturalSize.height;
    } else if (fitMode === 'page') {
      const scaleW = containerWidth / pageNaturalSize.width;
      const scaleH = containerHeight / pageNaturalSize.height;
      newScale = Math.min(scaleW, scaleH) * 0.95;
    }

    if (fitMode !== 'manual') {
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
      setScale(newScale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitMode, containerWidth, containerHeight, pageNaturalSize]);

  // ==========================================================================
  // Fullscreen
  // ==========================================================================
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ==========================================================================
  // Keyboard navigation
  // ==========================================================================
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!numPages) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          setPageNumber(p => Math.min(numPages, p + 1));
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          setPageNumber(p => Math.max(1, p - 1));
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          fitToWidth();
          break;
        case 'Home':
          e.preventDefault();
          setPageNumber(1);
          break;
        case 'End':
          e.preventDefault();
          setPageNumber(numPages);
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) toggleFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages]);

  // ==========================================================================
  // Search
  // ==========================================================================
  useEffect(() => {
    if (!searchOpen) {
      const marks = document.querySelectorAll('.pdf-search-mark, .pdf-search-current');
      marks.forEach(m => {
        const parent = m.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(m.textContent || ''), m);
          parent.normalize();
        }
      });
      setSearchResults({ count: 0, active: 0 });
      return;
    }
    if (!searchQuery.trim()) {
      setSearchResults({ count: 0, active: 0 });
      return;
    }
    const timer = setTimeout(() => {
      const textLayer = document.querySelector('.react-pdf__Page__textContent');
      if (!textLayer) {
        setSearchResults({ count: 0, active: 0 });
        return;
      }
      const text = textLayer.textContent || '';
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = text.match(regex);
      setSearchResults({
        count: matches?.length || 0,
        active: 1
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen, pageNumber]);

  // ==========================================================================
  // Callbacks
  // ==========================================================================
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen error:', e);
    }
  }, []);

  const zoomIn = useCallback(() => {
    setFitMode('manual');
    setScale(s => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setFitMode('manual');
    setScale(s => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  }, []);

  const fitToWidth = useCallback(() => {
    setFitMode('width');
  }, []);

  const fitToPage = useCallback(() => {
    setFitMode('page');
  }, []);

  const prevPage = useCallback(() => {
    setPageNumber(p => Math.max(1, p - 1));
  }, []);

  const nextPage = useCallback(() => {
    setPageNumber(p => Math.min(numPages || 1, p + 1));
  }, [numPages]);

  const onLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setLoading(false);
    setError(null);
    setWorkerReady(true);
  }, []);

  const onLoadError = useCallback((err: Error) => {
    console.error('[PDF] load error:', err);
    setError(err?.message || 'Erreur de chargement');
    setLoading(false);
    setWorkerReady(false);
  }, []);

  const onPageLoadSuccess = useCallback((page: any) => {
    try {
      const viewport = page.getViewport({ scale: 1 });
      setPageNaturalSize({ width: viewport.width, height: viewport.height });
    } catch (e) {
      console.warn('[PDF] Could not capture page size:', e);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      try {
        await navigator.clipboard.writeText(selection.toString());
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch {
        // Fallback
      }
    }
  }, []);

  // Layer error handlers (auto-disable on crash)
  const onTextLayerError = useCallback(() => {
    console.warn('[PDF] Disabling text layer (font/render issue)');
    setTextLayerEnabled(false);
    setTextLayerError(true);
  }, []);

  const onAnnotationLayerError = useCallback(() => {
    console.warn('[PDF] Disabling annotation layer');
    setAnnotationLayerEnabled(false);
  }, []);

  // Reset layers when URL changes
  useEffect(() => {
    setTextLayerEnabled(true);
    setAnnotationLayerEnabled(true);
    setTextLayerError(false);
    setError(null);
    setLoading(true);
    setNumPages(null);
    setPageNumber(1);
  }, [url]);

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>
      {/* Toolbar */}
      <div className="bg-slate-900 text-white px-2 sm:px-3 py-2 flex items-center justify-between gap-1 sm:gap-2 flex-wrap">
        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevPage}
            disabled={!numPages || pageNumber <= 1}
            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Page précédente (←)"
            aria-label="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-2 py-1 text-xs font-mono min-w-[70px] text-center">
            {numPages ? (
              <>
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageNumber}
                  onChange={(e) => {
                    const p = parseInt(e.target.value);
                    if (p >= 1 && p <= numPages) setPageNumber(p);
                  }}
                  className="w-10 bg-transparent text-center text-white border-b border-white/30 focus:border-white outline-none"
                  aria-label="Numéro de page"
                />
                <span className="text-slate-400"> / {numPages}</span>
              </>
            ) : (
              <span className="text-slate-400">… / …</span>
            )}
          </div>
          <button
            type="button"
            onClick={nextPage}
            disabled={!numPages || pageNumber >= numPages}
            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Page suivante (→)"
            aria-label="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Zoom arrière (-)"
            aria-label="Zoom arrière"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={fitToWidth}
            className={`px-2 py-1 hover:bg-white/10 rounded-lg text-xs font-mono min-w-[55px] transition ${fitMode === 'width' ? 'bg-white/20' : ''}`}
            title="Ajuster à la largeur (0)"
            aria-label="Ajuster à la largeur"
          >
            {fitMode === 'manual' ? `${Math.round(scale * 100)}%` : '⤢ Auto'}
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Zoom avant (+)"
            aria-label="Zoom avant"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={fitToPage}
            className={`p-2 hover:bg-white/10 rounded-lg transition ${fitMode === 'page' ? 'bg-white/20' : ''}`}
            title="Ajuster à la page"
            aria-label="Ajuster à la page"
          >
            {fitMode === 'page' ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(o => !o)}
            className={`p-2 hover:bg-white/10 rounded-lg transition ${searchOpen ? 'bg-white/20' : ''}`}
            title="Rechercher dans le PDF (Ctrl+F)"
            aria-label="Rechercher"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 hover:bg-white/10 rounded-lg transition relative"
            title="Copier la sélection"
            aria-label="Copier"
          >
            {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Plein écran (F)"
            aria-label="Plein écran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="p-2 hover:bg-white/10 rounded-lg transition"
              title="Télécharger"
              aria-label="Télécharger"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="bg-slate-800 text-white px-3 py-2 flex items-center gap-2 border-t border-slate-700">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans cette page..."
            className="flex-1 bg-transparent outline-none text-sm placeholder-slate-400"
            autoFocus
          />
          {searchQuery && (
            <span className="text-xs text-slate-400 font-mono">
              {searchResults.count > 0 ? `${searchResults.count} résultat(s)` : 'Aucun'}
            </span>
          )}
          <button
            type="button"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
            className="p-1 hover:bg-white/10 rounded transition"
            aria-label="Fermer la recherche"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Layer warning */}
      {textLayerError && !textLayerEnabled && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          Sélection de texte désactivée (polices incompatibles). Le rendu visuel fonctionne.
        </div>
      )}

      {/* PDF Container */}
      <div
        ref={containerRef}
        className="bg-slate-200 overflow-auto pdf-viewer-container"
        // UX: give the page more vertical room so it fits without scrolling
        // - 80vh on normal view (was 70vh) = ~140px more space
        // - 100vh in fullscreen
        // - min 600px so on short screens the page is still readable
        style={{ height: isFullscreen ? '100vh' : '80vh', minHeight: '600px' }}
      >
        {error ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-md">
              <FileWarning className="w-12 h-12 mx-auto mb-3 text-red-500" />
              <h3 className="font-bold text-lg mb-2">Impossible de charger le PDF</h3>
              <p className="text-sm text-slate-500 mb-4">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  setNumPages(null);
                  setWorkerReady(true);
                }}
                className="btn-primary text-sm inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Réessayer
              </button>
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex justify-center items-start min-h-full p-4"
          >
            <DocumentErrorBoundary onError={setError}>
              <Document
                file={url}
                onLoadSuccess={onLoadSuccess}
                onLoadError={onLoadError}
                options={documentOptions}
                loading={
                  <div className="flex items-center justify-center min-h-[500px]">
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 mx-auto mb-2 text-primary-500 animate-spin" />
                      <p className="text-sm text-slate-500">Chargement du PDF…</p>
                    </div>
                  </div>
                }
                error={
                  <div className="flex items-center justify-center min-h-[500px]">
                    <div className="text-center max-w-md p-6">
                      <FileWarning className="w-10 h-10 mx-auto mb-2 text-red-500" />
                      <p className="text-sm text-slate-600 mb-3">Erreur de chargement du document</p>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-sm inline-flex items-center gap-2"
                      >
                        Ouvrir dans un nouvel onglet →
                      </a>
                    </div>
                  </div>
                }
                externalLinkTarget="_blank"
              >
                <PageLayerBoundary
                  onLayerError={onTextLayerError}
                  label="text"
                >
                  <PageLayerBoundary
                    onLayerError={onAnnotationLayerError}
                    label="annotation"
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={textLayerEnabled}
                      renderAnnotationLayer={annotationLayerEnabled}
                      onLoadSuccess={onPageLoadSuccess}
                      loading={
                        <div className="flex items-center justify-center min-h-[500px] bg-white shadow-2xl rounded">
                          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center min-h-[500px] bg-white shadow-2xl rounded p-8">
                          <div className="text-center">
                            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-500" />
                            <p className="text-sm text-slate-600">Erreur de rendu de la page</p>
                          </div>
                        </div>
                      }
                      className="bg-white shadow-2xl"
                    />
                  </PageLayerBoundary>
                </PageLayerBoundary>
              </Document>
            </DocumentErrorBoundary>
          </div>
        )}
      </div>

      {/* Status bar */}
      {numPages && !error && (
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex items-center justify-center gap-3 text-xs text-slate-500">
          <span>📄 {numPages} page{numPages > 1 ? 's' : ''}</span>
          <span className="text-slate-300">|</span>
          <span>Page {pageNumber} sur {numPages}</span>
          <span className="text-slate-300">|</span>
          <span className="font-mono">
            {fitMode === 'manual' ? `${Math.round(scale * 100)}%` : `Auto (${fitMode === 'width' ? 'largeur' : 'page'})`}
          </span>
          <span className="text-slate-300">|</span>
          <span className="hidden sm:inline">⌨️ ← → / +/- / 0 = auto / F = plein écran</span>
        </div>
      )}
    </div>
  );
}