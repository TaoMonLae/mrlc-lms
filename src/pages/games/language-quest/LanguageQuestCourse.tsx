import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Headphones, Keyboard, Lightbulb, Lock, Map, Play, RotateCcw, SpellCheck2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiGet } from '@/src/lib/api';
import { useLanguageQuestSupport } from '@/src/components/games/LanguageQuestSupport';

interface CoursePayload {
  id: string;
  title: string;
  description: string | null;
  language: string;
  imageEmoji: string;
  accentColor: string;
  completedLessons: number;
  totalLessons: number;
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
    return <div className="grid min-h-[420px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>;
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
        </div>
      )}
    </div>
  );
}
