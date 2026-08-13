import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  Ban,
  BookOpen,
  CheckCircle2,
  Flame,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageQuestAvatar } from '@/src/components/games/LanguageQuestAvatar';
import { apiGet, apiSend } from '@/src/lib/api';

interface CourseRef {
  id: string;
  code: string;
  title: string;
  language: string;
  imageEmoji: string;
}

interface CourseHistoryEntry {
  course: CourseRef;
  points: number;
  lastActivityAt: string | null;
}

interface ManagedLearner {
  id: string;
  name: string;
  email: string;
  role: string;
  isExternalLearner: boolean;
  active: boolean;
  avatarId: string;
  bio: string;
  points: number;
  rewards: { level: number; title: string };
  currentStreak: number;
  lastPlayedDate: string | null;
  completedChallenges: number;
  lastLoginAt: string | null;
  createdAt: string;
  classrooms: { id: string; name: string }[];
  activeCourse: CourseRef | null;
  courseHistory: CourseHistoryEntry[];
}

interface CourseOption {
  id: string;
  title: string;
  language: string;
  imageEmoji: string;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STAFF: 'Staff',
  ACCOUNTANT: 'Accountant',
  CASE_WORKER: 'Case worker',
  LIBRARIAN: 'Librarian',
  STUDENT: 'Student',
};

