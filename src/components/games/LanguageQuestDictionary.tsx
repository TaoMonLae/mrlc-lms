import { useEffect, useRef, useState } from 'react';
import { BookA, Loader2, Search, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { languageQuestLookupWord } from '@/shared/languageQuest';

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

interface ChineseWord {
  simplified: string;
  traditional: string;
  pinyin: string;
  definitions: string[];
}

interface LookupResult {
  word: string;
  entries: DictionaryEntry[];
  translations: Translation[];
  monMatches: MonWord[];
  chineseMatches: ChineseWord[];
}

interface SelectionPrompt {
  word: string;
  left: number;
  top: number;
}

const MON_LANGUAGE_LABELS: Record<string, string> = {
  eng: 'English',
  mya: 'Myanmar',
  tha: 'Thai',
};

function pronounce(word: string) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.88;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function LanguageQuestDictionary() {
  const [selectionPrompt, setSelectionPrompt] = useState<SelectionPrompt | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lookupTerm, setLookupTerm] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const captureSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setSelectionPrompt(null);
        return;
      }
      const anchor = selection.anchorNode?.parentElement;
      const focus = selection.focusNode?.parentElement;
      if (
        !anchor?.closest('[data-lq-dictionary-scope]')
        || !focus?.closest('[data-lq-dictionary-scope]')
      ) {
        setSelectionPrompt(null);
        return;
      }
      const word = languageQuestLookupWord(selection.toString());
      if (!word) {
        setSelectionPrompt(null);
        return;
      }
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setSelectionPrompt({
        word,
        left: Math.min(window.innerWidth - 76, Math.max(76, rect.left + rect.width / 2)),
        top: Math.max(62, rect.top - 12),
      });
    };

    const onMouseUp = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('[data-lq-dictionary-action]')) return;
      window.setTimeout(captureSelection, 0);
    };
    const onTouchEnd = () => window.setTimeout(captureSelection, 80);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onTouchEnd);
      controllerRef.current?.abort();
    };
  }, []);

  const lookup = async (raw: string) => {
    const word = languageQuestLookupWord(raw) ?? raw.trim().slice(0, 60);
    if (!word) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLookupTerm(word);
    setQuery(word);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(
        `/api/dictionary/lookup?word=${encodeURIComponent(word)}`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'No dictionary entry was found.');
      }
      setResult(await response.json() as LookupResult);
    } catch (lookupError: any) {
      if (lookupError?.name !== 'AbortError') {
        setError(lookupError?.message || 'No dictionary entry was found.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const openDictionary = (word?: string) => {
    setOpen(true);
    setSelectionPrompt(null);
    window.getSelection()?.removeAllRanges();
    if (word) {
      void lookup(word);
    } else {
      setQuery('');
      setLookupTerm('');
      setResult(null);
      setError(null);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="hidden rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-sky-50 hover:text-sky-700 min-[460px]:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800"
        onClick={() => openDictionary()}
        aria-label="Open dictionary"
        title="Dictionary"
      >
        <BookA className="h-4 w-4" />
      </Button>

      {selectionPrompt && (
        <button
          type="button"
          data-lq-dictionary-action
          className="fixed z-[80] flex -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-full bg-sky-600 px-3 py-2 text-xs font-black text-white shadow-xl shadow-sky-950/25 transition hover:-translate-y-[calc(100%+2px)] hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
          style={{ left: selectionPrompt.left, top: selectionPrompt.top }}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => openDictionary(selectionPrompt.word)}
          aria-label={`Look up ${selectionPrompt.word}`}
        >
          <BookA className="h-3.5 w-3.5" />
          Look up “{selectionPrompt.word}”
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto border-sky-200 bg-white dark:border-sky-500/25 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-950 dark:text-white">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                <BookA className="h-4 w-4" />
              </span>
              Language Quest Dictionary
            </DialogTitle>
          </DialogHeader>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void lookup(query);
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type or highlight a word…"
                aria-label="Dictionary word"
                className="pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </form>

          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Highlight a word anywhere in the lesson, then choose <strong>Look up</strong>.
            Definitions and available Myanmar, Mon, or Chinese translations appear here.
          </p>

          <div className="min-h-36" aria-live="polite">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Looking up “{lookupTerm}”…
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                <p className="font-bold">No result for “{lookupTerm}”.</p>
                <p className="mt-1 text-xs opacity-80">{error}</p>
              </div>
            ) : result ? (
              <div className="space-y-4" data-no-i18n>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">{result.word}</h3>
                  {result.entries.length > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => pronounce(result.word)}
                      aria-label={`Pronounce ${result.word}`}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {result.translations.length > 0 && (
                  <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/20 dark:bg-violet-500/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                      Myanmar translation
                    </p>
                    {result.translations.slice(0, 5).map((translation, index) => (
                      <p key={index} lang="my" className="mt-1 text-sm leading-7 text-slate-800 dark:text-slate-100">
                        {translation.definition}
                      </p>
                    ))}
                  </section>
                )}

                {result.entries.length > 0 && (
                  <ol className="space-y-3">
                    {result.entries.slice(0, 5).map((entry, index) => (
                      <li key={`${entry.posLabel}-${index}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                        <p className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
                          {entry.posLabel}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
                          {entry.definition}
                        </p>
                        {entry.examples[0] && (
                          <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
                            “{entry.examples[0]}”
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}

                {result.chineseMatches.length > 0 && (
                  <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                      Chinese dictionary
                    </p>
                    {result.chineseMatches.slice(0, 3).map((match, index) => (
                      <div key={`${match.simplified}-${index}`} className="mt-2">
                        <p className="flex items-baseline gap-2 font-bold text-slate-900 dark:text-white">
                          <span lang="zh">{match.simplified}</span>
                          {match.traditional !== match.simplified && (
                            <span lang="zh-Hant" className="font-normal text-slate-400">({match.traditional})</span>
                          )}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{match.pinyin}</span>
                        </p>
                        {match.definitions.slice(0, 3).map((definition, definitionIndex) => (
                          <p key={definitionIndex} className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                            {definition}
                          </p>
                        ))}
                      </div>
                    ))}
                  </section>
                )}

                {result.monMatches.length > 0 && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                      Mon dictionary
                    </p>
                    {result.monMatches.slice(0, 3).map((match, index) => (
                      <div key={`${match.word}-${index}`} className="mt-2">
                        <p className="font-bold text-slate-900 dark:text-white">{match.word}</p>
                        {match.definitions.slice(0, 2).map((definition, definitionIndex) => (
                          <p key={definitionIndex} className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400">
                              {MON_LANGUAGE_LABELS[definition.lang] || definition.lang}:{' '}
                            </span>
                            {definition.definition}
                          </p>
                        ))}
                      </div>
                    ))}
                  </section>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/70 px-5 py-8 text-center text-sm text-slate-600 dark:border-sky-500/20 dark:bg-sky-500/5 dark:text-slate-300">
                Search here, or close this window and highlight an unfamiliar word.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
