import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Calculator, ChevronLeft, ChevronRight, Clock3, Flag, ListChecks, Sigma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GedExamProfile } from '@/shared/languageQuestGedExam';
import type { LanguageQuestOption } from '@/src/types/languageQuest';
import { LanguageQuestContentText } from '@/src/components/games/LanguageQuestContentText';
import { languageQuestRlaQuestionParts } from '@/src/components/games/LanguageQuestQuestionText';
import { LanguageQuestStimulus, type ScienceVisual } from '@/src/components/games/LanguageQuestScienceConcept';
import { GedCalculator, GedFormulaSheet } from '@/src/components/games/GedExamTools';

export interface GedPracticeCard {
  challengeId: string;
  question: string;
  sourceId?: string | null;
  stimulus?: ScienceVisual | null;
  options: LanguageQuestOption[];
}

interface GedPracticeTestScreenProps {
  format: GedExamProfile;
  courseLanguage: string;
  cards: GedPracticeCard[];
  answers: Record<string, string>;
  onAnswer: (challengeId: string, optionId: string) => void;
  secondsLeft: number;
  submitting: boolean;
  onSubmit: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');
  return hours ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`;
}

/**
 * Computer-based GED test interface: a source panel beside the question,
 * lettered single-answer choices, Previous/Next navigation, Flag for Review,
 * a Review Screen, and the subject's tools. Mathematical Reasoning opens with
 * a no-calculator Part 1 that cannot be revisited once Part 2 begins.
 */
export function GedPracticeTestScreen({ format, courseLanguage, cards, answers, onAnswer, secondsLeft, submitting, onSubmit }: GedPracticeTestScreenProps) {
  const partOneLength = format.noCalculatorQuestions > 0 ? Math.min(format.noCalculatorQuestions, Math.max(0, cards.length - 1)) : 0;
  const [index, setIndex] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set());
  const [reviewing, setReviewing] = useState(false);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [confirmingPartTwo, setConfirmingPartTwo] = useState(false);
  const [partTwo, setPartTwo] = useState(partOneLength === 0);
  const [tool, setTool] = useState<'calculator' | 'formula' | null>(null);

  const sectionStart = partTwo ? partOneLength : 0;
  const sectionEnd = partTwo ? cards.length : partOneLength;
  const sectionCards = cards.slice(sectionStart, sectionEnd);
  const card = cards[index];
  const calculatorAllowed = format.calculator && partTwo;
  const unansweredInSection = sectionCards.filter((entry) => !answers[entry.challengeId]).length;
  const unansweredTotal = cards.filter((entry) => !answers[entry.challengeId]).length;
  const lowTime = secondsLeft < 300;

  useEffect(() => {
    if (!calculatorAllowed && tool === 'calculator') setTool(null);
  }, [calculatorAllowed, tool]);

  const rla = useMemo(() => (card ? languageQuestRlaQuestionParts(courseLanguage, card.question) : null), [card, courseLanguage]);
  const passage = rla?.passage ?? null;
  const prompt = rla?.question ?? card?.question ?? '';
  const hasSource = Boolean(passage || card?.stimulus);
  const sourceGroup = useMemo(() => {
    if (!card?.sourceId) return null;
    const members = cards.map((entry, entryIndex) => ({ entry, entryIndex })).filter(({ entry }) => entry.sourceId === card.sourceId);
    if (members.length < 2) return null;
    return { first: members[0].entryIndex + 1, last: members[members.length - 1].entryIndex + 1 };
  }, [card, cards]);

  const goTo = (target: number) => {
    setReviewing(false);
    setConfirmingSubmit(false);
    setIndex(Math.min(sectionEnd - 1, Math.max(sectionStart, target)));
  };

  const next = () => {
    if (index + 1 < sectionEnd) setIndex(index + 1);
    else setReviewing(true);
  };

  const toggleFlag = () => {
    if (!card) return;
    setFlagged((current) => {
      const updated = new Set(current);
      if (updated.has(card.challengeId)) updated.delete(card.challengeId);
      else updated.add(card.challengeId);
      return updated;
    });
  };

  const beginPartTwo = () => {
    setPartTwo(true);
    setConfirmingPartTwo(false);
    setReviewing(false);
    setIndex(partOneLength);
  };

  const sectionLabel = partOneLength > 0 ? (partTwo ? 'Part 2 · Calculator allowed' : 'Part 1 · No calculator') : null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="shrink-0 border-b border-slate-300 bg-slate-800 text-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">GED-style practice · {format.testName}</p>
            <p className="text-xs font-semibold text-white/70">{reviewing ? 'Review Screen' : `Question ${index + 1} of ${cards.length}`}{sectionLabel ? ` · ${sectionLabel}` : ''}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {format.calculator && (
              <button
                type="button"
                onClick={() => setTool(tool === 'calculator' ? null : 'calculator')}
                disabled={!calculatorAllowed}
                aria-pressed={tool === 'calculator'}
                aria-label="Calculator"
                title={calculatorAllowed ? 'Calculator' : 'The calculator is not available in Part 1'}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-xs font-bold outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-white aria-pressed:text-slate-900"
              >
                <Calculator className="h-4 w-4" /> <span className="hidden sm:inline">Calculator</span>
              </button>
            )}
            {format.formulaSheet && (
              <button
                type="button"
                onClick={() => setTool(tool === 'formula' ? null : 'formula')}
                aria-pressed={tool === 'formula'}
                aria-label="Formula sheet"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-xs font-bold outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-300 aria-pressed:bg-white aria-pressed:text-slate-900"
              >
                <Sigma className="h-4 w-4" /> <span className="hidden sm:inline">Formula sheet</span>
              </button>
            )}
          </div>
          <div className={cn('rounded-lg px-3 py-1 text-right', lowTime ? 'bg-rose-600' : 'bg-white/10')} role="timer" aria-live={lowTime ? 'polite' : 'off'}>
            <p className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wide text-white/75"><Clock3 className="h-3 w-3" /> Time remaining</p>
            <p className="font-mono text-lg font-black leading-tight">{formatClock(secondsLeft)}</p>
          </div>
        </div>
        <div className="h-1 bg-white/10" aria-hidden="true">
          <div className="h-full bg-sky-400 transition-[width]" style={{ width: `${((cards.length - unansweredTotal) / Math.max(1, cards.length)) * 100}%` }} />
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {reviewing ? (
          <main className="h-full overflow-y-auto px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-3xl">
              <h1 className="text-xl font-black">Review Screen{partOneLength > 0 ? ` · ${partTwo ? 'Part 2' : 'Part 1'}` : ''}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Select a question to return to it. Unanswered questions are scored as incorrect, so answer every one before you {partTwo ? 'submit' : 'move on'}.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>{sectionCards.length - unansweredInSection} answered</span>
                <span className={unansweredInSection ? 'font-black text-rose-700 dark:text-rose-300' : undefined}>{unansweredInSection} unanswered</span>
                <span>{sectionCards.filter((entry) => flagged.has(entry.challengeId)).length} flagged</span>
              </div>
              <ol className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
                {sectionCards.map((entry, offset) => {
                  const number = sectionStart + offset + 1;
                  const answered = Boolean(answers[entry.challengeId]);
                  const isFlagged = flagged.has(entry.challengeId);
                  return (
                    <li key={entry.challengeId}>
                      <button
                        type="button"
                        onClick={() => goTo(sectionStart + offset)}
                        aria-label={`Question ${number}: ${answered ? 'answered' : 'unanswered'}${isFlagged ? ', flagged for review' : ''}`}
                        className={cn(
                          'relative flex min-h-14 w-full flex-col items-center justify-center rounded-lg border-2 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                          answered ? 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900' : 'border-dashed border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-200',
                        )}
                      >
                        {number}
                        <span className="text-[10px] font-semibold">{answered ? 'Answered' : 'Unanswered'}</span>
                        {isFlagged && <Flag className="absolute right-1.5 top-1.5 h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
                      </button>
                    </li>
                  );
                })}
              </ol>

              {partTwo ? (
                confirmingSubmit ? (
                  <div className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-950/30">
                    <p className="font-black">Submit the test?</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      {unansweredTotal ? `${unansweredTotal} question${unansweredTotal === 1 ? ' is' : 's are'} unanswered and will be scored as incorrect. ` : ''}You cannot change answers after submitting.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Button onClick={onSubmit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit test'}</Button>
                      <Button variant="outline" onClick={() => setConfirmingSubmit(false)} disabled={submitting}>Keep reviewing</Button>
                    </div>
                  </div>
                ) : (
                  <Button className="mt-6 w-full sm:w-auto" onClick={() => setConfirmingSubmit(true)}>Submit test</Button>
                )
              ) : confirmingPartTwo ? (
                <div className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-950/30">
                  <p className="font-black">Move to Part 2?</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">As on test day, you cannot return to Part 1 after you continue. The calculator becomes available in Part 2.</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button onClick={beginPartTwo}>Continue to Part 2</Button>
                    <Button variant="outline" onClick={() => setConfirmingPartTwo(false)}>Stay in Part 1</Button>
                  </div>
                </div>
              ) : (
                <Button className="mt-6 w-full sm:w-auto" onClick={() => setConfirmingPartTwo(true)}>Finish Part 1</Button>
              )}
            </div>
          </main>
        ) : card ? (
          <main className={cn('mx-auto grid h-full max-w-7xl', hasSource ? 'lg:grid-cols-2' : 'max-w-3xl')}>
            {hasSource && (
              <section aria-label="Source" className="min-h-0 overflow-y-auto border-b border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 max-lg:max-h-[42dvh] sm:p-6 lg:border-b-0 lg:border-r">
                <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  <BookOpenText className="h-4 w-4" />
                  {sourceGroup ? `Questions ${sourceGroup.first}–${sourceGroup.last} refer to this source` : 'Source'}
                </p>
                {passage ? (
                  <div className="whitespace-pre-line text-[15px] leading-7 text-slate-800 dark:text-slate-200"><LanguageQuestContentText language={courseLanguage} text={passage} /></div>
                ) : card.stimulus ? (
                  <LanguageQuestStimulus visual={card.stimulus} />
                ) : null}
              </section>
            )}
            <section aria-label={`Question ${index + 1}`} className="min-h-0 overflow-y-auto p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Question {index + 1}</h1>
                <button
                  type="button"
                  onClick={toggleFlag}
                  aria-pressed={flagged.has(card.challengeId)}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-500 aria-pressed:border-amber-400 aria-pressed:bg-amber-100 aria-pressed:text-amber-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:aria-pressed:bg-amber-500/20 dark:aria-pressed:text-amber-100"
                >
                  <Flag className={cn('h-4 w-4', flagged.has(card.challengeId) && 'fill-amber-400 text-amber-600')} />
                  {flagged.has(card.challengeId) ? 'Flagged' : 'Flag for review'}
                </button>
              </div>
              <div className="mt-3 text-lg font-semibold leading-8 text-slate-950 dark:text-white">
                <LanguageQuestContentText language={courseLanguage} text={prompt} />
              </div>
              <fieldset className="mt-5">
                <legend className="sr-only">Answer choices</legend>
                <div className="space-y-2">
                  {card.options.map((option, optionIndex) => {
                    const selected = answers[card.challengeId] === option.id;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          'flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border-2 bg-white px-3 py-3 transition focus-within:ring-2 focus-within:ring-sky-500 dark:bg-slate-900',
                          selected ? 'border-sky-600 bg-sky-50 dark:border-sky-400 dark:bg-sky-950/40' : 'border-slate-300 hover:border-slate-400 dark:border-slate-600',
                        )}
                      >
                        <input
                          type="radio"
                          name={`ged-${card.challengeId}`}
                          className="sr-only"
                          checked={selected}
                          onChange={() => onAnswer(card.challengeId, option.id)}
                        />
                        <span
                          aria-hidden="true"
                          className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-sm font-black', selected ? 'border-sky-600 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-500' : 'border-slate-400 text-slate-600 dark:border-slate-500 dark:text-slate-300')}
                        >
                          {LETTERS[optionIndex] ?? optionIndex + 1}
                        </span>
                        <span className="min-w-0 pt-0.5 text-base leading-6 text-slate-900 dark:text-slate-100">
                          <span className="sr-only">{LETTERS[optionIndex]}. </span>
                          <LanguageQuestContentText language={courseLanguage} text={option.text} />
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </section>
          </main>
        ) : null}

        {tool && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-end sm:right-5">
            <div className="pointer-events-auto">
              {tool === 'calculator' ? <GedCalculator onClose={() => setTool(null)} /> : <GedFormulaSheet onClose={() => setTool(null)} />}
            </div>
          </div>
        )}
      </div>

      {!reviewing && (
        <footer className="shrink-0 border-t border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 sm:px-5">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
            <Button variant="outline" onClick={() => goTo(index - 1)} disabled={index <= sectionStart}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="ghost" onClick={() => setReviewing(true)}>
              <ListChecks className="h-4 w-4" /> <span>Review<span className="hidden sm:inline"> questions</span></span>
            </Button>
            <Button onClick={next}>
              {index + 1 < sectionEnd ? <>Next <ChevronRight className="h-4 w-4" /></> : partTwo ? 'Review and submit' : 'Finish Part 1'}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
