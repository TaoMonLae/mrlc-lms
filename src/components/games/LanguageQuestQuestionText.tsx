import { BookOpenText } from 'lucide-react';
import { languageQuestCourseMode } from '@/shared/languageQuest';
import { LanguageQuestContentText } from '@/src/components/games/LanguageQuestContentText';

interface LanguageQuestQuestionTextProps {
  language: string;
  text: string;
  headingLevel?: 1 | 2 | 3;
  compact?: boolean;
  className?: string;
}

export interface LanguageQuestRlaQuestionParts {
  passage: string;
  question: string;
}

/** GED RLA challenges store their source and prompt as two newline-separated sections. */
export function languageQuestRlaQuestionParts(language: string, text: string): LanguageQuestRlaQuestionParts | null {
  if (languageQuestCourseMode(language) !== 'rla') return null;
  const separator = text.indexOf('\n\n');
  if (separator < 0) return null;
  const passage = text.slice(0, separator).trim();
  const question = text.slice(separator + 2).trim();
  return passage && question ? { passage, question } : null;
}

/** Keeps an RLA source readable without letting it overwhelm the actual question. */
export function LanguageQuestQuestionText({
  language,
  text,
  headingLevel = 1,
  compact = false,
  className,
}: LanguageQuestQuestionTextProps) {
  const Heading = `h${headingLevel}` as const;
  const rla = languageQuestRlaQuestionParts(language, text);

  if (!rla) {
    return (
      <Heading className={className}>
        <LanguageQuestContentText language={language} text={text} />
      </Heading>
    );
  }

  return (
    <div className={className}>
      <section className="overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/80 shadow-sm dark:border-violet-500/25 dark:bg-violet-500/10">
        <header className={`flex items-center justify-between gap-3 border-b border-violet-200/80 bg-white/70 font-black text-violet-800 dark:border-violet-500/20 dark:bg-slate-950/25 dark:text-violet-200 ${compact ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'}`}>
          <span className="flex items-center gap-2 uppercase tracking-[0.14em]"><BookOpenText className="h-4 w-4" /> Source passage</span>
          {!compact && <span className="font-semibold normal-case tracking-normal text-slate-500 dark:text-slate-400">Read, then answer</span>}
        </header>
        <div
          role="region"
          aria-label="Source passage"
          tabIndex={0}
          className={`overflow-y-auto overscroll-contain whitespace-pre-line text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 dark:text-slate-200 ${compact ? 'max-h-28 px-3 py-2 text-xs leading-5' : 'max-h-[min(34vh,20rem)] px-4 py-4 text-sm font-medium leading-7 sm:px-5 sm:text-base'}`}
        >
          {rla.passage}
        </div>
      </section>
      <Heading className={compact ? 'mt-3 text-sm font-black leading-6 text-slate-900 dark:text-white' : 'mt-5 max-w-3xl text-2xl font-black leading-tight text-slate-900 dark:text-white sm:text-3xl'}>
        {rla.question}
      </Heading>
    </div>
  );
}
