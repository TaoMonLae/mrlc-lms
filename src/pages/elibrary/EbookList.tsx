import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookMarked, Search, Filter, Plus, BookOpen, Download, Pencil, Trash2, Lock } from 'lucide-react';
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

function fmtSize(bytes?: number | null) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function EbookList() {
  const navigate = useNavigate();
  const { user } = useUser();
  const canManage = user?.role === 'ADMIN' || user?.role === 'TEACHER' || user?.role === 'LIBRARIAN';

  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('All');

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

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ebooks.filter((b) => {
      const matchesQ = !q || [b.title, b.author, b.category].filter(Boolean).some((f) => String(f).toLowerCase().includes(q));
      const matchesFmt = formatFilter === 'All' || b.format === formatFilter;
      return matchesQ && matchesFmt;
    });
  }, [ebooks, query, formatFilter]);

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
      </div>

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
