import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft, Award, BookMarked, BookOpenText, Calculator, Check, ChevronRight,
  Dices, FileCheck2, Flag, Globe2, Headphones, Keyboard, Lightbulb, ListChecks,
  Lock, Map, Play, RotateCcw, Skull, SpellCheck2, Star, Target, Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/src/lib/api';
import { coursePercent } from '@/src/lib/languageQuestCourseUi';
import { useLanguageQuestSupport } from '@/src/components/games/LanguageQuestSupport';
import { LanguageQuestContentText } from '@/src/components/games/LanguageQuestContentText';
import { QuestReveal } from '@/src/components/games/LanguageQuestMotion';
import { languageQuestCategoryForLanguage } from '@/shared/languageQuestCourseCategories';
import { languageQuestStoriesForCategory } from '@/shared/languageQuestStory';
import { languageQuestCourseMode, languageQuestCourseUsesStudyCards } from '@/shared/languageQuest';

interface CourseLesson {
  id: string;
  title: string;
  description: string | null;
  challengeCount: number;
  completedChallenges: number;
  completed: boolean;
  locked: boolean;
  available: boolean;
}

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
  units: { id: string; title: string; description: string | null; lessons: CourseLesson[] }[];
  bossBattle: {
    available: boolean; unlocked: boolean; eligibleQuestionCount: number;
    minQuestions: number; remainingChallenges: number;
  };
  finalExam: {
    available: boolean; unlocked: boolean; eligibleQuestionCount: number; minQuestions: number;
    questionCount: number; passPercent: number; attemptMinutes: number; passed: boolean;
    certificateEligible: boolean; passedAt: string | null; bestScorePercent: number | null;
    latestAttempt: { status: string; scorePercent: number | null; submittedAt: string | null; violationReason: string | null } | null;
    retryAt: string | null;
  };
}

const PATH_X = [50, 69, 62, 38, 31, 48, 67, 55, 34];
const PATH_STEP = 180;

