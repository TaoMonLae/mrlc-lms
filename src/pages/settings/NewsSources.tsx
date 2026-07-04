import React, { useEffect, useState } from 'react';
import { Rss, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet, apiSend } from '@/src/lib/api';
import { toast } from 'sonner';

interface NewsSource {
  id: string;
  name: string;
  feedUrl: string;
  category: string | null;
  enabled: boolean;
  lastFetchedAt: string | null;
  lastError: string | null;
  _count: { articles: number };
}

export default function NewsSources() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', feedUrl: '', category: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setSources(await apiGet<NewsSource[]>('/api/news-sources'));
    } catch {
      toast.error('Failed to load news sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.feedUrl.trim()) { toast.error('Name and feed URL are required'); return; }
    setSaving(true);
    try {
      await apiSend('/api/news-sources', 'POST', {
        name: form.name.trim(),
        feedUrl: form.feedUrl.trim(),
        category: form.category.trim() || undefined,
      });
      toast.success('Source added — fetching its articles now');
      setForm({ name: '', feedUrl: '', category: '' });
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add source');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (source: NewsSource) => {
    try {
      await apiSend(`/api/news-sources/${source.id}`, 'PUT', { enabled: !source.enabled });
      setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, enabled: !s.enabled } : s)));
    } catch (e: any) {
      toast.error(e.message || 'Failed to update source');
    }
  };

  const handleDelete = async (source: NewsSource) => {
    if (!confirm(`Remove "${source.name}"? Its ${source._count.articles} cached article(s) will also be deleted.`)) return;
    try {
      await apiSend(`/api/news-sources/${source.id}`, 'DELETE');
      setSources((prev) => prev.filter((s) => s.id !== source.id));
      toast.success('Source removed');
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove source');
    }
  };

  const handleRefresh = async (source: NewsSource) => {
    setRefreshingId(source.id);
    try {
      const result = await apiSend<{ ok: boolean; count: number; error?: string }>(`/api/news-sources/${source.id}/refresh`, 'POST');
      if (result.ok) toast.success(`Fetched ${result.count} article(s) from ${source.name}`);
      else toast.error(result.error || 'Fetch failed');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Refresh failed');
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Rss className="h-5 w-5" /> News Sources
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          RSS feeds the daily digest pulls headlines from. Only the headline, a short excerpt, and a link back
          to the original article are stored — students read the full piece at the source.
        </p>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-surface-raised/30 p-4 rounded-xl border border-slate-200 dark:border-surface-raised">
        <div className="space-y-1.5">
          <Label htmlFor="src-name">Name</Label>
          <Input id="src-name" placeholder="e.g. BBC World News" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="src-url">RSS Feed URL</Label>
          <Input id="src-url" placeholder="https://example.com/rss.xml" value={form.feedUrl} onChange={(e) => setForm((f) => ({ ...f, feedUrl: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="src-cat">Category (optional)</Label>
          <div className="flex gap-2">
            <Input id="src-cat" placeholder="World" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            <Button type="submit" disabled={saving} className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>

      <div className="border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-surface-raised">
              <tr>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Articles</th>
                <th className="px-4 py-3 font-semibold">Last Fetched</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && sources.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm italic">No sources yet — add one above.</td></tr>
              )}
              {sources.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-surface-raised/50 hover:bg-slate-50 dark:hover:bg-surface-raised/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white">{s.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[280px]">{s.feedUrl}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.category || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s._count.articles}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {s.lastFetchedAt ? formatDistanceToNow(new Date(s.lastFetchedAt), { addSuffix: true }) : 'never'}
                  </td>
                  <td className="px-4 py-3">
                    {s.lastError ? (
                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400" title={s.lastError}>
                        <AlertCircle className="h-3.5 w-3.5" /> Error
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {s.enabled ? 'OK' : 'Disabled'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => handleRefresh(s)} disabled={refreshingId === s.id}>
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshingId === s.id ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleToggle(s)}>
                        {s.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700" onClick={() => handleDelete(s)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
