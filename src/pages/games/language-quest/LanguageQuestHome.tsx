import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookOpen, Crown, Flame, Heart, LayoutGrid, Languages, Map, Sparkles, Star, Trophy, WholeWord } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiGet } from '@/src/lib/api';
import type { LanguageQuestCourseSummary, LanguageQuestOverview } from '@/src/types/languageQuest';
import { useAuth } from '@/src/providers/AuthProvider';
import { LanguageQuestAchievements } from '@/src/components/games/LanguageQuestAchievements';
import { LanguageQuestCourseFolders } from '@/src/components/games/LanguageQuestCourseFolder';
import { useLanguageQuestSupport } from '@/src/components/games/LanguageQuestSupport';
import { orderedLanguageQuestCategories } from '@/shared/languageQuestCourseCategories';
import { LanguageQuestRewardTrack } from '@/src/components/games/LanguageQuestRewards';
import {
  LanguageQuestEngagement,
  LanguageQuestLanguageAlbums,
} from '@/src/components/games/LanguageQuestEngagement';
import { LanguageQuestLegendaryVault } from '@/src/components/games/LanguageQuestLegendaryRewards';
import { QuestDepthStage, QuestReveal, QuestStaggeredText } from '@/src/components/games/LanguageQuestMotion';

function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10">{icon}</span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-lg font-extrabold tabular-nums">{value}</p>
        <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-white/65">{label}</p>
      </div>
    </div>
  );
}

function HeartRefillBar({
  hearts,
  maxHearts,
  unlockedSurpriseCards,
  totalSurpriseCards,
}: {
  hearts: number;
  maxHearts: number;
  unlockedSurpriseCards: number;
  totalSurpriseCards: number;
}) {
  const low = hearts < maxHearts;
  return (
    <section className={`flex items-center justify-between gap-3 border-y px-1 py-3 ${low ? 'border-rose-200/90 bg-rose-50/70 dark:border-rose-500/25 dark:bg-rose-950/20' : 'border-[var(--lq-steel-border)] bg-white/45 dark:border-slate-700 dark:bg-slate-900/25'}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${low ? 'bg-rose-600 text-white' : 'border border-[var(--lq-steel-border)] bg-white text-[var(--lq-slate-caption)] dark:border-slate-700 dark:bg-slate-900'}`}>
          <Heart className="h-4 w-4 fill-current" />
        </span>
        <p className="min-w-0 truncate text-sm font-bold text-slate-700 dark:text-slate-200">
          {low
            ? 'Take a short review quiz to refill a heart and reveal a surprise card.'
            : `Hearts are full • ${unlockedSurpriseCards}/${totalSurpriseCards} surprise cards found`}
        </p>
      </div>
      <Button
        size="sm"
        className={low ? 'shrink-0 rounded-full bg-rose-600 text-white hover:bg-rose-700' : 'shrink-0 rounded-full'}
        variant={low ? undefined : 'outline'}
        render={<Link to="/games/language-quest/heart-refill" />}
        nativeButton={false}
      >
        {low ? 'Refill a heart' : 'View'}
      </Button>
    </section>
  );
}

