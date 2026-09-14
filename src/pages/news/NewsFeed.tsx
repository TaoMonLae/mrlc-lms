import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpenText,
  ClipboardList,
  LayoutGrid,
  List,
  Loader2,
  Newspaper,
  RefreshCw,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router";
import AnimatedContent from "@/components/AnimatedContent";
import { apiGet, apiSend } from "@/src/lib/api";
import { usePermissions } from "@/src/lib/permissions";
import { homeworkPrefillFor } from "@/src/lib/newsHomeworkPrefill";
import { NewsImage, newsDate } from "./NewsPresentation";
import { toast } from "sonner";
import "./news.css";

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
  const [params, setParams] = useSearchParams();
  const category =
    params.get("category") ||
    (location.state as { fromCategory?: string })?.fromCategory ||
    "ALL";
  const query = params.get("q") || "";
  const listView = params.get("view") === "list";
  const [search, setSearch] = useState(query);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const requestSeqRef = useRef(0);

  const load = useCallback(
    async (nextPage = 1) => {
      const seq = ++requestSeqRef.current;
      setLoading(true);
      setError(null);
      try {
        const request = new URLSearchParams({ page: String(nextPage) });
        if (category !== "ALL") request.set("category", category);
        if (query) request.set("q", query);
        const res = await apiGet<{ items: NewsArticle[]; total: number }>(
          `/api/news?${request}`,
        );
        if (seq !== requestSeqRef.current) return;
        setArticles((prev) =>
          nextPage === 1
            ? res.items
            : [
                ...prev,
                ...res.items.filter(
                  (item) => !prev.some((old) => old.id === item.id),
                ),
              ],
        );
        setTotal(res.total);
        setPage(nextPage);
      } catch {
        if (seq === requestSeqRef.current)
          setError(
            "The news desk could not load these stories. Please try again.",
          );
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    },
    [category, query],
  );

  useEffect(() => {
    apiGet<string[]>("/api/news/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);
  useEffect(() => {
    setArticles([]);
    setTotal(0);
    setPage(1);
    void load();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [load]);
  useEffect(() => {
    setSearch(query);
  }, [query]);

  const updateFilters = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.set("category", category);
    Object.entries(changes).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setParams(next, { replace: true });
  };
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (search.trim() === query) void load();
    else updateFilters({ q: search.trim() });
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiSend("/api/news/refresh", "POST");
      toast.success("News refreshed");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };
  const returnTo = `/news${params.toString() ? `?${params}` : ""}`;
  const storyLink = (article: NewsArticle) => ({
    to: `/news/${article.id}`,
    state: { fromCategory: category, returnTo },
  });
  const showFrontPage = !query && !listView;
  const lead = showFrontPage ? articles[0] : null;
  const briefs = showFrontPage ? articles.slice(1, 4) : [];
  const archive = showFrontPage ? articles.slice(4) : articles;
  const assign = (article: NewsArticle) =>
    navigate("/teacher/homework", {
      state: { prefill: homeworkPrefillFor(article) },
    });
  const meta = (article: NewsArticle) => (
    <div className="news-story-meta">
      <span>{article.source.name}</span>
      <time dateTime={article.publishedAt || article.fetchedAt}>
        {newsDate(article.publishedAt || article.fetchedAt)}
      </time>
    </div>
  );
  const footer = (article: NewsArticle) => (
    <div className="news-story-footer">
      <span>
        <BookOpenText size={13} />
        {article.hasFullContent ? "Full article in app" : "Summary + source"}
      </span>
      {(isAdmin || isTeacher) && (
        <button
          type="button"
          onClick={() => assign(article)}
          aria-label={`Assign ${article.title} as homework`}
          title="Assign as homework"
        >
          <ClipboardList size={15} />
          <span>Assign</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="news-page">
      <header className="news-masthead">
        <div className="news-edition">
          <span>MRLC / Learning beyond the classroom</span>
          <span>World news · Daily digest</span>
        </div>
        <div className="news-masthead-main">
          <h1>
            Newsroom<span aria-hidden="true">.</span>
          </h1>
          <p>
            A wider world. <br />A better-informed classroom.
          </p>
        </div>
        <div className="news-masthead-bottom">
          <span>Read. Question. Understand.</span>
          {isAdmin && (
            <div className="news-admin-actions">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "Refreshing…" : "Refresh news"}
              </button>
              <Link to="/settings/news-sources">
                <Settings2 size={14} />
                Manage sources
              </Link>
            </div>
          )}
        </div>
      </header>
      <nav className="news-topics" aria-label="News topics">
        {["ALL", ...categories.filter((item) => item !== "ALL")].map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => updateFilters({ category: item })}
          >
            {item === "ALL" ? "All stories" : item}
          </button>
        ))}
      </nav>
      <div className="news-search-bar">
        <form onSubmit={handleSearch}>
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search news articles"
            placeholder="Find a story, an idea, a perspective…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="news-search-submit" type="submit">
            Search
            <ArrowUpRight size={15} />
          </button>
        </form>
        <div
          className="news-view-switch"
          role="group"
          aria-label="Article layout"
        >
          <button
            type="button"
            aria-label="Editorial grid"
            aria-pressed={!listView}
            onClick={() => updateFilters({ view: "" })}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            type="button"
            aria-label="Compact list"
            aria-pressed={listView}
            onClick={() => updateFilters({ view: "list" })}
          >
            <List size={18} />
          </button>
        </div>
      </div>
      {query && (
        <div className="news-query">
          <span>
            Search results for <strong>“{query}”</strong>
          </span>
          <button type="button" onClick={() => updateFilters({ q: "" })}>
            Clear search
            <X size={14} />
          </button>
        </div>
      )}
      <div aria-busy={loading}>
        {loading && !articles.length && (
          <div className="news-state" role="status">
            <Loader2 className="animate-spin" size={25} />
            <h2>Opening the news desk</h2>
            <p>Gathering stories from your school’s sources.</p>
          </div>
        )}
        {error && (
          <div className="news-state" role="alert">
            <Newspaper size={28} />
            <h2>Let’s try that again.</h2>
            <p>{error}</p>
            <button
              type="button"
              className="news-action"
              onClick={() => load()}
            >
              Retry loading
            </button>
          </div>
        )}
        {!loading && !error && !articles.length && (
          <div className="news-state">
            <Search size={28} />
            <h2>
              {query || category !== "ALL"
                ? "No stories in this edition."
                : "The first edition is on its way."}
            </h2>
            <p>
              {query || category !== "ALL"
                ? "Try another topic or a broader search."
                : "Articles will appear here when your school’s sources refresh."}
            </p>
            {query || category !== "ALL" ? (
              <button
                className="news-action"
                onClick={() => updateFilters({ q: "", category: "ALL" })}
              >
                Browse all stories
              </button>
            ) : isAdmin ? (
              <Link className="news-action" to="/settings/news-sources">
                Manage news sources
                <ArrowUpRight size={16} />
              </Link>
            ) : null}
          </div>
        )}
        {lead && (
          <AnimatedContent
            key={`${category}-front`}
            className="news-front"
            distance={14}
            duration={0.45}
            threshold={0}
            container="main"
          >
            <article className="news-lead">
              <div className="news-section-label">
                <span>01 / In focus</span>
                <span>{category === "ALL" ? "Latest edition" : category}</span>
              </div>
              <Link {...storyLink(lead)} className="news-story-link">
                <NewsImage
                  key={lead.imageUrl}
                  src={lead.imageUrl}
                  source={lead.source.name}
                  priority
                />
                {meta(lead)}
                <h2 className="news-headline">{lead.title}</h2>
              </Link>
              {lead.summary && (
                <p className="news-lead-summary">{lead.summary}</p>
              )}
              {footer(lead)}
            </article>
            <aside className="news-briefing" aria-label="More headlines">
              <div className="news-section-label">
                <span>The briefing</span>
                <ArrowDown size={14} />
              </div>
              {briefs.map((article, index) => (
                <article className="news-brief" key={article.id}>
                  <span className="news-brief-number">
                    {String(index + 2).padStart(2, "0")}
                  </span>
                  <div>
                    {meta(article)}
                    <Link {...storyLink(article)}>
                      <h2 className="news-headline">{article.title}</h2>
                    </Link>
                    {footer(article)}
                  </div>
                </article>
              ))}
              <div className="news-reading-note">
                <BookOpenText size={21} />
                <h3>Make room for a new perspective.</h3>
                <p>
                  Open a story, select an unfamiliar word, and use Define to
                  explore its meaning.
                </p>
                <Link to="/dictionary">
                  Explore the dictionary
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </aside>
          </AnimatedContent>
        )}
        {archive.length > 0 && (
          <section
            className="news-archive"
            aria-labelledby="news-archive-title"
          >
            <div className="news-archive-heading">
              <div>
                <p className="news-eyebrow">
                  {showFrontPage ? "02 / Keep exploring" : "The news index"}
                </p>
                <h2 id="news-archive-title">
                  {query
                    ? "Stories matching your search"
                    : category === "ALL"
                      ? "Across the headlines"
                      : `${category} stories`}
                </h2>
              </div>
              <span role="status">
                {articles.length} of {total} stories
              </span>
            </div>
            <div className={`news-stories ${listView ? "is-list" : ""}`}>
              {archive.map((article) => (
                <article className="news-story" key={article.id}>
                  <Link {...storyLink(article)} className="news-story-link">
                    <NewsImage
                      key={article.imageUrl}
                      src={article.imageUrl}
                      source={article.source.name}
                    />
                    <div className="news-story-copy">
                      {meta(article)}
                      <h3 className="news-headline">{article.title}</h3>
                      {article.summary && <p>{article.summary}</p>}
                    </div>
                  </Link>
                  {footer(article)}
                </article>
              ))}
            </div>
          </section>
        )}
        {articles.length < total && (
          <div className="news-load-more">
            <span>
              {articles.length} stories on your desk · {total} available
            </span>
            <button
              type="button"
              className="news-action"
              onClick={() => load(page + 1)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowDown size={16} />
              )}
              {loading ? "Loading stories…" : "Load more stories"}
            </button>
          </div>
        )}
      </div>
      <footer className="news-colophon">
        <strong>MRLC Newsroom</strong>
        <p>
          Stories belong to their original publishers. Full text is shown when
          supplied by the source; otherwise, follow the credited link.
        </p>
      </footer>
    </div>
  );
}
