// Shared tap-to-build word-order UI for REORDER challenges, used by both the
// main lesson quiz (LanguageQuestLesson.tsx) and the mastery/Lightning
// Round/Daily Chain review deck (LanguageQuestMastery.tsx). The learner taps
// bank tiles to append them to their answer, and taps an answer tile to send
// it back to the bank -- no drag-and-drop library needed, which keeps this
// usable on touch devices without extra dependencies.
export interface LanguageQuestReorderOption {
  id: string;
  text: string;
}

interface LanguageQuestReorderTilesProps {
  options: LanguageQuestReorderOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function LanguageQuestReorderTiles({ options, value, onChange, disabled }: LanguageQuestReorderTilesProps) {
  const byId = new Map(options.map((option) => [option.id, option]));
  const chosen = value.map((id) => byId.get(id)).filter((option): option is LanguageQuestReorderOption => Boolean(option));
  const bank = options.filter((option) => !value.includes(option.id));

  return (
    <div className="mt-6 space-y-4">
      <div className="flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-3 dark:border-slate-700">
        {chosen.length === 0 && (
          <span className="px-1 text-sm text-slate-400 dark:text-slate-500">Tap the words below in order…</span>
        )}
        {chosen.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value.filter((id) => id !== option.id))}
            className="rounded-xl border-2 border-violet-500 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-900 transition hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0 dark:bg-violet-500/10 dark:text-violet-100"
          >
            {option.text}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {bank.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange([...value, option.id])}
            className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:-translate-y-0.5 hover:border-violet-300 disabled:cursor-default disabled:hover:translate-y-0 dark:border-slate-700 dark:bg-surface-indigo dark:text-white"
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
}
