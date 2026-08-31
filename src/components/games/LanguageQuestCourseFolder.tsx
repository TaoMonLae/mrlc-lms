import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CourseFolderGroup<T> {
  category: string;
  courses: T[];
}

interface LanguageQuestCourseFoldersProps<T> {
  groups: CourseFolderGroup<T>[];
  renderCourse: (course: T) => ReactNode;
  idPrefix?: string;
  courseGridClassName?: string;
}

const categoryArt = {
  chinese: '/icons/LanguageQuests_Graphics/Contry Flags/030-china.svg',
  english: '/icons/LanguageQuests_Graphics/Contry Flags/042-united states of america.svg',
  spanish: '/icons/LanguageQuests_Graphics/Owl School 7.svg',
  malay: '/icons/LanguageQuests_Graphics/Contry Flags/034-malaysia.svg',
  mathematics: '/icons/LanguageQuests_Graphics/Owl School 5.svg',
  other: '/icons/LanguageQuests_Graphics/Owl School 1.svg',
} as const;

function folderArt(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('chinese') || normalized.includes('mandarin')) return categoryArt.chinese;
  if (normalized.includes('english')) return categoryArt.english;
  if (normalized.includes('spanish')) return categoryArt.spanish;
  if (normalized.includes('malay') || normalized.includes('bahasa')) return categoryArt.malay;
  if (normalized.includes('math')) return categoryArt.mathematics;
  return categoryArt.other;
}

function categoryId(category: string, prefix: string) {
  const asciiSlug = category
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const unicodeFallback = Array.from(category)
    .map((character) => character.codePointAt(0)?.toString(36))
    .filter(Boolean)
    .join('-');
  return `${prefix}-${asciiSlug || unicodeFallback || 'category'}`;
}

export function LanguageQuestCourseFolders<T>({
  groups,
  renderCourse,
  idPrefix = 'course-folder',
  courseGridClassName,
}: LanguageQuestCourseFoldersProps<T>) {
  const [activeCategory, setActiveCategory] = useState<string | null>(() => groups[0]?.category ?? null);

  useEffect(() => {
    if (!groups.length) {
      setActiveCategory(null);
      return;
    }
    if (!activeCategory || !groups.some((group) => group.category === activeCategory)) {
      setActiveCategory(groups[0].category);
    }
  }, [activeCategory, groups]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.category === activeCategory) ?? groups[0],
    [activeCategory, groups],
  );

  if (!activeGroup) return null;

  const panelId = `${idPrefix}-panel`;

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label="Course categories"
        className="lq-category-rail flex gap-3 overflow-x-auto pb-4 sm:gap-5"
      >
        {groups.map((group) => {
          const selected = group.category === activeGroup.category;
          const tabId = categoryId(group.category, idPrefix);

          return (
            <button
              key={group.category}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              onClick={() => setActiveCategory(group.category)}
              className="group/category min-w-24 shrink-0 rounded-[1.4rem] px-2 py-2 text-center outline-none focus-visible:ring-4 focus-visible:ring-[var(--lq-signal-blue)]/25"
            >
              <span
                className={cn(
                  'relative mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full border-2 bg-white transition duration-200 sm:h-24 sm:w-24',
                  selected
                    ? 'border-[var(--lq-signal-blue)] shadow-[0_5px_0_var(--lq-signal-blue)] -translate-y-1'
                    : 'border-[var(--lq-steel-border)] shadow-[0_3px_0_#c5d0dc] group-hover/category:-translate-y-1 group-hover/category:border-[var(--lq-signal-blue)]',
                )}
              >
                <img
                  src={folderArt(group.category)}
                  alt=""
                  aria-hidden="true"
                  width="72"
                  height="72"
                  className="h-[72%] w-[72%] object-contain transition-transform duration-200 group-hover/category:scale-110"
                />
              </span>
              <span className={cn('mt-3 block max-w-28 truncate text-sm font-extrabold', selected ? 'text-[var(--lq-signal-blue)]' : 'text-[var(--lq-charcoal)] dark:text-white')}>
                {group.category}
              </span>
              <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--lq-slate-caption)] dark:text-slate-400">
                {group.courses.length} {group.courses.length === 1 ? 'course' : 'courses'}
              </span>
            </button>
          );
        })}
      </div>

      <section
        id={panelId}
        role="tabpanel"
        aria-labelledby={categoryId(activeGroup.category, idPrefix)}
        className="mt-3 border-t border-[var(--lq-steel-border)] pt-6 dark:border-slate-700"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--lq-signal-blue)]">Now browsing</p>
            <h3 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-[var(--lq-charcoal)] dark:text-white">{activeGroup.category}</h3>
          </div>
          <Badge variant="outline" className="rounded-full border-[var(--lq-steel-border)] bg-white px-3 py-1.5 text-[var(--lq-slate-caption)] dark:bg-slate-900">
            {activeGroup.courses.length} {activeGroup.courses.length === 1 ? 'course' : 'courses'}
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          </Badge>
        </div>
        <div className={cn('grid gap-px overflow-hidden rounded-2xl border border-[var(--lq-steel-border)] bg-[var(--lq-steel-border)] md:grid-cols-2 xl:grid-cols-3 dark:border-slate-700 dark:bg-slate-700', courseGridClassName)}>
          {activeGroup.courses.map(renderCourse)}
        </div>
      </section>
    </div>
  );
}
