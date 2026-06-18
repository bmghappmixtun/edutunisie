'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2,
  ChevronLeft, ChevronRight, Download,
  Loader2, AlertCircle, RefreshCw, FileWarning
} from 'lucide-react';

// Configure PDF.js worker ONCE at module load (before any Document renders)
// Use local worker file (same-origin, no CORS issues, guaranteed version match)
if (typeof window !== 'undefined' && pdfjs?.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;
const DEFAULT_SCALE = 1.2;

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
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(DEFAULT_SCALE);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Detect container width responsively
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isFullscreen]);

  // Detect fullscreen changes
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // Don't intercept when typing in input
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
          setScale(s => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
          break;
        case '-':
          e.preventDefault();
          setScale(s => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
          break;
        case 'Home':
          e.preventDefault();
          setPageNumber(1);
          break;
        case 'End':
          e.preventDefault();
          setPageNumber(numPages);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [numPages]);

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
    setScale(s => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(s => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(DEFAULT_SCALE);
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
  }, []);

  const onLoadError = useCallback((err: Error) => {
    console.error('PDF load error:', err);
    setError(err?.message || 'Erreur de chargement');
    setLoading(false);
  }, []);

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
            onClick={resetZoom}
            className="px-2 py-1 hover:bg-white/10 rounded-lg text-xs font-mono min-w-[55px] transition"
            title="Réinitialiser le zoom"
            aria-label="Réinitialiser le zoom"
          >
            {Math.round(scale * 100)}%
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
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Plein écran"
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

      {/* PDF Container */}
      <div
        ref={containerRef}
        className="bg-slate-100 overflow-auto pdf-viewer-container"
        style={{ height: isFullscreen ? '100vh' : '70vh', minHeight: '500px' }}
      >
        {error ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-md">
              <FileWarning className="w-12 h-12 mx-auto mb-3 text-red-500" />
              <h3 className="font-bold text-lg mb-2">Impossible de charger le PDF</h3>
              <p className="text-sm text-slate-500 mb-4">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-primary text-sm inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Réessayer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-4 min-h-full">
            <Document
              file={url}
              onLoadSuccess={onLoadSuccess}
              onLoadError={onLoadError}
              loading={
                <div className="flex items-center justify-center min-h-[500px]">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 mx-auto mb-2 text-primary-500 animate-spin" />
                    <p className="text-sm text-slate-500">Chargement du PDF…</p>
                  </div>
                </div>
              }
              options={{
                cMapUrl: 'https://unpkg.com/pdfjs-dist@4.8.69/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@4.8.69/standard_fonts/',
              }}
              externalLinkTarget="_blank"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                width={containerWidth > 0 ? Math.min(containerWidth, 1200) : undefined}
                renderTextLayer={true}
                renderAnnotationLayer={true}
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
            </Document>
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
          <span className="hidden sm:inline">⌨️ ← → / +/- / Home / End</span>
        </div>
      )}
    </div>
  );
}