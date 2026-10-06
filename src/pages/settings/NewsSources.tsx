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
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setSources(await apiGet<NewsSource[]>('/api/news-sources'));
    } catch {
      setLoadError(true);
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
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Rss className="h-5 w-5" /> News Sources
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the RSS feeds used by News. Articles include a headline, summary, and source link.
          Students can read the full article here when the publisher includes it in the feed.
        </p>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/50 p-4 rounded-sm border border-border">
        <div className="space-y-1.5">
          <Label htmlFor="src-name">Name</Label>
          <Input id="src-name" required placeholder="e.g. BBC World News" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="src-url">RSS Feed URL</Label>
          <Input id="src-url" type="url" required placeholder="https://example.com/rss.xml" value={form.feedUrl} onChange={(e) => setForm((f) => ({ ...f, feedUrl: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="src-cat">Category (optional)</Label>
          <div className="flex gap-2">
            <Input id="src-cat" placeholder="World" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            <Button type="submit" disabled={saving} className="shrink-0 min-h-11" aria-label={saving ? 'Adding source' : 'Add source'}>
              <Plus className="h-4 w-4" /> {saving ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      </form>

      {loadError && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
        <p>News sources could not be loaded.</p>
        <Button variant="outline" onClick={load}>Retry loading sources</Button>
      </div>}

      <div className="border border-border rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">News sources and feed status</caption>
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
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
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center" role="status">Loading news sources…</td></tr>}
              {!loading && !loadError && sources.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm italic">No sources yet — add one above.</td></tr>
              )}
              {sources.map((s) => (
                <tr key={s.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{s.name}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-[280px]" title={s.feedUrl}>{s.feedUrl}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.category || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s._count.articles}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.lastFetchedAt ? formatDistanceToNow(new Date(s.lastFetchedAt), { addSuffix: true }) : 'never'}
                  </td>
                  <td className="px-4 py-3">
                    {!s.enabled ? <span className="text-muted-foreground">Disabled</span> : s.lastError ? (
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
                      <Button variant="ghost" size="sm" className="h-11 min-w-11" aria-label={`Refresh ${s.name}`} onClick={() => handleRefresh(s)} disabled={refreshingId !== null}>
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshingId === s.id ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-11 text-sm" aria-label={`${s.enabled ? 'Disable' : 'Enable'} ${s.name}`} onClick={() => handleToggle(s)}>
                        {s.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-11 min-w-11 text-red-600 hover:text-red-700" aria-label={`Remove ${s.name}`} onClick={() => handleDelete(s)}>
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
