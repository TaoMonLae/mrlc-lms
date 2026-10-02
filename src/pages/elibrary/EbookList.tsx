import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowUpDown, BarChart3, BookMarked, BookOpen, ChevronDown, ChevronLeft,
  ChevronRight, ClipboardList, Download, LibraryBig, Pencil, Plus,
  Search, Trash2, X,
} from 'lucide-react';
import './EbookList.css';
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
import { ebookMatchesSearch } from '../../../lib/ebookSearch';

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

function fmtSize(bytes?: number | null) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function hashText(value: string) {
  return Array.from(value).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function BookCover({ book, className = '' }: { book: Ebook; className?: string }) {
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => setCoverFailed(false), [book.coverUrl]);

  if (book.coverUrl && !coverFailed) {
    return (
      <img
        src={book.coverUrl}
        alt={`Cover of ${book.title}`}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
        onError={() => setCoverFailed(true)}
      />
    );
  }
  return (
    <div className={`elibrary-cover-placeholder ${className}`} style={{ '--cover-hue': `${Math.abs(hashText(book.title)) % 360}` } as React.CSSProperties}>
      <span>MRLC / DIGITAL EDITION</span>
      <BookMarked className="h-8 w-8" />
      <div>
        <p>{book.title}</p>
        <small>{book.author || 'Unknown author'}</small>
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortValue>('title');
  const [selectedGenreKey, setSelectedGenreKey] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Ebook | null>(null);
  const [continueReading, setContinueReading] = useState<ProgressEntry[]>([]);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const [visibleLimit, setVisibleLimit] = useState(24);
  useEffect(() => setVisibleLimit(24), [deferredQuery, sortBy, selectedGenreKey]);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/ebooks', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load e-library');
      setEbooks(await res.json());
    } catch (e: any) {
      const message = e.message || 'Failed to load e-library';
      setLoadError(message);
      toast.error(message);
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

  const selectedGroup = genreGroups.find((group) => group.key === selectedGenreKey) || null;

  const sortBooks = useCallback((books: Ebook[]) => {
    const sorted = [...books];
    if (sortBy === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'author') sorted.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    else sorted.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return sorted;
  }, [sortBy]);

  const searchBooks = useMemo(() => sortBooks(
    ebooks.filter((book) => ebookMatchesSearch(book, deferredQuery)),
  ), [deferredQuery, ebooks, sortBooks]);

  useEffect(() => {
    if (!loading && selectedGenreKey && !selectedGroup) setSelectedGenreKey(null);
  }, [loading, selectedGenreKey, selectedGroup]);

  const shelfBooks = useMemo(() => {
    if (!selectedGroup) return [];
    return sortBooks(selectedGroup.books.filter((book) => ebookMatchesSearch(book, deferredQuery)));
  }, [deferredQuery, selectedGroup, sortBooks]);

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

  const selectGenre = useCallback((key: string) => {
    setSelectedGenreKey(key);
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
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      setContinueReading(current => current.filter(entry => entry.ebook.id !== book.id));
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

  const formatCount = useMemo(() => new Set(ebooks.map((book) => book.format.toUpperCase())).size, [ebooks]);
  const renderBookTile = (book: Ebook) => (
    <article key={book.id} className="elibrary-book-card group min-w-0">
      <button
        type="button"
        onClick={() => setSelectedBook(book)}
        aria-label={`View information for ${book.title}`}
        className="elibrary-book-card__button"
      >
        <div className="elibrary-book-card__cover">
          <BookCover book={book} />
          <span className="elibrary-book-card__format">{book.format}</span>
          {book.seriesNumber != null && (
            <span className="elibrary-book-card__volume">
              Vol. {book.seriesNumber}
            </span>
          )}
        </div>
        <div className="elibrary-book-card__copy">
          <span>{book.category?.trim() || 'Open collection'}</span>
          <h3>{book.title}</h3>
          <p>{book.author || 'Unknown author'}</p>
        </div>
      </button>
    </article>
  );

  return (
    <div className="elibrary-catalog-page elibrary-workspace">
      <header className="library-heading">
        <div><p>MRLC / Reading room</p><h1>E-library</h1><span>Find your next read. Keep your place in the books you love.</span></div>
        <div className="library-totals" aria-label="Library summary"><strong>{loading ? '—' : ebooks.length}<span>books</span></strong><strong>{loading ? '—' : genreGroups.length}<span>collections</span></strong><strong>{loading ? '—' : formatCount}<span>formats</span></strong></div>
      </header>

      {canManage && (
        <nav className="elibrary-staff-rail" aria-label="E-Library management">
          <div><span>Staff desk</span><strong>Curate the collection</strong></div>
          <div className="elibrary-staff-rail__actions">
            <Link to="/elibrary/analytics"><BarChart3 /> Reading analytics</Link>
            <Link to="/elibrary/gutenberg"><BookMarked /> Gutenberg</Link>
            <Link to="/elibrary/upload" className="is-primary"><Plus /> Upload book</Link>
          </div>
        </nav>
      )}

      {!selectedGroup && !query.trim() && continueReading.length > 0 && (
        <div className="elibrary-continue" aria-labelledby="continue-reading-heading">
          <div className="elibrary-section-heading">
            <p>Your reading</p>
            <h2 id="continue-reading-heading">Continue reading</h2>
            <span>{continueReading.length} {continueReading.length === 1 ? 'book' : 'books'} in progress</span>
          </div>
          <div className="elibrary-continue__rail custom-scrollbar">
            {continueReading.map((progress) => (
              <button
                key={progress.ebook.id}
                type="button"
                onClick={() => navigate(`/elibrary/${progress.ebook.id}/read`)}
                className="elibrary-continue-card"
              >
                <div className="elibrary-continue-card__cover">
                  {progress.ebook.coverUrl ? <img src={progress.ebook.coverUrl} alt="" /> : <BookMarked />}
                </div>
                <div className="elibrary-continue-card__copy">
                  <span>Resume</span>
                  <strong>{progress.ebook.title}</strong>
                  <small>{progress.ebook.author || progress.ebook.format}</small>
                  {progress.percent != null && (
                    <div className="elibrary-reading-progress" aria-label={`${Math.round(progress.percent)}% complete`}>
                      <i style={{ width: `${Math.min(100, Math.max(3, progress.percent))}%` }} />
                      <em>{Math.round(progress.percent)}%</em>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="elibrary-search-panel">
        <div>
          <h2>Explore the library</h2><p className="library-search-caption">Search by title, author, subject or language.</p>
        </div>
        <div className="elibrary-search-panel__controls">
          <label className="elibrary-search-field" htmlFor="elibrary-global-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search all books</span>
            <Input
              id="elibrary-global-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={selectedGroup ? `Search ${selectedGroup.genre}…` : "Search all books…"}
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear library search"><X /></button>
            )}
          </label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortValue)}>
            <SelectTrigger aria-label="Sort books">
              <div><ArrowUpDown /><SelectValue /></div>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!loading && !loadError && ebooks.length > 0 && (
        <nav className="library-collections" aria-label="Book collections">
          <button type="button" aria-pressed={!selectedGroup} onClick={() => { setSelectedGenreKey(null); setExpandedSeries(new Set()); }}>All books <span>{ebooks.length}</span></button>
          {genreGroups.map(group => <button key={group.key} type="button" aria-pressed={group.key === selectedGenreKey} onClick={() => selectGenre(group.key)}>{group.genre}<span>{group.books.length}</span></button>)}
        </nav>
      )}

      {loading ? (
        <div className="elibrary-state" role="status"><BookOpen /> Loading your library…</div>
      ) : loadError ? (
        <div className="elibrary-state is-error" role="alert">
          <BookOpen /><strong>The shelves are temporarily unavailable.</strong><p>{loadError}</p>
          <Button variant="outline" onClick={() => void load()}>Try again</Button>
        </div>
      ) : ebooks.length === 0 ? (
        <div className="elibrary-state">
          <BookOpen /><strong>Your library starts here.</strong>
          {canManage && <p>Upload a PDF, EPUB, CBR, or CBZ file to begin the school collection.</p>}
        </div>
      ) : query.trim() && !selectedGroup ? (
        <div className="elibrary-sheet" aria-labelledby="search-results-heading">
          <div className="elibrary-sheet__heading">
            <div><p>Search index</p><h2 id="search-results-heading">Results for “{query.trim()}”</h2></div>
            <span aria-live="polite">{searchBooks.length} {searchBooks.length === 1 ? 'title' : 'titles'}</span>
          </div>
          {searchBooks.length > 0 ? (
            <><div className="elibrary-book-grid">{searchBooks.slice(0, visibleLimit).map(renderBookTile)}</div>{searchBooks.length > visibleLimit && <div className="library-more"><Button variant="outline" onClick={() => setVisibleLimit(limit => limit + 24)}>Show more books ({searchBooks.length - visibleLimit} remaining)</Button></div>}</>
          ) : (
            <div className="elibrary-state is-compact"><Search /><strong>No matching books.</strong><p>Try a title, author, genre, series, or language.</p><Button variant="link" onClick={() => setQuery('')}>Clear search</Button></div>
          )}
        </div>
      ) : !selectedGroup ? (
        <section className="elibrary-sheet" aria-labelledby="browse-genres-heading">
          <div className="elibrary-sheet__heading"><div><p>The collection</p><h2 id="browse-genres-heading">All books</h2></div><span>{ebooks.length} titles</span></div>
          <><div className="elibrary-book-grid">{searchBooks.slice(0, visibleLimit).map(renderBookTile)}</div>{searchBooks.length > visibleLimit && <div className="library-more"><Button variant="outline" onClick={() => setVisibleLimit(limit => limit + 24)}>Show more books ({searchBooks.length - visibleLimit} remaining)</Button></div>}</>
        </section>
      ) : (
        <div className="elibrary-sheet" aria-labelledby="selected-genre-heading">
          <div className="elibrary-shelf-heading">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="elibrary-back-button" onClick={returnToGenres}><ChevronLeft /> All collections</button>
              <div className="elibrary-shelf-heading__icon"><LibraryBig /></div>
              <div className="min-w-0">
                <p>Open collection</p>
                <h2 id="selected-genre-heading">{selectedGroup.genre}</h2>
                <span>{selectedGroup.books.length} {selectedGroup.books.length === 1 ? 'title' : 'titles'}</span>
              </div>
            </div>
          </div>

          {shelfBooks.length === 0 ? (
            <div className="elibrary-state is-compact"><Search /><strong>No books match “{query}”.</strong><Button variant="link" onClick={() => setQuery('')}>Clear search</Button></div>
          ) : (
            <div className="elibrary-shelf-content">
              {shelfGroups.series.map((series) => {
                const seriesKey = `${selectedGroup.key}::${series.key}`;
                const expanded = expandedSeries.has(seriesKey);
                const authors = Array.from(new Set(series.books.map((book) => book.author).filter(Boolean)));
                return (
                  <div key={seriesKey} className="elibrary-series">
                    <button
                      type="button"
                      onClick={() => toggleSeries(seriesKey)}
                      aria-expanded={expanded}
                      className="elibrary-series__trigger"
                    >
                      <div className="elibrary-series__covers" aria-hidden="true">
                        {series.books.slice(0, 3).map((book, index) => (
                          <div key={book.id} style={{ left: `${index * 14}px`, zIndex: 3 - index }}>
                            <BookCover book={book} />
                          </div>
                        ))}
                      </div>
                      <div className="elibrary-series__copy">
                        <span>Series · {series.books.length} {series.books.length === 1 ? 'volume' : 'volumes'}</span>
                        <h3>{series.name}</h3>
                        <p>{authors.join(', ') || 'Unknown author'}</p>
                      </div>
                      {expanded ? <ChevronDown /> : <ChevronRight />}
                    </button>
                    {expanded && (
                      <div className="elibrary-book-grid is-series">{series.books.map(renderBookTile)}</div>
                    )}
                  </div>
                );
              })}

              {shelfGroups.standalone.length > 0 && (
                <div className="elibrary-individual-books">
                  {shelfGroups.series.length > 0 && <h3>Individual titles</h3>}
                  <div className="elibrary-book-grid">{shelfGroups.standalone.map(renderBookTile)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={Boolean(selectedBook)} onOpenChange={(open) => { if (!open) setSelectedBook(null); }}>
        {selectedBook && (
          <DialogContent className="elibrary-book-dialog library-details max-h-[90dvh] max-w-4xl overflow-y-auto p-0 sm:max-w-4xl" showCloseButton>
            <div className="elibrary-book-dialog__grid">
              <div className="elibrary-book-dialog__cover">
                <BookCover book={selectedBook} className="library-detail-cover" />
              </div>
              <div className="elibrary-book-dialog__copy">
                <div className="elibrary-book-dialog__eyebrow">
                  <Badge>{selectedBook.format}</Badge>
                  <span>{selectedBook.category?.trim() || 'Open collection'}</span>
                  {selectedBook.seriesName && (
                    <Badge variant="outline">{selectedBook.seriesName}{selectedBook.seriesNumber != null ? ` · Vol. ${selectedBook.seriesNumber}` : ''}</Badge>
                  )}
                </div>
                <DialogTitle>{selectedBook.title}</DialogTitle>
                <p className="elibrary-book-dialog__author">{selectedBook.author || 'Unknown author'}</p>
                <DialogDescription>
                  {selectedBook.description?.trim() || 'No description is available for this book yet.'}
                </DialogDescription>
                <dl className="elibrary-book-dialog__facts">
                  {selectedBook.language && <div><dt>Language</dt><dd>{selectedBook.language}</dd></div>}
                  {selectedBook.fileSize && <div><dt>File size</dt><dd>{fmtSize(selectedBook.fileSize)}</dd></div>}
                  <div><dt>Access</dt><dd>{selectedBook.downloadAllowed ? 'Read + download' : 'Read online only'}</dd></div>
                </dl>
                <div className="elibrary-book-dialog__actions">
                  <Button onClick={() => navigate(`/elibrary/${selectedBook.id}/read`)}>
                    <BookOpen className="mr-2 h-5 w-5" /> Read now
                  </Button>
                  {selectedBook.downloadAllowed && (
                    <Button variant="outline" disabled={downloadingId === selectedBook.id} onClick={() => handleDownload(selectedBook)}>
                      <Download className="mr-2 h-5 w-5" /> {downloadingId === selectedBook.id ? 'Downloading…' : 'Download'}
                    </Button>
                  )}
                </div>
                {(canAssignHomework || canManage) && (
                  <div className="elibrary-book-dialog__staff-actions">
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
