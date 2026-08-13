import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, ChevronDown, FolderOpen } from 'lucide-react';
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

const categoryTones = {
  chinese: {
    icon: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    line: 'from-rose-500 to-red-500',
    glow: 'from-rose-500/18 to-red-500/5',
    art: '/icons/LanguageQuests_Graphics/Contry Flags/030-china.svg',
  },
  english: {
    icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    line: 'from-violet-500 to-fuchsia-500',
    glow: 'from-violet-500/18 to-fuchsia-500/5',
    art: '/icons/LanguageQuests_Graphics/Contry Flags/042-united states of america.svg',
  },
  spanish: {
    icon: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
    line: 'from-orange-500 to-amber-400',
    glow: 'from-orange-500/18 to-amber-400/5',
    // No Spain flag ships in the Contry Flags pack (only Mexico, which isn't
    // an accurate stand-in for "Spanish") -- keep the mascot art here until
    // a Spain flag asset is added.
    art: '/icons/LanguageQuests_Graphics/Owl School 7.svg',
  },
  malay: {
    icon: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
    line: 'from-sky-500 to-cyan-400',
    glow: 'from-sky-500/18 to-cyan-400/5',
    art: '/icons/LanguageQuests_Graphics/Contry Flags/034-malaysia.svg',
  },
  mathematics: {
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    line: 'from-blue-600 to-indigo-500',
    glow: 'from-blue-500/18 to-indigo-500/5',
    art: '/icons/LanguageQuests_Graphics/Owl School 5.svg',
  },
  other: {
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    line: 'from-emerald-500 to-teal-400',
    glow: 'from-emerald-500/18 to-teal-400/5',
    art: '/icons/LanguageQuests_Graphics/Owl School 1.svg',
  },
} as const;

function folderTone(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('chinese') || normalized.includes('mandarin')) return categoryTones.chinese;
  if (normalized.includes('english')) return categoryTones.english;
  if (normalized.includes('spanish')) return categoryTones.spanish;
  if (normalized.includes('malay') || normalized.includes('bahasa')) return categoryTones.malay;
  if (normalized.includes('math')) return categoryTones.mathematics;
  return categoryTones.other;
}

function categoryId(category: string, prefix: string) {
  return `${prefix}-${category.replace(/\W+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`;
}

export function LanguageQuestCourseFolders<T>({
  groups,
  renderCourse,
  idPrefix = 'course-folder',
  courseGridClassName,
}: LanguageQuestCourseFoldersProps<T>) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (activeCategory && !groups.some((group) => group.category === activeCategory)) {
      setActiveCategory(null);
    }
  }, [activeCategory, groups]);

  const activeGroup = useMemo(
    () => activeCategory ? groups.find((group) => group.category === activeCategory) : undefined,
    [activeCategory, groups],
  );

  if (groups.length === 0) return null;

  const panelId = `${idPrefix}-panel`;

  return (
    <div>
      <div
        role="group"
        aria-label="Course folders"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {groups.map((group, groupIndex) => {
          const tone = folderTone(group.category);
          const selected = group.category === activeGroup?.category;
          const tabId = categoryId(group.category, idPrefix);

          return (
            <button
              key={group.category}
              id={tabId}
              type="button"
              aria-pressed={selected}
              aria-expanded={selected}
              aria-controls={selected ? panelId : undefined}
              aria-label={`${selected ? 'Close' : 'Open'} ${group.category} folder`}
              onClick={() => setActiveCategory(selected ? null : group.category)}
              className={cn(
                'group/folder relative overflow-hidden rounded-2xl border p-3 text-left shadow-sm outline-none transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-4 focus-visible:ring-violet-400/35 sm:min-h-40 sm:rounded-3xl sm:p-5',
                groups.length % 2 === 1 && groupIndex === groups.length - 1 && 'col-span-2 lg:col-span-1',
                selected
                  ? 'border-violet-400 bg-white ring-2 ring-violet-200 dark:border-violet-400/70 dark:bg-slate-900 dark:ring-violet-500/20'
                  : 'border-slate-200 bg-white/75 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-violet-500/50',
              )}
            >
              <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${tone.line}`} />
              <span className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`} />
              <img
                src={tone.art}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-5 -right-5 hidden h-28 w-28 object-contain opacity-45 drop-shadow-xl transition duration-300 group-hover/folder:-translate-y-1 group-hover/folder:rotate-2 group-hover/folder:scale-110 sm:block sm:h-32 sm:w-32"
              />

              <span className="relative flex h-full items-center gap-2.5 sm:min-h-32 sm:flex-col sm:items-start sm:justify-between sm:gap-0">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl shadow-sm sm:h-10 sm:w-10 sm:rounded-2xl ${tone.icon}`}>
                  <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 sm:max-w-[78%] sm:flex-none">
                  <span className="hidden text-[10px] font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300 sm:block">
                    Course folder
                  </span>
                  <span className="block truncate text-xs font-black leading-tight text-slate-950 dark:text-white sm:mt-1 sm:text-lg">
                    {group.category}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-[10px] font-black text-slate-500 dark:text-slate-300 sm:mt-2 sm:gap-1.5 sm:text-[11px]">
                    {group.courses.length} {group.courses.length === 1 ? 'course' : 'courses'}
                    {selected
                      ? <ChevronDown className="h-3.5 w-3.5 text-violet-600" />
                      : <ArrowRight className="h-3.5 w-3.5 transition group-hover/folder:translate-x-1" />}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {activeGroup && (
        <section
          id={panelId}
          aria-labelledby={categoryId(activeGroup.category, idPrefix)}
          className="mt-4 animate-in fade-in slide-in-from-top-2 rounded-[1.75rem] border border-violet-200/80 bg-white/80 p-4 shadow-lg shadow-violet-950/5 duration-300 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-black/20 sm:p-6"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
                Open folder
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{activeGroup.category}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {activeGroup.courses.length} {activeGroup.courses.length === 1 ? 'course' : 'courses'}
              </Badge>
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                aria-label={`Close open ${activeGroup.category} course panel`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 text-xs font-black text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-400/30 dark:border-violet-500/30 dark:bg-slate-950 dark:text-violet-200"
              >
                Close folder
                <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className={cn('grid gap-5 md:grid-cols-2 xl:grid-cols-3', courseGridClassName)}>
            {activeGroup.courses.map(renderCourse)}
          </div>
        </section>
      )}
    </div>
  );
}
