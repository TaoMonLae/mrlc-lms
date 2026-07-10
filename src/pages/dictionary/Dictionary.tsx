import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookA, Search, Loader2, Shuffle, X, Volume2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DictionaryEntry {
  pos: string;
  posLabel: string;
  lemma: string;
  definition: string;
  examples: string[];
  synonyms: string[];
}

interface Translation {
  pos: string | null;
  definition: string;
}

interface MonDefinitionOut {
  lang: string;
  pos: string | null;
  definition: string;
  example: string | null;
}

interface MonWordResult {
  word: string;
  ipa: string | null;
  thaiGloss: string | null;
  definitions: MonDefinitionOut[];
}

interface LookupResult {
  word: string;
  entries: DictionaryEntry[];
  translations: Translation[];
  monMatches: MonWordResult[];
}

const MON_LANG_LABEL: Record<string, string> = { eng: 'English', mya: 'Myanmar', tha: 'Thai' };
const MYANMAR_SCRIPT_RE = /[က-႟]/;

const RECENTS_KEY = 'dictionary_recent_searches';
const MAX_RECENTS = 10;

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((word): word is string => typeof word === 'string' && word.trim().length > 0)
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function saveRecent(word: string) {
  try {
    const list = loadRecents().filter((w) => w.toLowerCase() !== word.toLowerCase());
    list.unshift(word);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
  } catch {
    // localStorage unavailable — recents just won't persist.
  }
}

