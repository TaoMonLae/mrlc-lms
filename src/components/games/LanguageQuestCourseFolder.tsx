import type { ReactNode } from 'react';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LanguageQuestCourseFolderProps {
  category: string;
  count: number;
  children: ReactNode;
  defaultOpen?: boolean;
  idPrefix?: string;
}

const categoryTones = {
  chinese: {
    icon: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    line: 'from-rose-500 to-red-500',
  },
  english: {
    icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    line: 'from-violet-500 to-fuchsia-500',
  },
  spanish: {
    icon: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
    line: 'from-orange-500 to-amber-400',
  },
  other: {
    icon: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
    line: 'from-sky-500 to-cyan-400',
  },
} as const;

function folderTone(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('chinese') || normalized.includes('mandarin')) return categoryTones.chinese;
  if (normalized.includes('english')) return categoryTones.english;
  if (normalized.includes('spanish')) return categoryTones.spanish;
  return categoryTones.other;
}

function categoryId(category: string, prefix: string) {
  return `${prefix}-${category.replace(/\W+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`;
}

export function LanguageQuestCourseFolder({
  category,
  count,
  children,
  defaultOpen = false,
  idPrefix = 'course-folder',
}: LanguageQuestCourseFolderProps) {
  const tone = folderTone(category);
  const headingId = categoryId(category, idPrefix);

  return (
    <details
      open={defaultOpen}
      className="group/folder overflow-hidden rounded-[1.75rem] border border-violet-200/80 bg-white/75 shadow-lg shadow-violet-950/5 transition open:shadow-xl dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-black/20"
    >
      <summary className="relative flex min-h-24 cursor-pointer list-none items-center gap-3 overflow-hidden px-3 py-4 outline-none transition hover:bg-violet-50/70 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-violet-400/40 dark:hover:bg-slate-800/80 sm:gap-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${tone.line}`} />
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl sm:h-14 sm:w-14 ${tone.icon}`}>
          <FolderOpen className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
            Course folder
          </span>
          <span id={headingId} className="mt-1 block text-lg font-black leading-tight text-slate-950 dark:text-white sm:text-2xl">
            {category}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary">
            {count} {count === 1 ? 'course' : 'courses'}
          </Badge>
          <span className="hidden text-xs font-bold text-slate-500 dark:text-slate-300 sm:inline">
            <span className="group-open/folder:hidden">Open folder</span>
            <span className="hidden group-open/folder:inline">Close folder</span>
          </span>
          <ChevronDown className="h-5 w-5 text-slate-500 transition-transform duration-200 group-open/folder:rotate-180 dark:text-slate-300" aria-hidden="true" />
        </span>
      </summary>
      <section aria-labelledby={headingId} className="border-t border-violet-100 bg-slate-50/65 p-4 dark:border-slate-700 dark:bg-slate-950/45 sm:p-6">
        {children}
      </section>
    </details>
  );
}
