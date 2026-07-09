import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Search, Loader2, BookMarked, Download, CheckCircle2, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface GutenbergResult {
  gutenbergId: number;
  title: string;
  author: string | null;
  languages: string[];
  subjects: string[];
  category: string;
  downloadCount: number;
  coverUrl: string | null;
  hasEpub: boolean;
}

interface SearchResponse {
  count: number;
  hasNext: boolean;
  results: GutenbergResult[];
}

function authHeaders(token: string | null, json = false) {
  const h: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export default function GutenbergImport() {
  const token = sessionStorage.getItem('auth_token');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GutenbergResult[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [importing, setImporting] = useState<Set<number>>(new Set());
  const [imported, setImported] = useState<Set<number>>(new Set());

  const search = async (nextPage = 1) => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/gutenberg/search?q=${encodeURIComponent(q)}&page=${nextPage}`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Search failed.');
      }
      const data: SearchResponse = await res.json();
      setResults((prev) => (nextPage === 1 ? data.results : [...prev, ...data.results]));
      setCount(data.count);
      setHasNext(data.hasNext);
      setPage(nextPage);
      setSearched(true);
    } catch (e: any) {
      toast.error(e.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(1);
  };

  const importBook = async (book: GutenbergResult) => {
    setImporting((prev) => new Set(prev).add(book.gutenbergId));
    try {
      const res = await fetch('/api/admin/gutenberg/import', {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({ gutenbergId: book.gutenbergId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setImported((prev) => new Set(prev).add(book.gutenbergId));
          toast.message('Already in your library.');
          return;
        }
        throw new Error(err.error || 'Import failed.');
      }
      setImported((prev) => new Set(prev).add(book.gutenbergId));
      toast.success(`"${book.title}" added to the E-Library.`);
    } catch (e: any) {
      toast.error(e.message || 'Import failed.');
    } finally {
      setImporting((prev) => {
        const next = new Set(prev);
        next.delete(book.gutenbergId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" title="Back to E-Library" render={<Link to="/elibrary" />} nativeButton={false}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-accent-purple" /> Import from Project Gutenberg
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">
            Search 70,000+ free, public-domain books and add them to your E-Library with one click.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or author…"
            className="pl-9"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={searching || !query.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {searching && page === 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      {searched && !searching && results.length === 0 && (
        <p className="text-sm text-slate-500 py-6 text-center">No books found for "{query}". Try a different title or author spelling.</p>
      )}

      {count !== null && results.length > 0 && (
        <p className="text-xs text-slate-400">{count.toLocaleString()} result{count === 1 ? '' : 's'} on Project Gutenberg</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((b) => {
          const isImporting = importing.has(b.gutenbergId);
          const isImported = imported.has(b.gutenbergId);
          return (
            <div key={b.gutenbergId} className="flex gap-3 rounded-lg border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo p-3">
              <div className="w-14 h-20 shrink-0 rounded bg-slate-100 dark:bg-surface-raised overflow-hidden flex items-center justify-center">
                {b.coverUrl ? (
                  <img src={b.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1 flex flex-col">
                <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">{b.title}</p>
                {b.author && <p className="text-xs text-slate-500 mt-0.5 truncate">{b.author}</p>}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {b.languages.slice(0, 1).map((l) => (
                    <Badge key={l} variant="outline" className="text-[9px] uppercase">{l}</Badge>
                  ))}
                  {b.subjects.slice(0, 1).map((s) => (
                    <Badge key={s} variant="outline" className="text-[9px] truncate max-w-[100px]">{s}</Badge>
                  ))}
                  <Badge variant="outline" className="text-[9px] truncate max-w-[100px]">{b.category}</Badge>
                </div>
                <div className="mt-auto pt-2">
                  {isImported ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> In library
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" disabled={isImporting} onClick={() => importBook(b)}>
                      {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                      Import
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasNext && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={searching} onClick={() => search(page + 1)}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Load more
          </Button>
        </div>
      )}
    </div>
  );
}
