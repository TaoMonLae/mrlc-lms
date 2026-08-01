import { useId, useState } from 'react';

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
  const [announcement, setAnnouncement] = useState('');
  const instructionsId = useId();
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
      setAnnouncement(`${options.find((option) => option.id === optionId)?.text ?? 'Tile'} and ${options.find((option) => option.id === other)?.text ?? 'tile'} unlinked.`);
      return;
    }
    if (pendingId === optionId) {
      setPendingId(null);
      setAnnouncement('Tile deselected.');
      return;
    }
    if (pendingId) {
      onChange([...value, [pendingId, optionId]]);
      setAnnouncement(`${options.find((option) => option.id === pendingId)?.text ?? 'Tile'} linked with ${options.find((option) => option.id === optionId)?.text ?? 'tile'}.`);
      setPendingId(null);
      return;
    }
    setPendingId(optionId);
    setAnnouncement(`${options.find((option) => option.id === optionId)?.text ?? 'Tile'} selected. Choose its match.`);
  };

  return (
    <div className="mt-6">
      <p id={instructionsId} className="mb-3 text-sm text-slate-500 dark:text-slate-400">
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
              aria-describedby={instructionsId}
              aria-pressed={pending || paired}
              aria-label={paired ? `${option.text}, linked with ${options.find((candidate) => candidate.id === pairedWith.get(option.id))?.text ?? 'another tile'}. Tap to unlink.` : pending ? `${option.text}, selected. Tap to deselect.` : `${option.text}. Tap to select.`}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-2 text-center text-sm font-bold transition disabled:cursor-default ${
                paired
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100'
                  : pending
                    ? 'border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-500/10 dark:text-violet-100'
                    : 'border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-violet-300 dark:border-slate-700 dark:bg-surface-indigo dark:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                {option.emoji && <span className="text-lg" aria-hidden="true">{option.emoji}</span>}
                <span>{option.text}</span>
              </span>
              {(paired || pending) && <span className="text-[10px] font-black uppercase tracking-wider">{paired ? 'Linked' : 'Selected'}</span>}
            </button>
          );
        })}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </div>
  );
}
