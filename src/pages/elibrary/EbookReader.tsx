import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
// Let Vite compile the pdf.js worker through its own pipeline. The `?worker`
// import yields a Worker constructor that works in both dev and build, with the
// correct module type and matching version (and stays same-origin for CSP).
import PdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import ePub, { type Book, type Rendition } from 'epubjs';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut,
  Loader2, BookOpen, List, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// A single shared module worker for the whole app (pdf.js reuses it safely).
pdfjs.GlobalWorkerOptions.workerPort = new PdfjsWorker();

interface EbookMeta {
  id: string;
  title: string;
  author?: string | null;
  format: string; // "PDF" | "EPUB"
  downloadAllowed: boolean;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function EbookReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [meta, setMeta] = useState<EbookMeta | null>(null);
  const [epubBlob, setEpubBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token = useMemo(() => sessionStorage.getItem('auth_token'), []);

  // Load metadata first. PDFs are streamed directly by pdf.js so larger books
  // can start rendering without waiting for a full blob download.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!id) throw new Error('This e-book is not available.');
        if (!token) throw new Error('Please sign in again to read this book.');

        setLoading(true);
        setError(null);
        setMeta(null);
        setEpubBlob(null);

        const headers = { Authorization: `Bearer ${token}` };
        const metaRes = await fetchWithTimeout(`/api/ebooks/${id}`, { headers });
        if (!metaRes.ok) throw new Error('This e-book is not available.');
        const m: EbookMeta = await metaRes.json();

        if (!cancelled) setMeta(m);

        if (m.format.toUpperCase() === 'EPUB') {
          const fileRes = await fetchWithTimeout(`/api/ebooks/${id}/content`, { headers }, 90000);
          if (!fileRes.ok) throw new Error('Could not load the book file.');
          const b = await fileRes.blob();
          if (!cancelled) setEpubBlob(b);
        }
      } catch (e: any) {
        if (!cancelled) {
          const timedOut = e?.name === 'AbortError';
          setError(timedOut ? 'The book took too long to open. Please try again.' : e.message || 'Failed to open this book.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, token]);

  const handleDownload = async () => {
    if (!meta) return;
    try {
      const res = await fetch(`/api/ebooks/${meta.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Download not allowed');
      }
      const b = await res.blob();
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meta.title}.${meta.format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || 'Download failed');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] -m-2">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-1 pb-3 shrink-0">
        <Button variant="ghost" size="icon" title="Back to library"
          render={<Link to="/elibrary" />} nativeButton={false}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-slate-900 dark:text-white truncate">
              {meta?.title || 'Loading…'}
            </h1>
            {meta && <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-bold shrink-0">{meta.format}</Badge>}
            {meta && !meta.downloadAllowed && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                <Lock className="h-3 w-3" /> Read only
              </span>
            )}
          </div>
          {meta?.author && <p className="text-xs text-slate-500 truncate">{meta.author}</p>}
        </div>
        {meta?.downloadAllowed && (
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        )}
      </div>

      {/* Viewer */}
      <div className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-surface-raised bg-slate-100 dark:bg-canvas overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Opening book…
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <BookOpen className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/elibrary')}>
              Back to E-Library
            </Button>
          </div>
        ) : meta && meta.format.toUpperCase() === 'EPUB' && epubBlob ? (
          <EpubView blob={epubBlob} />
        ) : meta && meta.format.toUpperCase() === 'PDF' ? (
          <PdfView id={meta.id} token={token} />
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────────────────── PDF reader ─────────────────────────── */
function PdfView({ id, token }: { id: string; token: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);

  const file = useMemo(
    () => ({
      url: `/api/ebooks/${id}/content`,
      httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
    [id, token],
  );

  useEffect(() => {
    setNumPages(0);
    setPage(1);
    setErr(null);
  }, [id]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth - 32));
    ro.observe(el);
    setWidth(el.clientWidth - 32);
    return () => ro.disconnect();
  }, []);

  // Safety net: never hang on a silent spinner forever.
  useEffect(() => {
    if (numPages > 0 || err) return;
    const t = setTimeout(() => {
      if (numPages === 0) {
        setErr('The PDF viewer took too long to respond. Please try again or download the file if downloads are enabled.');
      }
    }, 25000);
    return () => clearTimeout(t);
  }, [numPages, err]);

  const go = (delta: number) =>
    setPage((p) => Math.min(Math.max(1, p + delta), numPages || 1));

  const onError = (e: unknown) => {
    const msg = (e as Error)?.message || String(e);
    console.error('[E-Library PDF]', e);
    setErr(msg);
  };

  return (
    <div className="h-full flex flex-col">
      <div ref={containerRef} className="flex-1 min-h-0 overflow-auto custom-scrollbar flex justify-center p-4">
        {err ? (
          <div className="flex flex-col items-center justify-center text-center px-6 max-w-md">
            <BookOpen className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Could not display this PDF.</p>
            <p className="text-xs text-slate-500 mt-1 break-words">{err}</p>
          </div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setErr(null); }}
            onLoadError={onError}
            onSourceError={onError}
            loading={<div className="flex items-center justify-center h-40 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div>}
          >
            <Page
              pageNumber={page}
              width={width > 0 ? Math.min(width, 1000) * scale : undefined}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="shadow-lg"
              onRenderError={onError}
            />
          </Document>
        )}
      </div>
      {/* Controls */}
      <div className="shrink-0 flex items-center justify-center gap-2 border-t border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo px-4 py-2">
        <Button variant="outline" size="icon" onClick={() => go(-1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums px-2">
          Page {page} / {numPages || '…'}
        </span>
        <Button variant="outline" size="icon" onClick={() => go(1)} disabled={page >= numPages}><ChevronRight className="h-4 w-4" /></Button>
        <div className="w-px h-5 bg-slate-200 dark:bg-surface-raised mx-1" />
        <Button variant="outline" size="icon" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(2)))} title="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
        <span className="text-xs text-slate-500 tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
        <Button variant="outline" size="icon" onClick={() => setScale((s) => Math.min(2.5, +(s + 0.2).toFixed(2)))} title="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── EPUB reader ─────────────────────────── */
function EpubView({ blob }: { blob: Blob }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const rendRef = useRef<Rendition | null>(null);
  const [toc, setToc] = useState<{ label: string; href: string }[]>([]);
  const [currentHref, setCurrentHref] = useState<string>('');
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;
    (async () => {
      try {
        setReady(false);
        setErr(null);
        const buf = await blob.arrayBuffer();
        if (destroyed || !viewerRef.current) return;
        const book = ePub(buf as any);
        bookRef.current = book;
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'auto',
        });
        rendRef.current = rendition;
        rendition.on('relocated', (loc: any) => setCurrentHref(loc?.start?.href || ''));
        await rendition.display();
        if (!destroyed) setReady(true);
        book.loaded.navigation
          .then((nav: any) => {
            if (destroyed) return;
            const items = (nav.toc || []).map((t: any) => ({ label: (t.label || '').trim(), href: t.href }));
            setToc(items);
          })
          .catch((e: unknown) => console.warn('[E-Library EPUB navigation]', e));
      } catch (e: any) {
        if (!destroyed) setErr(e.message || 'Could not display this EPUB.');
      }
    })();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') rendRef.current?.prev();
      if (e.key === 'ArrowRight') rendRef.current?.next();
    };
    window.addEventListener('keyup', onKey);

    return () => {
      destroyed = true;
      window.removeEventListener('keyup', onKey);
      try { rendRef.current?.destroy(); bookRef.current?.destroy(); } catch { /* noop */ }
    };
  }, [blob]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 bg-white dark:bg-[#f7f7f2]">
        {err ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <BookOpen className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700">Could not display this EPUB.</p>
            <p className="text-xs text-slate-500 mt-1 break-words">{err}</p>
          </div>
        ) : (
          <div ref={viewerRef} className="h-full w-full" />
        )}
      </div>
      <div className="shrink-0 flex items-center justify-center gap-2 border-t border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo px-4 py-2">
        <Button variant="outline" size="icon" onClick={() => rendRef.current?.prev()} disabled={!ready}><ChevronLeft className="h-4 w-4" /></Button>
        {toc.length > 0 && (
          <Select value={currentHref} onValueChange={(href) => rendRef.current?.display(href)}>
            <SelectTrigger className="w-[260px] h-9">
              <div className="flex items-center gap-2 min-w-0"><List className="h-3.5 w-3.5 shrink-0" /><SelectValue placeholder="Contents" /></div>
            </SelectTrigger>
            <SelectContent className="max-h-72 min-w-[260px]">
              {toc.map((t, i) => (
                <SelectItem key={`${t.href}-${i}`} value={t.href}>{t.label || `Section ${i + 1}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="icon" onClick={() => rendRef.current?.next()} disabled={!ready}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
