import { Check, Headphones, ListChecks, PencilLine, SpellCheck2 } from 'lucide-react';

export type LanguageQuestLessonPhase = 'learn' | 'vocabulary' | 'spelling' | 'sentence' | 'quiz';

interface StepDefinition {
  key: LanguageQuestLessonPhase;
  label: string;
  icon: typeof Headphones;
}

interface LanguageQuestPhaseStepperProps {
  phase: LanguageQuestLessonPhase;
  hasVocabulary: boolean;
  hasSpelling: boolean;
  hasSentence: boolean;
  accentColor: string;
}

/**
 * The five-step lesson routine (Learn -> Pick -> Spell -> Build -> Check), rendered
 * as a small stepper so learners always know where they are and what's
 * still ahead. Steps a lesson skips (e.g. a lesson with no full-sentence
 * cards has no "Build" step) are omitted rather than shown as permanently
 * disabled, since they'll never become reachable in that lesson.
 */
export function LanguageQuestPhaseStepper({ phase, hasVocabulary, hasSpelling, hasSentence, accentColor }: LanguageQuestPhaseStepperProps) {
  const steps: StepDefinition[] = [
    { key: 'learn', label: 'Learn', icon: Headphones },
    ...(hasVocabulary ? [{ key: 'vocabulary' as const, label: 'Pick', icon: ListChecks }] : []),
    ...(hasSpelling ? [{ key: 'spelling' as const, label: 'Spell', icon: SpellCheck2 }] : []),
    ...(hasSentence ? [{ key: 'sentence' as const, label: 'Build', icon: PencilLine }] : []),
    { key: 'quiz', label: 'Check', icon: Check },
  ];
  const currentIndex = steps.findIndex((step) => step.key === phase);

  return (
    <div className="flex items-center justify-center gap-1.5 py-1.5" aria-label="Lesson progress">
      {steps.map((step, stepIndex) => {
        const isComplete = stepIndex < currentIndex;
        const isCurrent = stepIndex === currentIndex;
        const Icon = isComplete ? Check : step.icon;
        return (
          <div key={step.key} className="flex items-center gap-1.5">
            {stepIndex > 0 && (
              <div
                className={`h-0.5 w-4 rounded-full sm:w-8 ${isComplete ? '' : 'bg-slate-200 dark:bg-surface-raised'}`}
                style={isComplete ? { backgroundColor: accentColor } : undefined}
              />
            )}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold transition-colors sm:px-2.5 ${
                isCurrent
                  ? 'text-white shadow-sm'
                  : isComplete
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
              }`}
              style={isCurrent ? { backgroundColor: accentColor } : undefined}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
