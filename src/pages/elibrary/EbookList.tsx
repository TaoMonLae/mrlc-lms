import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpDown, BarChart3, BookMarked, BookOpen, ChevronDown, ChevronLeft,
  ChevronRight, ClipboardList, Download, LibraryBig, Lock, Pencil, Plus,
  Search, Trash2,
} from 'lucide-react';
import CircularGallery from '@/components/CircularGallery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ebookHomeworkPrefill } from '../../lib/ebookHomeworkPrefill';
import { useUser } from '../../lib/permissions';

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

interface GenreGroup {
  key: string;
  genre: string;
  books: Ebook[];
}

interface GalleryItem {
  id: string;
  image: string;
  text: string;
}

function fmtSize(bytes?: number | null) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function hashText(value: string) {
  return Array.from(value).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function genreArtwork(label: string) {
  const hue = Math.abs(hashText(label)) % 360;
  const safeLabel = label.replace(/[&<>"']/g, '').slice(0, 22);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900" viewBox="0 0 700 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 78% 58%)"/><stop offset="1" stop-color="hsl(${(hue + 58) % 360} 72% 34%)"/></linearGradient></defs><rect width="700" height="900" rx="44" fill="url(#g)"/><circle cx="580" cy="150" r="180" fill="white" opacity=".12"/><circle cx="90" cy="780" r="250" fill="white" opacity=".08"/><path d="M180 260h340v380H180z" fill="none" stroke="white" stroke-width="24" opacity=".9"/><path d="M350 260v380" stroke="white" stroke-width="20" opacity=".9"/><text x="350" y="735" text-anchor="middle" fill="white" font-family="sans-serif" font-size="52" font-weight="700">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function BookCover({ book, className = '' }: { book: Ebook; className?: string }) {
  if (book.coverUrl) {
    return <img src={book.coverUrl} alt={`Cover of ${book.title}`} className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`flex h-full w-full flex-col justify-between bg-gradient-to-br from-primary via-accent-purple to-indigo-800 p-5 text-white ${className}`}>
      <BookMarked className="h-8 w-8 opacity-80" />
      <div>
        <p className="line-clamp-4 text-lg font-bold leading-tight">{book.title}</p>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">{book.author || 'Unknown author'}</p>
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'author', label: 'Author A–Z' },
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
  const [sortBy, setSortBy] = useState<SortValue>('title');
  const [selectedGenreKey, setSelectedGenreKey] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Ebook | null>(null);
  const [continueReading, setContinueReading] = useState<ProgressEntry[]>([]);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
      if (res.ok) setContinueReading(await res.json());
    } catch {
      // The library remains usable if reading progress cannot be loaded.
    }
  };

  useEffect(() => { load(); loadProgress(); }, []);

  const genreGroups = useMemo<GenreGroup[]>(() => {
    const groups = new Map<string, GenreGroup>();
    ebooks.forEach((book) => {
      const genre = book.category?.trim() || 'Uncategorized';
      const key = genre.toLocaleLowerCase();
      const group = groups.get(key) || { key, genre, books: [] };
      group.books.push(book);
      groups.set(key, group);
    });
    return Array.from(groups.values()).sort((a, b) => {
      if (a.genre === 'Uncategorized') return 1;
      if (b.genre === 'Uncategorized') return -1;
      return a.genre.localeCompare(b.genre);
    });
  }, [ebooks]);

  const galleryItems = useMemo<GalleryItem[]>(() => genreGroups.map((group) => ({
    id: group.key,
    image: group.books.find((book) => book.coverUrl)?.coverUrl || genreArtwork(group.genre),
    text: `${group.genre} · ${group.books.length} ${group.books.length === 1 ? 'book' : 'books'}`,
  })), [genreGroups]);

  const selectedGroup = genreGroups.find((group) => group.key === selectedGenreKey) || null;

  useEffect(() => {
    if (!loading && selectedGenreKey && !selectedGroup) setSelectedGenreKey(null);
  }, [loading, selectedGenreKey, selectedGroup]);

  const shelfBooks = useMemo(() => {
    if (!selectedGroup) return [];
    const q = query.trim().toLocaleLowerCase();
    const rows = selectedGroup.books.filter((book) => !q || [book.title, book.author, book.seriesName, book.format]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(q)));
    const sorted = [...rows];
    if (sortBy === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'author') sorted.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    return sorted;
  }, [query, selectedGroup, sortBy]);

  const shelfGroups = useMemo(() => {
    const series = new Map<string, { key: string; name: string; books: Ebook[] }>();
    const standalone: Ebook[] = [];
    shelfBooks.forEach((book) => {
      const name = book.seriesName?.trim();
      if (!name) {
        standalone.push(book);
        return;
      }
      const key = name.toLocaleLowerCase();
      const group = series.get(key) || { key, name, books: [] };
      group.books.push(book);
      series.set(key, group);
    });
    return {
      standalone,
      series: Array.from(series.values()).map((group) => ({
        ...group,
        books: [...group.books].sort((a, b) =>
          (a.seriesNumber ?? Number.MAX_SAFE_INTEGER) - (b.seriesNumber ?? Number.MAX_SAFE_INTEGER)
          || a.title.localeCompare(b.title)),
      })),
    };
  }, [shelfBooks]);

  const selectGenre = useCallback((item: GalleryItem) => {
    setSelectedGenreKey(item.id);
    setQuery('');
    setExpandedSeries(new Set());
  }, []);

  const returnToGenres = () => {
    setSelectedGenreKey(null);
    setQuery('');
    setExpandedSeries(new Set());
  };

  const handleDownload = async (book: Ebook) => {
    setDownloadingId(book.id);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/ebooks/${book.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Download not allowed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${book.title}.${book.format.toLowerCase()}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (book: Ebook) => {
    if (!window.confirm(`Delete "${book.title}" from the e-library?`)) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/ebooks/${book.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete');
      }
      setEbooks((current) => current.filter((item) => item.id !== book.id));
      setSelectedBook(null);
      toast.success('E-book deleted.');
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

  const renderBookTile = (book: Ebook) => (
    <article key={book.id} className="group min-w-0">
      <button
        type="button"
        onClick={() => setSelectedBook(book)}
        aria-label={`View information for ${book.title}`}
        className="w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 dark:focus-visible:ring-offset-surface-indigo"
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-md transition duration-200 group-hover:-translate-y-1 group-hover:shadow-xl group-active:scale-[0.98] motion-reduce:transform-none dark:border-surface-raised dark:bg-surface-indigo">
          <BookCover book={book} />
          <Badge className="absolute right-3 top-3 border-0 bg-white/95 text-[10px] font-bold uppercase tracking-[0.14em] text-primary shadow-sm hover:bg-white/95 dark:bg-slate-950/90 dark:text-white">
            {book.format}
          </Badge>
          {book.seriesNumber != null && (
            <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
              Vol. {book.seriesNumber}
            </span>
          )}
        </div>
        <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-white">{book.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-300">{book.author || 'Unknown author'}</p>
      </button>
    </article>
  );

  return (
    <div className="min-w-0 max-w-full space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            <BookMarked className="h-6 w-6 text-accent-purple" /> E-Library
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Browse by genre, preview book details, and read online.</p>
        </div>
        {canManage && (
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="outline" className="min-h-11 w-full sm:w-auto" render={<Link to="/elibrary/analytics" />} nativeButton={false}>
              <BarChart3 className="mr-2 h-4 w-4" /> Reading Analytics
            </Button>
            <Button variant="outline" className="min-h-11 w-full sm:w-auto" render={<Link to="/elibrary/gutenberg" />} nativeButton={false}>
              <BookMarked className="mr-2 h-4 w-4" /> Import from Gutenberg
            </Button>
            <Button className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto" render={<Link to="/elibrary/upload" />} nativeButton={false}>
              <Plus className="mr-2 h-4 w-4" /> Upload Book
            </Button>
          </div>
        )}
      </header>

      {!selectedGroup && continueReading.length > 0 && (
        <section className="min-w-0 max-w-full space-y-2" aria-labelledby="continue-reading-heading">
          <h2 id="continue-reading-heading" className="text-sm font-semibold text-slate-700 dark:text-slate-200">Continue Reading</h2>
          <div className="flex max-w-full gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {continueReading.map((progress) => (
              <button
                key={progress.ebook.id}
                type="button"
                onClick={() => navigate(`/elibrary/${progress.ebook.id}/read`)}
                className="group min-h-11 w-40 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-surface-raised dark:bg-surface-indigo"
              >
                <div className="flex h-24 w-full items-center justify-center overflow-hidden bg-accent-purple/10">
                  {progress.ebook.coverUrl ? <img src={progress.ebook.coverUrl} alt="" className="h-full w-full object-cover" /> : <BookMarked className="h-7 w-7 text-accent-purple" />}
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold leading-tight text-slate-900 dark:text-white">{progress.ebook.title}</p>
                  {progress.percent != null && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-surface-raised" aria-label={`${Math.round(progress.percent)}% complete`}>
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(3, progress.percent))}%` }} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="py-24 text-center text-sm text-slate-500" role="status">Loading e-library…</div>
      ) : ebooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center dark:border-surface-raised dark:bg-surface-indigo">
          <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No e-books yet.</p>
          {canManage && <p className="mt-1 text-xs text-slate-500">Upload a PDF, EPUB, CBR, or CBZ file to create the first shelf.</p>}
        </div>
      ) : !selectedGroup ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo" aria-labelledby="browse-genres-heading">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between dark:border-surface-raised">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Library collections</p>
              <h2 id="browse-genres-heading" className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">Browse genres</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Select a collection to open its bookshelf.</p>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-300">{ebooks.length} books · {genreGroups.length} genres</p>
          </div>
          <div className="h-[400px] sm:h-[500px]" data-testid="genre-gallery">
            <CircularGallery
              items={galleryItems}
              bend={2.6}
              borderRadius={0.08}
              textColor="#64748b"
              font="600 28px sans-serif"
              scrollSpeed={2}
              onItemClick={selectGenre}
            />
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-500 dark:border-surface-raised dark:text-slate-300">
            Drag or scroll to browse. Select a cover to view the books in that genre.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo" aria-labelledby="selected-genre-heading">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between dark:border-surface-raised">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="outline" className="min-h-11 shrink-0" onClick={returnToGenres}>
                <ChevronLeft className="mr-1 h-4 w-4" /> All genres
              </Button>
              <div className="hidden rounded-xl bg-primary/10 p-3 text-primary sm:block"><LibraryBig className="h-5 w-5" /></div>
              <div className="min-w-0">
                <h2 id="selected-genre-heading" className="truncate text-xl font-semibold text-slate-900 dark:text-white">{selectedGroup.genre}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-300">{selectedGroup.books.length} {selectedGroup.books.length === 1 ? 'book' : 'books'}</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <label className="relative min-w-0 flex-1 lg:w-72">
                <span className="sr-only">Search this shelf</span>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this shelf…" className="min-h-11 pl-9 text-base sm:text-sm" />
              </label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortValue)}>
                <SelectTrigger className="min-h-11 w-full sm:w-48" aria-label="Sort books">
                  <div className="flex items-center gap-2"><ArrowUpDown className="h-3.5 w-3.5" /><SelectValue /></div>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {shelfBooks.length === 0 ? (
            <div className="py-20 text-center">
              <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-700 dark:text-slate-200">No books match “{query}”.</p>
              <Button variant="link" className="mt-2" onClick={() => setQuery('')}>Clear search</Button>
            </div>
          ) : (
            <div className="space-y-8 p-5 sm:p-7">
              {shelfGroups.series.map((series) => {
                const seriesKey = `${selectedGroup.key}::${series.key}`;
                const expanded = expandedSeries.has(seriesKey);
                const authors = Array.from(new Set(series.books.map((book) => book.author).filter(Boolean)));
                return (
                  <div key={seriesKey} className="overflow-hidden rounded-2xl border border-accent-purple/20 bg-slate-50/70 dark:border-accent-purple/30 dark:bg-black/10">
                    <button
                      type="button"
                      onClick={() => toggleSeries(seriesKey)}
                      aria-expanded={expanded}
                      className="flex min-h-20 w-full cursor-pointer items-center gap-4 p-4 text-left transition-colors hover:bg-accent-purple/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    >
                      <div className="relative h-20 w-24 shrink-0" aria-hidden="true">
                        {series.books.slice(0, 3).map((book, index) => (
                          <div key={book.id} className="absolute top-0 h-20 w-14 overflow-hidden rounded-md border-2 border-white bg-accent-purple/10 shadow dark:border-surface-indigo" style={{ left: `${index * 14}px`, zIndex: 3 - index }}>
                            <BookCover book={book} />
                          </div>
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge className="bg-accent-purple/10 text-[10px] text-accent-purple hover:bg-accent-purple/10">Book series</Badge>
                          <span className="text-xs text-slate-500">{series.books.length} {series.books.length === 1 ? 'volume' : 'volumes'}</span>
                        </div>
                        <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">{series.name}</h3>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-300">{authors.join(', ') || 'Unknown author'}</p>
                      </div>
                      {expanded ? <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" /> : <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />}
                    </button>
                    {expanded && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-7 border-t border-slate-200 p-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 dark:border-surface-raised">
                        {series.books.map(renderBookTile)}
                      </div>
                    )}
                  </div>
                );
              })}

              {shelfGroups.standalone.length > 0 && (
                <div>
                  {shelfGroups.series.length > 0 && <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Individual books</h3>}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                    {shelfGroups.standalone.map(renderBookTile)}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <Dialog open={Boolean(selectedBook)} onOpenChange={(open) => { if (!open) setSelectedBook(null); }}>
        {selectedBook && (
          <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto p-0 sm:max-w-4xl [&_[data-slot=dialog-close]]:bg-white/90 [&_[data-slot=dialog-close]]:text-slate-900 [&_[data-slot=dialog-close]]:shadow-sm [&_[data-slot=dialog-close]]:hover:bg-white" showCloseButton>
            <div className="grid min-h-[460px] md:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.7fr)]">
              <div className="min-h-72 overflow-hidden bg-slate-950 md:min-h-full">
                <BookCover book={selectedBook} className="md:min-h-[520px]" />
              </div>
              <div className="flex min-w-0 flex-col p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 pr-10">
                  <Badge className="bg-primary text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary">{selectedBook.format}</Badge>
                  <span className="text-sm text-slate-500 dark:text-slate-300">{selectedBook.category?.trim() || 'Uncategorized'}</span>
                  {selectedBook.seriesName && (
                    <Badge variant="outline">{selectedBook.seriesName}{selectedBook.seriesNumber != null ? ` · Vol. ${selectedBook.seriesNumber}` : ''}</Badge>
                  )}
                </div>
                <DialogTitle className="mt-7 text-3xl font-bold leading-tight text-slate-950 dark:text-white">{selectedBook.title}</DialogTitle>
                <p className="mt-2 text-lg font-medium text-slate-500 dark:text-slate-300">{selectedBook.author || 'Unknown author'}</p>
                <DialogDescription className="mt-7 text-base leading-7 text-slate-600 dark:text-slate-300">
                  {selectedBook.description?.trim() || 'No description is available for this book yet.'}
                </DialogDescription>
                <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {selectedBook.language && <div><dt className="inline text-slate-400">Language: </dt><dd className="inline font-medium text-slate-700 dark:text-slate-200">{selectedBook.language}</dd></div>}
                  {selectedBook.fileSize && <div><dt className="inline text-slate-400">Size: </dt><dd className="inline font-medium text-slate-700 dark:text-slate-200">{fmtSize(selectedBook.fileSize)}</dd></div>}
                  {!selectedBook.downloadAllowed && <div className="inline-flex items-center gap-1 font-medium text-slate-500"><Lock className="h-3.5 w-3.5" /> Read only</div>}
                </dl>
                <div className="mt-auto grid gap-3 pt-8 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Button className="min-h-12 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate(`/elibrary/${selectedBook.id}/read`)}>
                    <BookOpen className="mr-2 h-5 w-5" /> Read now
                  </Button>
                  {selectedBook.downloadAllowed && (
                    <Button variant="outline" className="min-h-12 px-5" disabled={downloadingId === selectedBook.id} onClick={() => handleDownload(selectedBook)}>
                      <Download className="mr-2 h-5 w-5" /> {downloadingId === selectedBook.id ? 'Downloading…' : 'Download'}
                    </Button>
                  )}
                </div>
                {(canAssignHomework || canManage) && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-surface-raised">
                    {canAssignHomework && (
                      <Button variant="outline" className="min-h-11" onClick={() => navigate('/teacher/homework', { state: { prefill: ebookHomeworkPrefill(selectedBook) } })}>
                        <ClipboardList className="mr-2 h-4 w-4" /> Assign
                      </Button>
                    )}
                    {canManage && (
                      <>
                        <Button variant="outline" className="min-h-11" render={<Link to={`/elibrary/${selectedBook.id}/edit`} />} nativeButton={false}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <Button variant="destructive" className="min-h-11" onClick={() => handleDelete(selectedBook)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
