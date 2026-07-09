import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookMarked, Search, Filter, Plus, BookOpen, Download, Pencil, Trash2, Lock, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useUser } from '../../lib/permissions';

export interface Ebook {
  id: string;
  title: string;
  author?: string | null;
  description?: string | null;
  category?: string | null;
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

  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('All');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortValue>('recent');
  const [continueReading, setContinueReading] = useState<ProgressEntry[]>([]);

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
      const matchesQ = !q || [b.title, b.author, b.category].filter(Boolean).some((f) => String(f).toLowerCase().includes(q));
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
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('E-book deleted.');
      setEbooks((prev) => prev.filter((x) => x.id !== b.id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-accent-purple" /> E-Library
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Read EPUB and PDF books online.</p>
        </div>
        {canManage && (
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" render={<Link to="/elibrary/upload" />} nativeButton={false}>
            <Plus className="mr-2 h-4 w-4" /> Upload Book
          </Button>
        )}
      </div>

      {continueReading.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Continue Reading</h2>
          <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-1">
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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, author, category…" className="pl-9" />
        </div>
        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-[150px]">
            <div className="flex items-center gap-2"><Filter className="h-3.5 w-3.5" /><SelectValue /></div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All formats</SelectItem>
            <SelectItem value="PDF">PDF</SelectItem>
            <SelectItem value="EPUB">EPUB</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortValue)}>
          <SelectTrigger className="w-[180px]">
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
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
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
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
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
          {canManage && ebooks.length === 0 && <p className="text-xs text-slate-500 mt-1">Click “Upload Book” to add an EPUB or PDF.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => (
            <div key={b.id} className="group bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="flex gap-4 p-4 flex-1">
                <div className="h-24 w-16 shrink-0 rounded-sm bg-accent-purple/10 border border-slate-100 dark:border-surface-raised flex items-center justify-center overflow-hidden">
                  {b.coverUrl ? <img src={b.coverUrl} alt="" className="h-full w-full object-cover" /> : <BookMarked className="h-7 w-7 text-accent-purple" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-bold">{b.format}</Badge>
                    {!b.downloadAllowed && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><Lock className="h-3 w-3" /> Read only</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 mt-1 leading-tight">{b.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{b.author || '—'}{b.fileSize ? ` · ${fmtSize(b.fileSize)}` : ''}</p>
                  {b.category && <p className="text-[10px] text-slate-400 mt-0.5">{b.category}</p>}
                </div>
              </div>
              <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => navigate(`/elibrary/${b.id}/read`)}>
                  <BookOpen className="mr-2 h-4 w-4" /> Read
                </Button>
                {b.downloadAllowed && (
                  <Button variant="outline" size="icon" title="Download" onClick={() => handleDownload(b)}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {canManage && (
                  <>
                    <Button variant="outline" size="icon" title="Edit" render={<Link to={`/elibrary/${b.id}/edit`} />} nativeButton={false}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" title="Delete" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(b)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