function CourseLibrary({ courses, progressSavedText }: { courses: LanguageQuestCourseSummary[]; progressSavedText: string }) {
  const courseGroups = orderedLanguageQuestCategories(courses);

  return (
    <section id="course-library" className="scroll-mt-28" aria-labelledby="language-quest-course-library-title">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lq-signal-blue)]">Continue learning</p>
          <h2 id="language-quest-course-library-title" className="mt-1 text-xl font-bold text-[var(--lq-charcoal)] dark:text-white">Choose a course</h2>
          <p className="mt-1 text-sm text-[var(--lq-slate-caption)] dark:text-slate-300">{progressSavedText}</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="lq-card border border-dashed border-[var(--lq-steel-border)] p-12 text-center dark:border-slate-700">
          <BookOpen className="mx-auto h-11 w-11 text-[var(--lq-signal-blue)]/50" />
          <p className="mt-3 font-semibold text-[var(--lq-charcoal)] dark:text-slate-200">No published courses yet</p>
          <p className="mt-1 text-sm text-[var(--lq-slate-caption)]">A teacher or administrator can create the first course.</p>
        </div>
      ) : (
        <LanguageQuestCourseFolders
          groups={courseGroups}
          idPrefix="learner-course-folder"
          renderCourse={(course) => (
            <article key={course.id} className="group min-w-0 bg-white p-5 transition-colors hover:bg-sky-50/70 dark:bg-slate-900 dark:hover:bg-slate-800/85">
                <div className="flex items-start gap-4">
                  <div className="lq-tile-circle relative grid h-14 w-14 shrink-0 place-items-center border border-[var(--lq-steel-border)] text-3xl dark:border-slate-700">
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900" style={{ backgroundColor: course.accentColor }} aria-hidden="true" />
                    {course.imageEmoji || <BookOpen className="h-6 w-6" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Badge variant="outline" className="border-[var(--lq-steel-border)] text-[var(--lq-slate-caption)]">{course.language}</Badge>
                    <h4 className="mt-2 text-lg font-bold text-[var(--lq-charcoal)] dark:text-white">{course.title}</h4>
                  </div>
                </div>
                <p className="mt-3 min-h-10 text-sm leading-5 text-[var(--lq-slate-caption)] dark:text-slate-300">{course.description || 'A new language adventure.'}</p>
                <div className="mt-4 flex items-center justify-between text-xs font-medium text-[var(--lq-slate-caption)]">
                  <span>{course.lessonCount} lessons</span>
                  <span>{course.progressPercent}% complete</span>
                </div>
                <Progress value={course.progressPercent} className="mt-2 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-indicator]]:bg-[var(--lq-signal-blue)]" />
                <div className="mt-5 flex items-center gap-2 border-t border-[var(--lq-steel-border)] pt-4 dark:border-slate-700">
                  <Link
                    to={course.completed && !course.certificateEligible && course.finalExam.available ? `/games/language-quest/courses/${course.id}/final-exam` : course.nextLessonId ? `/games/language-quest/lessons/${course.nextLessonId}` : `/games/language-quest/courses/${course.id}`}
                    className="inline-flex min-h-10 flex-1 items-center justify-between rounded-full px-1 text-sm font-extrabold text-[var(--lq-signal-blue)] outline-none transition group-hover:pl-2 focus-visible:ring-4 focus-visible:ring-[var(--lq-signal-blue)]/20"
                  >
                    {course.certificateEligible ? 'Certificate earned' : course.completed && course.finalExam.available ? 'Take final exam' : course.completed ? 'Exam setup required' : course.nextLessonId ? (course.progressPercent > 0 ? 'Resume lesson' : 'Start course') : 'View course'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                  {course.progressPercent > 0 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full border-[var(--lq-steel-border)] text-[var(--lq-signal-blue)]"
                      aria-label="View course path"
                      title="View course path"
                      render={<Link to={`/games/language-quest/courses/${course.id}`} />}
                      nativeButton={false}
                    >
                      <Map className="h-4 w-4" />
                    </Button>
                  )}
                </div>
            </article>
          )}
        />
      )}
    </section>
  );
}

