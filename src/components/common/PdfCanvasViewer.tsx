import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api.ts';

// Configure PDF.js worker using local Vite asset URL (same-origin, sandbox-safe)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

interface PdfCanvasViewerProps {
  /** Pre-fetched binary PDF data */
  data?: ArrayBuffer | Uint8Array | null;
  /** Or URL to fetch PDF binary from (will include session headers automatically) */
  url?: string;
  /** Document title for display */
  title?: string;
  /** Height class for the scrollable viewport */
  heightClass?: string;
}

interface PdfPageCanvasProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}

const PdfPageCanvas: React.FC<PdfPageCanvasProps> = ({ pdfDoc, pageNumber, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendering, setRendering] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;

    const renderPage = async () => {
      try {
        setRendering(true);
        setPageError(null);
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = Math.min(window.devicePixelRatio || 1.5, 2.5);
        const viewport = page.getViewport({ scale });
        const outputViewport = page.getViewport({ scale: scale * dpr });

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = Math.floor(outputViewport.width);
        canvas.height = Math.floor(outputViewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTask = page.render({
          canvasContext: context,
          viewport: outputViewport,
          canvas,
        });

        await renderTask.promise;
        if (!isCancelled) {
          setRendering(false);
        }
      } catch (err: any) {
        if (!isCancelled && err?.name !== 'RenderingCancelledException') {
          console.warn(`Error rendering PDF page ${pageNumber}:`, err);
          setPageError(err?.message || 'Failed to render page');
          setRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageNumber, scale]);

  return (
    <div className="relative bg-white shadow-md border border-[#cbd5e1] rounded-xs mx-auto my-2 transition-all">
      {rendering && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
          <RefreshCw className="w-5 h-5 text-[#1d4ed8] animate-spin" />
        </div>
      )}
      {pageError ? (
        <div className="p-6 text-xs text-[#dc2626] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Page {pageNumber} error: {pageError}</span>
        </div>
      ) : (
        <canvas ref={canvasRef} className="block max-w-full h-auto" />
      )}
      <div className="bg-[#f8fafc] border-t border-[#e2e8f0] px-3 py-1 text-[10px] font-mono text-[#64748b] flex justify-between">
        <span>Page {pageNumber}</span>
        <span>Rendered via Secure Canvas Engine</span>
      </div>
    </div>
  );
};

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  data,
  url,
  title = 'PDF Document',
  heightClass = 'h-[65vh]',
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.15);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    let loadedDoc: pdfjsLib.PDFDocumentProxy | null = null;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        let pdfBytes: Uint8Array | null = null;

        if (data) {
          // Clone buffer so PDF.js worker transfer doesn't detach the caller's ArrayBuffer
          const sourceBytes = data instanceof Uint8Array ? data : new Uint8Array(data);
          pdfBytes = new Uint8Array(sourceBytes.length);
          pdfBytes.set(sourceBytes);
        } else if (url) {
          const headers: Record<string, string> = {};
          const sessionId = api.getSessionId();
          if (sessionId) {
            headers['Authorization'] = `Bearer ${sessionId}`;
            headers['x-session-id'] = sessionId;
          }
          const res = await fetch(url, { headers });
          if (!res.ok) {
            throw new Error(`Failed to fetch PDF stream (HTTP ${res.status})`);
          }
          const arrayBuf = await res.arrayBuffer();
          pdfBytes = new Uint8Array(arrayBuf);
        }

        if (!pdfBytes || pdfBytes.length === 0) {
          throw new Error('Empty PDF document buffer');
        }

        const loadingTask = pdfjsLib.getDocument({
          data: pdfBytes,
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) {
          await doc.cleanup();
          return;
        }

        loadedDoc = doc;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err: any) {
        if (isMounted) {
          console.error('PDF Canvas Viewer load error:', err);
          setError(err?.message || 'Unable to parse PDF binary');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (loadedDoc) {
        try {
          loadedDoc.cleanup();
        } catch {
          // ignore
        }
      }
    };
  }, [data, url]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 2.6));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handleResetZoom = () => setScale(1.15);

  const scrollToPage = (pageNo: number) => {
    if (!containerRef.current) return;
    const pageElements = containerRef.current.querySelectorAll('[data-pdf-page]');
    const target = pageElements[pageNo - 1] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className={`w-full ${heightClass} bg-white rounded border border-[#cbd5e1] flex flex-col items-center justify-center p-8 space-y-3`}>
        <RefreshCw className="w-8 h-8 text-[#1d4ed8] animate-spin" />
        <div className="text-xs font-semibold text-[#0f172a]">Rendering PDF Document on Canvas...</div>
        <div className="text-[11px] text-[#64748b]">{title}</div>
      </div>
    );
  }

  if (error || !pdfDoc) {
    return (
      <div className={`w-full ${heightClass} bg-white rounded border border-[#cbd5e1] flex flex-col items-center justify-center p-8 text-center space-y-3`}>
        <div className="w-10 h-10 rounded-full bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center text-[#dc2626]">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="text-xs font-bold text-[#0f172a]">PDF Preview Could Not Be Rendered</div>
        <div className="text-[11px] text-[#64748b] max-w-md">{error || 'The file may not be a valid PDF binary.'}</div>
      </div>
    );
  }

  return (
    <div className={`w-full ${heightClass} flex flex-col bg-[#e2e8f0] rounded border border-[#cbd5e1] overflow-hidden shadow-inner`}>
      {/* PDF Viewer Toolbar */}
      <div className="bg-[#1e293b] text-white px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-[#334155] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-[#38bdf8] shrink-0" />
          <span className="font-semibold truncate max-w-[240px] sm:max-w-[340px]" title={title}>
            {title}
          </span>
          <span className="bg-[#334155] text-[#e2e8f0] px-2 py-0.5 rounded text-[10px] font-mono shrink-0">
            {numPages} {numPages === 1 ? 'Page' : 'Pages'}
          </span>
        </div>

        {/* Zoom & Page Controls */}
        <div className="flex items-center gap-1.5">
          {numPages > 1 && (
            <div className="flex items-center gap-1 mr-2 bg-[#0f172a] px-2 py-0.5 rounded border border-[#334155]">
              <button
                type="button"
                onClick={() => scrollToPage(1)}
                className="p-0.5 hover:text-[#38bdf8] transition-colors"
                title="First Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1">1–{numPages}</span>
              <button
                type="button"
                onClick={() => scrollToPage(numPages)}
                className="p-0.5 hover:text-[#38bdf8] transition-colors"
                title="Last Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 bg-[#334155] hover:bg-[#475569] rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] min-w-[44px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 bg-[#334155] hover:bg-[#475569] rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 bg-[#334155] hover:bg-[#475569] rounded transition-colors ml-0.5"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Canvas Pages Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-3 sm:p-5 flex flex-col items-center space-y-4"
      >
        {Array.from({ length: numPages }, (_, idx) => (
          <div key={idx + 1} data-pdf-page={idx + 1} className="w-full flex justify-center">
            <PdfPageCanvas
              pdfDoc={pdfDoc}
              pageNumber={idx + 1}
              scale={scale}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
