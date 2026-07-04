import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Newspaper, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { apiGet } from '@/src/lib/api';
import { toast } from 'sonner';

interface ArticleDetail {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  link: string;
  imageUrl: string | null;
  author: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  source: { id: string; name: string; category: string | null };
}

export default function ArticleReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiGet<ArticleDetail>(`/api/news/${id}`)
      .then(setArticle)
      .catch(() => { toast.error('Article not found'); navigate('/news'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-500">Loading article...</span>
      </div>
    );
  }

  if (!article) return null;

  const dateLabel = article.publishedAt || article.fetchedAt;
  // Full-article HTML only exists when the source's own feed included it —
  // see news.ts fullContentFrom(). We sanitize before rendering, same as the
  // chat message pattern elsewhere in the app.
  const safeContent = article.content ? DOMPurify.sanitize(article.content) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link to="/news" />} className="rounded-full hover:bg-slate-100 dark:hover:bg-surface-raised">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-aubergine-600" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">News</span>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
        {article.imageUrl && (
          <div className="max-h-80 w-full overflow-hidden bg-slate-100 dark:bg-surface-raised">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.imageUrl} alt="" className="w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        <CardContent className="p-6 md:p-10 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="border-none text-[10px] uppercase tracking-wider font-bold h-5 bg-aubergine-100 text-aubergine-700 dark:bg-aubergine-900/30 dark:text-aubergine-400">
                {article.source.name}
              </Badge>
              {article.source.category && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold h-5 border-slate-300 dark:border-surface-raised">
                  {article.source.category}
                </Badge>
              )}
            </div>
            <h1 className="font-myanmar text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {formatDistanceToNow(new Date(dateLabel), { addSuffix: true })}
              </span>
              {article.author && <span>By {article.author}</span>}
            </div>
          </div>

          {safeContent ? (
            <div
              className={[
                'max-w-none text-slate-700 dark:text-slate-300 leading-relaxed',
                '[&_p]:mb-4 [&_p]:text-base [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-3',
                '[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-2',
                '[&_a]:text-aubergine-600 [&_a]:underline [&_a]:underline-offset-2',
                '[&_img]:rounded-lg [&_img]:my-4 [&_img]:max-w-full',
                '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4',
                '[&_blockquote]:border-l-4 [&_blockquote]:border-aubergine-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500',
              ].join(' ')}
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />
          ) : (
            <div className="space-y-4">
              {article.summary && (
                <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">{article.summary}</p>
              )}
              <div className="flex flex-col gap-3 p-5 bg-slate-50 dark:bg-surface-raised/30 rounded-xl border border-slate-100 dark:border-surface-raised">
                <p className="text-sm text-slate-500">
                  {article.source.name} only shares a summary in its feed — read the full piece at the source.
                </p>
                <Button render={<a href={article.link} target="_blank" rel="noopener noreferrer" />} className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground">
                  Read full article at {article.source.name} <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-surface-raised">
            <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-aubergine-600 flex items-center gap-1.5">
              Originally published by {article.source.name}
              {article.publishedAt && <> · {format(new Date(article.publishedAt), 'MMM d, yyyy')}</>}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      <Link to="/news" className="text-sm font-bold flex items-center gap-2 text-slate-400 hover:text-aubergine-600 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to all news
      </Link>
    </div>
  );
}