function UnitPath({ lessons, nextLessonId, language }: {
  lessons: CourseLesson[];
  nextLessonId: string | null;
  language: string;
}) {
  const pathHeight = Math.max(170, lessons.length * PATH_STEP);
  const points = lessons.map((_, index) => `${PATH_X[index % PATH_X.length] * 4},${index * PATH_STEP + 44}`).join(' ');

  if (lessons.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-slate-300 text-slate-400 dark:border-slate-700">
          <BookOpenText className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-300">Lessons are coming soon.</p>
      </div>
    );
  }

  return (
    <div className="lq-course-path relative mx-auto w-full max-w-[430px]" style={{ height: pathHeight }}>
      {lessons.length > 1 && (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full w-full overflow-visible" viewBox={`0 0 400 ${pathHeight}`} preserveAspectRatio="none">
          <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" className="lq-course-path-line" />
        </svg>
      )}

      {lessons.map((lesson, index) => {
        const isCurrent = lesson.id === nextLessonId;
        const canOpen = lesson.available && !lesson.locked;
        const label = !lesson.available
          ? `${lesson.title} has no learning activities yet`
          : lesson.locked ? `${lesson.title} is locked`
            : lesson.completed ? `Practise ${lesson.title} again` : `Start ${lesson.title}`;
        const node = (
          <>
            {isCurrent && <span className="lq-current-lesson-callout" aria-hidden="true">Start here<span /></span>}
            <span className={`lq-lesson-node ${lesson.completed ? 'is-complete' : ''} ${isCurrent ? 'is-current' : ''} ${!canOpen ? 'is-locked' : ''}`}>
              {!lesson.available || lesson.locked
                ? <Lock className="h-6 w-6" aria-hidden="true" />
                : lesson.completed
                  ? <Check className="h-7 w-7 stroke-[3]" aria-hidden="true" />
                  : <Star className="h-7 w-7 fill-current stroke-[2.5]" aria-hidden="true" />}
            </span>
            <span className={`lq-lesson-node-title ${!canOpen ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
              <span className="line-clamp-2"><LanguageQuestContentText language={language} text={lesson.title} /></span>
              <span className="mt-0.5 block text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
                {lesson.available ? `${lesson.completedChallenges}/${lesson.challengeCount} steps` : 'Coming soon'}
              </span>
            </span>
          </>
        );
        const position = { top: index * PATH_STEP, left: `${PATH_X[index % PATH_X.length]}%` };

        return canOpen ? (
          <Link key={lesson.id} to={`/games/language-quest/lessons/${lesson.id}`} className="lq-lesson-node-wrap" style={position} aria-label={label}>{node}</Link>
        ) : (
          <div key={lesson.id} className="lq-lesson-node-wrap" style={position} aria-label={label}>{node}</div>
        );
      })}
    </div>
  );
}

function Milestone({ tone, icon, eyebrow, title, description, href, action, disabled }: {
  tone: 'exam' | 'boss'; icon: React.ReactNode; eyebrow: string; title: string;
  description: string; href?: string; action: string; disabled?: boolean;
}) {
  const content = (
    <>
      <span className={`lq-milestone-icon is-${tone}`}>{disabled ? <Lock className="h-6 w-6" /> : icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{eyebrow}</span>
        <span className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">{description}</span>
      </span>
      <span className={`lq-milestone-action ${disabled ? 'is-disabled' : ''}`}>{action}{!disabled && <ChevronRight className="h-4 w-4" aria-hidden="true" />}</span>
    </>
  );
  return href && !disabled
    ? <Link to={href} className="lq-milestone-row">{content}</Link>
    : <div className="lq-milestone-row" aria-disabled={disabled}>{content}</div>;
}

function CourseGuide({ isSubjectCourse, subjectLabel, explanationLanguage, lq }: {
  isSubjectCourse: boolean; subjectLabel: string; explanationLanguage: string;
  lq: (key: any) => string;
}) {
  const languageSteps = [
    { icon: Headphones, label: lq('learnTitle') },
    { icon: ListChecks, label: lq('vocabularyTitle') },
    { icon: SpellCheck2, label: lq('spellTitle') },
    { icon: Keyboard, label: lq('buildTitle') },
    { icon: Check, label: lq('checkTitle') },
  ];
  const subjectSteps = [
    { icon: BookOpenText, label: 'Understand' }, { icon: Calculator, label: 'Solve' },
    { icon: Check, label: 'Check' }, { icon: RotateCcw, label: 'Retry' },
  ];
  const steps = isSubjectCourse ? subjectSteps : languageSteps;

  return (
    <section className="lq-course-aside-panel" aria-labelledby="course-guide-title">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff4cc] text-[#b77900] dark:bg-amber-500/15 dark:text-amber-300"><Lightbulb className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b77900]">How it works</p>
          <h2 id="course-guide-title" lang={isSubjectCourse ? undefined : explanationLanguage} className="font-black text-slate-900 dark:text-white">
            {isSubjectCourse ? `${subjectLabel} practice` : lq('lessonGuideTitle')}
          </h2>
        </div>
      </div>
      <ol className="mt-5 space-y-1">
        {steps.map(({ icon: Icon, label }, index) => (
          <li key={label} className="flex min-h-11 items-center gap-3 border-b border-slate-100 py-2 last:border-b-0 dark:border-slate-800">
            <span className="text-xs font-black tabular-nums text-slate-400">{String(index + 1).padStart(2, '0')}</span>
            <Icon className="h-4 w-4 text-[#58a700]" aria-hidden="true" />
            <span lang={isSubjectCourse ? undefined : explanationLanguage} className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function LanguageQuestCourse() {
  const { explanationLanguage, lq } = useLanguageQuestSupport();
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<CoursePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) { setLoading(false); setCourse(null); return; }
    const controller = new AbortController();
    setLoading(true);
    setCourse(null);
    apiGet<CoursePayload>(`/api/language-quest/courses/${courseId}`, { signal: controller.signal })
      .then(setCourse)
      .catch((error: any) => { if (error?.name !== 'AbortError') toast.error(error?.message || 'Could not load the course'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [courseId]);

  const flattenedLessons = useMemo(() => course?.units.flatMap((unit) => unit.lessons) ?? [], [course]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl pb-16" aria-busy="true" aria-label="Loading course path">
        <Skeleton className="h-11 w-32 rounded-xl" /><Skeleton className="mt-5 h-64 w-full rounded-2xl" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">{Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-[440px] rounded-2xl" />)}</div>
          <Skeleton className="hidden h-72 rounded-2xl lg:block" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto grid min-h-[480px] max-w-xl place-items-center text-center"><div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-slate-200 text-slate-400 dark:border-slate-700"><Map className="h-7 w-7" /></span>
        <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">This course could not be found.</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">It may be unpublished or unavailable to your classroom.</p>
        <Button variant="outline" className="mt-5 min-h-11 rounded-xl" render={<Link to="/games/language-quest" />} nativeButton={false}>Back to courses</Button>
      </div></div>
    );
  }

  const percent = coursePercent(course.completedLessons, course.totalLessons);
  const displayedCompletedLessons = Math.min(Math.max(0, course.completedLessons), Math.max(0, course.totalLessons));
  const nextLesson = course.nextLessonId ? flattenedLessons.find((lesson) => lesson.id === course.nextLessonId && lesson.available && !lesson.locked) ?? null : null;
  const courseMode = languageQuestCourseMode(course.language);
  const usesStudyCards = languageQuestCourseUsesStudyCards(course.language);
  const isMathematics = courseMode === 'mathematics';
  const isSubjectCourse = !usesStudyCards;
  const subjectLabel = isMathematics ? 'maths' : courseMode === 'science' ? 'science' : courseMode === 'social-studies' ? 'social studies' : 'RLA';
  const courseStories = usesStudyCards ? languageQuestStoriesForCategory(course.category?.trim() || languageQuestCategoryForLanguage(course.language)) : [];
  const courseComplete = course.totalLessons > 0 && course.completedLessons >= course.totalLessons;
  const heroHref = nextLesson ? `/games/language-quest/lessons/${nextLesson.id}` : course.finalExam.available && course.finalExam.unlocked ? `/games/language-quest/courses/${course.id}/final-exam` : null;
  const heroAction = nextLesson ? (percent > 0 ? 'Continue lesson' : 'Start learning') : course.finalExam.available && course.finalExam.unlocked ? (course.finalExam.passed ? 'View exam status' : 'Take final exam') : null;

  return (
    <div className="lq-course-page mx-auto max-w-5xl pb-16">
      <Link to="/games/language-quest" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-black text-slate-500 outline-none hover:text-[#58a700] focus-visible:ring-4 focus-visible:ring-[#58cc02]/20 dark:text-slate-300">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All courses
      </Link>

      <QuestReveal className="mt-3">
        <section className="lq-course-hero" aria-labelledby="course-title">
          <div className="relative z-10 max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/75"><Flag className="h-4 w-4" aria-hidden="true" /> {course.language} · Learning path</p>
            <h1 id="course-title" className="mt-3 text-balance text-[clamp(2rem,6vw,3.6rem)] font-black leading-[0.98] tracking-[-0.045em] text-white">{course.title}</h1>
            {course.description && <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-white/85 sm:text-base"><LanguageQuestContentText language={course.language} text={course.description} /></p>}
            <div className="mt-7 max-w-xl">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-white"><span>{displayedCompletedLessons} of {Math.max(0, course.totalLessons)} lessons</span><span>{percent}%</span></div>
              <div className="h-4 overflow-hidden rounded-full bg-[#46a302] p-1" role="progressbar" aria-label="Course completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                <span className="block h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
            {heroHref && heroAction && <Link to={heroHref} className="lq-course-primary-action mt-6"><Play className="h-5 w-5 fill-current" aria-hidden="true" />{heroAction}</Link>}
          </div>
          <div className="lq-course-hero-mark" aria-hidden="true"><Target className="h-20 w-20" /></div>
        </section>
      </QuestReveal>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="min-w-0 space-y-8" aria-label={`${course.title} lessons`}>
          {course.units.map((unit, unitIndex) => (
            <QuestReveal key={unit.id} delay={Math.min(unitIndex * 0.05, 0.2)}>
              <section aria-labelledby={`unit-${unit.id}`}>
                <header className="lq-unit-banner">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">Unit {unitIndex + 1}</p>
                    <h2 id={`unit-${unit.id}`} className="mt-1 text-xl font-black text-white sm:text-2xl"><LanguageQuestContentText language={course.language} text={unit.title} /></h2>
                    {unit.description && <p className="mt-1 text-sm font-semibold leading-5 text-white/75"><LanguageQuestContentText language={course.language} text={unit.description} /></p>}
                  </div>
                  <span className="shrink-0 rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-xs font-black text-white">{unit.lessons.filter((lesson) => lesson.completed).length}/{unit.lessons.filter((lesson) => lesson.available).length}</span>
                </header>
                <UnitPath lessons={unit.lessons} nextLessonId={course.nextLessonId} language={course.language} />
              </section>
            </QuestReveal>
          ))}

          <QuestReveal>
            <section className="border-t-2 border-slate-200 pt-8 dark:border-slate-700" aria-labelledby="final-stretch-title">
              <div className="mb-4 flex items-center gap-3 px-1">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#fff4cc] text-[#b77900]"><Trophy className="h-5 w-5" /></span>
                <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b77900]">Finish line</p><h2 id="final-stretch-title" className="text-xl font-black text-slate-900 dark:text-white">Prove what you learned</h2></div>
              </div>
              <div className="divide-y-2 divide-slate-100 border-y-2 border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                <Milestone
                  tone="exam" icon={course.finalExam.passed ? <Award className="h-7 w-7" /> : <FileCheck2 className="h-7 w-7" />} eyebrow="Certificate requirement" title="Monitored Final Exam"
                  description={course.finalExam.passed
                    ? `Passed${course.finalExam.bestScorePercent !== null ? ` with a best score of ${course.finalExam.bestScorePercent}%` : ''}. Your verified certificate is unlocked.`
                    : !course.finalExam.available
                      ? `A teacher needs to add ${Math.max(0, course.finalExam.minQuestions - course.finalExam.eligibleQuestionCount)} more compatible scored questions.`
                      : course.finalExam.unlocked ? `${course.finalExam.questionCount} questions · ${course.finalExam.passPercent}% to pass · ${course.finalExam.attemptMinutes} minutes.` : 'Complete every lesson to unlock the certificate exam.'}
                  href={course.finalExam.available && course.finalExam.unlocked ? `/games/language-quest/courses/${course.id}/final-exam` : undefined}
                  action={course.finalExam.passed ? 'View' : course.finalExam.unlocked && course.finalExam.available ? 'Begin' : 'Locked'} disabled={!course.finalExam.available || !course.finalExam.unlocked}
                />
                <Milestone
                  tone="boss" icon={<Skull className="h-7 w-7" />} eyebrow="Bonus challenge" title="Boss Battle"
                  description={!course.bossBattle.available
                    ? `This challenge needs ${Math.max(0, course.bossBattle.minQuestions - course.bossBattle.eligibleQuestionCount)} more compatible choice questions.`
                    : course.bossBattle.unlocked ? 'Face a timed set of your toughest course questions for bonus XP.' : `${course.bossBattle.remainingChallenges} scored challenge${course.bossBattle.remainingChallenges === 1 ? '' : 's'} remain before it unlocks.`}
                  href={course.bossBattle.available && course.bossBattle.unlocked ? `/games/language-quest/courses/${course.id}/boss-battle` : undefined}
                  action={course.bossBattle.available && course.bossBattle.unlocked ? 'Challenge' : 'Locked'} disabled={!course.bossBattle.available || !course.bossBattle.unlocked}
                />
              </div>
            </section>
          </QuestReveal>

          {courseComplete && !isSubjectCourse && (
            <QuestReveal>
              <section className="lq-celebration-strip" aria-labelledby="course-complete-title">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#ffc800] text-[#7a5600] shadow-[0_5px_0_#d7a100]"><Trophy className="h-7 w-7" /></span>
                <div className="min-w-0 flex-1">
                  <h2 id="course-complete-title" className="text-xl font-black text-slate-900 dark:text-white">Course complete!</h2>
                  <p lang={explanationLanguage} className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{lq('completeHelp')}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" className="min-h-11 rounded-xl" render={<Link to={`/games/language-quest/courses/${course.id}/culture`} />} nativeButton={false}><Globe2 className="h-4 w-4" /> Culture Quest</Button>
                    {courseStories.length > 0 && <Button variant="outline" className="min-h-11 rounded-xl" render={<Link to={`/games/language-quest/courses/${course.id}/story/${courseStories[0].id}`} />} nativeButton={false}><BookOpenText className="h-4 w-4" /> Story Mode</Button>}
                    <Button variant="outline" className="min-h-11 rounded-xl" render={<Link to={`/games/word-trail?courseId=${course.id}`} />} nativeButton={false}><Dices className="h-4 w-4" /> Word Trail</Button>
                  </div>
                </div>
              </section>
            </QuestReveal>
          )}
        </main>

        <aside className="space-y-5 lg:sticky lg:top-24" aria-label="Course tools">
          <section className="lq-course-aside-panel" aria-labelledby="progress-title">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#58a700]">Your progress</p><h2 id="progress-title" className="mt-1 text-lg font-black text-slate-900 dark:text-white">{courseComplete ? 'Path complete' : `${course.totalLessons - Math.min(course.completedLessons, course.totalLessons)} lessons left`}</h2></div>
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-[5px] border-[#58cc02] text-sm font-black text-[#58a700]">{percent}%</span>
            </div>
            {nextLesson && <Link to={`/games/language-quest/lessons/${nextLesson.id}`} className="lq-course-side-action mt-5"><span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#58a700]">Up next</span><span className="mt-0.5 block truncate text-sm font-black text-slate-800 dark:text-white">{nextLesson.title}</span></span><ChevronRight className="h-5 w-5 shrink-0" /></Link>}
          </section>

          {usesStudyCards && (
            <section className="lq-course-aside-panel" aria-labelledby="words-title">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ddf4ff] text-[#1899d6] dark:bg-sky-500/15 dark:text-sky-300"><BookMarked className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1899d6]">Study tool</p><h2 id="words-title" className="font-black text-slate-900 dark:text-white">Learned words</h2></div></div>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">Every completed vocabulary practice is saved for review.</p>
              <Link to={`/games/language-quest/words?courseId=${course.id}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#84d8ff] px-4 text-sm font-black text-[#1899d6] shadow-[0_3px_0_#84d8ff] outline-none hover:bg-[#f0faff] focus-visible:ring-4 focus-visible:ring-sky-200 dark:hover:bg-sky-500/10"><BookOpenText className="h-4 w-4" /> Review words</Link>
            </section>
          )}
          <CourseGuide isSubjectCourse={isSubjectCourse} subjectLabel={subjectLabel} explanationLanguage={explanationLanguage} lq={lq} />
        </aside>
      </div>
    </div>
  );
}
