import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3, BookMarked, Search, Filter, Plus, BookOpen, Download, Pencil,
  Trash2, Lock, ArrowUpDown, ClipboardList, ChevronDown, ChevronRight, LibraryBig,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useUser } from '../../lib/permissions';
import { ebookHomeworkPrefill } from '../../lib/ebookHomeworkPrefill';

export interface Ebook {
  id: string;
  title: string;
  author?: string | null;
  description?: string | null;
  category?: string | null;
  seriesName?: string | null;
  seriesNumber?: number | null;
  language?: string | null;
  coverUrl?: string | null;
  format: string;
  fileSize?: number | null;
  visibility?: string | null;
  downloadAllowed: boolean;
  uploadedByName?: string | null;
  createdAt?: string;
}

interface ProgressEntry {
  ebook: { id: string; title: string; author?: string | null; format: string; coverUrl?: string | null };
  location: string;
  percent: number | null;
  updatedAt: string;
}

function fmtSize(bytes?: number | null) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently added' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'author', label: 'Author (A–Z)' },
] as const;
type SortValue = typeof SORT_OPTIONS[number]['value'];

export default function EbookList() {
  const navigate = useNavigate();
  const { user } = useUser();
  const canManage = user?.role === 'ADMIN' || user?.role === 'TEACHER' || user?.role === 'LIBRARIAN';
  const canAssignHomework = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('All');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortValue>('recent');
  const [continueReading, setContinueReading] = useState<ProgressEntry[]>([]);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/ebooks', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load e-library');
      setEbooks(await res.json());
    } catch (e: any) {
      toast.error(e.message || 'Failed to load e-library');
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/ebooks/my/progress', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      setContinueReading(await res.json());
    } catch {
      // Non-critical — the "Continue Reading" strip just won't show.
    }
  };

  useEffect(() => { load(); loadProgress(); }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    ebooks.forEach((b) => { if (b.category) set.add(b.category); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ebooks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = ebooks.filter((b) => {
      const matchesQ = !q || [b.title, b.author, b.category, b.seriesName].filter(Boolean).some((f) => String(f).toLowerCase().includes(q));
      const matchesFmt = formatFilter === 'All' || b.format === formatFilter;
      const matchesCat = category === 'All' || b.category === category;
      return matchesQ && matchesFmt && matchesCat;
    });
    const sorted = [...rows];
    if (sortBy === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'author') sorted.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    // 'recent' relies on the API's default createdAt-desc order, so no re-sort needed.
    return sorted;
  }, [ebooks, query, formatFilter, category, sortBy]);

  const genreGroups = useMemo(() => {
    const groups = new Map<string, { genre: string; standalone: Ebook[]; series: Map<string, { name: string; books: Ebook[] }> }>();
    for (const book of filtered) {
      const genre = book.category?.trim() || 'Uncategorized';
      const genreKey = genre.toLocaleLowerCase();
      const group = groups.get(genreKey) || { genre, standalone: [], series: new Map() };
      if (book.seriesName?.trim()) {
        const seriesName = book.seriesName.trim();
        const seriesKey = seriesName.toLocaleLowerCase();
        const series = group.series.get(seriesKey) || { name: seriesName, books: [] };
        series.books.push(book);
        group.series.set(seriesKey, series);
      } else {
        group.standalone.push(book);
      }
      groups.set(genreKey, group);
    }
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        series: Array.from(group.series.values()).map((series) => ({
          ...series,
          books: [...series.books].sort((a, b) =>
            (a.seriesNumber ?? Number.MAX_SAFE_INTEGER) - (b.seriesNumber ?? Number.MAX_SAFE_INTEGER)
            || a.title.localeCompare(b.title)),
        })),
      }))
      .sort((a, b) => {
        if (a.genre === 'Uncategorized') return 1;
        if (b.genre === 'Uncategorized') return -1;
        return a.genre.localeCompare(b.genre);
      });
  }, [filtered]);

  const handleDownload = async (b: Ebook) => {
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/ebooks/${b.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Download not allowed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${b.title}.${b.format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || 'Download failed');
    }
  };

  const handleDelete = async (b: Ebook) => {
    if (!window.confirm(`Delete "${b.title}" from the e-library?`)) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/ebooks/${b.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete');
      }
      toast.success('E-book deleted.');
      setEbooks((prev) => prev.filter((x) => x.id !== b.id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  const toggleSeries = (key: string) => {
    setExpandedSeries((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderBookCard = (b: Ebook) => (
    <article key={b.id} className="group min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md dark:border-surface-raised dark:bg-surface-indigo">
      <div className="flex min-h-36 gap-4 p-4">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-md border border-slate-100 bg-accent-purple/10 shadow-sm dark:border-surface-raised">
          {b.coverUrl ? (
            <img src={b.coverUrl} alt={`Cover of ${b.title}`} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center"><BookMarked className="h-7 w-7 text-accent-purple" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">{b.format}</Badge>
            {b.seriesName && b.seriesNumber && (
              <Badge className="bg-accent-purple/10 text-[9px] text-accent-purple hover:bg-accent-purple/10">Vol. {b.seriesNumber}</Badge>
            )}
            {!b.downloadAllowed && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><Lock className="h-3 w-3" /> Read only</span>
            )}
          </div>
          <h3 className="mt-2 line-clamp-2 font-semibold leading-tight text-slate-900 dark:text-white">{b.title}</h3>
          <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-300">{b.author || 'Unknown author'}</p>
          {b.fileSize ? <p className="mt-1 text-[10px] text-slate-400">{fmtSize(b.fileSize)}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 dark:border-surface-raised">
        <Button className="min-w-28 flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate(`/elibrary/${b.id}/read`)}>
          <BookOpen className="mr-2 h-4 w-4" /> Read
        </Button>
        {b.downloadAllowed && (
          <Button variant="outline" size="icon" title="Download" aria-label={`Download ${b.title}`} onClick={() => handleDownload(b)}>
            <Download className="h-4 w-4" />
          </Button>
        )}
        {canAssignHomework && (
          <Button
            variant="outline"
            size="icon"
            title="Assign as homework"
            aria-label={`Assign ${b.title} as homework`}
            onClick={() => navigate('/teacher/homework', { state: { prefill: ebookHomeworkPrefill(b) } })}
          >
            <ClipboardList className="h-4 w-4" />
          </Button>
        )}
        {canManage && (
          <>
            <Button variant="outline" size="icon" title="Edit" aria-label={`Edit ${b.title}`} render={<Link to={`/elibrary/${b.id}/edit`} />} nativeButton={false}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" title="Delete" aria-label={`Delete ${b.title}`} className="text-red-600 hover:text-red-700" onClick={() => handleDelete(b)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </article>
  );

  return (
    <div className="min-w-0 max-w-full space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-accent-purple" /> E-Library
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Read PDF, EPUB, CBR, and CBZ books online.</p>
        </div>
        {canManage && (
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto" render={<Link to="/elibrary/analytics" />} nativeButton={false}>
              <BarChart3 className="mr-2 h-4 w-4" /> Reading Analytics
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" render={<Link to="/elibrary/gutenberg" />} nativeButton={false}>
              <BookMarked className="mr-2 h-4 w-4" /> Import from Gutenberg
            </Button>
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground sm:w-auto" render={<Link to="/elibrary/upload" />} nativeButton={false}>
              <Plus className="mr-2 h-4 w-4" /> Upload Book
            </Button>
          </div>
        )}
      </div>

      {continueReading.length > 0 && (
        <div className="min-w-0 max-w-full space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Continue Reading</h2>
          <div className="flex max-w-full gap-3 overflow-x-auto custom-scrollbar pb-1">
            {continueReading.map((p) => (
              <button
                key={p.ebook.id}
                onClick={() => navigate(`/elibrary/${p.ebook.id}/read`)}
                className="group shrink-0 w-40 text-left bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-24 w-full bg-accent-purple/10 flex items-center justify-center overflow-hidden">
                  {p.ebook.coverUrl ? (
                    <img src={p.ebook.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <BookMarked className="h-7 w-7 text-accent-purple" />
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight">{p.ebook.title}</p>
                  {p.percent != null && (
                    <div className="mt-1.5 h-1 rounded-full bg-slate-200 dark:bg-surface-raised overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(3, p.percent))}%` }} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, author, genre, or series…" className="pl-9" />
        </div>
        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <div className="flex items-center gap-2"><Filter className="h-3.5 w-3.5" /><SelectValue /></div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All formats</SelectItem>
            <SelectItem value="PDF">PDF</SelectItem>
            <SelectItem value="EPUB">EPUB</SelectItem>
            <SelectItem value="CBR">CBR</SelectItem>
            <SelectItem value="CBZ">CBZ</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortValue)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <div className="flex items-center gap-2"><ArrowUpDown className="h-3.5 w-3.5" /><SelectValue /></div>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('All')}
            className={`max-w-full break-words px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              category === 'All'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white dark:bg-surface-indigo text-slate-600 dark:text-slate-300 border-slate-200 dark:border-surface-raised hover:border-primary/50'
            }`}
          >
            All categories
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`max-w-full break-words px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                category === c
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white dark:bg-surface-indigo text-slate-600 dark:text-slate-300 border-slate-200 dark:border-surface-raised hover:border-primary/50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">Loading e-library…</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-surface-indigo rounded-md border border-dashed border-slate-200 dark:border-surface-raised">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {ebooks.length === 0 ? 'No e-books yet.' : 'No books match your search.'}
          </p>
          {canManage && ebooks.length === 0 && <p className="text-xs text-slate-500 mt-1">Click “Upload Book” to add a PDF, EPUB, CBR, or CBZ file.</p>}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-300">
            <span>{filtered.length} {filtered.length === 1 ? 'book' : 'books'}</span>
            <span>{genreGroups.length} {genreGroups.length === 1 ? 'genre' : 'genres'}</span>
          </div>
          {genreGroups.map((group) => {
            const bookCount = group.standalone.length + group.series.reduce((total, series) => total + series.books.length, 0);
            return (
              <section key={group.genre} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm dark:border-surface-raised dark:bg-surface-indigo/40">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 dark:border-surface-raised dark:bg-surface-indigo">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary"><LibraryBig className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-slate-900 dark:text-white">{group.genre}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-300">{bookCount} {bookCount === 1 ? 'book' : 'books'}</p>
                    </div>
                  </div>
                  {group.series.length > 0 && (
                    <Badge variant="outline">{group.series.length} series</Badge>
                  )}
                </div>

                <div className="space-y-5 p-4">
                  {group.series.map((series) => {
                    const seriesKey = `${group.genre.toLocaleLowerCase()}::${series.name.toLocaleLowerCase()}`;
                    const expanded = expandedSeries.has(seriesKey);
                    const authorNames = Array.from(new Set(series.books.map((book) => book.author).filter(Boolean)));
                    return (
                      <div key={seriesKey} className="overflow-hidden rounded-xl border border-accent-purple/20 bg-white shadow-sm dark:border-accent-purple/30 dark:bg-surface-indigo">
                        <button
                          type="button"
                          onClick={() => toggleSeries(seriesKey)}
                          aria-expanded={expanded}
                          className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent-purple/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                        >
                          <div className="relative h-20 w-20 shrink-0">
                            {series.books.slice(0, 3).map((book, index) => (
                              <div
                                key={book.id}
                                className="absolute top-0 h-20 w-14 overflow-hidden rounded border border-white bg-accent-purple/10 shadow dark:border-surface-raised"
                                style={{ left: `${index * 12}px`, zIndex: 3 - index }}
                              >
                                {book.coverUrl ? (
                                  <img src={book.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="flex h-full items-center justify-center"><BookMarked className="h-5 w-5 text-accent-purple" /></div>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <Badge className="bg-accent-purple/10 text-[10px] text-accent-purple hover:bg-accent-purple/10">Book series</Badge>
                              <span className="text-xs text-slate-500">{series.books.length} {series.books.length === 1 ? 'volume' : 'volumes'}</span>
                            </div>
                            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">{series.name}</h3>
                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-300">{authorNames.join(', ') || 'Unknown author'}</p>
                          </div>
                          {expanded ? <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" /> : <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />}
                        </button>
                        {expanded && (
                          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2 xl:grid-cols-3 dark:border-surface-raised dark:bg-black/10">
                            {series.books.map(renderBookCard)}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {group.standalone.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {group.standalone.map(renderBookCard)}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
