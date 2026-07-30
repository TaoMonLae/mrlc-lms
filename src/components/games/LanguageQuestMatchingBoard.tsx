import { useState } from 'react';

// Shared tap-to-pair UI for MATCHING challenges, used by both the main
// lesson quiz (LanguageQuestLesson.tsx) and the mastery/Lightning
// Round/Daily Chain review deck (LanguageQuestMastery.tsx). All tiles sit in
// one shuffled grid rather than two columns -- which side of a pair each
// tile belongs to is server-side-only knowledge, so the client never learns
// (and can't accidentally reveal) how tiles are meant to line up. The
// learner taps two tiles to connect them; tapping either tile of an already
// connected pair unpairs both and returns them to the grid.
export interface LanguageQuestMatchingOption {
  id: string;
  text: string;
  emoji?: string | null;
}

interface LanguageQuestMatchingBoardProps {
  options: LanguageQuestMatchingOption[];
  value: [string, string][];
  onChange: (next: [string, string][]) => void;
  disabled?: boolean;
}

export function LanguageQuestMatchingBoard({ options, value, onChange, disabled }: LanguageQuestMatchingBoardProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pairedWith = new Map<string, string>();
  value.forEach(([a, b]) => {
    pairedWith.set(a, b);
    pairedWith.set(b, a);
  });

  const handleTap = (optionId: string) => {
    if (disabled) return;
    if (pairedWith.has(optionId)) {
      // Tapping a linked tile breaks that pair and returns both to the grid.
      const other = pairedWith.get(optionId)!;
      onChange(value.filter(([a, b]) => a !== optionId && b !== optionId && a !== other && b !== other));
      return;
    }
    if (pendingId === optionId) {
      setPendingId(null);
      return;
    }
    if (pendingId) {
      onChange([...value, [pendingId, optionId]]);
      setPendingId(null);
      return;
    }
    setPendingId(optionId);
  };

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm text-slate-400 dark:text-slate-500">
        Tap two tiles that go together to connect them…
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const paired = pairedWith.has(option.id);
          const pending = pendingId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => handleTap(option.id)}
              className={`flex min-h-16 items-center justify-center gap-2 rounded-xl border-2 px-3 py-2 text-center text-sm font-bold transition disabled:cursor-default ${
                paired
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100'
                  : pending
                    ? 'border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-500/10 dark:text-violet-100'
                    : 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-violet-300 dark:border-slate-700 dark:bg-surface-indigo dark:text-white'
              }`}
            >
              {option.emoji && <span className="text-lg" aria-hidden="true">{option.emoji}</span>}
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