function dateLabel(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export default function LanguageQuestLearners() {
  const [learners, setLearners] = useState<ManagedLearner[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  // "external" mirrors this page's original scope (public self-signup
  // learners, whose account lifecycle is managed right here). "all" widens
  // the list to every student/teacher/learner with any Learning Quest
  // activity, purely so course engagement can be tracked school-wide.
  const [scope, setScope] = useState<'external' | 'all'>('external');
  const [courseFilter, setCourseFilter] = useState('');
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (status !== 'all') params.set('status', status);
      if (scope === 'all') params.set('scope', 'all');
      if (courseFilter) params.set('courseId', courseFilter);
      const result = await apiGet<{ learners: ManagedLearner[] }>(
        `/api/language-quest/admin/learners?${params.toString()}`,
      );
      setLearners(result.learners);
    } catch (error: any) {
      toast.error(error?.message || 'Could not load Learning Quest learners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [query, status, scope, courseFilter]);

  // Course list for the filter dropdown — this endpoint is already
  // admin-scoped and returns every course (official + teacher-created) when
  // called by an admin, so it doubles as the filter's option list.
  useEffect(() => {
    apiGet<CourseOption[]>('/api/language-quest/manage/courses')
      .then((courses) => setCourseOptions(courses))
      .catch(() => {
        // Non-critical — the course filter just stays empty if this fails.
      });
  }, []);

  const stats = useMemo(() => ({
    total: learners.length,
    active: learners.filter((learner) => learner.active).length,
    inactive: learners.filter((learner) => !learner.active).length,
    inClass: learners.filter((learner) => learner.classrooms.length > 0).length,
    onCourse: learners.filter((learner) => learner.activeCourse).length,
  }), [learners]);

  const setLearnerStatus = async (learner: ManagedLearner, active: boolean) => {
    const action = active ? 'reactivate' : 'deactivate';
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} ${learner.name}?${active ? '' : ' Their current sessions will be signed out.'}`)) return;
    setBusyId(learner.id);
    try {
      await apiSend(`/api/language-quest/admin/learners/${learner.id}/status`, 'PATCH', { active });
      setLearners((current) => current.map((item) => item.id === learner.id ? { ...item, active } : item));
      toast.success(`${learner.name} ${active ? 'reactivated' : 'deactivated'}`);
    } catch (error: any) {
      toast.error(error?.message || `Could not ${action} learner`);
    } finally {
      setBusyId('');
    }
  };

  const terminate = async (learner: ManagedLearner) => {
    if (learner.active) {
      toast.error('Deactivate the learner before terminating the account');
      return;
    }
    if (!window.confirm(`Permanently terminate ${learner.name} (${learner.email})?\n\nThis deletes the learner profile, classroom memberships, points, streaks, and lesson history. This cannot be undone.`)) return;
    setBusyId(learner.id);
    try {
      await apiSend(`/api/language-quest/admin/learners/${learner.id}`, 'DELETE');
      setLearners((current) => current.filter((item) => item.id !== learner.id));
      toast.success(`${learner.name}'s account was terminated`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not terminate learner');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <Button variant="ghost" className="-ml-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Learning Quest
      </Button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-900 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/15" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Administrator tools</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Learning Quest Learners</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
            {scope === 'external'
              ? 'Manage public learning-only accounts without mixing them into private school Student records. Deactivate access first; permanent termination is available only for inactive learners.'
              : "Track which course every student, teacher, and public learner is doing right now — filter by course below to see who's on it."}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Shown', value: stats.total, icon: Users, tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
          { label: 'Active', value: stats.active, icon: UserCheck, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
          { label: 'Inactive', value: stats.inactive, icon: Ban, tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
          { label: 'In classrooms', value: stats.inClass, icon: CheckCircle2, tone: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
          { label: 'On a course', value: stats.onCourse, icon: BookOpen, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
            <div>
              <p className="text-xl font-black text-slate-950 dark:text-white">{value}</p>
              <p className="text-xs font-semibold text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setScope('external')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${scope === 'external' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            Public learners
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${scope === 'all' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            Everyone (students, teachers &amp; learners)
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search learners</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 pl-10" placeholder="Search name or email…" />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:w-44">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by course</span>
            <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:w-56">
              <option value="">Any course</option>
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>{course.imageEmoji} {course.title} ({course.language})</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="grid min-h-64 place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>
        ) : learners.length === 0 ? (
          <div className="p-14 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">No learner accounts found</h2>
            <p className="mt-1 text-sm text-slate-500">Try a different search or status filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {learners.map((learner) => (
              <article key={learner.id} className={`p-5 sm:p-6 ${learner.active ? '' : 'bg-slate-50/80 dark:bg-slate-950/35'}`}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <LanguageQuestAvatar avatarId={learner.avatarId} name={learner.name} className="h-14 w-14 text-3xl" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-black text-slate-950 dark:text-white">{learner.name}</h2>
                        <Badge variant={learner.active ? 'default' : 'destructive'}>{learner.active ? 'Active' : 'Inactive'}</Badge>
                        <Badge variant="outline" className="gap-1 text-amber-700 dark:text-amber-300">
                          <Trophy className="h-3 w-3" /> Level {learner.rewards.level} · {learner.rewards.title}
                        </Badge>
                        {!learner.isExternalLearner && (
                          <Badge variant="outline" className="text-violet-700 dark:text-violet-300">{ROLE_LABEL[learner.role] ?? learner.role}</Badge>
                        )}
                      </div>
                      <p className="truncate text-sm text-slate-500 dark:text-slate-400">{learner.email}</p>
                      {learner.bio && <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-5 text-slate-600 dark:text-slate-300">{learner.bio}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {learner.classrooms.length ? learner.classrooms.map((classroom) => (
                          <Badge key={classroom.id} variant="outline" className="text-sky-700 dark:text-sky-300">{classroom.name}</Badge>
                        )) : <span className="text-xs font-semibold text-slate-400">Independent learner</span>}
                      </div>

                      {/* Course tracking — the whole point of this view for admins */}
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/50">
                        {learner.activeCourse ? (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-lg leading-none">{learner.activeCourse.imageEmoji}</span>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-800 dark:text-slate-100">{learner.activeCourse.title}</p>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Currently doing &bull; {learner.activeCourse.language}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                            <BookOpen className="h-3.5 w-3.5" /> No course started yet
                          </p>
                        )}
                        {learner.courseHistory.length > 1 && (
                          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-200 pt-2 dark:border-slate-800">
                            {learner.courseHistory
                              .filter((entry) => entry.course.id !== learner.activeCourse?.id)
                              .map((entry) => (
                                <Badge key={entry.course.id} variant="outline" className="text-[10px] text-slate-500">
                                  {entry.course.imageEmoji} {entry.course.title} · {entry.points} pts
                                </Badge>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4 lg:min-w-[420px]">
                    <div><p className="text-slate-400">Points</p><p className="mt-1 font-black text-amber-600 dark:text-amber-300"><Star className="mr-1 inline h-3.5 w-3.5 fill-current" />{learner.points}</p></div>
                    <div><p className="text-slate-400">Streak</p><p className="mt-1 font-black text-orange-600 dark:text-orange-300"><Flame className="mr-1 inline h-3.5 w-3.5 fill-current" />{learner.currentStreak} days</p></div>
                    <div><p className="text-slate-400">Completed</p><p className="mt-1 font-black text-slate-700 dark:text-slate-200">{learner.completedChallenges} practices</p></div>
                    <div><p className="text-slate-400">Last practice</p><p className="mt-1 font-black text-slate-700 dark:text-slate-200">{dateLabel(learner.lastPlayedDate)}</p></div>
                    <div className="col-span-2"><p className="text-slate-400">Last login</p><p className="mt-1 font-semibold text-slate-600 dark:text-slate-300">{dateLabel(learner.lastLoginAt)}</p></div>
                    <div className="col-span-2"><p className="text-slate-400">Joined</p><p className="mt-1 font-semibold text-slate-600 dark:text-slate-300">{dateLabel(learner.createdAt)}</p></div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:w-36 lg:flex-col">
                    {!learner.isExternalLearner ? (
                      <p className="text-[11px] font-semibold text-slate-400 lg:text-right">Managed via Users</p>
                    ) : learner.active ? (
                      <Button variant="outline" size="sm" disabled={busyId === learner.id} onClick={() => setLearnerStatus(learner, false)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10">
                        <Ban className="mr-2 h-4 w-4" /> Deactivate
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" disabled={busyId === learner.id} onClick={() => setLearnerStatus(learner, true)} className="bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                          <UserCheck className="mr-2 h-4 w-4" /> Reactivate
                        </Button>
                        <Button variant="outline" size="sm" disabled={busyId === learner.id} onClick={() => terminate(learner)} className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Terminate
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Account lifecycle:</strong> deactivation blocks sign-in and revokes current sessions but preserves learning history. Termination is permanent and is intentionally available only after deactivation.</p>
      </section>
    </div>
  );
}
