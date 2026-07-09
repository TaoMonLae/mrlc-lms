import React, { useEffect, useRef, useState } from 'react';
import { Newspaper, Search, ExternalLink, RefreshCw, Settings2, BookOpenText, ClipboardList } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiSend } from '@/src/lib/api';
import { usePermissions } from '@/src/lib/permissions';
import { homeworkPrefillFor } from '@/src/lib/newsHomeworkPrefill';
import { toast } from 'sonner';

interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  link: string;
  imageUrl: string | null;
  author: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  hasFullContent: boolean;
  source: { id: string; name: string; category: string | null };
}

export default function NewsFeed() {
  const { isAdmin, isTeacher } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Get the category from navigation state, default to 'ALL' if not provided
  const fromCategory = (location.state as { fromCategory?: string })?.fromCategory || 'ALL';
  const [category, setCategory] = useState(fromCategory);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 24;
  // Guards against out-of-order responses -- e.g. clicking "Load more" (page
  // 2) and then immediately switching category (page 1) fires two requests,
  // and without this the slower one could resolve last and clobber state
  // with the wrong page/category mix. Each call captures the sequence number
  // it was issued with; a response only gets applied if it's still the most
  // recently issued request by the time it comes back.
  const requestSeqRef = useRef(0);

  const load = async (nextPage = 1) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage) });
      if (category !== 'ALL') params.set('category', category);
      if (search.trim()) params.set('q', search.trim());
      const res = await apiGet<{ items: NewsArticle[]; total: number }>(`/api/news?${params}`);
      if (seq !== requestSeqRef.current) return; // superseded by a newer request
      if (nextPage === 1) setArticles(res.items);
      else setArticles((prev) => [...prev, ...res.items]);
      setTotal(res.total);
      setPage(nextPage);
    } catch {
      if (seq === requestSeqRef.current) toast.error('Failed to load news');
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    apiGet<string[]>('/api/news/categories').then(setCategories).catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [category]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(1); };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiSend('/api/news/refresh', 'POST');
      toast.success('News refreshed');
      await load(1);
    } catch (e: any) {
      toast.error(e.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const canLoadMore = articles.length < total;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-aubergine-600" />
            News
          </h1>
          <p className="text-sm text-slate-500">
            World headlines, refreshed daily. Articles marked "Full Article" read entirely in-app; others show a
            summary with a credited link to the source.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh now
            </Button>
            <Button variant="outline" size="sm" render={<Link to="/settings/news-sources" />}>
              <Settings2 className="mr-2 h-4 w-4" /> Sources
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 ring-offset-aubergine-600 focus-visible:ring-aubergine-600"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            className="h-10 px-3 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo text-sm focus:ring-2 focus:ring-aubergine-600 outline-none flex-1 md:flex-none min-w-[160px]"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button type="submit" variant="outline">Search</Button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((a) => (
          <Link
            key={a.id}
            to={`/news/${a.id}`}
            state={{ fromCategory: category }}
            className="group bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm hover:shadow-lg hover:border-aubergine-200 dark:hover:border-aubergine-800 hover:-translate-y-1 transition-all duration-200 flex flex-col overflow-hidden"
          >
            {a.imageUrl && (
              <div className="h-40 w-full overflow-hidden bg-slate-100 dark:bg-surface-raised relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.imageUrl} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
              </div>
            )}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge variant="secondary" className="border-none text-[10px] uppercase tracking-wider font-bold h-5 bg-aubergine-100 text-aubergine-700 dark:bg-aubergine-900/30 dark:text-aubergine-400">
                  {a.source.name}
                </Badge>
                {a.source.category && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold h-5 border-slate-300 dark:border-surface-raised">
                    {a.source.category}
                  </Badge>
                )}
                {a.hasFullContent && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold h-5 border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                    <BookOpenText className="h-2.5 w-2.5" /> Full Article
                  </Badge>
                )}
              </div>
              {/* font-myanmar only affects glyphs the custom Khit Haungg
                  face actually covers (Burmese/Mon script) — Latin-script
                  headlines fall through to the sans stack untouched, so
                  this is safe to apply to every title regardless of the
                  source's language. */}
              <h3 className="font-myanmar text-base font-bold text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-aubergine-600 transition-colors">
                {a.title}
              </h3>
              {a.summary && (
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 leading-relaxed flex-1">
                  {a.summary}
                </p>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-surface-raised text-[11px] text-slate-500">
                <span>{a.publishedAt ? formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true }) : formatDistanceToNow(new Date(a.fetchedAt), { addSuffix: true })}</span>
                <span className="flex items-center gap-1 text-aubergine-600 font-medium">
                  {a.hasFullContent ? 'Read in app' : 'Read summary'} <ExternalLink className="h-3 w-3" />
                </span>
              </div>
              {/* Teacher/admin-only — jumps into Homework creation with this
                  article pre-filled as a reading-response assignment. Not
                  restricted to any subject; RLA/Social Studies are just the
                  natural fit. stopPropagation so it doesn't also trigger the
                  card's own Link navigation to the article. */}
              {(isTeacher || isAdmin) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate('/teacher/homework', { state: { prefill: homeworkPrefillFor(a) } });
                  }}
                  className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-surface-raised py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:border-aubergine-300 hover:text-aubergine-600 dark:hover:border-aubergine-800 transition-colors"
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Assign as Homework
                </button>
              )}
            </div>
          </Link>
        ))}

        {loading && articles.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            Loading news...
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-surface-indigo rounded-xl border border-dashed border-slate-300 dark:border-surface-raised">
            <Newspaper className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No articles yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              {isAdmin ? 'Add a news source below, or click "Refresh now" once one is set up.' : 'Check back soon — the daily digest refreshes automatically.'}
            </p>
          </div>
        )}
      </div>

      {canLoadMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => load(page + 1)} disabled={loading}>
            {loading ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
