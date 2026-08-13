import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { BarChart3, BookOpen, ChevronDown, Flame, GraduationCap, Heart, Languages, Map, Settings2, Sparkles, Star, Trophy, UserRound, Users, WholeWord } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white px-1.5 py-2 text-center shadow-sm dark:border-surface-raised dark:bg-surface-indigo sm:flex-row sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-left">
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black leading-none text-slate-900 dark:text-white sm:text-xl">{value}</p>
        <p className="mt-1 truncate text-[10px] font-medium text-slate-500 dark:text-slate-300 sm:text-xs">{label}</p>
      </div>
    </div>
  );
}

function CompactDashboardSection({
  id,
  icon,
  title,
  summary,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `${id}-panel`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 text-left shadow-sm outline-none transition hover:border-violet-300 focus-visible:ring-4 focus-visible:ring-violet-400/30 dark:border-slate-700 dark:bg-slate-900/85 dark:hover:border-violet-500/50 md:hidden"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-black text-slate-950 dark:text-white">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-300">{summary}</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div id={panelId} className={`${open ? 'mt-3 block' : 'hidden'} md:block`}>
        {children}
      </div>
    </div>
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

  const load = () => {
    setLoading(true);
    setFailed(false);
    apiGet<LanguageQuestOverview>('/api/language-quest/overview')
      .then(setData)
      .catch((error: any) => {
        setFailed(true);
        toast.error(error?.message || 'Could not load Language Quest');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <div className="space-y-7 pb-10" aria-busy="true" aria-label="Loading Language Quest">
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
        <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">Language Quest is taking a break</h1>
        <p className="mt-1 text-sm text-slate-500">Please try loading the courses again.</p>
        <Button className="mt-5" onClick={load}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8 sm:space-y-7 sm:pb-10">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-fuchsia-700 to-rose-600 p-4 text-white shadow-xl sm:rounded-3xl sm:p-8">
        <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-amber-300/15" />
        <img
          src="/icons/LanguageQuests_Graphics/Owl School 12.svg"
          alt=""
          aria-hidden="true"
          className="lq-float-delayed pointer-events-none absolute -bottom-8 right-4 hidden h-44 w-44 object-contain opacity-25 drop-shadow-2xl xl:block"
        />
        <div className="relative flex flex-col justify-between gap-4 sm:gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">
              <Sparkles className="h-3 w-3" /> Learn • Play • Grow
            </Badge>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:mt-4 sm:text-4xl">MRLC Language Quest</h1>
            <p lang={explanationLanguage} className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-white/85 sm:mt-2 sm:text-base sm:leading-6">
              {lq('journeySummary')}
            </p>
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            <Button size="sm" variant="outline" className="shrink-0 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:h-10" render={<Link to="/games/language-quest/profile" />} nativeButton={false}>
              <UserRound className="mr-2 h-4 w-4" /> My Profile
            </Button>
            <Button size="sm" variant="outline" className="shrink-0 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:h-10" render={<Link to="/games/language-quest/words" />} nativeButton={false}>
              <BookOpen className="mr-2 h-4 w-4" /> My Learned Words
            </Button>
            <Button size="sm" variant="outline" className="shrink-0 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:h-10" render={<Link to="/games/language-quest/leaderboard" />} nativeButton={false}>
              <Trophy className="mr-2 h-4 w-4" /> Leaderboard
            </Button>
            {data.canManage && (
              <>
                <Button size="sm" className="shrink-0 bg-white text-violet-700 hover:bg-white/90 sm:h-10" render={<Link to="/games/language-quest/classrooms" />} nativeButton={false}>
                  <GraduationCap className="mr-2 h-4 w-4" /> Classrooms
                </Button>
                <Button size="sm" className="shrink-0 bg-white text-violet-700 hover:bg-white/90 sm:h-10" render={<Link to="/games/language-quest/analytics" />} nativeButton={false}>
                  <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                </Button>
                <Button size="sm" className="shrink-0 bg-white text-violet-700 hover:bg-white/90 sm:h-10" render={<Link to="/games/language-quest/manage" />} nativeButton={false}>
                  <Settings2 className="mr-2 h-4 w-4" /> Manage Courses
                </Button>
              </>
            )}
            {user?.role === 'ADMIN' && (
              <Button size="sm" className="shrink-0 bg-slate-950/80 text-white hover:bg-slate-950 sm:h-10" render={<Link to="/games/language-quest/learners" />} nativeButton={false}>
                <Users className="mr-2 h-4 w-4" /> Manage Learners
              </Button>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Learning stats" className="grid grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon={<Heart className="h-5 w-5 fill-current" />} label="Hearts" value={`${data.profile.hearts}/${data.profile.maxHearts}`} tone="bg-rose-100 text-rose-600 dark:bg-rose-500/15" />
        <StatCard icon={<Star className="h-5 w-5 fill-current" />} label="Total XP" value={data.profile.points} tone="bg-amber-100 text-amber-600 dark:bg-amber-500/15" />
        <StatCard icon={<Flame className="h-5 w-5 fill-current" />} label="Day streak" value={data.profile.currentStreak} tone="bg-orange-100 text-orange-600 dark:bg-orange-500/15" />
        <StatCard icon={<Trophy className="h-5 w-5" />} label="Best streak" value={data.profile.bestStreak} tone="bg-violet-100 text-violet-600 dark:bg-violet-500/15" />
      </section>

      <section className="flex flex-row items-center justify-between gap-3 overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-fuchsia-50 to-violet-50 p-3 shadow-sm dark:border-rose-500/20 dark:from-rose-950/25 dark:via-fuchsia-950/20 dark:to-violet-950/25 sm:rounded-3xl sm:p-6">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white shadow-lg sm:h-13 sm:w-13 sm:rounded-2xl"><Heart className="h-5 w-5 fill-current sm:h-6 sm:w-6" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-600 dark:text-fuchsia-300">Comeback corner</p>
            <h2 className="mt-0.5 text-sm font-black text-slate-950 dark:text-white sm:mt-1 sm:text-xl">Refill hearts. Reveal cards.</h2>
            <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:block">
              {data.profile.hearts < data.profile.maxHearts
                ? 'Take a short review quiz to restore one heart. Your first successful refill today includes a no-duplicate surprise card.'
                : `Hearts are full. You have found ${data.surpriseCards.unlockedCount}/${data.surpriseCards.totalCount} Surprise Heart Cards.`}
            </p>
          </div>
        </div>
        <Button size="sm" className="shrink-0 bg-fuchsia-700 px-3 font-black text-white hover:bg-fuchsia-800 sm:h-10" render={<Link to="/games/language-quest/heart-refill" />} nativeButton={false}>
          <Sparkles className="h-4 w-4 sm:mr-2" /> <span className="sr-only sm:not-sr-only">{data.profile.hearts < data.profile.maxHearts ? 'Refill a heart' : 'See refill challenge'}</span>
        </Button>
      </section>

      <CourseLibrary courses={data.courses} progressSavedText={lq('progressSaved')} />

      <CompactDashboardSection id="dashboard-missions" icon={<Flame className="h-5 w-5" />} title="Missions" summary="Daily goals, mastery and classroom challenges">
        <LanguageQuestEngagement onXpChanged={load} />
      </CompactDashboardSection>

      <CompactDashboardSection id="dashboard-quest-cards" icon={<Trophy className="h-5 w-5" />} title="Quest Cards" summary={`Level ${data.profile.rewards.level} • ${data.profile.rewards.unlockedCardIds.length} cards unlocked`}>
        <LanguageQuestRewardTrack rewards={data.profile.rewards} bestStreak={data.profile.bestStreak} />
      </CompactDashboardSection>

      <CompactDashboardSection id="dashboard-legendary-vault" icon={<Star className="h-5 w-5" />} title="Legendary Vault" summary={`${data.profile.rewards.unlockedLegendaryIds.length} historical cards unlocked`}>
        <LanguageQuestLegendaryVault rewards={data.profile.rewards} learnerName={user?.name || 'Language Quest Learner'} />
      </CompactDashboardSection>

      <CompactDashboardSection id="dashboard-subject-albums" icon={<BookOpen className="h-5 w-5" />} title="Subject albums" summary={`${new Set(data.courses.map((course) => course.language)).size} subjects in your card journey`}>
        <LanguageQuestLanguageAlbums courses={data.courses} />
      </CompactDashboardSection>

      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-sky-100 bg-sky-50 p-3 sm:flex-row sm:items-center sm:p-5 dark:border-sky-500/20 dark:bg-sky-500/10">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm dark:bg-surface-indigo dark:text-sky-300"><WholeWord className="h-5 w-5" /></span>
          <div>
            <h2 lang={explanationLanguage} className="font-black text-slate-900 dark:text-white">{lq('sentenceFeatureTitle')}</h2>
            <p lang={explanationLanguage} className="mt-1 line-clamp-2 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-300 sm:text-sm sm:leading-6">{lq('sentenceFeatureBody')}</p>
          </div>
        </div>
      </section>

      <CompactDashboardSection id="dashboard-achievements" icon={<Sparkles className="h-5 w-5" />} title="Achievements" summary={`${data.profile.currentStreak}-day streak • certificates and sharing`}>
        <LanguageQuestAchievements
          learnerName={user?.name || 'Language Quest Learner'}
          profile={data.profile}
          courses={data.courses}
        />
      </CompactDashboardSection>
    </div>
  );
}
