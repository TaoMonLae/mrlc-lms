import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Loader2, BookOpen, List, Lock, Maximize2, Minimize2, Search, X,
  Highlighter, Sparkles, Trash2, BookA, Volume2, ClipboardList, Sun, Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useUser } from '../../lib/permissions';
import { ebookHomeworkPrefill } from '../../lib/ebookHomeworkPrefill';

// A single shared module worker for the whole app (pdf.js reuses it safely).
pdfjs.GlobalWorkerOptions.workerPort = new PdfjsWorker();

interface EbookMeta {
  id: string;
  title: string;
  author?: string | null;
  format: string; // "PDF" | "EPUB" | "CBR" | "CBZ"
  downloadAllowed: boolean;
}

interface HighlightRow {
  id: string;
  cfi: string | null;
  page: number | null;
  text: string;
  color: string;
}

interface SearchResult {
  key: string; // cfi (EPUB) or page number as string (PDF)
  label: string;
  excerpt: string;
}

type ReaderPageView = 'single' | 'two';
type ReaderFitMode = 'width' | 'height';

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function authHeaders(token: string | null, json = false) {
  const h: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function fetchProgress(id: string, token: string | null): Promise<{ location: string; percent: number | null } | null> {
  try {
    const res = await fetch(`/api/ebooks/${id}/progress`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function saveProgress(id: string, token: string | null, location: string, percent: number | null) {
  fetch(`/api/ebooks/${id}/progress`, {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify({ location, percent }),
  }).catch(() => {});
}

async function fetchHighlights(id: string, token: string | null): Promise<HighlightRow[]> {
  try {
    const res = await fetch(`/api/ebooks/${id}/highlights`, { headers: authHeaders(token) });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Debounces a callback without re-creating a new debounced function on every
// render (so effects that depend on it don't keep resetting the timer).
function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delay: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef<number | undefined>(undefined);
  return useCallback((...args: Parameters<T>) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => fnRef.current(...args), delay);
  }, [delay]);
}

export default function EbookReader() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const canMakeFlashcards = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const [meta, setMeta] = useState<EbookMeta | null>(null);
  const [epubBlob, setEpubBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);

  const token = useMemo(() => sessionStorage.getItem('auth_token'), []);

  // Count active student reading time, not merely time with a tab left open.
  // A heartbeat is sent only while the document is visible/focused and the
  // student interacted with the reader during the previous minute.
  useEffect(() => {
    const reader = readerRef.current;
    if (!id || !token || !meta || user?.role !== 'STUDENT' || !reader) return;
    let lastActivity = Date.now();
    const markActive = () => { lastActivity = Date.now(); };
    const send = (seconds: number, opened = false) => fetch(`/api/ebooks/${id}/reading-time`, {
      method: 'POST',
      headers: authHeaders(token, true),
      body: JSON.stringify({ seconds, opened }),
      keepalive: true,
    }).catch(() => {});
    send(0, true);
    const events: Array<keyof HTMLElementEventMap> = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach((event) => reader.addEventListener(event, markActive, { passive: true }));
    window.addEventListener('ebook-reader-activity', markActive);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && document.hasFocus() && Date.now() - lastActivity <= 60_000) {
        send(15);
      }
    }, 15_000);
    return () => {
      window.clearInterval(timer);
      events.forEach((event) => reader.removeEventListener(event, markActive));
      window.removeEventListener('ebook-reader-activity', markActive);
    };
  }, [id, token, meta, user?.role]);

  // Full page (browser Fullscreen API) support for distraction-free reading.
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await readerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Full page view is not supported in this browser.');
    }
  };

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
    <div
      ref={readerRef}
      className={`flex flex-col -m-2 ${isFullscreen ? 'h-dvh bg-white dark:bg-canvas p-3' : 'h-[calc(100dvh-7rem)]'}`}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-1 pb-3 shrink-0">
        {!isFullscreen && (
          <Button variant="ghost" size="icon" title="Back to library"
            render={<Link to="/elibrary" />} nativeButton={false}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
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
        {canMakeFlashcards && meta && !isFullscreen && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/teacher/homework', { state: { prefill: ebookHomeworkPrefill(meta) } })}
          >
            <ClipboardList className="h-4 w-4 mr-2" /> Assign as Homework
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit full page view' : 'Full page view'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
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
          <EpubView id={meta.id} token={token} blob={epubBlob} bookTitle={meta.title} canMakeFlashcards={canMakeFlashcards} />
        ) : meta && meta.format.toUpperCase() === 'PDF' ? (
          <PdfView id={meta.id} token={token} bookTitle={meta.title} canMakeFlashcards={canMakeFlashcards} />
        ) : meta && ['CBR', 'CBZ'].includes(meta.format.toUpperCase()) ? (
          <ComicView id={meta.id} token={token} format={meta.format.toUpperCase()} />
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────────────── Shared: selection action bar ─────────────────────── */
const HIGHLIGHT_COLORS = [
  { value: 'yellow', dot: '#facc15', label: 'Yellow' },
  { value: 'green', dot: '#4ade80', label: 'Green' },
  { value: 'blue', dot: '#60a5fa', label: 'Blue' },
  { value: 'pink', dot: '#f472b6', label: 'Pink' },
] as const;

function SelectionBar({ text, onHighlight, onFlashcard, onDefine, onDismiss }: {
  text: string; onHighlight: (color: string) => void; onFlashcard?: () => void; onDefine?: () => void; onDismiss: () => void;
}) {
  const [color, setColor] = useState<string>('yellow');
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-lg px-3 py-1.5 max-w-[92%]">
      <span className="hidden sm:inline text-xs text-slate-500 truncate max-w-[180px]">"{text}"</span>
      <div className="flex items-center gap-1" role="group" aria-label="Highlight color">
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            aria-label={c.label}
            aria-pressed={color === c.value}
            onClick={() => setColor(c.value)}
            className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${color === c.value ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-300' : ''}`}
            style={{ backgroundColor: c.dot }}
          />
        ))}
      </div>
      {onDefine && (
        <Button size="sm" variant="outline" onClick={onDefine}><BookA className="h-3.5 w-3.5 mr-1.5" /> Define</Button>
      )}
      <Button size="sm" variant="outline" onClick={() => onHighlight(color)}><Highlighter className="h-3.5 w-3.5 mr-1.5" /> Highlight</Button>
      {onFlashcard && (
        <Button size="sm" variant="outline" onClick={onFlashcard}><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Flashcard</Button>
      )}
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onDismiss}><X className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

// A single word (letters/apostrophes/hyphens only) or Myanmar-script text,
// pulled out of a (possibly multi-word) text selection, for dictionary
// lookup. Falls back to null if the selection has no such token at all
// (e.g. pure punctuation/numbers).
const MYANMAR_SCRIPT_RE_READER = /[က-႟]/;
function extractLookupWord(selected: string): string | null {
  const trimmed = selected.trim();
  if (!trimmed) return null;
  if (MYANMAR_SCRIPT_RE_READER.test(trimmed)) return trimmed.slice(0, 60);
  const m = trimmed.match(/[A-Za-z][A-Za-z'-]*/);
  return m ? m[0] : null;
}

interface ReaderDictEntry { pos: string; posLabel: string; definition: string; examples: string[]; synonyms: string[]; }
interface ReaderTranslation { pos: string | null; definition: string; }
interface ReaderMonDefinition { lang: string; pos: string | null; definition: string; example: string | null; }
interface ReaderMonWord { word: string; ipa: string | null; thaiGloss: string | null; definitions: ReaderMonDefinition[]; }
interface ReaderLookupResult { word: string; entries: ReaderDictEntry[]; translations: ReaderTranslation[]; monMatches: ReaderMonWord[]; }
const READER_MON_LANG_LABEL: Record<string, string> = { eng: 'English', mya: 'Myanmar', tha: 'Thai' };

// Per the Fullscreen API spec, only descendants of the fullscreened element
// are rendered -- a dialog portaled to document.body as usual would be
// invisible while reading in the reader's "Full page view". Portal into the
// fullscreened element itself when there is one.
function fullscreenPortalContainer(): HTMLElement | undefined {
  return (document.fullscreenElement as HTMLElement | null) || undefined;
}

/* ─────────────────────── Shared: quick define popover ─────────────────────── */
function DefinePopover({ word, onClose }: { word: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReaderLookupResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    // The dictionary API is public (no sign-in required), so no auth header.
    fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Word not found.');
        }
        setData(await res.json());
      })
      .catch((e: any) => { if (!cancelled) setError(e.message || 'Word not found.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [word]);

  const speak = () => {
    try {
      const utter = new SpeechSynthesisUtterance(word);
      utter.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch { /* speech synthesis unavailable — no-op */ }
  };

  // Browser fullscreen (used by the reader's "Full page view") only renders
  // descendants of the fullscreened element -- a dialog portaled to
  // document.body as usual would be invisible while reading in fullscreen.
  // Portal into the fullscreened element itself when there is one.
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent container={fullscreenPortalContainer()} className="max-w-md max-h-[80vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookA className="h-4 w-4 text-accent-purple shrink-0" /> {word}
            {data && data.entries.length > 0 && (
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Pronounce" onClick={speak}>
                <Volume2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-slate-500 py-6 text-center">{error}</p>
        ) : data ? (
          <div className="space-y-4">
            {data.translations.length > 0 && (
              <div className="space-y-1.5 rounded-lg bg-accent-purple/5 border border-accent-purple/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-purple">Myanmar</p>
                {data.translations.map((t, i) => (
                  <p key={i} className="text-sm text-slate-700 dark:text-slate-200">{t.definition}</p>
                ))}
              </div>
            )}
            {data.monMatches.length > 0 && (
              <div className="space-y-2 rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Mon</p>
                {data.monMatches.slice(0, 3).map((m, i) => (
                  <div key={i}>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{m.word}</span>
                    {m.definitions.slice(0, 2).map((d, j) => (
                      <p key={j} className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400">{READER_MON_LANG_LABEL[d.lang] || d.lang}: </span>{d.definition}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {data.entries.length > 0 ? (
              <ol className="space-y-2.5 list-decimal list-inside marker:text-slate-400 marker:text-sm">
                {data.entries.slice(0, 6).map((e, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="text-[10px] font-medium text-slate-400 mr-1">{e.posLabel}</span>
                    {e.definition}
                    {e.examples[0] && <span className="block text-xs text-slate-500 italic mt-0.5 pl-4">"{e.examples[0]}"</span>}
                  </li>
                ))}
              </ol>
            ) : data.translations.length === 0 && data.monMatches.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No definition found for "{word}".</p>
            ) : null}
            <Link
              to={`/dictionary`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-primary hover:underline pt-1"
            >
              Open full Dictionary →
            </Link>
          </div>
        ) : null}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────── Shared: highlights list dialog ─────────────────────── */
function HighlightsDialog({ highlights, onJump, onDelete, onClose }: {
  highlights: HighlightRow[]; onJump: (h: HighlightRow) => void; onDelete: (h: HighlightRow) => void; onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent container={fullscreenPortalContainer()} className="max-w-lg">
        <DialogHeader><DialogTitle>My Highlights</DialogTitle></DialogHeader>
        {highlights.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No highlights yet — select some text while reading to save one.</p>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {highlights.map((h) => (
              <div key={h.id} className="flex items-start gap-2 rounded-md border border-slate-200 dark:border-surface-raised p-3">
                <button onClick={() => onJump(h)} className="flex-1 text-left text-sm text-slate-700 dark:text-slate-200 line-clamp-3 hover:underline">
                  {h.page ? <span className="block mb-0.5 text-[10px] font-semibold text-slate-400">Page {h.page}</span> : null}
                  “{h.text}”
                </button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 shrink-0" onClick={() => onDelete(h)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────── Shared: in-book search dialog ─────────────────────── */
function SearchDialog({ onSearch, onSelect, onClose }: {
  onSearch: (q: string) => Promise<SearchResult[]>;
  onSelect: (r: SearchResult) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const run = async () => {
    const q = query.trim();
    if (q.length < 2) { toast.error('Type at least 2 characters.'); return; }
    setSearching(true);
    setResults(null);
    try {
      setResults(await onSearch(q));
    } catch (e: any) {
      toast.error(e.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent container={fullscreenPortalContainer()} className="max-w-lg">
        <DialogHeader><DialogTitle>Search in Book</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
            placeholder="Search text…"
          />
          <Button onClick={run} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        {searching && <p className="text-xs text-slate-500 text-center py-4">Searching the whole book — this can take a moment for longer titles…</p>}
        {results !== null && !searching && (
          results.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No matches found.</p>
          ) : (
            <div className="space-y-1 max-h-[50vh] overflow-y-auto custom-scrollbar mt-1">
              {results.map((r, i) => (
                <button
                  key={`${r.key}-${i}`}
                  onClick={() => onSelect(r)}
                  className="w-full text-left rounded-md p-2 hover:bg-slate-100 dark:hover:bg-surface-raised transition-colors"
                >
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">{r.label}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{r.excerpt}</p>
                </button>
              ))}
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────── Shared: add highlighted text as a flashcard ─────────────────────── */
function AddToFlashcardsDialog({ token, defaultDefinition, onClose }: {
  token: string | null; defaultDefinition: string; onClose: () => void;
}) {
  const [decks, setDecks] = useState<{ id: string; title: string }[]>([]);
  const [deckId, setDeckId] = useState('');
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState(defaultDefinition.slice(0, 800));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/flashcards/decks', { headers: authHeaders(token) });
        if (!res.ok) throw new Error('Could not load your flashcard decks.');
        const list = await res.json();
        setDecks(list);
        if (list[0]) setDeckId(list[0].id);
      } catch (e: any) {
        toast.error(e.message || 'Could not load flashcard decks.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const submit = async () => {
    if (!deckId) { toast.error('Choose a deck.'); return; }
    if (!term.trim() || !definition.trim()) { toast.error('Term and definition are required.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/flashcards/decks/${deckId}`, { headers: authHeaders(token) });
      if (!res.ok) throw new Error('Could not load the deck.');
      const deck = await res.json();
      const cards = [
        ...deck.cards.map((c: any) => ({ term: c.term, definition: c.definition, imageUrl: c.imageUrl })),
        { term: term.trim(), definition: definition.trim(), imageUrl: null },
      ];
      const putRes = await fetch(`/api/flashcards/decks/${deckId}`, {
        method: 'PUT',
        headers: authHeaders(token, true),
        body: JSON.stringify({
          title: deck.title, description: deck.description, subjectId: deck.subject?.id || null,
          shared: deck.shared, classIds: (deck.classes || []).map((c: any) => c.id), cards,
        }),
      });
      if (!putRes.ok) throw new Error('Could not save the card.');
      toast.success('Added to flashcard deck.');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add flashcard.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent container={fullscreenPortalContainer()}>
        <DialogHeader><DialogTitle>Add to Flashcard Deck</DialogTitle></DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading decks…</div>
        ) : decks.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">You don't have any flashcard decks yet. Create one from the Flashcards page first.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Deck</Label>
              <Select value={deckId} onValueChange={setDeckId}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {decks.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="The word or concept" />
            </div>
            <div className="space-y-2">
              <Label>Definition</Label>
              <Textarea rows={4} value={definition} onChange={(e) => setDefinition(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {decks.length > 0 && (
            <Button onClick={submit} disabled={submitting || loading}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Card
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────── CBR / CBZ comic reader ─────────────────────── */
type ComicDirection = 'ltr' | 'rtl';
type ComicFitMode = ReaderFitMode | 'page';

function ComicPageImage({ id, token, page, fitMode, availableWidth, availableHeight, scale }: {
  id: string;
  token: string | null;
  page: number;
  fitMode: ComicFitMode;
  availableWidth: number;
  availableHeight: number;
  scale: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setSrc(null);
    setError(null);
    setDimensions(null);
    fetch(`/api/ebooks/${id}/comic/pages/${page}`, { headers: authHeaders(token) })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Could not load page ${page}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((err: any) => { if (!cancelled) setError(err.message || `Could not load page ${page}`); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, page, token]);

  if (error) {
    return (
      <div className="flex min-h-40 min-w-40 items-center justify-center rounded border border-red-200 bg-red-50 p-4 text-center text-xs text-red-700">
        {error}
      </div>
    );
  }
  if (!src) {
    return <div className="flex h-48 w-36 items-center justify-center rounded bg-white shadow"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>;
  }

  let renderedWidth: number | undefined;
  if (dimensions && availableWidth > 0 && availableHeight > 0) {
    const aspectRatio = dimensions.width / dimensions.height;
    const fittedWidth = fitMode === 'height'
      ? availableHeight * aspectRatio
      : fitMode === 'page'
        ? Math.min(availableWidth, availableHeight * aspectRatio)
        : availableWidth;
    renderedWidth = Math.max(1, fittedWidth * scale);
  }

  return (
    <img
      src={src}
      alt={`Comic page ${page}`}
      draggable={false}
      className="max-w-none select-none bg-white shadow-xl"
      onLoad={(event) => setDimensions({
        width: event.currentTarget.naturalWidth,
        height: event.currentTarget.naturalHeight,
      })}
      style={{
        width: renderedWidth ? `${renderedWidth}px` : 'auto',
        height: 'auto',
        maxWidth: renderedWidth ? 'none' : '100%',
      }}
    />
  );
}

function ComicView({ id, token, format }: { id: string; token: string | null; format: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [pageView, setPageView] = useState<ReaderPageView>('single');
  const [fitMode, setFitMode] = useState<ComicFitMode>('page');
  const [direction, setDirection] = useState<ComicDirection>('ltr');
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/ebooks/${id}/comic/manifest`, { headers: authHeaders(token) }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Could not open this ${format} file.`);
        }
        return res.json() as Promise<{ pageCount: number }>;
      }),
      fetchProgress(id, token),
    ])
      .then(([manifest, progress]) => {
        if (cancelled) return;
        setPageCount(manifest.pageCount);
        const savedPage = Number.parseInt(progress?.location || '', 10);
        setPage(Number.isFinite(savedPage) ? Math.min(Math.max(1, savedPage), manifest.pageCount) : 1);
        setProgressLoaded(true);
      })
      .catch((err: any) => { if (!cancelled) setError(err.message || `Could not open this ${format} file.`); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [format, id, token]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setViewport({ width: el.clientWidth, height: el.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, []);

  const debouncedSave = useDebouncedCallback((current: number, total: number) => {
    saveProgress(id, token, String(current), total > 0 ? Math.round((current / total) * 1000) / 10 : null);
  }, 700);
  useEffect(() => {
    if (progressLoaded && pageCount > 0) debouncedSave(page, pageCount);
  }, [debouncedSave, page, pageCount, progressLoaded]);

  const pageStep = pageView === 'two' ? 2 : 1;
  const go = useCallback((delta: number) => {
    setPage((current) => Math.min(Math.max(1, current + delta * pageStep), pageCount || 1));
    window.dispatchEvent(new Event('ebook-reader-activity'));
  }, [pageCount, pageStep]);

  const zoomOut = useCallback(() => setScale((value) => Math.max(0.5, +(value - 0.2).toFixed(2))), []);
  const zoomIn = useCallback(() => setScale((value) => Math.min(3, +(value + 0.2).toFixed(2))), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, [role="combobox"]')) return;
      if (event.key === 'ArrowLeft') go(direction === 'rtl' ? 1 : -1);
      else if (event.key === 'ArrowRight') go(direction === 'rtl' ? -1 : 1);
      else if (event.key === '+' || event.key === '=') zoomIn();
      else if (event.key === '-') zoomOut();
      else if (event.key === '0') setScale(1);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [direction, go, zoomIn, zoomOut]);

  const changePageView = (value: ReaderPageView) => {
    setPageView(value);
    if (value === 'two') setPage((current) => current % 2 === 0 ? current - 1 : current);
  };

  const pageNumbers = pageView === 'two' && page < pageCount ? [page, page + 1] : [page];
  const displayPages = direction === 'rtl' && pageNumbers.length === 2 ? [...pageNumbers].reverse() : pageNumbers;
  const gap = displayPages.length === 2 ? 16 : 0;
  const availableWidth = viewport.width > 0
    ? Math.max(1, (viewport.width - 32 - gap) / displayPages.length)
    : 0;
  const availableHeight = viewport.height > 0 ? Math.max(1, viewport.height - 32) : 0;

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening comic…</div>;
  }
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Could not display this {format} comic.</p>
        <p className="mt-1 max-w-md text-xs text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col" role="region" aria-label={`${format} comic reader`}>
      <div ref={containerRef} className="flex min-h-0 flex-1 items-start justify-center gap-4 overflow-auto p-4 custom-scrollbar">
        {displayPages.map((pageNumber) => (
          <ComicPageImage
            key={pageNumber}
            id={id}
            token={token}
            page={pageNumber}
            fitMode={fitMode}
            availableWidth={availableWidth}
            availableHeight={availableHeight}
            scale={scale}
          />
        ))}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-slate-200 bg-white px-3 py-2 dark:border-surface-raised dark:bg-surface-indigo">
        <Button variant="outline" size="icon" onClick={() => go(-1)} disabled={page <= 1} title="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
        <span className="min-w-24 px-1 text-center text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
          {pageNumbers.length === 2 ? `Pages ${page}–${page + 1}` : `Page ${page}`} / {pageCount}
        </span>
        <Button variant="outline" size="icon" onClick={() => go(1)} disabled={page + pageNumbers.length - 1 >= pageCount} title="Next page"><ChevronRight className="h-4 w-4" /></Button>
        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-surface-raised" />
        <Button variant="outline" size="icon" onClick={zoomOut} title="Zoom out (-)"><ZoomOut className="h-4 w-4" /></Button>
        <button
          type="button"
          onClick={() => setScale(1)}
          title="Reset zoom to 100% (0)"
          className="w-11 rounded px-1 py-2 text-center text-xs tabular-nums text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-surface-raised"
        >
          {Math.round(scale * 100)}%
        </button>
        <Button variant="outline" size="icon" onClick={zoomIn} title="Zoom in (+)"><ZoomIn className="h-4 w-4" /></Button>
        <Select value={pageView} onValueChange={(value) => changePageView(value as ReaderPageView)}>
          <SelectTrigger className="h-9 w-[126px]" title="Page view"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="single">Single Page</SelectItem><SelectItem value="two">Two Page</SelectItem></SelectContent>
        </Select>
        <Select value={fitMode} onValueChange={(value) => { setFitMode(value as ComicFitMode); setScale(1); }}>
          <SelectTrigger className="h-9 w-[120px]" title="Fit mode"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="page">Fit Page</SelectItem>
            <SelectItem value="width">Fit Width</SelectItem>
            <SelectItem value="height">Fit Height</SelectItem>
          </SelectContent>
        </Select>
        <Select value={direction} onValueChange={(value) => setDirection(value as ComicDirection)}>
          <SelectTrigger className="h-9 w-[142px]" title="Reading direction"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ltr">Left to Right</SelectItem><SelectItem value="rtl">Right to Left</SelectItem></SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* ─────────────────────────── PDF reader ─────────────────────────── */
function PdfView({ id, token, bookTitle, canMakeFlashcards }: {
  id: string; token: string | null; bookTitle: string; canMakeFlashcards: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [pageView, setPageView] = useState<ReaderPageView>('single');
  const [fitMode, setFitMode] = useState<ReaderFitMode>('width');
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [err, setErr] = useState<string | null>(null);

  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);

  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selection, setSelection] = useState<string | null>(null);
  const [addingFlashcard, setAddingFlashcard] = useState(false);
  const [defineWord, setDefineWord] = useState<string | null>(null);

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
    setProgressLoaded(false);
    setPendingPage(null);
  }, [id]);

  // Resume where the reader left off.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await fetchProgress(id, token);
      if (cancelled) return;
      const pg = p?.location ? parseInt(p.location, 10) : NaN;
      if (Number.isFinite(pg) && pg >= 1) setPendingPage(pg);
      setProgressLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [id, token]);

  useEffect(() => {
    if (pendingPage && numPages > 0) {
      setPage(Math.min(pendingPage, numPages));
      setPendingPage(null);
    }
  }, [pendingPage, numPages]);

  // Persist reading position, but only once the saved position has already
  // been applied (otherwise the very first render at page 1 would clobber it).
  const debouncedSave = useDebouncedCallback((pg: number, total: number) => {
    saveProgress(id, token, String(pg), total > 0 ? Math.round((pg / total) * 1000) / 10 : null);
  }, 800);
  useEffect(() => {
    if (!progressLoaded || pendingPage || numPages <= 0) return;
    debouncedSave(page, numPages);
  }, [page, numPages, progressLoaded, pendingPage, debouncedSave]);

  useEffect(() => {
    fetchHighlights(id, token).then(setHighlights);
  }, [id, token]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setViewport({ width: el.clientWidth, height: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
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

  const pageStep = pageView === 'two' ? 2 : 1;
  const go = (direction: number) =>
    setPage((p) => Math.min(Math.max(1, p + direction * pageStep), numPages || 1));

  const changePageView = (value: ReaderPageView) => {
    setPageView(value);
    if (value === 'two') setPage((current) => current % 2 === 0 ? current - 1 : current);
  };

  const visiblePages = pageView === 'two' && page < numPages ? [page, page + 1] : [page];
  const availableWidth = Math.max(240, viewport.width - 32 - (pageView === 'two' ? 16 : 0));
  const fittedPageWidth = (availableWidth / visiblePages.length) * scale;
  const fittedPageHeight = Math.max(240, viewport.height - 32) * scale;

  const onError = (e: unknown) => {
    const msg = (e as Error)?.message || String(e);
    console.error('[E-Library PDF]', e);
    setErr(msg);
  };

  const onMouseUp = () => {
    const text = window.getSelection()?.toString().trim() || '';
    setSelection(text.length > 0 ? text : null);
  };

  const saveHighlight = async (color: string) => {
    if (!selection) return;
    try {
      const res = await fetch(`/api/ebooks/${id}/highlights`, {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({ text: selection, page, color }),
      });
      if (!res.ok) throw new Error('Could not save highlight.');
      const h = await res.json();
      setHighlights((prev) => [...prev, h]);
      toast.success('Highlight saved.');
    } catch (e: any) {
      toast.error(e.message || 'Could not save highlight.');
    } finally {
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    }
  };

  const deleteHighlight = async (h: HighlightRow) => {
    try {
      await fetch(`/api/ebooks/highlights/${h.id}`, { method: 'DELETE', headers: authHeaders(token) });
      setHighlights((prev) => prev.filter((x) => x.id !== h.id));
    } catch {
      toast.error('Could not delete highlight.');
    }
  };

  // Scans the extracted text layer of each page for a query. Bounded to the
  // first 400 pages so a very large scanned book can't hang the dialog.
  const searchPdf = async (query: string): Promise<SearchResult[]> => {
    const pdf = pdfRef.current;
    if (!pdf) return [];
    const q = query.toLowerCase();
    const results: SearchResult[] = [];
    const pageCount = Math.min(pdf.numPages, 400);
    for (let i = 1; i <= pageCount && results.length < 40; i++) {
      try {
        const pg = await pdf.getPage(i);
        const content = await pg.getTextContent();
        const text = content.items.map((it: any) => it.str).join(' ');
        const idx = text.toLowerCase().indexOf(q);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const excerpt = `${start > 0 ? '…' : ''}${text.slice(start, idx + q.length + 60).trim()}…`;
          results.push({ key: String(i), label: `Page ${i}`, excerpt });
        }
      } catch {
        // Unreadable page (e.g. scanned image with no text layer) — skip.
      }
    }
    return results;
  };

  return (
    <div className="h-full flex flex-col relative">
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto custom-scrollbar flex justify-center p-4 relative"
      >
        {err ? (
          <div className="flex flex-col items-center justify-center text-center px-6 max-w-md">
            <BookOpen className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Could not display this PDF.</p>
            <p className="text-xs text-slate-500 mt-1 break-words">{err}</p>
          </div>
        ) : (
          <div ref={pageWrapRef} onMouseUp={onMouseUp} className="flex items-start justify-center gap-4">
            <Document
              file={file}
              onLoadSuccess={(pdf: any) => { setNumPages(pdf.numPages); pdfRef.current = pdf; setErr(null); }}
              onLoadError={onError}
              onSourceError={onError}
              loading={<div className="flex items-center justify-center h-40 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div>}
            >
              <div className="flex items-start justify-center gap-4">
                {visiblePages.map((pageNumber) => (
                  <Page
                    key={pageNumber}
                    pageNumber={pageNumber}
                    width={fitMode === 'width' && viewport.width > 0 ? fittedPageWidth : undefined}
                    height={fitMode === 'height' && viewport.height > 0 ? fittedPageHeight : undefined}
                    renderAnnotationLayer={false}
                    renderTextLayer
                    className="shadow-lg"
                    onRenderError={onError}
                  />
                ))}
              </div>
            </Document>
          </div>
        )}
        {selection && (
          <SelectionBar
            text={selection}
            onHighlight={saveHighlight}
            onFlashcard={canMakeFlashcards ? () => setAddingFlashcard(true) : undefined}
            onDefine={extractLookupWord(selection) ? () => setDefineWord(extractLookupWord(selection)) : undefined}
            onDismiss={() => { window.getSelection()?.removeAllRanges(); setSelection(null); }}
          />
        )}
      </div>
      {/* Controls */}
      <div className="shrink-0 flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo px-4 py-2">
        <Button variant="outline" size="icon" onClick={() => go(-1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums px-2">
          {pageView === 'two' && page < numPages ? `Pages ${page}–${page + 1}` : `Page ${page}`} / {numPages || '…'}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => go(1)}
          disabled={page + visiblePages.length - 1 >= numPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-slate-200 dark:bg-surface-raised mx-1" />
        <Button variant="outline" size="icon" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(2)))} title="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
        <span className="text-xs text-slate-500 tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
        <Button variant="outline" size="icon" onClick={() => setScale((s) => Math.min(2.5, +(s + 0.2).toFixed(2)))} title="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
        <div className="w-px h-5 bg-slate-200 dark:bg-surface-raised mx-1" />
        <Select value={pageView} onValueChange={(value) => changePageView(value as ReaderPageView)}>
          <SelectTrigger className="h-9 w-[132px]" title="Page view"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single Page</SelectItem>
            <SelectItem value="two">Two Page</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fitMode} onValueChange={(value) => { setFitMode(value as ReaderFitMode); setScale(1); }}>
          <SelectTrigger className="h-9 w-[125px]" title="Fit mode"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="width">Fit to Width</SelectItem>
            <SelectItem value="height">Fit to Height</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-px h-5 bg-slate-200 dark:bg-surface-raised mx-1" />
        <Button variant="outline" size="icon" onClick={() => setShowSearch(true)} title="Search in book" disabled={!numPages}><Search className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" onClick={() => setShowHighlights(true)} title="My highlights">
          <Highlighter className="h-4 w-4" />
        </Button>
      </div>

      {showSearch && (
        <SearchDialog
          onSearch={searchPdf}
          onSelect={(r) => { setPage(parseInt(r.key, 10)); setShowSearch(false); }}
          onClose={() => setShowSearch(false)}
        />
      )}
      {showHighlights && (
        <HighlightsDialog
          highlights={highlights}
          onJump={(h) => { if (h.page) setPage(h.page); setShowHighlights(false); }}
          onDelete={deleteHighlight}
          onClose={() => setShowHighlights(false)}
        />
      )}
      {addingFlashcard && selection && (
        <AddToFlashcardsDialog
          token={token}
          defaultDefinition={selection}
          onClose={() => { setAddingFlashcard(false); window.getSelection()?.removeAllRanges(); setSelection(null); }}
        />
      )}
      {defineWord && <DefinePopover word={defineWord} onClose={() => setDefineWord(null)} />}
    </div>
  );
}

// TOC hrefs and the rendition's "relocated" href are often resolved relative
// to different base paths (or carry a cache-busting prefix), so a naive
// equality check almost never matches. Compare by filename only, ignoring
// any query string or hash fragment, so the dropdown shows the chapter
// label instead of falling back to the raw (and often very long) href.
function hrefKey(href: string): string {
  try {
    return decodeURIComponent(href.split('#')[0].split('?')[0]).split('/').pop() || href;
  } catch {
    return href;
  }
}

const HIGHLIGHT_FILL: Record<string, string> = {
  yellow: '#facc15', green: '#4ade80', blue: '#60a5fa', pink: '#f472b6',
};

type EpubAppearance = 'light' | 'warm' | 'dark';

const EPUB_APPEARANCE_KEY = 'ebook_epub_appearance';
const EPUB_APPEARANCE_SURFACE: Record<EpubAppearance, string> = {
  light: 'bg-white',
  warm: 'bg-[#f5efe4]',
  dark: 'bg-[#171717]',
};
const EPUB_APPEARANCE_CSS: Record<EpubAppearance, string> = {
  light: `
    html, body { background: #ffffff !important; color: #1e293b !important; }
    html body * { color: #1e293b !important; }
    a { color: #2563eb !important; }
  `,
  warm: `
    html, body { background: #f5efe4 !important; color: #3d3427 !important; }
    html body * { color: #3d3427 !important; }
    a { color: #8a4b22 !important; }
  `,
  dark: `
    html, body { background: #171717 !important; color: #e5e7eb !important; }
    html body * { color: #e5e7eb !important; }
    a { color: #93c5fd !important; }
  `,
};
const EPUB_APPEARANCE_COLORS: Record<EpubAppearance, { background: string; text: string; link: string }> = {
  light: { background: '#ffffff', text: '#1e293b', link: '#2563eb' },
  warm: { background: '#f5efe4', text: '#3d3427', link: '#8a4b22' },
  dark: { background: '#171717', text: '#e5e7eb', link: '#93c5fd' },
};

function loadEpubAppearance(): EpubAppearance {
  try {
    const saved = localStorage.getItem(EPUB_APPEARANCE_KEY);
    return saved === 'warm' || saved === 'dark' || saved === 'light' ? saved : 'light';
  } catch {
    return 'light';
  }
}

function applyEpubContentAppearance(contents: any, appearance: EpubAppearance) {
  const colors = EPUB_APPEARANCE_COLORS[appearance];
  contents.css('background-color', colors.background, true);
  contents.css('color', colors.text, true);
  const doc = contents.document as Document | undefined;
  if (!doc) return;

  doc.documentElement.style.setProperty('background-color', colors.background, 'important');
  doc.querySelectorAll<HTMLElement>('body *').forEach((element) => {
    element.style.setProperty('color', colors.text, 'important');
  });
  doc.querySelectorAll<HTMLElement>('a').forEach((element) => {
    element.style.setProperty('color', colors.link, 'important');
  });
}

function applyEpubAppearance(rendition: Rendition, appearance: EpubAppearance) {
  const themes = (rendition as any).themes;
  if (!themes) return;
  // EPUB.js keeps every rule-based theme stylesheet in the book document.
  // Reusing one CSS theme lets addStylesheetCss replace it, so switching back
  // from dark reliably removes the previous colours.
  themes.registerCss('reader-appearance', EPUB_APPEARANCE_CSS[appearance]);
  themes.select('reader-appearance');
  for (const contents of (rendition as any).getContents?.() ?? []) {
    applyEpubContentAppearance(contents, appearance);
  }
}

/* ─────────────────────────── EPUB reader ─────────────────────────── */
function EpubView({ id, token, blob, bookTitle, canMakeFlashcards }: {
  id: string; token: string | null; blob: Blob; bookTitle: string; canMakeFlashcards: boolean;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const rendRef = useRef<Rendition | null>(null);
  const [toc, setToc] = useState<{ label: string; href: string }[]>([]);
  const [currentHref, setCurrentHref] = useState<string>('');
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [appearance, setAppearance] = useState<EpubAppearance>(loadEpubAppearance);
  const [zoom, setZoom] = useState(100);
  const [pageView, setPageView] = useState<ReaderPageView>('single');
  const [fitMode, setFitMode] = useState<ReaderFitMode>('width');
  const appearanceRef = useRef(appearance);

  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selection, setSelection] = useState<{ cfiRange: string; text: string; contents: any } | null>(null);
  const [addingFlashcard, setAddingFlashcard] = useState(false);
  const [defineWord, setDefineWord] = useState<string | null>(null);
  const appliedHighlightIds = useRef<Set<string>>(new Set());

  // Resolve the currently-visible location to the matching TOC entry (by
  // filename) so the dropdown shows a readable chapter label instead of the
  // raw spine href, which is often long and would otherwise overflow into
  // the "next" button.
  const activeTocHref = useMemo(() => {
    if (!currentHref) return '';
    const key = hrefKey(currentHref);
    return toc.find((t) => hrefKey(t.href) === key)?.href || '';
  }, [currentHref, toc]);

  const debouncedSaveProgress = useDebouncedCallback((cfi: string, percent: number | null) => {
    saveProgress(id, token, cfi, percent);
  }, 800);

  const applyHighlight = useCallback((h: HighlightRow) => {
    if (!h.cfi || !rendRef.current || appliedHighlightIds.current.has(h.id)) return;
    try {
      rendRef.current.annotations.add(
        'highlight', h.cfi, {}, undefined, 'epub-hl',
        { fill: HIGHLIGHT_FILL[h.color] || HIGHLIGHT_FILL.yellow, 'fill-opacity': '0.35', 'mix-blend-mode': 'multiply' },
      );
      appliedHighlightIds.current.add(h.id);
    } catch {
      // A highlight anchored in a section that hasn't been rendered yet — harmless, epubjs will just skip it.
    }
  }, []);

  useEffect(() => {
    fetchHighlights(id, token).then((rows) => {
      setHighlights(rows);
      rows.forEach(applyHighlight);
    });
  }, [id, token, applyHighlight]);

  useEffect(() => {
    let destroyed = false;
    (async () => {
      try {
        setReady(false);
        setErr(null);
        const savedProgress = await fetchProgress(id, token);
        const buf = await blob.arrayBuffer();
        if (destroyed || !viewerRef.current) return;
        const book = ePub(buf as any);
        bookRef.current = book;
        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
        });
        rendRef.current = rendition;
        applyEpubAppearance(rendition, appearance);
        rendition.hooks.content.register((contents: any) => {
          applyEpubContentAppearance(contents, appearanceRef.current);
          // EPUB chapters render inside iframes, so their input events do not
          // bubble to the outer reader. Forward activity without exposing book
          // content so legitimate iframe reading continues the time heartbeat.
          const activity = () => window.dispatchEvent(new Event('ebook-reader-activity'));
          ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((event) =>
            contents.document?.addEventListener(event, activity, { passive: true }),
          );
        });
        rendition.on('relocated', (loc: any) => {
          const href = loc?.start?.href || '';
          setCurrentHref(href);
          if (loc?.start?.cfi) {
            let percent: number | null = null;
            try {
              const rawPercentage = (book.locations as any).percentageFromCfi(loc.start.cfi);
              const generated = Number(rawPercentage);
              if (rawPercentage != null && Number.isFinite(generated)) percent = Math.round(generated * 1000) / 10;
            } catch { /* locations may still be generating */ }
            if (percent === null && Number.isFinite(Number(loc?.start?.percentage))) {
              percent = Math.round(Number(loc.start.percentage) * 1000) / 10;
            }
            debouncedSaveProgress(loc.start.cfi, percent);
          }
        });
        rendition.on('selected', (cfiRange: string, contents: any) => {
          const text = contents?.window?.getSelection?.()?.toString()?.trim() || '';
          if (text) setSelection({ cfiRange, text, contents });
        });
        await rendition.display(savedProgress?.location || undefined);
        // Build a lightweight location map so reflowable EPUBs report a real
        // 0-100 reading percentage. Do this after first display so opening the
        // book is not blocked by pagination of every chapter.
        book.locations.generate(1600).then(() => {
          const location: any = rendition.currentLocation();
          const cfi = location?.start?.cfi;
          if (!cfi) return;
          const percentage = Number((book.locations as any).percentageFromCfi(cfi));
          if (Number.isFinite(percentage)) debouncedSaveProgress(cfi, Math.round(percentage * 1000) / 10);
        }).catch(() => {});
        if (!destroyed) {
          setReady(true);
          highlights.forEach(applyHighlight);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  useEffect(() => {
    appearanceRef.current = appearance;
    try { localStorage.setItem(EPUB_APPEARANCE_KEY, appearance); } catch { /* preference remains for this session */ }
    if (rendRef.current) applyEpubAppearance(rendRef.current, appearance);
  }, [appearance, ready]);

  // EPUB text is reflowable, so zoom changes its base font size rather than
  // scaling an iframe bitmap. This keeps text crisp and repaginates naturally.
  useEffect(() => {
    if (!rendRef.current) return;
    try { rendRef.current.themes.fontSize(`${zoom}%`); } catch { /* rendition is still opening */ }
  }, [zoom, ready]);

  useEffect(() => {
    if (!rendRef.current) return;
    try { rendRef.current.spread(pageView === 'two' ? 'always' : 'none', 0); } catch { /* rendition is still opening */ }
  }, [pageView, ready]);

  // Keep EPUB.js informed when fit mode, fullscreen, or the surrounding
  // layout changes. Fit-to-height uses a comfortable page-width cap; fit-to-
  // width consumes the whole reader width. Both retain the selected spread.
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      try { rendRef.current?.resize(el.clientWidth, el.clientHeight); } catch { /* not ready yet */ }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready, fitMode, pageView]);

  const clearSelection = () => {
    try { selection?.contents?.window?.getSelection?.()?.removeAllRanges(); } catch { /* noop */ }
    setSelection(null);
  };

  const saveHighlight = async (color: string) => {
    if (!selection) return;
    try {
      const res = await fetch(`/api/ebooks/${id}/highlights`, {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({ text: selection.text, cfi: selection.cfiRange, color }),
      });
      if (!res.ok) throw new Error('Could not save highlight.');
      const h: HighlightRow = await res.json();
      setHighlights((prev) => [...prev, h]);
      applyHighlight(h);
      toast.success('Highlight saved.');
    } catch (e: any) {
      toast.error(e.message || 'Could not save highlight.');
    } finally {
      clearSelection();
    }
  };

  const deleteHighlight = async (h: HighlightRow) => {
    try {
      await fetch(`/api/ebooks/highlights/${h.id}`, { method: 'DELETE', headers: authHeaders(token) });
      setHighlights((prev) => prev.filter((x) => x.id !== h.id));
      if (h.cfi) {
        try { rendRef.current?.annotations.remove(h.cfi, 'highlight'); } catch { /* noop */ }
        appliedHighlightIds.current.delete(h.id);
      }
    } catch {
      toast.error('Could not delete highlight.');
    }
  };

  // Loads and scans each spine section's text for a query. epubjs's
  // per-section `find()` is the documented pattern for full-book search
  // since there's no built-in book-wide index.
  const searchEpub = async (query: string): Promise<SearchResult[]> => {
    const book = bookRef.current;
    if (!book) return [];
    const items = ((book.spine as any).spineItems || []) as any[];
    const results: SearchResult[] = [];
    for (const item of items) {
      if (results.length >= 40) break;
      try {
        await item.load((book.load as any).bind(book));
        const matches: any[] = typeof item.find === 'function' ? item.find(query) : [];
        item.unload();
        for (const m of matches) {
          const label = toc.find((t) => hrefKey(t.href) === hrefKey(item.href))?.label || item.href;
          results.push({ key: m.cfi, label, excerpt: m.excerpt || '' });
        }
      } catch {
        // Section failed to load — skip it.
      }
    }
    return results;
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className={`flex-1 min-h-0 relative overflow-auto custom-scrollbar flex justify-center ${EPUB_APPEARANCE_SURFACE[appearance]}`}>
        {err ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <BookOpen className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700">Could not display this EPUB.</p>
            <p className="text-xs text-slate-500 mt-1 break-words">{err}</p>
          </div>
        ) : (
          <div
            ref={viewerRef}
            className="h-full shrink-0"
            style={{
              width: fitMode === 'width'
                ? '100%'
                : pageView === 'two' ? 'min(100%, 1200px)' : 'min(100%, 760px)',
            }}
          />
        )}
        {selection && (
          <SelectionBar
            text={selection.text}
            onHighlight={saveHighlight}
            onFlashcard={canMakeFlashcards ? () => setAddingFlashcard(true) : undefined}
            onDefine={extractLookupWord(selection.text) ? () => setDefineWord(extractLookupWord(selection.text)) : undefined}
            onDismiss={clearSelection}
          />
        )}
      </div>
      <div className="shrink-0 flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo px-4 py-2">
        <Button variant="outline" size="icon" onClick={() => rendRef.current?.prev()} disabled={!ready} className="shrink-0"><ChevronLeft className="h-4 w-4" /></Button>
        {toc.length > 0 && (
          <Select value={activeTocHref} onValueChange={(href) => rendRef.current?.display(href)}>
            <SelectTrigger className="w-[140px] sm:w-[220px] md:w-[260px] h-9 shrink-0 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0 w-full">
                <List className="h-3.5 w-3.5 shrink-0" />
                <SelectValue placeholder="Contents" className="truncate min-w-0" />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-72 min-w-[260px]">
              {toc.map((t, i) => (
                <SelectItem key={`${t.href}-${i}`} value={t.href}>{t.label || `Section ${i + 1}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="icon" onClick={() => rendRef.current?.next()} disabled={!ready} className="shrink-0"><ChevronRight className="h-4 w-4" /></Button>
        <div className="w-px h-5 bg-slate-200 dark:bg-surface-raised mx-1 shrink-0" />
        <Button variant="outline" size="icon" onClick={() => setZoom((value) => Math.max(60, value - 10))} title="Zoom out" disabled={!ready}><ZoomOut className="h-4 w-4" /></Button>
        <span className="text-xs text-slate-500 tabular-nums w-10 text-center">{zoom}%</span>
        <Button variant="outline" size="icon" onClick={() => setZoom((value) => Math.min(200, value + 10))} title="Zoom in" disabled={!ready}><ZoomIn className="h-4 w-4" /></Button>
        <Select value={pageView} onValueChange={(value) => setPageView(value as ReaderPageView)} disabled={!ready}>
          <SelectTrigger className="h-9 w-[132px]" title="Page view"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single Page</SelectItem>
            <SelectItem value="two">Two Page</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fitMode} onValueChange={(value) => setFitMode(value as ReaderFitMode)} disabled={!ready}>
          <SelectTrigger className="h-9 w-[125px]" title="Fit mode"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="width">Fit to Width</SelectItem>
            <SelectItem value="height">Fit to Height</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-px h-5 bg-slate-200 dark:bg-surface-raised mx-1 shrink-0" />
        <Button variant="outline" size="icon" onClick={() => setShowSearch(true)} title="Search in book" disabled={!ready} className="shrink-0"><Search className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" onClick={() => setShowHighlights(true)} title="My highlights" className="shrink-0">
          <Highlighter className="h-4 w-4" />
        </Button>
        <div className="inline-flex items-center rounded-md border border-slate-200 dark:border-surface-raised p-0.5 shrink-0" role="group" aria-label="Reading appearance">
          <Button
            variant={appearance === 'light' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setAppearance('light')}
            title="Light appearance"
            aria-label="Light appearance"
          >
            <Sun className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={appearance === 'warm' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setAppearance('warm')}
            title="Warm appearance"
            aria-label="Warm appearance"
          >
            <BookOpen className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={appearance === 'dark' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setAppearance('dark')}
            title="Dark appearance"
            aria-label="Dark appearance"
          >
            <Moon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showSearch && (
        <SearchDialog
          onSearch={searchEpub}
          onSelect={(r) => { rendRef.current?.display(r.key); setShowSearch(false); }}
          onClose={() => setShowSearch(false)}
        />
      )}
      {showHighlights && (
        <HighlightsDialog
          highlights={highlights}
          onJump={(h) => { if (h.cfi) rendRef.current?.display(h.cfi); setShowHighlights(false); }}
          onDelete={deleteHighlight}
          onClose={() => setShowHighlights(false)}
        />
      )}
      {addingFlashcard && selection && (
        <AddToFlashcardsDialog
          token={token}
          defaultDefinition={selection.text}
          onClose={() => { setAddingFlashcard(false); clearSelection(); }}
        />
      )}
      {defineWord && <DefinePopover word={defineWord} onClose={() => setDefineWord(null)} />}
    </div>
  );
}
