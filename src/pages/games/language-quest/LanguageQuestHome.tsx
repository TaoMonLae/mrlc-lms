import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Flame, GraduationCap, Heart, Languages, Settings2, Sparkles, Star, Trophy, UserRound, Users, WholeWord } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiGet } from '@/src/lib/api';
import type { LanguageQuestOverview } from '@/src/types/languageQuest';
import { useAuth } from '@/src/providers/AuthProvider';
import { LanguageQuestAchievements } from '@/src/components/games/LanguageQuestAchievements';
import { LanguageQuestCourseFolder } from '@/src/components/games/LanguageQuestCourseFolder';
import { useLanguageQuestSupport } from '@/src/components/games/LanguageQuestSupport';
import { orderedLanguageQuestCategories } from '@/shared/languageQuestCourseCategories';

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>{icon}</div>
      <div>
        <p className="text-xl font-black leading-none text-slate-900 dark:text-white">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-300">{label}</p>
      </div>
    </div>
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
      <div className="grid min-h-[420px] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">Preparing your next quest…</p>
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

  const courseGroups = orderedLanguageQuestCategories(data.courses);

  return (
    <div className="space-y-7 pb-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-fuchsia-700 to-rose-600 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-amber-300/15" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">
              <Sparkles className="h-3 w-3" /> Learn • Play • Grow
            </Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">MRLC Language Quest</h1>
            <p lang={explanationLanguage} className="mt-2 max-w-xl text-sm leading-6 text-white/85 sm:text-base">
              {lq('journeySummary')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" render={<Link to="/games/language-quest/profile" />} nativeButton={false}>
              <UserRound className="mr-2 h-4 w-4" /> My Profile
            </Button>
            <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" render={<Link to="/games/language-quest/leaderboard" />} nativeButton={false}>
              <Trophy className="mr-2 h-4 w-4" /> Leaderboard
            </Button>
            {data.canManage && (
              <>
                <Button className="bg-white text-violet-700 hover:bg-white/90" render={<Link to="/games/language-quest/classrooms" />} nativeButton={false}>
                  <GraduationCap className="mr-2 h-4 w-4" /> Classrooms
                </Button>
                <Button className="bg-white text-violet-700 hover:bg-white/90" render={<Link to="/games/language-quest/manage" />} nativeButton={false}>
                  <Settings2 className="mr-2 h-4 w-4" /> Manage Courses
                </Button>
              </>
            )}
            {user?.role === 'ADMIN' && (
              <Button className="bg-slate-950/80 text-white hover:bg-slate-950" render={<Link to="/games/language-quest/learners" />} nativeButton={false}>
                <Users className="mr-2 h-4 w-4" /> Manage Learners
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Heart className="h-5 w-5 fill-current" />} label="Hearts" value={`${data.profile.hearts}/${data.profile.maxHearts}`} tone="bg-rose-100 text-rose-600 dark:bg-rose-500/15" />
        <StatCard icon={<Star className="h-5 w-5 fill-current" />} label="Total points" value={data.profile.points} tone="bg-amber-100 text-amber-600 dark:bg-amber-500/15" />
        <StatCard icon={<Flame className="h-5 w-5 fill-current" />} label="Day streak" value={data.profile.currentStreak} tone="bg-orange-100 text-orange-600 dark:bg-orange-500/15" />
        <StatCard icon={<Trophy className="h-5 w-5" />} label="Best streak" value={data.profile.bestStreak} tone="bg-violet-100 text-violet-600 dark:bg-violet-500/15" />
      </section>

      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-sky-100 bg-sky-50 p-5 sm:flex-row sm:items-center dark:border-sky-500/20 dark:bg-sky-500/10">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm dark:bg-surface-indigo dark:text-sky-300"><WholeWord className="h-5 w-5" /></span>
          <div>
            <h2 lang={explanationLanguage} className="font-black text-slate-900 dark:text-white">{lq('sentenceFeatureTitle')}</h2>
            <p lang={explanationLanguage} className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{lq('sentenceFeatureBody')}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Choose a course</h2>
            <p lang={explanationLanguage} className="mt-1 text-sm text-slate-500 dark:text-slate-300">{lq('progressSaved')}</p>
          </div>
        </div>

        {data.courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
            <BookOpen className="mx-auto h-11 w-11 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No published courses yet</p>
            <p className="mt-1 text-sm text-slate-500">A teacher or administrator can create the first course.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {courseGroups.map((group, index) => (
              <LanguageQuestCourseFolder
                key={group.category}
                category={group.category}
                count={group.courses.length}
                defaultOpen={index === 0}
                idPrefix="learner-course-folder"
              >
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {group.courses.map((course) => (
                    <article key={course.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-surface-raised dark:bg-surface-indigo">
                      <div className="h-2" style={{ backgroundColor: course.accentColor }} />
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl" style={{ backgroundColor: `${course.accentColor}18` }}>
                            {course.imageEmoji}
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
                        <Button className="mt-5 w-full" style={{ backgroundColor: course.accentColor }} render={<Link to={`/games/language-quest/courses/${course.id}`} />} nativeButton={false}>
                          {course.progressPercent > 0 ? 'Continue course' : 'Start course'}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </LanguageQuestCourseFolder>
            ))}
          </div>
        )}
      </section>

      <LanguageQuestAchievements
        learnerName={user?.name || 'Language Quest Learner'}
        profile={data.profile}
        courses={data.courses}
      />
    </div>
  );
}
