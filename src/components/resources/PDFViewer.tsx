'use client';
import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, ChevronRight, Download, Loader2, AlertCircle } from 'lucide-react';

// Dynamic import to avoid SSR issues with PDF.js
const Document = dynamic(() => import('react-pdf').then(mod => mod.Document), {
  ssr: false,
  loading: () => <ViewerLoading />
});
const Page = dynamic(() => import('react-pdf').then(mod => mod.Page), {
  ssr: false,
});

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  import('react-pdf').then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;
  });
}

interface PDFViewerProps {
  url: string;
  fileName?: string;
  initialPage?: number;
  onDownload?: () => void;
  className?: string;
}

function ViewerLoading() {
  return (
    <div className="flex items-center justify-center h-96 bg-slate-50 rounded-xl">
      <div className="text-center">
        <Loader2 className="w-10 h-10 mx-auto mb-2 text-primary-500 animate-spin" />
        <p className="text-sm text-slate-500">Chargement du PDF...</p>
      </div>
    </div>
  );
}

export default function PDFViewer({ url, fileName, initialPage = 1, onDownload, className = '' }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.2);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Detect container width for responsive rendering
  useEffect(() => {
    const updateWidth = () => {
      const container = document.getElementById('pdf-container');
      if (container) setContainerWidth(container.clientWidth - 32);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [isFullscreen]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!numPages) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setPageNumber(p => Math.min(numPages, p + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setPageNumber(p => Math.max(1, p - 1));
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(3, s + 0.2));
      } else if (e.key === '-') {
        setScale(s => Math.max(0.5, s - 0.2));
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === 'Home') {
        setPageNumber(1);
      } else if (e.key === 'End') {
        setPageNumber(numPages);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [numPages, isFullscreen]);

  function onDocumentLoadSuccess({ numPages: n }: { numPages: number }) {
    setNumPages(n);
    setIsLoading(false);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    setError(err.message);
    setIsLoading(false);
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs min-w-[60px] text-center">
            {numPages ? `${pageNumber} / ${numPages}` : '...'}
          </span>
          <button
            onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))}
            disabled={!numPages || pageNumber >= numPages}
            className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            className="p-1.5 hover:bg-white/10 rounded-lg transition"
            title="Zoom arrière"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="p-1.5 hover:bg-white/10 rounded-lg transition"
            title="Zoom avant"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(1.2)}
            className="px-2 py-1 hover:bg-white/10 rounded-lg text-xs transition"
            title="Taille réelle"
          >
            100%
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-white/10 rounded-lg transition ml-1"
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-1.5 hover:bg-white/10 rounded-lg transition ml-1"
              title="Télécharger"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* PDF Container */}
      <div
        id="pdf-container"
        className="bg-slate-100 overflow-auto"
        style={{ height: isFullscreen ? 'calc(100vh - 56px)' : '70vh', minHeight: '500px' }}
      >
        {error ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-md">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
              <h3 className="font-bold text-lg mb-2">Impossible de charger le PDF</h3>
              <p className="text-sm text-slate-500 mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="btn-primary text-sm">
                Réessayer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-4">
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<ViewerLoading />}
              options={{
                cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
                cMapPacked: true,
              }}
              className="shadow-2xl"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                width={containerWidth > 0 ? Math.min(containerWidth, 1200) : undefined}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={<ViewerLoading />}
                className="bg-white"
              />
            </Document>
          </div>
        )}
      </div>

      {/* Bottom controls (page input) */}
      {numPages && (
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex items-center justify-center gap-2 text-sm">
          <span className="text-slate-500">Aller à la page :</span>
          <input
            type="number"
            min={1}
            max={numPages}
            value={pageNumber}
            onChange={(e) => {
              const p = parseInt(e.target.value);
              if (p >= 1 && p <= numPages) setPageNumber(p);
            }}
            className="w-16 px-2 py-1 border border-slate-200 rounded text-center text-xs font-mono focus:border-primary-400 outline-none"
          />
          <span className="text-slate-400">/ {numPages}</span>
        </div>
      )}
    </div>
  );
}