function speak(word: string) {
  try {
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch {
    // Speech synthesis not available in this browser — silently no-op.
  }
}

export default function Dictionary() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>([]);
  const [wordOfDay, setWordOfDay] = useState<LookupResult | null>(null);
  const [loadingWotd, setLoadingWotd] = useState(true);
  const [lookupWord, setLookupWord] = useState('');
  const lookupController = useRef<AbortController | null>(null);
  const randomController = useRef<AbortController | null>(null);

  useEffect(() => {
    setRecents(loadRecents());
    fetchRandom();
    return () => {
      lookupController.current?.abort();
      randomController.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRandom = async () => {
    randomController.current?.abort();
    const controller = new AbortController();
    randomController.current = controller;
    setLoadingWotd(true);
    try {
      // Dictionary is public — no sign-in required — so no auth header here.
      const res = await fetch('/api/dictionary/random', { signal: controller.signal });
      if (res.ok) setWordOfDay(await res.json());
    } catch {
      // Non-critical — the word-of-the-day card just won't show.
    } finally {
      if (!controller.signal.aborted) setLoadingWotd(false);
    }
  };

  const lookup = async (raw: string) => {
    const word = raw.trim();
    if (!word) return;
    lookupController.current?.abort();
    const controller = new AbortController();
    lookupController.current = controller;
    setLoading(true);
    setLookupWord(word);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`, { signal: controller.signal });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Word not found.');
      }
      const data: LookupResult = await res.json();
      setResult(data);
      setQuery(data.word);
      saveRecent(data.word);
      setRecents(loadRecents());
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message || 'Word not found.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(query);
  };

  const clearRecents = () => {
    try {
      localStorage.removeItem(RECENTS_KEY);
    } catch {
      // localStorage unavailable — clear the in-memory list only.
    }
    setRecents([]);
  };

  const renderEntries = (data: LookupResult) => {
    const groups = new Map<string, DictionaryEntry[]>();
    for (const e of data.entries) {
      const key = e.posLabel;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{data.word}</h2>
          {data.entries.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Pronounce" onClick={() => speak(data.word)}>
              <Volume2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {data.translations.length > 0 && (
          <div className="space-y-2 rounded-lg bg-accent-purple/5 border border-accent-purple/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-purple">Myanmar Translation (မြန်မာဘာသာပြန်)</p>
            <ul className="space-y-1.5">
              {data.translations.map((t, i) => (
                <li key={i} className="text-sm text-slate-700 dark:text-slate-200 flex items-baseline gap-2">
                  {t.pos && <span className="text-[10px] font-medium text-slate-400 shrink-0">{t.pos}</span>}
                  <span>{t.definition}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.monMatches.length > 0 && (
          <div className="space-y-3 rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Mon Dictionary (ဘာသာမန်)</p>
            <div className="space-y-4">
              {data.monMatches.map((m, i) => (
                <div key={i} className={i > 0 ? 'pt-3 border-t border-amber-500/10' : ''}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-semibold text-slate-900 dark:text-white">{m.word}</span>
                    {m.ipa && <span className="text-xs text-slate-400">/{m.ipa}/</span>}
                    {m.thaiGloss && <span className="text-xs text-slate-400">· {m.thaiGloss}</span>}
                  </div>
                  <ul className="mt-1 space-y-1">
                    {m.definitions.map((d, j) => (
                      <li key={j} className="text-sm text-slate-700 dark:text-slate-200 flex items-baseline gap-2">
                        <span className="text-[10px] font-medium text-slate-400 shrink-0 w-14">{MON_LANG_LABEL[d.lang] || d.lang}</span>
                        <span>
                          {d.definition}
                          {d.example && (
                            <details className="mt-1 text-xs text-slate-500">
                              <summary className="cursor-pointer select-none italic hover:text-slate-700 dark:hover:text-slate-300">Example</summary>
                              <p className="mt-1 italic">{d.example}</p>
                            </details>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        {Array.from(groups.entries()).map(([posLabel, entries]) => (
          <div key={posLabel} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{posLabel}</p>
            <ol className="space-y-3 list-decimal list-inside marker:text-slate-400 marker:text-sm">
              {entries.map((e, i) => (
                <li key={i} className="text-sm text-slate-700 dark:text-slate-200">
                  {e.definition}
                  {e.examples.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-5">
                      {e.examples.map((ex, j) => (
                        <li key={j} className="text-xs text-slate-500 italic">“{ex}”</li>
                      ))}
                    </ul>
                  )}
                  {e.synonyms.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {e.synonyms.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => lookup(s.replace(/_/g, ' '))}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-surface-raised text-slate-500 hover:text-primary hover:underline transition-colors"
                        >
                          {s.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    );
  };

  // This page is public (no sign-in required), so it isn't nested inside the
  // app's authenticated layout/sidebar — it renders standalone with its own
  // minimal header instead.
  const isSignedIn = typeof window !== 'undefined' && !!sessionStorage.getItem('auth_token');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-canvas">
      <header className="border-b border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <BookA className="h-5 w-5 text-accent-purple" /> Dictionary
          </Link>
          <Link
            to={isSignedIn ? '/dashboard' : '/login'}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {isSignedIn ? 'Back to Dashboard' : 'Log in'}
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-6 py-6 pb-10">
      <div>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Look up any English word — definitions, examples, synonyms, and Myanmar/Mon translations — or paste a Mon word directly. Free to use, no sign-in required.</p>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type an English word, or paste a Mon word…"
            className="pl-9"
            aria-label="Dictionary search"
            spellCheck={false}
            autoFocus
          />
        </div>
        <Button type="submit" disabled={loading || !query.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      {recents.length > 0 && !result && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">Recent:</span>
          {recents.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => lookup(w)}
              className="text-xs px-2 py-1 rounded-full border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo text-slate-600 dark:text-slate-300 hover:border-primary/50 transition-colors"
            >
              {w}
            </button>
          ))}
          <button type="button" onClick={clearRecents} className="text-slate-400 hover:text-slate-600 ml-1" title="Clear recent searches" aria-label="Clear recent searches">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-lg p-6 min-h-[240px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500 py-10">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Looking up “{lookupWord}”…
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{error}</p>
            <p className="text-xs text-slate-500 mt-1">
              {MYANMAR_SCRIPT_RE.test(lookupWord)
                ? 'Check the spelling of the Mon word, or try a shorter part of it.'
                : 'Check the spelling, or try a simpler form of the word (e.g. "run" instead of "running").'}
            </p>
          </div>
        ) : result ? (
          renderEntries(result)
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Featured Word</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Another word" onClick={fetchRandom} disabled={loadingWotd}>
                <Shuffle className="h-3.5 w-3.5" />
              </Button>
            </div>
            {loadingWotd ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : wordOfDay ? (
              <div>
                {renderEntries(wordOfDay)}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-10">Search for a word above to get started.</p>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
