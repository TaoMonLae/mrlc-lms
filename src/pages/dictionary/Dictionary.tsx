import React, { useEffect, useState } from 'react';
import { BookA, Search, Loader2, Shuffle, X, Volume2 } from 'lucide-react';
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

interface LookupResult {
  word: string;
  entries: DictionaryEntry[];
  translations: Translation[];
}

const RECENTS_KEY = 'dictionary_recent_searches';
const MAX_RECENTS = 10;

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
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

  useEffect(() => {
    setRecents(loadRecents());
    fetchRandom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRandom = async () => {
    setLoadingWotd(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/dictionary/random', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setWordOfDay(await res.json());
    } catch {
      // Non-critical — the word-of-the-day card just won't show.
    } finally {
      setLoadingWotd(false);
    }
  };

  const lookup = async (raw: string) => {
    const word = raw.trim();
    if (!word) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      setError(e.message || 'Word not found.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(query);
  };

  const clearRecents = () => {
    localStorage.removeItem(RECENTS_KEY);
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
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Pronounce" onClick={() => speak(data.word)}>
            <Volume2 className="h-4 w-4" />
          </Button>
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BookA className="h-6 w-6 text-accent-purple" /> Dictionary
        </h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Look up any English word — definitions, examples, synonyms, and Myanmar translations, no internet required.</p>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a word…"
            className="pl-9"
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
              onClick={() => lookup(w)}
              className="text-xs px-2 py-1 rounded-full border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo text-slate-600 dark:text-slate-300 hover:border-primary/50 transition-colors"
            >
              {w}
            </button>
          ))}
          <button onClick={clearRecents} className="text-slate-400 hover:text-slate-600 ml-1" title="Clear recent searches">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-lg p-6 min-h-[240px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-500 py-10">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Looking up “{query}”…
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{error}</p>
            <p className="text-xs text-slate-500 mt-1">Check the spelling, or try a simpler form of the word (e.g. "run" instead of "running").</p>
          </div>
        ) : result ? (
          renderEntries(result)
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Word of the Day</p>
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
  );
}
