import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Crown, Flame, Heart, LayoutGrid, Languages, Map, Sparkles, Star, Trophy, WholeWord } from 'lucide-react';
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

function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15">{icon}</span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-black">{value}</p>
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-white/70">{label}</p>
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
    <section className={`flex items-center justify-between gap-3 rounded-2xl border p-3 shadow-sm ${low ? 'border-rose-200 bg-rose-50 dark:border-rose-500/25 dark:bg-rose-950/20' : 'border-slate-200 bg-white dark:border-surface-raised dark:bg-surface-indigo'}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${low ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
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
        className={low ? 'shrink-0 bg-rose-600 text-white hover:bg-rose-700' : 'shrink-0'}
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
    <section aria-labelledby="language-quest-course-library-title">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Continue learning</p>
          <h2 id="language-quest-course-library-title" className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Choose a course</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{progressSavedText}</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <BookOpen className="mx-auto h-11 w-11 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No published courses yet</p>
          <p className="mt-1 text-sm text-slate-500">A teacher or administrator can create the first course.</p>
        </div>
      ) : (
        <LanguageQuestCourseFolders
          groups={courseGroups}
          idPrefix="learner-course-folder"
          renderCourse={(course) => (
            <article key={course.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-surface-raised dark:bg-surface-indigo">
              <div className="h-2" style={{ backgroundColor: course.accentColor }} />
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl" style={{ backgroundColor: `${course.accentColor}18` }}>
                    {course.imageEmoji || <BookOpen className="h-6 w-6" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Badge variant="outline">{course.language}</Badge>
                    <h4 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{course.title}</h4>
                  </div>
                </div>
                <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-300">{course.description || 'A new language adventure.'}</p>
                <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>{course.lessonCount} lessons</span>
                  <span>{course.progressPercent}% complete</span>
                </div>
                <Progress value={course.progressPercent} className="mt-2 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-indicator]]:bg-violet-600" />
                <div className="mt-5 flex items-center gap-2">
                  <Button
                    className="flex-1"
                    style={{ backgroundColor: course.accentColor }}
                    render={<Link to={course.completed && !course.certificateEligible && course.finalExam.available ? `/games/language-quest/courses/${course.id}/final-exam` : course.nextLessonId ? `/games/language-quest/lessons/${course.nextLessonId}` : `/games/language-quest/courses/${course.id}`} />}
                    nativeButton={false}
                  >
                    {course.certificateEligible ? 'Certificate earned' : course.completed && course.finalExam.available ? 'Take final exam' : course.completed ? 'Exam setup required' : course.nextLessonId ? (course.progressPercent > 0 ? 'Resume lesson' : 'Start course') : 'View course'}
                  </Button>
                  {course.progressPercent > 0 && (
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="View course path"
                      title="View course path"
                      render={<Link to={`/games/language-quest/courses/${course.id}`} />}
                      nativeButton={false}
                    >
                      <Map className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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
      <div className="space-y-7 pb-10" aria-busy="true" aria-label="Loading Learning Quest">
        <div className="rounded-3xl bg-violet-100/70 p-6 dark:bg-violet-500/10 sm:p-8">
          <Skeleton className="h-5 w-32 rounded-full bg-violet-200/70 dark:bg-violet-900/40" />
          <Skeleton className="mt-4 h-9 w-72 max-w-full bg-violet-200/70 dark:bg-violet-900/40" />
          <Skeleton className="mt-3 h-4 w-full max-w-md bg-violet-200/50 dark:bg-violet-900/30" />
          <Skeleton className="mt-2 h-4 w-2/3 max-w-sm bg-violet-200/50 dark:bg-violet-900/30" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, statIndex) => (
            <div key={statIndex} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-surface-raised dark:bg-surface-indigo">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
        <div>
          <Skeleton className="h-6 w-44" />
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <div key={cardIndex} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-surface-raised dark:bg-surface-indigo">
                <Skeleton className="h-2 w-full rounded-none" />
                <div className="space-y-3 p-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
                    <div className="flex-1 space-y-2 pt-1">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-surface-raised dark:bg-surface-indigo">
        <Languages className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">Learning Quest is taking a break</h1>
        <p className="mt-1 text-sm text-slate-500">Please try loading the courses again.</p>
        <Button className="mt-5" onClick={load}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 pb-8 sm:space-y-5 sm:pb-10">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-fuchsia-700 to-rose-600 p-4 text-white shadow-xl sm:rounded-3xl sm:p-6">
        <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10" />
        <img
          src="/icons/LanguageQuests_Graphics/Owl School 12.svg"
          alt=""
          aria-hidden="true"
          className="lq-float-delayed pointer-events-none absolute -bottom-8 right-4 hidden h-32 w-32 object-contain opacity-20 drop-shadow-2xl xl:block"
        />
        <div className="relative flex flex-col justify-between gap-4 sm:gap-6 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">
              <Sparkles className="h-3 w-3" /> Learn • Play • Grow
            </Badge>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:mt-4 sm:text-3xl">MRLC Learning Quest</h1>
            <p lang={explanationLanguage} className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-white/85 sm:mt-2 sm:text-sm sm:leading-6">
              {lq('journeySummary')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 lg:justify-end">
            <HeroStat icon={<Heart className="h-4 w-4 fill-current" />} value={`${data.profile.hearts}/${data.profile.maxHearts}`} label="Hearts" />
            <HeroStat icon={<Star className="h-4 w-4 fill-current" />} value={data.profile.points} label="Total XP" />
            <HeroStat icon={<Flame className="h-4 w-4 fill-current" />} value={data.profile.currentStreak} label="Day streak" />
            <HeroStat icon={<Trophy className="h-4 w-4" />} value={data.profile.bestStreak} label="Best streak" />
          </div>
        </div>
      </section>

      <HeartRefillBar
        hearts={data.profile.hearts}
        maxHearts={data.profile.maxHearts}
        unlockedSurpriseCards={data.surpriseCards.unlockedCount}
        totalSurpriseCards={data.surpriseCards.totalCount}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
          <TabsList className="grid !h-auto w-full grid-cols-3 items-stretch gap-2 bg-transparent p-0 sm:grid-cols-6">
            <TabsTrigger value="learn" className="h-12 min-h-0 min-w-0 gap-1.5 overflow-hidden rounded-xl border border-transparent px-2 font-black after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-violet-400 data-active:bg-violet-600 data-active:text-white data-active:shadow-sm sm:gap-2 sm:px-3">
              <BookOpen className="h-4 w-4" /> Learn
            </TabsTrigger>
            <TabsTrigger value="missions" className="h-12 min-h-0 min-w-0 gap-1.5 overflow-hidden rounded-xl border border-transparent px-2 font-black after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-sky-400 data-active:bg-sky-600 data-active:text-white data-active:shadow-sm sm:gap-2 sm:px-3">
              <Flame className="h-4 w-4" /> Missions
            </TabsTrigger>
            <TabsTrigger value="cards" className="h-12 min-h-0 min-w-0 gap-1.5 overflow-hidden rounded-xl border border-transparent px-2 font-black after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-fuchsia-400 data-active:bg-fuchsia-600 data-active:text-white data-active:shadow-sm sm:gap-2 sm:px-3">
              <Trophy className="h-4 w-4" /> Quest Cards
            </TabsTrigger>
            <TabsTrigger value="vault" className="h-12 min-h-0 min-w-0 gap-1.5 overflow-hidden rounded-xl border border-transparent px-2 font-black after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-amber-400 data-active:bg-amber-600 data-active:text-white data-active:shadow-sm sm:gap-2 sm:px-3">
              <Crown className="h-4 w-4" /> Vault
            </TabsTrigger>
            <TabsTrigger value="albums" className="h-12 min-h-0 min-w-0 gap-1.5 overflow-hidden rounded-xl border border-transparent px-2 font-black after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-pink-400 data-active:bg-pink-600 data-active:text-white data-active:shadow-sm sm:gap-2 sm:px-3">
              <LayoutGrid className="h-4 w-4" /> Albums
            </TabsTrigger>
            <TabsTrigger value="achievements" className="h-12 min-h-0 min-w-0 gap-1.5 overflow-hidden rounded-xl border border-transparent px-2 font-black after:hidden focus-visible:ring-2 focus-visible:ring-inset data-active:border-emerald-400 data-active:bg-emerald-600 data-active:text-white data-active:shadow-sm sm:gap-2 sm:px-3">
              <Sparkles className="h-4 w-4" /> Awards
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="learn" className="space-y-5 outline-none">
          <CourseLibrary courses={data.courses} progressSavedText={lq('progressSaved')} />
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-surface-raised dark:bg-surface-indigo">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"><WholeWord className="h-4 w-4" /></span>
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
