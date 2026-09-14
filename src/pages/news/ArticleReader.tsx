import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router";
import {
  ArrowLeft,
  ExternalLink,
  Newspaper,
  Clock,
  ClipboardList,
  BookA,
  Loader2,
  Volume2,
  X,
} from "lucide-react";
import { NewsImage, newsDate } from "./NewsPresentation";
import "./news.css";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiGet } from "@/src/lib/api";
import { usePermissions } from "@/src/lib/permissions";
import { homeworkPrefillFor } from "@/src/lib/newsHomeworkPrefill";
import { toast } from "sonner";

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

interface DictionaryEntry {
  posLabel: string;
  definition: string;
  examples: string[];
}
interface Translation {
  definition: string;
}
interface MonDefinition {
  lang: string;
  definition: string;
}
interface MonWord {
  word: string;
  definitions: MonDefinition[];
}
interface LookupResult {
  word: string;
  entries: DictionaryEntry[];
  translations: Translation[];
  monMatches: MonWord[];
}

const MON_LANG_LABEL: Record<string, string> = {
  eng: "English",
  mya: "Myanmar",
  tha: "Thai",
};
const MYANMAR_SCRIPT_RE = /[က-႟]/;

function selectedLookupWord(selected: string): string | null {
  const text = selected.trim();
  if (!text) return null;
  if (MYANMAR_SCRIPT_RE.test(text)) return text.slice(0, 60);
  return text.match(/[A-Za-z][A-Za-z'-]*/)?.[0] || null;
}

function NewsDefinitionDialog({
  word,
  onClose,
}: {
  word: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Word not found.");
        }
        return res.json() as Promise<LookupResult>;
      })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "Word not found.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [word]);

  const pronounce = () => {
    try {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      /* Speech synthesis is optional. */
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookA className="h-4 w-4 text-accent-purple" /> {word}
            {result?.entries.length ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Pronounce"
                onClick={pronounce}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-slate-500">{error}</p>
        ) : result ? (
          <div className="space-y-4">
            {result.translations.length > 0 && (
              <section className="rounded-lg border border-accent-purple/10 bg-accent-purple/5 p-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-accent-purple">
                  Myanmar
                </p>
                {result.translations.map((item, index) => (
                  <p
                    key={index}
                    className="text-sm text-slate-700 dark:text-slate-200"
                  >
                    {item.definition}
                  </p>
                ))}
              </section>
            )}
            {result.monMatches.length > 0 && (
              <section className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Mon
                </p>
                {result.monMatches.slice(0, 3).map((match, index) => (
                  <div key={index} className="mb-2 last:mb-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {match.word}
                    </p>
                    {match.definitions
                      .slice(0, 2)
                      .map((definition, definitionIndex) => (
                        <p
                          key={definitionIndex}
                          className="text-xs text-slate-600 dark:text-slate-300"
                        >
                          <span className="text-slate-400">
                            {MON_LANG_LABEL[definition.lang] || definition.lang}
                            :{" "}
                          </span>
                          {definition.definition}
                        </p>
                      ))}
                  </div>
                ))}
              </section>
            )}
            {result.entries.length > 0 && (
              <ol className="list-inside list-decimal space-y-2.5 marker:text-slate-400">
                {result.entries.slice(0, 6).map((entry, index) => (
                  <li
                    key={index}
                    className="text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span className="mr-1 text-[10px] text-slate-400">
                      {entry.posLabel}
                    </span>
                    {entry.definition}
                  </li>
                ))}
              </ol>
            )}
            <Link
              to={`/dictionary?word=${encodeURIComponent(word)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block pt-1 text-xs text-primary hover:underline"
            >
              Open full Dictionary →
            </Link>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ArticleReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isTeacher, isAdmin } = usePermissions();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [defineWord, setDefineWord] = useState<string | null>(null);
  const [textSize, setTextSize] = useState(19);

  // Get the category from navigation state, default to 'ALL' if not provided
  const fromCategory =
    (location.state as { fromCategory?: string })?.fromCategory || "ALL";

  const requestedReturn = (location.state as { returnTo?: string })?.returnTo;
  const returnTo =
    requestedReturn && /^\/news(?:\?|$)/.test(requestedReturn)
      ? requestedReturn
      : "/news";

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setArticle(null);
    setSelectedText(null);
    setDefineWord(null);
    apiGet<ArticleDetail>(`/api/news/${id}`)
      .then((data) => {
        if (!cancelled) setArticle(data);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Article not found");
          navigate("/news");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
  const safeContent = article.content
    ? DOMPurify.sanitize(article.content)
    : null;
  const lookupWord = selectedText ? selectedLookupWord(selectedText) : null;
  const captureSelection = () => {
    const selected = window.getSelection()?.toString().trim() || "";
    setSelectedText(selected || null);
  };
  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelectedText(null);
  };

  return (
    <div className="news-page news-reader">
      <nav className="news-reader-nav" aria-label="Article navigation">
        <Link to={returnTo} state={{ fromCategory }}>
          <ArrowLeft size={16} />
          Back to news
        </Link>
        <span>MRLC / Newsroom</span>
        <a href={article.link} target="_blank" rel="noopener noreferrer">
          Original source
          <ExternalLink size={14} />
        </a>
      </nav>
      <article>
        <header className="news-reader-header">
          <p className="news-eyebrow">
            {article.source.category || "From the news desk"}
            <span>{safeContent ? "Full article" : "News summary"}</span>
          </p>
          <h1 className="news-headline">{article.title}</h1>
          <div className="news-reader-byline">
            <strong>{article.source.name}</strong>
            {article.author && <span>By {article.author}</span>}
            <time dateTime={dateLabel}>
              <Clock size={13} />
              {newsDate(dateLabel)}
            </time>
          </div>
        </header>
        {article.imageUrl && (
          <div className="news-reader-photo">
            <NewsImage
              key={article.imageUrl}
              src={article.imageUrl}
              source={article.source.name}
              priority
            />
            <p>Image from {article.source.name}</p>
          </div>
        )}
        <div className="news-reader-columns">
          <aside className="news-study-desk" aria-label="Reading tools">
            <p className="news-eyebrow">Your reading desk</p>
            <div className="news-text-size">
              <span>Text size</span>
              <div>
                <button
                  type="button"
                  disabled={textSize <= 17}
                  aria-label="Decrease article text size"
                  onClick={() => setTextSize((size) => Math.max(17, size - 2))}
                >
                  A−
                </button>
                <button
                  type="button"
                  disabled={textSize >= 25}
                  aria-label="Increase article text size"
                  onClick={() => setTextSize((size) => Math.min(25, size + 2))}
                >
                  A+
                </button>
              </div>
            </div>
            <BookA size={23} />
            <h2>A word worth knowing?</h2>
            <p>
              Select a word in the article to look up its meaning in the
              dictionary.
            </p>
            <Link to="/dictionary">
              Open dictionary
              <ExternalLink size={13} />
            </Link>
            {(isTeacher || isAdmin) && (
              <button
                type="button"
                className="news-action"
                onClick={() =>
                  navigate("/teacher/homework", {
                    state: { prefill: homeworkPrefillFor(article) },
                  })
                }
              >
                <ClipboardList size={16} />
                Assign as homework
              </button>
            )}
          </aside>
          <div
            className="news-reader-body"
            style={
              { "--news-reading-size": `${textSize}px` } as React.CSSProperties
            }
          >
            <div
              onMouseUp={captureSelection}
              onTouchEnd={captureSelection}
              onKeyUp={captureSelection}
            >
              {safeContent ? (
                <div
                  className="news-prose"
                  dangerouslySetInnerHTML={{ __html: safeContent }}
                />
              ) : (
                <>
                  {article.summary && (
                    <p className="news-prose news-summary">{article.summary}</p>
                  )}
                  <div className="news-source-notice">
                    <p className="news-eyebrow">Continue at the source</p>
                    <h2>There’s more to this story.</h2>
                    <p>
                      {article.source.name} shares a summary in its feed. Read
                      the complete article on the publisher’s website.
                    </p>
                    <a
                      className="news-action"
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Read at {article.source.name}
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </>
              )}
            </div>
            <footer className="news-reader-credit">
              <Newspaper size={18} />
              <div>
                <p>
                  Originally published by{" "}
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {article.source.name}
                    <ExternalLink size={12} />
                  </a>
                </p>
                <span>
                  {newsDate(dateLabel)} · Content belongs to its original
                  publisher.
                </span>
              </div>
            </footer>
          </div>
        </div>
      </article>
      {selectedText && (
        <div
          className="news-selection"
          role="region"
          aria-label="Selected text tools"
        >
          <p>“{selectedText}”</p>
          <div>
            {lookupWord && (
              <button
                className="news-action"
                onClick={() => setDefineWord(lookupWord)}
              >
                <BookA size={15} />
                Define
              </button>
            )}
            <button aria-label="Clear selection" onClick={clearSelection}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}
      <Link
        className="news-reader-return"
        to={returnTo}
        state={{ fromCategory }}
      >
        <ArrowLeft size={16} />
        Return to the news desk
      </Link>
      {defineWord && (
        <NewsDefinitionDialog
          word={defineWord}
          onClose={() => {
            setDefineWord(null);
            clearSelection();
          }}
        />
      )}
    </div>
  );
}
