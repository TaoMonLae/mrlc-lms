import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpenText, Check, ChevronRight, Dices, Globe2, Headphones, Keyboard, Lightbulb, Lock, Map, Play, RotateCcw, Skull, SpellCheck2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/src/lib/api';
import { useLanguageQuestSupport } from '@/src/components/games/LanguageQuestSupport';
import { languageQuestCategoryForLanguage } from '@/shared/languageQuestCourseCategories';
import { languageQuestStoriesForCategory } from '@/shared/languageQuestStory';

interface CoursePayload {
  id: string;
  title: string;
  description: string | null;
  language: string;
  category?: string;
  imageEmoji: string;
  accentColor: string;
  completedLessons: number;
  totalLessons: number;
  nextLessonId: string | null;
  units: {
    id: string;
    title: string;
    description: string | null;
    lessons: {
      id: string;
      title: string;
      description: string | null;
      challengeCount: number;
      completedChallenges: number;
      completed: boolean;
      locked: boolean;
    }[];
  }[];
}

export default function LanguageQuestCourse() {
  const { explanationLanguage, lq } = useLanguageQuestSupport();
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<CoursePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    apiGet<CoursePayload>(`/api/language-quest/courses/${courseId}`)
      .then(setCourse)
      .catch((error: any) => toast.error(error?.message || 'Could not load the course'))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-12" aria-busy="true" aria-label="Loading course">
        <Skeleton className="h-8 w-32" />
        <div className="overflow-hidden rounded-3xl bg-violet-100/70 p-6 dark:bg-violet-500/10 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Skeleton className="h-20 w-20 shrink-0 rounded-3xl bg-violet-200/70 dark:bg-violet-900/40" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-20 bg-violet-200/60 dark:bg-violet-900/40" />
              <Skeleton className="h-8 w-56 max-w-full bg-violet-200/70 dark:bg-violet-900/40" />
              <Skeleton className="h-4 w-full max-w-md bg-violet-200/50 dark:bg-violet-900/30" />
              <Skeleton className="h-2 w-full bg-violet-200/50 dark:bg-violet-900/30" />
            </div>
          </div>
        </div>
        {Array.from({ length: 2 }).map((_, unitIndex) => (
          <div key={unitIndex} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-surface-raised dark:bg-surface-indigo">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-surface-raised dark:bg-surface-raised/30">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                <Skeleton className="h-5 w-40" />
              </div>
            </div>
            <div className="space-y-3 p-4 sm:p-6">
              {Array.from({ length: 3 }).map((__, lessonIndex) => (
                <div key={lessonIndex} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-3 dark:border-surface-raised">
                  <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!course) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-surface-raised dark:bg-surface-indigo">
        <Map className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900 dark:text-white">This course could not be found.</p>
        <Button variant="outline" className="mt-4" render={<Link to="/games/language-quest" />} nativeButton={false}>Back to Language Quest</Button>
      </div>
    );
  }

  const percent = course.totalLessons ? Math.round((course.completedLessons / course.totalLessons) * 100) : 0;
  const nextLesson = course.nextLessonId
    ? course.units.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === course.nextLessonId)
    : null;
  const courseStories = languageQuestStoriesForCategory(course.category?.trim() || languageQuestCategoryForLanguage(course.language));

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <Button variant="ghost" className="-ml-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> All courses
      </Button>

      <section className="overflow-hidden rounded-3xl text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${course.accentColor}, ${course.accentColor}cc)` }}>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-white/15 text-5xl ring-1 ring-white/20">{course.imageEmoji}</div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{course.language}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">{course.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">{course.description}</p>
            <div className="mt-4 flex items-center gap-3">
              <Progress value={percent} className="flex-1 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-white/20 [&_[data-slot=progress-indicator]]:bg-white" />
              <span className="text-sm font-bold">{percent}%</span>
            </div>
          </div>
        </div>
      </section>

      {nextLesson && (
        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border-2 p-5 sm:flex-row sm:items-center" style={{ borderColor: `${course.accentColor}55`, backgroundColor: `${course.accentColor}0f` }}>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: course.accentColor }}>
              <Play className="h-5 w-5 fill-current" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: course.accentColor }}>Pick up where you left off</p>
              <p className="mt-0.5 font-bold text-slate-900 dark:text-white">{nextLesson.title}</p>
            </div>
          </div>
          <Button style={{ backgroundColor: course.accentColor }} render={<Link to={`/games/language-quest/lessons/${nextLesson.id}`} />} nativeButton={false}>
            Resume lesson <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </section>
      )}

      <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5 dark:border-violet-500/20 dark:bg-violet-500/10">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><Lightbulb className="h-5 w-5" /></span>
          <div>
            <h2 lang={explanationLanguage} className="font-black text-slate-900 dark:text-white">{lq('lessonGuideTitle')}</h2>
            <p lang={explanationLanguage} className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{lq('lessonGuideBody')}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex gap-2 rounded-xl bg-white/80 p-3 dark:bg-surface-indigo/60"><Headphones className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /><p lang={explanationLanguage} className="text-xs leading-5 text-slate-600 dark:text-slate-200"><strong className="block text-slate-800 dark:text-white">{lq('learnTitle')}</strong>{lq('learnBody')}</p></div>
              <div className="flex gap-2 rounded-xl bg-white/80 p-3 dark:bg-surface-indigo/60"><SpellCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p lang={explanationLanguage} className="text-xs leading-5 text-slate-600 dark:text-slate-200"><strong className="block text-slate-800 dark:text-white">{lq('spellTitle')}</strong>{lq('spellBody')}</p></div>
              <div className="flex gap-2 rounded-xl bg-white/80 p-3 dark:bg-surface-indigo/60"><Keyboard className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-600" /><p lang={explanationLanguage} className="text-xs leading-5 text-slate-600 dark:text-slate-200"><strong className="block text-slate-800 dark:text-white">{lq('buildTitle')}</strong>{lq('buildBody')}</p></div>
              <div className="flex gap-2 rounded-xl bg-white/80 p-3 dark:bg-surface-indigo/60"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p lang={explanationLanguage} className="text-xs leading-5 text-slate-600 dark:text-slate-200"><strong className="block text-slate-800 dark:text-white">{lq('checkTitle')}</strong>{lq('checkBody')}</p></div>
            </div>
          </div>
        </div>
      </section>

      {course.units.map((unit, unitIndex) => (
        <section key={unit.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
          <header className="border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-surface-raised dark:bg-surface-raised/30">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: course.accentColor }}>{unitIndex + 1}</div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">{unit.title}</h2>
                {unit.description && <p className="text-xs text-slate-500 dark:text-slate-300">{unit.description}</p>}
              </div>
            </div>
          </header>
          <div className="p-4 sm:p-6">
            {unit.lessons.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Lessons are coming soon.</p>
            ) : (
              <div className="relative space-y-3 before:absolute before:bottom-6 before:left-6 before:top-6 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {unit.lessons.map((lesson) => {
                  const content = (
                    <>
                      <div
                        className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-4 border-white text-white shadow-sm dark:border-surface-indigo ${lesson.locked ? 'bg-slate-300 dark:bg-slate-700' : ''}`}
                        style={!lesson.locked ? { backgroundColor: lesson.completed ? '#10b981' : course.accentColor } : undefined}
                      >
                        {lesson.locked ? <Lock className="h-4 w-4" /> : lesson.completed ? <Check className="h-5 w-5" /> : <Play className="h-4 w-4 fill-current" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${lesson.locked ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{lesson.title}</h3>
                          {lesson.completed && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Complete</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">{lesson.description || `${lesson.challengeCount} quick challenges`}</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">{lesson.completedChallenges}/{lesson.challengeCount} challenges</p>
                      </div>
                      {!lesson.locked && (lesson.completed ? <RotateCcw className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />)}
                    </>
                  );
                  return lesson.locked ? (
                    <div key={lesson.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-3 opacity-75 dark:border-surface-raised" aria-label={`${lesson.title} is locked`}>{content}</div>
                  ) : (
                    <Link key={lesson.id} to={`/games/language-quest/lessons/${lesson.id}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-3 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-surface-raised dark:hover:border-violet-600">{content}</Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ))}

      {course.totalLessons > 0 && course.completedLessons === course.totalLessons && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
          <Trophy className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">Course complete!</h2>
          <p lang={explanationLanguage} className="mt-1 text-sm text-slate-500 dark:text-slate-300">{lq('completeHelp')}</p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Button className="bg-rose-700 text-white hover:bg-rose-800" render={<Link to={`/games/language-quest/courses/${course.id}/boss-battle`} />} nativeButton={false}>
              <Skull className="mr-2 h-4 w-4" /> Challenge the Boss
            </Button>
            <Button variant="outline" render={<Link to={`/games/language-quest/courses/${course.id}/culture`} />} nativeButton={false}>
              <Globe2 className="mr-2 h-4 w-4" /> Culture Quest
            </Button>
            {courseStories.length > 0 && (
              <Button variant="outline" render={<Link to={`/games/language-quest/courses/${course.id}/story/${courseStories[0].id}`} />} nativeButton={false}>
                <BookOpenText className="mr-2 h-4 w-4" /> Story Mode
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            className="mt-2 border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-500/40 dark:text-sky-300"
            render={<Link to={`/games/word-trail?courseId=${course.id}`} />}
            nativeButton={false}
          >
            <Dices className="mr-2 h-4 w-4" /> Practice this course in Word Trail
          </Button>
        </div>
      )}
    </div>
  );
}