export default function LanguageQuestHome() {
  const { user } = useAuth();
  const { explanationLanguage, lq } = useLanguageQuestSupport();
  const [data, setData] = useState<LanguageQuestOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeTab, setActiveTab] = useState('learn');

  const load = () => {
    setLoading(true);
    setFailed(false);
    apiGet<LanguageQuestOverview>('/api/language-quest/overview')
      .then(setData)
      .catch((error: any) => {
        setFailed(true);
        toast.error(error?.message || 'Could not load Learning Quest');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <div className="space-y-6 pb-10" aria-busy="true" aria-label="Loading Learning Quest">
        <div className="lq-hero-gradient overflow-hidden rounded-[1.75rem] p-6 sm:p-8">
          <Skeleton className="h-4 w-32 rounded-full bg-white/20" />
          <Skeleton className="mt-5 h-10 w-80 max-w-full bg-white/20" />
          <Skeleton className="mt-4 h-4 w-full max-w-lg bg-white/15" />
          <Skeleton className="mt-2 h-4 w-2/3 max-w-md bg-white/15" />
          <div className="mt-8 grid grid-cols-2 divide-x divide-white/15 border-t border-white/15 pt-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, statIndex) => <Skeleton key={statIndex} className="mx-4 my-3 h-10 bg-white/15" />)}
          </div>
        </div>
        <div className="border-t border-[var(--lq-steel-border)] pt-6">
          <Skeleton className="h-6 w-44" />
          <div className="mt-5 flex gap-5 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 w-24 shrink-0 rounded-full" />)}
          </div>
          <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-[var(--lq-steel-border)] bg-[var(--lq-steel-border)] md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <div key={cardIndex} className="space-y-3 bg-white p-5 dark:bg-slate-900">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2 pt-1">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="border-y border-[var(--lq-steel-border)] bg-white/60 px-5 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-[var(--lq-steel-border)] text-[var(--lq-signal-blue)] dark:border-slate-700"><Languages className="h-8 w-8" /></span>
        <h1 className="mt-5 text-2xl font-extrabold text-[var(--lq-charcoal)] dark:text-white">Learning Quest is taking a short break</h1>
        <p className="mt-2 text-sm text-[var(--lq-slate-caption)]">Your progress is safe. Try loading the course library again.</p>
        <button type="button" className="lq-btn-primary mt-5" onClick={load}>Try Again</button>
      </div>
    );
  }

  const nextCourse = data.courses.find((course) => course.progressPercent > 0 && !course.completed) ?? data.courses.find((course) => !course.completed) ?? data.courses[0];
  const nextHref = nextCourse?.nextLessonId
    ? `/games/language-quest/lessons/${nextCourse.nextLessonId}`
    : nextCourse
      ? `/games/language-quest/courses/${nextCourse.id}`
      : '#course-library';
  const learnerName = user?.name?.trim().split(/\s+/)[0] || 'Learner';

  return (
    <div className="min-w-0 max-w-full space-y-5 pb-8 sm:space-y-6 sm:pb-10">
      <section className="lq-hero-gradient relative overflow-hidden rounded-[1.75rem] text-white">
        <div className="lq-hero-grid absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative grid min-h-[390px] items-center gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)] lg:px-10">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-[var(--lq-spring-mint)]" /> Your learning passport
            </p>
            <QuestStaggeredText
              text={`${learnerName}, your next small win is ready.`}
              className="mt-5 max-w-[14ch] text-balance text-[clamp(2.35rem,6vw,4.8rem)] font-extrabold leading-[0.94] tracking-[-0.055em] text-white"
            />
            <p lang={explanationLanguage} className="mt-5 max-w-xl text-pretty text-sm leading-6 text-white/78 sm:text-base sm:leading-7">
              {lq('journeySummary')}
            </p>
            {nextCourse && (
              <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link to={nextHref} className="lq-btn-primary min-h-12 px-6">
                  {nextCourse.progressPercent > 0 ? 'Continue' : 'Start'} {nextCourse.title}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <p className="text-xs font-bold text-white/65">{nextCourse.progressPercent}% complete · {nextCourse.lessonCount} lessons</p>
              </div>
            )}
          </div>

          <QuestDepthStage className="mx-auto hidden w-full max-w-sm lg:block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-white/25 bg-white/10 p-6 backdrop-blur-sm">
              <span className="absolute left-6 top-6 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[var(--lq-signal-blue)]">Hello, {learnerName}!</span>
              <img
                src="/icons/LanguageQuests_Graphics/Owl School 12.svg"
                alt="A friendly owl guide ready for the next lesson"
                width="320"
                height="240"
                className="lq-depth-2 absolute bottom-0 right-2 h-[82%] w-[82%] object-contain drop-shadow-2xl"
              />
              <span className="absolute bottom-5 left-5 grid h-16 w-16 place-items-center rounded-full border-4 border-white/25 bg-[var(--lq-spring-mint)] text-center text-xs font-extrabold leading-tight text-[var(--lq-charcoal)]">
                {nextCourse?.progressPercent ?? 0}%<br />done
              </span>
            </div>
          </QuestDepthStage>
        </div>

        <div className="relative grid grid-cols-2 divide-x divide-y divide-white/15 border-t border-white/15 bg-black/5 sm:divide-y-0 lg:grid-cols-4">
          <HeroStat icon={<Heart className="h-4 w-4 fill-current" />} value={`${data.profile.hearts}/${data.profile.maxHearts}`} label="Hearts" />
          <HeroStat icon={<Star className="h-4 w-4 fill-current" />} value={data.profile.points} label="Total XP" />
          <HeroStat icon={<Flame className="h-4 w-4 fill-current" />} value={data.profile.currentStreak} label="Day streak" />
          <HeroStat icon={<Trophy className="h-4 w-4" />} value={data.profile.bestStreak} label="Best streak" />
        </div>
      </section>

      <HeartRefillBar
        hearts={data.profile.hearts}
        maxHearts={data.profile.maxHearts}
        unlockedSurpriseCards={data.surpriseCards.unlockedCount}
        totalSurpriseCards={data.surpriseCards.totalCount}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="border-b border-[var(--lq-steel-border)] dark:border-slate-700">
          <TabsList className="lq-mode-rail flex !h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
            <TabsTrigger value="learn" className="h-13 min-h-0 shrink-0 gap-2 rounded-none border-b-[3px] border-transparent px-4 font-extrabold text-[var(--lq-slate-caption)] after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-[var(--lq-signal-blue)] data-active:bg-transparent data-active:text-[var(--lq-signal-blue)]">
              <BookOpen className="h-4 w-4" /> Learn
            </TabsTrigger>
            <TabsTrigger value="missions" className="h-13 min-h-0 shrink-0 gap-2 rounded-none border-b-[3px] border-transparent px-4 font-extrabold text-[var(--lq-slate-caption)] after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-[var(--lq-signal-blue)] data-active:bg-transparent data-active:text-[var(--lq-signal-blue)]">
              <Flame className="h-4 w-4" /> Missions
            </TabsTrigger>
            <TabsTrigger value="cards" className="h-13 min-h-0 shrink-0 gap-2 rounded-none border-b-[3px] border-transparent px-4 font-extrabold text-[var(--lq-slate-caption)] after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-[var(--lq-signal-blue)] data-active:bg-transparent data-active:text-[var(--lq-signal-blue)]">
              <Trophy className="h-4 w-4" /> Quest Cards
            </TabsTrigger>
            <TabsTrigger value="vault" className="h-13 min-h-0 shrink-0 gap-2 rounded-none border-b-[3px] border-transparent px-4 font-extrabold text-[var(--lq-slate-caption)] after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-[var(--lq-signal-blue)] data-active:bg-transparent data-active:text-[var(--lq-signal-blue)]">
              <Crown className="h-4 w-4" /> Vault
            </TabsTrigger>
            <TabsTrigger value="albums" className="h-13 min-h-0 shrink-0 gap-2 rounded-none border-b-[3px] border-transparent px-4 font-extrabold text-[var(--lq-slate-caption)] after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-[var(--lq-signal-blue)] data-active:bg-transparent data-active:text-[var(--lq-signal-blue)]">
              <LayoutGrid className="h-4 w-4" /> Albums
            </TabsTrigger>
            <TabsTrigger value="achievements" className="h-13 min-h-0 shrink-0 gap-2 rounded-none border-b-[3px] border-transparent px-4 font-extrabold text-[var(--lq-slate-caption)] after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-[var(--lq-signal-blue)] data-active:bg-transparent data-active:text-[var(--lq-signal-blue)]">
              <Sparkles className="h-4 w-4" /> Awards
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="learn" className="space-y-5 outline-none">
          <QuestReveal><CourseLibrary courses={data.courses} progressSavedText={lq('progressSaved')} /></QuestReveal>
          <div className="flex items-start gap-3 border-y border-[var(--lq-steel-border)] bg-white/45 px-1 py-4 dark:border-slate-700 dark:bg-slate-900/25">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--lq-steel-border)] bg-white text-[var(--lq-signal-blue)] dark:border-slate-700 dark:bg-slate-900"><WholeWord className="h-4 w-4" /></span>
            <div>
              <h2 lang={explanationLanguage} className="text-sm font-black text-slate-900 dark:text-white">{lq('sentenceFeatureTitle')}</h2>
              <p lang={explanationLanguage} className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{lq('sentenceFeatureBody')}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="missions" className="outline-none">
          <LanguageQuestEngagement onXpChanged={load} />
        </TabsContent>

        <TabsContent value="cards" className="outline-none">
          <LanguageQuestRewardTrack rewards={data.profile.rewards} bestStreak={data.profile.bestStreak} />
        </TabsContent>

        <TabsContent value="vault" className="outline-none">
          <LanguageQuestLegendaryVault rewards={data.profile.rewards} expanded learnerName={user?.name || 'Learning Quest Learner'} />
        </TabsContent>

        <TabsContent value="albums" className="outline-none">
          <LanguageQuestLanguageAlbums courses={data.courses} />
        </TabsContent>

        <TabsContent value="achievements" className="outline-none">
          <LanguageQuestAchievements
            learnerName={user?.name || 'Learning Quest Learner'}
            profile={data.profile}
            courses={data.courses}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
